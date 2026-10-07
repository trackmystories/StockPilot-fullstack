import {ApiError, requestJson} from './http';

import {getAccessToken, getToken, removeToken, sessionRevision} from './authStorage';

export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const started = sessionRevision();

  let token = await getAccessToken();

  const check = () => {
    if (!token || started !== sessionRevision()) {
      throw new ApiError('Please sign in again.', 401);
    }
  };

  check();

  const send = () =>
    requestJson<T>(path, {
      ...options,

      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  try {
    const data = await send();

    check();

    return data;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    check();

    const latest = await getToken();

    token = latest && latest !== token ? latest : await getAccessToken(true);

    check();

    try {
      const data = await send();

      check();

      return data;
    } catch (retryError) {
      if (
        started === sessionRevision() &&
        retryError instanceof ApiError &&
        retryError.status === 401
      ) {
        await removeToken();
      }

      throw retryError;
    }
  }
}
