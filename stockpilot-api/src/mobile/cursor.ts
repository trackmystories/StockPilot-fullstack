import {BadRequestException} from '@nestjs/common';
import {Timestamp} from 'firebase-admin/firestore';

export function documentId(id: unknown): string {
  if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) {
    throw new BadRequestException('Invalid document ID.');
  }

  return id;
}

export function decodeCursor(value: string): [Timestamp, string] {
  try {
    if (typeof value !== 'string' || value.length > 2048) {
      throw new Error();
    }

    const data = JSON.parse(Buffer.from(value, 'base64url').toString());

    const id = documentId(data.id);

    // Support cursors previously returned by Express.
    if (typeof data.date === 'string' && Number.isFinite(Date.parse(data.date))) {
      return [Timestamp.fromDate(new Date(data.date)), id];
    }

    if (!Number.isInteger(data.seconds) || !Number.isInteger(data.nanoseconds)) {
      throw new Error();
    }

    return [new Timestamp(data.seconds, data.nanoseconds), id];
  } catch {
    throw new BadRequestException('Invalid page cursor.');
  }
}

export function encodeCursor(timestamp: Timestamp, id: string): string {
  return Buffer.from(
    JSON.stringify({
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds,
      id,
    }),
  ).toString('base64url');
}
