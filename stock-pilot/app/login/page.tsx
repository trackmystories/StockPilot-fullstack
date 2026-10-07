import {Container} from '@mantine/core';

import styles from './login.module.css';

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <Container size="sm" className={styles.container}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>STOCKPILOT</p>

          <h1 className={styles.title}>
            Hey there!
          </h1>

          <p className={styles.description}>
            We are launching soon.
            <br />
            Stay tuned!
          </p>

          <div className={styles.line} />
        </div>
      </Container>
    </main>
  );
}