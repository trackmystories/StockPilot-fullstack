import type {Article, ArticleSummary, NewsRepository, Page} from '../domain/News';

export class NewsRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'NewsRequestError';
  }
}

export class HttpNewsRepository implements NewsRepository {
  private async request<T>(path: string, token?: string): Promise<T> {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

    if (!configuredUrl) {
      throw new Error(
        'Set NEXT_PUBLIC_API_URL in the Next.js project .env.local, then restart Next.js.',
      );
    }

    const baseUrl = configuredUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    const url = `${baseUrl}/api${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const headers: HeadersInit = {
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = typeof data?.message === 'string' ? data.message : 'News request failed';

        throw new NewsRequestError(`${message} (HTTP ${response.status}) at ${url}`, response.status);
      }

      if (!data || typeof data !== 'object') {
        throw new Error(
          `Expected news JSON from ${url}. Check that NEXT_PUBLIC_API_URL points to NestJS.`,
        );
      }

      return data as T;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`News request timed out at ${url}.`);
      }

      if (error instanceof TypeError) {
        throw new Error(
          `Cannot reach ${url}. Check that NestJS is running and the API address is reachable.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async list(token?: string, cursor?: string): Promise<Page<ArticleSummary>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const page = await this.request<Page<ArticleSummary>>(`/news${query}`, token);

    if (
      !Array.isArray(page.items) ||
      !(page.nextCursor === null || typeof page.nextCursor === 'string')
    ) {
      throw new Error('Invalid news response: expected {items: [], nextCursor: string | null}.');
    }

    return page;
  }

  async get(id: string, token?: string): Promise<Article> {
    const article = await this.request<Article>(`/news/${encodeURIComponent(id)}`, token);

    if (typeof article.id !== 'string' || typeof article.body !== 'string') {
      throw new Error('Invalid article response: expected an article with id and body.');
    }

    return article;
  }
}