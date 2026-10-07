import Link from 'next/link';

import { Button, Container } from '@mantine/core';
import { AppShowcase } from './components/AppShowcase';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <main>
      <section className={styles.hero}>
        <Container
          size="xl"
          className={styles.heroContainer}
        >
          <div className={styles.content}>
            <p className={styles.eyebrow}>INVEST SMARTER</p>

            <h1 className={styles.title}>
              Own <span>Tomorrow</span>
            </h1>

            <p className={styles.description}>
              Actionable insights, powerful tools, and real market intelligence
              — all on your finger tips.
            </p>
          </div>
        </Container>
      </section>
      <AppShowcase
        eyebrow="THE SMARTER WAY TO INVEST"
        title="From noise"
        highlightedText="to opportunity."
        description="The stock universe can be overwhelming — thousands of companies, endless data and conflicting opinions. StockPilot cuts through the noise so you can focus on what matters."
        imageSrc="/stockpilot-home.png"
        imageAlt="StockPilot home screen"
        features={[
          {
            icon: '▥',
            title: 'Curated Insights',
            description: 'AI-powered picks and analysis',
          },
          {
            icon: 'ϟ',
            title: 'Save Time',
            description: 'Key metrics, all in one place',
          },
          {
            icon: '◉',
            title: 'Invest Smarter',
            description: 'Spot opportunities with confidence',
          },
        ]} />

      <AppShowcase
        eyebrow="INVESTOR SIGNALS"
        title="See what"
        highlightedText="the numbers are saying."
        description="Raw financial data is only useful if you know what to look for. StockPilot turns reported company results into clear investor signals so you can quickly understand earnings quality, capital efficiency and growth momentum."
        imageSrc="/stockpilot-investor-signals.png"
        imageAlt="StockPilot investor signals screen"
        imagePosition="left"
        features={[
          {
            icon: '◎',
            title: 'Read Between the Numbers',
            description:
              'See how efficiently a company converts growth and earnings into real cash flow.',
          },
          {
            icon: '↗',
            title: 'Spot Momentum Earlier',
            description:
              'Track changes in growth, margins and capital efficiency before making a decision.',
          },
          {
            icon: '✓',
            title: 'Decide With Context',
            description:
              'Turn complex financial relationships into signals that are easier to understand and compare.',
          },
        ]}
        footerItems={[
          'EARNINGS QUALITY',
          'CAPITAL EFFICIENCY',
          'GROWTH MOMENTUM',
        ]}
      />
    </main>
  );
}