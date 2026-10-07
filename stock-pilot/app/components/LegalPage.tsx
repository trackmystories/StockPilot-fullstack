import type {ReactNode} from 'react';

import styles from './LegalPage.module.css';

type LegalSection = {
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  introduction: ReactNode;
  sections: LegalSection[];
};

export function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  introduction,
  sections,
}: LegalPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            {eyebrow}
          </p>

          <h1 className={styles.title}>
            {title}
          </h1>

          <p className={styles.updated}>
            Last updated: {lastUpdated}
          </p>

          <div className={styles.introduction}>
            {introduction}
          </div>
        </header>

        <div className={styles.sections}>
          {sections.map((section) => (
            <section
              key={section.title}
              className={styles.section}
            >
              <h2>{section.title}</h2>

              <div className={styles.content}>
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}