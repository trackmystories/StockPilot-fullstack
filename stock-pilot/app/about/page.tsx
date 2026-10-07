import {AboutCta} from './components/AboutCta';
import {AboutHero} from './components/AboutHero';
import {MissionSection} from './components/MissionSection';
import {ValuesSection} from './components/ValuesSection';

import styles from './about.module.css';

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <AboutHero />
      <MissionSection />
      <ValuesSection />
      <AboutCta />
    </main>
  );
}