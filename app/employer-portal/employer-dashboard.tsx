import { archivo } from '../lga-room/shared';
import styles from './employer-portal.module.css';

type DashboardInsight = {
  formId: string;
  formTitle: string;
  count: number;
  message: string;
};

type EmployerDashboardProps = {
  employerName: string;
  contactName: string;
  totalSubmissions: number;
  insights: DashboardInsight[];
  onOpenForm: (formId: string) => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function EmployerDashboard({
  employerName,
  contactName,
  totalSubmissions,
  insights,
  onOpenForm,
}: EmployerDashboardProps) {
  return (
    <section className={styles.employerDashboard}>
      <div className={styles.dashboardIntro}>
        <span className={styles.kicker}>Your employer account</span>
        <h2 className={archivo.className}>{employerName}</h2>
        <p>
          Signed in as {contactName}.
          {totalSubmissions > 0
            ? ` You have submitted ${totalSubmissions} request${totalSubmissions === 1 ? '' : 's'} through the portal.`
            : ' Explore services to connect with NCST students and graduates.'}
        </p>
      </div>

      {insights.length > 0 ? (
        <div className={styles.dashboardInsights}>
          {insights.map(insight => (
            <article className={styles.dashboardInsightCard} key={insight.formId}>
              <span className={styles.dashboardInsightCount}>{insight.count}</span>
              <div>
                <strong>{insight.formTitle}</strong>
                <p>{insight.message}</p>
                <button type="button" onClick={() => onOpenForm(insight.formId)}>Open this service</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.dashboardEmpty}>
          <p>Ready to get started? Choose a service from the sidebar or request applicants below.</p>
          <button type="button" onClick={() => onOpenForm('request-applicants')}>Request applicants</button>
        </div>
      )}
    </section>
  );
}

export function EmployerRecentActivity({
  items,
}: {
  items: Array<{ id: string; formTitle: string; submittedAt: string }>;
}) {
  if (!items.length) return null;

  return (
    <section className={styles.recentActivityPanel}>
      <span className={styles.kicker}>Recent activity</span>
      <h3 className={archivo.className}>Your submissions</h3>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            <strong>{item.formTitle}</strong>
            <span>{formatDate(item.submittedAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
