import type {Article, ArticleSummary, NewsRepository, Page} from '../domain/News';
import {requestJson} from '../../Auth/infrastructure/http';

export class HttpNewsRepository implements NewsRepository {
  list(_token: string, cursor?: string): Promise<Page<ArticleSummary>> {
    return requestJson(`/api/news${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
  }

  get(_token: string, id: string): Promise<Article> {
    return requestJson(`/api/news/${encodeURIComponent(id)}`);
  }
}
