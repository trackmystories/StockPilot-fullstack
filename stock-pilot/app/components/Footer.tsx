import Image from 'next/image';
import Link from 'next/link';

import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link
            href="/"
            className={styles.brandLink}
          >
            <Image
              src="/logo.png"
              alt="StockPilot logo"
              width={56}
              height={28}
              className={styles.logo}
            />

            <span className={styles.brandName}>
              StockPilot
            </span>
          </Link>
        </div>

        <div className={styles.right}>
          <Link
            href="/privacy"
            className={styles.link}
          >
            Privacy Policy
          </Link>

          <span className={styles.divider}>
            |
          </span>

          <Link
            href="/terms"
            className={styles.link}
          >
            Terms of Use
          </Link>

          <span className={styles.divider}>
            |
          </span>

          <span className={styles.copyright}>
            © 2026 StockPilot. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}