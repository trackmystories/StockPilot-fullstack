import Image from 'next/image';
import Link from 'next/link';

import styles from '../about.module.css';

export function AboutHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            ABOUT STOCKPILOT
          </p>

          <h1 className={styles.heroTitle}>
            A smarter way
            <br />
            to <span>invest.</span>
          </h1>

          <p className={styles.heroDescription}>
            Investing comes with a lot of noise. StockPilot is built to make
            research clearer, faster and easier to understand — so investors
            can focus on the information that actually matters.
          </p>

          <div className={styles.heroActions}>
            <a
              href="#mission"
              className={styles.primaryButton}
            >
              Our Mission
            </a>

            <Link
              href="/login"
              className={styles.secondaryButton}
            >
              App Launching soon
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroGlow} />

          <Image
            src="/aboutus.png"
            alt="StockPilot investment analysis"
            width={760}
            height={760}
            className={styles.heroImage}
            priority
          />
        </div>
      </div>
    </section>
  );
}