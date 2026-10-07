import {BadRequestException, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {FieldPath, Timestamp} from 'firebase-admin/firestore';
import {FirebaseService} from '../firebase/firebase.service';
import {decodeCursor, documentId, encodeCursor} from './cursor';

@Injectable()
export class NotificationsService {
  constructor(private readonly firebase: FirebaseService) {}

  private async account(uid: string) {
    const ref = this.firebase.db.collection('users').doc(uid);

    if (!(await ref.get()).exists) {
      throw new UnauthorizedException('Account unavailable.');
    }

    return ref;
  }

  async list(uid: string, cursor?: string) {
    const user = await this.account(uid);

    let query = this.firebase.db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');

    if (cursor !== undefined) {
      query = query.startAfter(...decodeCursor(cursor));
    }

    const [page, state] = await Promise.all([
      query.limit(31).get(),
      user.collection('notificationState').doc('inbox').get(),
    ]);

    const docs = page.docs.slice(0, 30);

    // Fetch all read markers in one operation.
    const reads = docs.length
      ? await this.firebase.db.getAll(...docs.map((doc) => user.collection('notificationReads').doc(doc.id)))
      : [];

    const cutoff = state.get('readAllBefore')?.toMillis() ?? 0;

    const items = docs.map((doc, index) => {
      const data = doc.data();

      return {
        id: doc.id,
        type: ['stock', 'research', 'watchlist', 'system'].includes(data.type) ? data.type : 'system',
        ticker: typeof data.ticker === 'string' ? data.ticker : '',
        title: typeof data.title === 'string' ? data.title : 'Stock Pilot',
        message: typeof data.message === 'string' ? data.message : '',
        articleId: typeof data.articleId === 'string' ? data.articleId : undefined,
        createdAt: data.createdAt.toDate().toISOString(),
        read: reads[index].exists || data.createdAt.toMillis() <= cutoff,
      };
    });

    const last = docs[docs.length - 1];

    return {
      items,
      nextCursor: page.size > 30 && last ? encodeCursor(last.get('createdAt'), last.id) : null,
    };
  }

  async readAll(uid: string) {
    const user = await this.account(uid);

    const ref = user.collection('notificationState').doc('inbox');

    const now = Timestamp.now();

    await this.firebase.db.runTransaction(async (transaction) => {
      const state = await transaction.get(ref);

      if ((state.get('readAllBefore')?.toMillis() ?? 0) < now.toMillis()) {
        transaction.set(ref, {readAllBefore: now}, {merge: true});
      }
    });

    return {
      readAllBefore: now.toDate().toISOString(),
    };
  }

  async read(uid: string, id: string) {
    const user = await this.account(uid);

    const notification = await this.firebase.db.collection('notifications').doc(documentId(id)).get();

    if (!notification.exists) {
      throw new NotFoundException('Notification not found.');
    }

    await user.collection('notificationReads').doc(id).set({
      readAt: Timestamp.now(),
    });

    return {read: true};
  }

  async device(uid: string, token: unknown, register: boolean) {
    await this.account(uid);

    if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || /\s/.test(token)) {
      throw new BadRequestException('Invalid device token.');
    }

    const ref = this.firebase.db.collection('pushDevices').doc(createHash('sha256').update(token).digest('hex'));

    if (register) {
      await ref.set({
        token,
        uid,
        updatedAt: Timestamp.now(),
      });
    } else {
      await this.firebase.db.runTransaction(async (transaction) => {
        const device = await transaction.get(ref);

        if (device.get('uid') === uid) {
          transaction.delete(ref);
        }
      });
    }

    return {registered: register};
  }
}
