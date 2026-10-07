import type {NewsRepository} from '../domain/News';
export class NewsService {
  constructor(private news: NewsRepository) {}
  list(token: string, cursor?: string) {
    return this.news.list(token, cursor);
  }
  get(token: string, id: string) {
    return this.news.get(token, id);
  }
}
