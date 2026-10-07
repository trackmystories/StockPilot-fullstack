import {cache} from 'react';
import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {Container} from '@mantine/core';
import {newsService} from '../newsDependencies';
import {ArticleBody} from '../components/ArticleBody';
import styles from './article.module.css';
type ArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getArticle = cache(async (id: string) => {
  return newsService.get(id);
});

function formatDate(date: string | null) {
  if (!date) {
    return 'Draft';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function getArticleUrl(id: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return `${siteUrl}/news/${id}`;
}

export async function generateMetadata({params}: ArticlePageProps): Promise<Metadata> {
  const {id} = await params;
  const article = await getArticle(id);
  const url = getArticleUrl(article.id);

  return {
    title: `${article.title} | StockPilot`,
    description: article.excerpt,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      url,
      siteName: 'StockPilot',
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt || undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      images: article.coverImageUrl
        ? [
            {
              url: article.coverImageUrl,
              alt: article.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: article.coverImageUrl ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.excerpt,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  };
}

export default async function ArticlePage({params}: ArticlePageProps) {
  const {id} = await params;
  const article = await getArticle(id);
  const articleUrl = getArticleUrl(article.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    url: articleUrl,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt || undefined,
    author: {
      '@type': 'Organization',
      name: article.authorName || 'Stock Pilot Research',
    },
    publisher: {
      '@type': 'Organization',
      name: 'StockPilot',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/logo.png`,
      },
    },
    image: article.coverImageUrl || undefined,
    about: article.companyName
      ? {
          '@type': 'Corporation',
          name: article.companyName,
          tickerSymbol: article.ticker,
        }
      : undefined,
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <Container size="xl">
        <article className={styles.article}>
          <Link href="/news" className={styles.backLink}>
            ← Back to News
          </Link>

          <p className={styles.category}>{article.category.toUpperCase()}</p>

          <h1 className={styles.title}>{article.title}</h1>

          <div className={styles.meta}>
            <Image
              src="/logo.png"
              alt="StockPilot logo"
              width={40}
              height={40}
              className={styles.authorLogo}
            />

            <span>
              By <strong>{article.authorName}</strong>
            </span>

            <span className={styles.dot}>•</span>

            <time dateTime={article.publishedAt ?? undefined}>
              {formatDate(article.publishedAt)}
            </time>
          </div>

          {article.coverImageUrl && (
            <div className={styles.cover}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.coverImageUrl} alt={article.title} />
            </div>
          )}

          <div className={styles.divider} />

          {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}

          <ArticleBody body={article.body} images={article.images} />
        </article>
      </Container>
    </main>
  );
}