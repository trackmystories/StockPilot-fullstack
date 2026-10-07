import Link from 'next/link';

import styles from '../about.module.css';

export function AboutCta() {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.container}>
        <div className={styles.ctaCard}>
          <div>
            <p className={styles.ctaEyebrow}>
              INVEST WITH MORE CONTEXT
            </p>

            <h2>
              Make the numbers
              <br />
              <span>work for you.</span>
            </h2>

            <p>
              Explore financial data, investor signals and research designed
              to help you understand opportunities faster.
            </p>
          </div>

          <Link
            href="/login"
            className={styles.ctaButton}
          >
            App Launching soon
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}