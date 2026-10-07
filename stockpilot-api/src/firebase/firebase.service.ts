import {Injectable} from '@nestjs/common';

import {cert, getApps, initializeApp} from 'firebase-admin/app';

import {getAuth, type Auth} from 'firebase-admin/auth';

import {getFirestore, type Firestore} from 'firebase-admin/firestore';

import {resolve} from 'node:path';

@Injectable()
export class FirebaseService {
  readonly auth: Auth;
  readonly db: Firestore;

  constructor() {
    const credentialsPath = resolve(process.cwd(), 'src/firebase/firebase-service-account.json');

    const existingApp = getApps().find((app) => app.name === '[DEFAULT]');

    const app =
      existingApp ??
      initializeApp({
        credential: cert(credentialsPath),
      });

    this.auth = getAuth(app);
    this.db = getFirestore(app);
  }
}
