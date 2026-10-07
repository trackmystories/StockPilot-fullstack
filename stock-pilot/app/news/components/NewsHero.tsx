import {Container} from '@mantine/core';

import styles from '../../../app/news/news.module.css';

export function NewsHero() {
  return (
    <section className={styles.hero}>
      <Container size="xl">
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            NEWS & RESEARCH
          </p>

          <h1 className={styles.heroTitle}>
            Market insights for
            <br />
            a <span>brighter tomorrow.</span>
          </h1>

          <p className={styles.heroDescription}>
            Stay informed with StockPilot research, company updates,
            <br className={styles.desktopBreak} />
            and market-moving insights.
          </p>
        </div>
      </Container>
    </section>
  );
}