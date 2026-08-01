import styles from './dashboard.module.css';

export default function DashboardHome() {
  return (
    <div className={styles.homePage}>
      <header className={styles.homeHero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>NCST Career Toolkit</span>
          <h1>
            Become more productive.
            <span className={styles.heroAccent}> Design any tool you want.</span>
          </h1>
          <p>
            A flexible workspace for career services teams — build reports, reach employers,
            support students, and launch new tools without starting from scratch.
          </p>
        </div>

      </header>

    </div>
  );
}
