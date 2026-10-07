'use client';
import Link from 'next/link';
import styles from './article.module.css';

export default function ArticleError({
  reset,
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  return (
    <div className={styles.centered} role="alert">
      <h1>Could not load this article</h1>

      <p>Check the Next.js terminal for the API error, then try again.</p>

      <button type="button" onClick={reset}>
        Try again
      </button>

      <Link href="/news">Back to News</Link>
    </div>
  );
}