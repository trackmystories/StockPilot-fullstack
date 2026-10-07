import {LatestResearch} from './components/LatestResearch';
import {NewsHero} from './components/NewsHero';
import styles from './news.module.css';


export default function NewsPage() {
  return (
    <main className={styles.page}>
      <NewsHero />
      <LatestResearch />
    </main>
  );
}