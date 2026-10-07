import {Injectable, NotFoundException} from '@nestjs/common';
import {FieldPath, Timestamp} from 'firebase-admin/firestore';
import type {DocumentSnapshot} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {FirebaseService} from '../firebase/firebase.service';
import {RequestCache} from '../common/request-cache';
import {decodeCursor, documentId, encodeCursor} from './cursor';

@Injectable()
export class NewsService {
  private readonly images = new RequestCache();

  constructor(private readonly firebase: FirebaseService) {}

  private async imageUrl(storagePath: string, url: string): Promise<string> {
    if (url.startsWith('https://')) {
      return url;
    }

    const bucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!storagePath || !bucket) {
      return '';
    }

    return this.images
      .get(`${bucket}/${storagePath}`, 300000, async () => {
        const [signedUrl] = await getStorage()
          .bucket(bucket)
          .file(storagePath)
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 3600000,
          });

        return signedUrl;
      })
      .catch(() => '');
  }

  private async article(doc: DocumentSnapshot, includeImages = true) {
    const data = doc.data()!;

    const text = (key: string, fallback = '') =>
      typeof data[key] === 'string' ? (data[key] as string) : fallback;

    const date = (value: unknown) =>
      value instanceof Timestamp ? value.toDate().toISOString() : null;

    const path = text('coverImagePath');

    const coverImageUrl = await this.imageUrl(
      path,
      text('coverImageUrl'),
    );

    const rawImages =
      data.images &&
      typeof data.images === 'object' &&
      !Array.isArray(data.images)
        ? data.images
        : {};

    const images = includeImages
      ? Object.fromEntries(
          await Promise.all(
            Object.entries(rawImages).map(async ([key, value]) => {
              const image =
                value && typeof value === 'object'
                  ? (value as Record<string, unknown>)
                  : {};

              const storagePath =
                typeof image.storagePath === 'string'
                  ? image.storagePath
                  : '';

              const positiveNumber = (value: unknown) =>
                typeof value === 'number' &&
                Number.isFinite(value) &&
                value > 0
                  ? value
                  : undefined;

              const width = positiveNumber(image.width);
              const height = positiveNumber(image.height);

              return [
                key,
                {
                  storagePath,
                  url: await this.imageUrl(
                    storagePath,
                    typeof image.url === 'string' ? image.url : '',
                  ),
                  ...(width && height ? {width, height} : {}),
                  alt: typeof image.alt === 'string' ? image.alt : '',
                  caption:
                    typeof image.caption === 'string'
                      ? image.caption
                      : '',
                },
              ];
            }),
          ),
        )
      : {};

    return {
      id: doc.id,
      ticker: text('ticker', doc.id),
      companyName: text('companyName'),
      title: text('title'),
      excerpt: text('excerpt'),
      body: text('body'),
      images,
      category: text('category', 'News'),
      coverImagePath: path,
      coverImageUrl,
      authorId: text('authorId'),
      authorName: text('authorName', 'StockPilot'),
      status: 'published' as const,
      createdAt: date(data.createdAt) ?? '',
      updatedAt: date(data.updatedAt) ?? '',
      publishedAt: date(data.publishedAt),
    };
  }

  async list(cursor?: string) {
    let query = this.firebase.db
      .collection('articles')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');

    if (cursor !== undefined) {
      query = query.startAfter(...decodeCursor(cursor));
    }

    const page = await query.limit(21).get();

    const docs = page.docs.slice(0, 20);

    const articles = await Promise.all(
      docs.map((doc) => this.article(doc, false)),
    );

    const last = docs[docs.length - 1];

    return {
      items: articles.map(({body, ...summary}) => summary),
      nextCursor:
        page.size > 20 &&
        last?.get('publishedAt') instanceof Timestamp
          ? encodeCursor(last.get('publishedAt'), last.id)
          : null,
    };
  }

  async get(id: string) {
    const doc = await this.firebase.db
      .collection('articles')
      .doc(documentId(id))
      .get();

    if (!doc.exists || doc.get('status') !== 'published') {
      throw new NotFoundException('Article not found.');
    }

    return this.article(doc);
  }
}