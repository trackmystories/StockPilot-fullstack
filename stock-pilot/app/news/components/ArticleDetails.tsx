'use client';

import Image from 'next/image';
import Link from 'next/link';

import {
    Alert,
    Button,
    Loader,
} from '@mantine/core';

import { useNewsArticle } from '../hooks/useNewsArticle';

import styles from '../../../app/news/[id]/article.module.css';

type ArticleDetailsProps = {
    id: string;
};

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

export function ArticleDetails({
    id,
}: ArticleDetailsProps) {
    const {
        article,
        loading,
        error,
        retry,
    } = useNewsArticle(id);

    if (loading) {
        return (
            <div className={styles.centered}>
                <Loader color="#16b77a" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.centered}>
                <Alert
                    color="red"
                    className={styles.error}
                >
                    {error}
                </Alert>

                <Button
                    color="#16b77a"
                    onClick={retry}
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (!article) {
        return null;
    }

    return (
        <article className={styles.article}>
            <Link
                href="/news"
                className={styles.backLink}
            >
                ← Back to News
            </Link>

            <p className={styles.category}>
                {article.category.toUpperCase()}
            </p>

            <h1 className={styles.title}>
                {article.title}
            </h1>

            <div className={styles.meta}>
                <Image
                    src="/logo.png"
                    alt="StockPilot logo"
                    width={40}
                    height={40}
                    className={styles.authorLogo}
                />

                <span>
                    By{' '}
                    <strong>
                        {article.authorName}
                    </strong>
                </span>

                <span className={styles.dot}>
                    •
                </span>

                <span>
                    {formatDate(article.publishedAt)}
                </span>
            </div>

            {article.coverImageUrl && (
                <div className={styles.cover}>
                    {/* External Firebase images are easier
              to render with a normal img initially. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={article.coverImageUrl}
                        alt={article.title}
                    />
                </div>
            )}

            <div className={styles.divider} />

            {article.excerpt && (
                <p className={styles.excerpt}>
                    {article.excerpt}
                </p>
            )}

            <div className={styles.body}>
                {article.body
                    .split(/\n\s*\n/)
                    .filter(Boolean)
                    .map((paragraph, index) => (
                        <p key={`${index}-${paragraph.slice(0, 20)}`}>
                            {paragraph}
                        </p>
                    ))}
            </div>
        </article>
    );
}