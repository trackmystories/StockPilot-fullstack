'use client';

import {useState} from 'react';

import Link from 'next/link';

import {Container, Loader} from '@mantine/core';

import {useNewsList} from '../hooks/useNewsList';

import styles from '../../../app/news/news.module.css';

const ITEMS_PER_PAGE = 3;

function formatDate(date: string | null) {
  if (!date) {
    return 'Draft';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function LatestResearch() {
  const list = useNewsList();

  const [visibleCount, setVisibleCount] =
    useState(ITEMS_PER_PAGE);

  const visibleItems = list.items.slice(
    0,
    visibleCount,
  );

  const hasHiddenLoadedItems =
    visibleCount < list.items.length;

  const canShowMore =
    hasHiddenLoadedItems || list.hasMore;

  const handleShowMore = async () => {
    const nextVisibleCount =
      visibleCount + ITEMS_PER_PAGE;

    if (
      nextVisibleCount > list.items.length &&
      list.hasMore
    ) {
      await list.loadMore();
    }

    setVisibleCount(nextVisibleCount);
  };

  const handleRetry = async () => {
    setVisibleCount(ITEMS_PER_PAGE);

    await list.refresh();
  };

  return (
    <section className={styles.research}>
      <Container size="xl">
        <div className={styles.researchHeader}>
          <h2 className={styles.researchTitle}>
            Latest Research
          </h2>
        </div>

        {list.error && (
          <div className={styles.feedback}>
            <p>{list.error}</p>

            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        )}

        {!list.loading &&
          !list.error &&
          visibleItems.length === 0 && (
            <p className={styles.empty}>
              No articles published yet.
            </p>
          )}

        <div className={styles.articleList}>
          {visibleItems.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.id}`}
              className={styles.articleLink}
            >
              <article className={styles.article}>
                <div className={styles.articleIdentity}>
                  <span className={styles.ticker}>
                    {article.ticker}
                  </span>

                  <span className={styles.category}>
                    {article.category}
                  </span>
                </div>

                <div className={styles.articleContent}>
                  <h3>
                    {article.title}
                  </h3>

                  <p>
                    {article.excerpt}
                  </p>
                </div>

                <div className={styles.articleMeta}>
                  <strong>
                    {article.authorName}
                  </strong>

                  <div>
                    <span>
                      {formatDate(
                        article.publishedAt,
                      )}
                    </span>
                  </div>
                </div>

                <span
                  className={styles.articleArrow}
                  aria-hidden="true"
                >
                  →
                </span>
              </article>
            </Link>
          ))}
        </div>

        {list.loading && (
          <div className={styles.loader}>
            <Loader color="#16b77a" />
          </div>
        )}

        {canShowMore &&
          !list.loading &&
          !list.error && (
            <div className={styles.loadMoreWrapper}>
              <button
                type="button"
                className={styles.loadMoreButton}
                onClick={handleShowMore}
              >
                Show more
              </button>
            </div>
          )}
      </Container>
    </section>
  );
}