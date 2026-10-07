import * as SecureStore from 'expo-secure-store';
import type {AuthResult} from '../domain/AuthRepository';
import {ApiError, requestJson} from './http';

export type StoredSession = AuthResult & {
  expiresAt: number;
};

const KEY = 'stockpilot_session_v1';

let session: StoredSession | null | undefined;
let revision = 0;
let reading: Promise<StoredSession | null> | null = null;
let refreshing: Promise<string | null> | null = null;
let writes: Promise<unknown> = Promise.resolve();

const listeners = new Set<(value: StoredSession | null) => void>();

function enqueue(task: () => Promise<void>) {
  const next = writes.then(task, task);

  writes = next.catch(() => undefined);

  return next;
}

function notify() {
  listeners.forEach((listener) => {
    listener(session ?? null);
  });
}

export function sessionRevision() {
  return revision;
}

export function subscribeSession(listener: (value: StoredSession | null) => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function valid(value: StoredSession): boolean {
  return Boolean(
    value &&
    typeof value.token === 'string' &&
    value.token &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken &&
    value.user &&
    typeof value.user.uid === 'string' &&
    value.user.uid &&
    Number.isFinite(value.expiresAt),
  );
}

export async function getSession(): Promise<StoredSession | null> {
  if (session !== undefined) {
    return session;
  }

  if (!reading) {
    const started = revision;

    reading = (async () => {
      const raw = await SecureStore.getItemAsync(KEY);

      let value: StoredSession | null = null;

      try {
        const parsed = raw ? (JSON.parse(raw) as StoredSession) : null;

        if (parsed && valid(parsed)) {
          value = parsed;
        }
      } catch {
        // Invalid stored data requires signing in again.
      }

      if (started === revision) {
        session = value;
      }

      return session ?? null;
    })().finally(() => {
      reading = null;
    });
  }

  return reading;
}

export async function saveSession(result: AuthResult): Promise<StoredSession> {
  const value = {
    ...result,
    expiresAt: Date.now() + Number(result.expiresIn) * 1000,
  };

  if (!valid(value) || Number(result.expiresIn) <= 0) {
    throw new Error('Invalid authentication response.');
  }

  const started = ++revision;

  await enqueue(async () => {
    if (started === revision) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(value));
    }
  });

  if (started !== revision) {
    throw new Error('Session changed. Please try again.');
  }

  session = value;

  notify();

  return value;
}

export async function removeToken() {
  ++revision;

  session = null;
  refreshing = null;

  notify();

  await enqueue(async () => {
    await SecureStore.deleteItemAsync(KEY);

    await SecureStore.deleteItemAsync('auth_token');
  });
}

export async function getToken() {
  return (await getSession())?.token ?? null;
}

// Compatibility with the unused legacy AuthContext.
// The active Redux login flow uses saveSession.
export async function saveToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function getAccessToken(force = false): Promise<string | null> {
  const current = await getSession();

  if (!current) {
    return null;
  }

  if (!force && current.expiresAt > Date.now() + 60000) {
    return current.token;
  }

  if (refreshing) {
    return refreshing;
  }

  const started = revision;

  const task = (async () => {
    try {
      const result = await requestJson<AuthResult>('/auth/refresh', {
        method: 'POST',

        body: JSON.stringify({
          refreshToken: current.refreshToken,
        }),
      });

      if (started !== revision) {
        return null;
      }

      const next = {
        ...result,
        expiresAt: Date.now() + Number(result.expiresIn) * 1000,
      };

      if (!valid(next) || next.user.uid !== current.user.uid || Number(result.expiresIn) <= 0) {
        throw new Error('Invalid refresh response.');
      }

      await enqueue(async () => {
        if (started === revision) {
          await SecureStore.setItemAsync(KEY, JSON.stringify(next));
        }
      });

      if (started !== revision) {
        return null;
      }

      session = next;

      notify();

      return next.token;
    } catch (error) {
      if (started === revision && error instanceof ApiError && error.status === 401) {
        await removeToken();
      }

      throw error;
    }
  })();

  refreshing = task;

  try {
    return await task;
  } finally {
    if (refreshing === task) {
      refreshing = null;
    }
  }
}
