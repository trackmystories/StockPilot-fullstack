const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldPath, Timestamp} = require('firebase-admin/firestore');
const {getAuth} = require('firebase-admin/auth');
const {getMessaging} = require('firebase-admin/messaging');
const {onDocumentWritten, onDocumentCreated} = require('firebase-functions/v2/firestore');
const {createHash} = require('node:crypto');
const {articleNotification} = require('../publication');

initializeApp();

const db = getFirestore();

const options = {
  region: 'europe-west1',
  retry: true,
  timeoutSeconds: 540,
};

exports.articlePublished = onDocumentWritten(
  {
    ...options,
    document: 'articles/{articleId}',
  },
  async (event) => {
    const notification = articleNotification(
      event.data?.before.data(),
      event.data?.after.data(),
      event.params.articleId,
    );

    if (!notification) {
      return;
    }

    // Retried events use the same ID, preventing duplicate inbox entries.
    const id = createHash('sha256').update(event.id).digest('hex');

    try {
      await db
        .collection('notifications')
        .doc(id)
        .create({
          ...notification,
          createdAt: Timestamp.now(),
        });
    } catch (error) {
      if (error.code !== 6 && error.code !== 'already-exists') {
        throw error;
      }
    }
  },
);

exports.notificationCreated = onDocumentCreated(
  {
    ...options,
    document: 'notifications/{notificationId}',
  },
  async (event) => {
    const data = event.data?.data();

    if (!data) {
      return;
    }

    const notificationId = event.params.notificationId;

    const progressRef = db.collection('notificationDelivery').doc(notificationId);

    const progress = (await progressRef.get()).data();

    if (progress?.complete) {
      return;
    }

    let cursor = progress?.cursor;

    while (true) {
      let query = db.collection('pushDevices').orderBy(FieldPath.documentId()).limit(400);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const page = await query.get();

      if (page.empty) {
        break;
      }

      const uids = [...new Set(page.docs.map((doc) => doc.data().uid).filter(Boolean))];

      const enabled = new Set();

      // Skip deleted or disabled accounts.
      for (let index = 0; index < uids.length; index += 100) {
        const result = await getAuth().getUsers(
          uids.slice(index, index + 100).map((uid) => ({uid})),
        );

        result.users.forEach((user) => {
          if (!user.disabled) {
            enabled.add(user.uid);
          }
        });
      }

      const devices = page.docs.filter((doc) => {
        const device = doc.data();

        return (
          enabled.has(device.uid) &&
          typeof device.token === 'string' &&
          device.updatedAt?.toMillis() > Date.now() - 30 * 86400000
        );
      });

      if (devices.length) {
        const result = await getMessaging().sendEachForMulticast({
          tokens: devices.map((doc) => doc.data().token),

          notification: {
            title: String(data.title || 'Stock Pilot').slice(0, 160),

            body: String(data.message || '').slice(0, 300),
          },

          data: {
            notificationId,

            articleId: typeof data.articleId === 'string' ? data.articleId : '',
          },

          android: {
            priority: 'high',

            notification: {
              tag: notificationId,
            },
          },

          apns: {
            headers: {
              'apns-collapse-id': notificationId.slice(0, 64),
            },

            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        });

        let transientFailure = false;

        for (let index = 0; index < result.responses.length; index++) {
          const error = result.responses[index].error;

          if (!error) {
            continue;
          }

          const invalidToken = [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token',
          ].includes(error.code);

          if (invalidToken) {
            await db.runTransaction(async (transaction) => {
              const current = await transaction.get(devices[index].ref);

              if (current.data()?.token === devices[index].data().token) {
                transaction.delete(devices[index].ref);
              }
            });
          } else {
            console.error('Push delivery failed', {
              notificationId,
              code: error.code,
            });

            transientFailure = true;
          }
        }

        if (transientFailure) {
          throw new Error('Retry push delivery page');
        }
      }

      cursor = page.docs[page.docs.length - 1].id;

      await progressRef.set(
        {
          cursor,
          updatedAt: Timestamp.now(),
        },
        {merge: true},
      );
    }

    await progressRef.set(
      {
        complete: true,
        updatedAt: Timestamp.now(),
      },
      {merge: true},
    );
  },
);
