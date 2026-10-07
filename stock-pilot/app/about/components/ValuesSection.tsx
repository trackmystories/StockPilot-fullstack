import styles from '../about.module.css';

const values = [
  {
    icon: '◎',
    title: 'Clarity',
    description:
      'We simplify complex financial information so investors can focus on what matters.',
  },
  {
    icon: '◫',
    title: 'Insight',
    description:
      'We connect financial data and investor signals to provide useful context, not just numbers.',
  },
  {
    icon: '↗',
    title: 'Progress',
    description:
      'We keep improving the way investors discover, analyse and understand opportunities.',
  },
];

export function ValuesSection() {
  return (
    <section className={styles.values}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>
          WHAT DRIVES US
        </p>

        <h2 className={styles.sectionTitle}>
          Built around
          <br />
          <span>better decisions.</span>
        </h2>

        <div className={styles.valueGrid}>
          {values.map((value) => (
            <article
              key={value.title}
              className={styles.valueCard}
            >
              <div className={styles.valueIcon}>
                {value.icon}
              </div>

              <h3>{value.title}</h3>

              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}