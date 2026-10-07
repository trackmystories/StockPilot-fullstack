import styles from '../about.module.css';

export function MissionSection() {
  return (
    <section
      id="mission"
      className={styles.mission}
    >
      <div className={styles.container}>
        <div className={styles.missionGrid}>
          <div>
            <p className={styles.eyebrow}>
              OUR MISSION
            </p>

            <h2 className={styles.sectionTitle}>
              Empower better
              <br />
              <span>investment decisions.</span>
            </h2>
          </div>

          <div className={styles.missionCopy}>
            <p>
              We believe better investment decisions start with better
              information.
            </p>

            <p>
              StockPilot brings together financial data, investor signals,
              company fundamentals and research into one clear experience.
            </p>

            <p>
              Our goal is simple: turn complex market information into
              practical insights that help investors understand a company
              before making a decision.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}