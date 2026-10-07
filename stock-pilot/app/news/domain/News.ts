export type ArticleImage = {
  storagePath?: string;
  url?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

export type Article = {
  id: string;

  ticker: string;
  companyName: string;

  title: string;
  excerpt: string;
  body: string;
  images?: Record<string, ArticleImage>;
  category: string;

  coverImagePath: string;
  coverImageUrl: string;

  authorId: string;
  authorName: string;

  status: 'draft' | 'published';

  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type ArticleSummary = Omit<Article, 'body'>;

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export interface NewsRepository {
  list(token?: string, cursor?: string): Promise<Page<ArticleSummary>>;

  get(id: string, token?: string): Promise<Article>;
}