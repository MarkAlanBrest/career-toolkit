import { Suspense } from 'react';
import DashboardShell from './DashboardShell';
import styles from './dashboard.module.css';

function DashboardLoading() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.layout}>
        <section className={styles.main}>
          <div className={styles.welcome}>
            <h2>Career Services toolkit</h2>
            <p>Loading dashboard…</p>
          </div>
        </section>
        <aside className={`${styles.sidebar} ${styles.sidebarModeText}`} aria-label="Tools menu">
          <div className={styles.sidebarControls}>
            <div className={styles.modeToggleBtn} style={{ pointerEvents: 'none' }}>
              <span className={styles.modeToggleTitle}>Menu</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CareerServicesDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardShell />
    </Suspense>
  );
}
