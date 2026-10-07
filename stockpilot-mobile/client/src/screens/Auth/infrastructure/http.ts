export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}
export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) {
    cancel();
  } else {
    options.signal?.addEventListener('abort', cancel, {once: true});
  }
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {'Content-Type': 'application/json', ...options.headers},
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join('\n') : data?.message;
      throw new ApiError(
        message || `Request failed (${response.status}).`,
        response.status,
        typeof data?.code === 'string' ? data.code : undefined,
      );
    }
    if (data === null) {
      throw new Error('Server returned an invalid response.');
    }
    return data as T;
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
