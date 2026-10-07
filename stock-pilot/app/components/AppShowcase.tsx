import type {ReactNode} from 'react';

import Image from 'next/image';
import Link from 'next/link';

import styles from './AppShowcase.module.css';

type ShowcaseFeature = {
  icon: ReactNode;
  title: string;
  description: string;
};

type AppShowcaseProps = {
  eyebrow: string;
  title: string;
  highlightedText: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  features: ShowcaseFeature[];
  ctaLabel?: string;
  ctaHref?: string;
  footerItems?: string[];
  imagePosition?: 'left' | 'right';
};

export function AppShowcase({
  eyebrow,
  title,
  highlightedText,
  description,
  imageSrc,
  imageAlt,
  features,
  ctaLabel = 'App launching soon',
  ctaHref = '/login',
  footerItems = ['DATA', 'INSIGHTS', 'OPPORTUNITIES'],
  imagePosition = 'right',
}: AppShowcaseProps) {
  return (
    <section className={styles.section}>
      <div
        className={`${styles.container} ${
          imagePosition === 'left' ? styles.imageLeft : ''
        }`}
      >
        <div className={styles.content}>
          <p className={styles.eyebrow}>
            {eyebrow}
          </p>

          <h2 className={styles.title}>
            {title}
            <br />
            <span>{highlightedText}</span>
          </h2>

          <p className={styles.description}>
            {description}
          </p>

          <div className={styles.features}>
            {features.map((feature) => (
              <div
                key={feature.title}
                className={styles.feature}
              >
                <div className={styles.icon}>
                  {feature.icon}
                </div>

                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href={ctaHref}
            className={styles.cta}
          >
            {ctaLabel}
            <span>→</span>
          </Link>

          {footerItems.length > 0 && (
            <div className={styles.categories}>
              {footerItems.map((item, index) => (
                <span key={item}>
                  {item}

                  {index < footerItems.length - 1 && (
                    <span className={styles.separator}>
                      /
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.visual}>
          <div className={styles.glow} />

          <Image
            src={imageSrc}
            alt={imageAlt}
            width={520}
            height={960}
            className={styles.phone}
          />
        </div>
      </div>
    </section>
  );
}