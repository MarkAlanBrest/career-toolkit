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
          Signed in as {contactName}. The portal recognizes your organization, keeps your forms ready to go,
          and tracks your requests so we can follow up with helpful reminders and invitations.
          {totalSubmissions > 0 && ` You have submitted ${totalSubmissions} request${totalSubmissions === 1 ? '' : 's'} so far.`}
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
          <p>Your submission history will appear here after you send your first request.</p>
          <button type="button" onClick={() => onOpenForm('request-applicants')}>Request applicants</button>
        </div>
      )}
    </section>
  );
}

export function AccountBenefitsPanel({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className={styles.accountBenefitsPanel}>
      <div>
        <span className={styles.kicker}>Your choice</span>
        <h2 className={archivo.className}>Accounts are optional</h2>
        <p>
          Every employer service works without registering. If you would like a faster experience next time,
          you can create a free login when you register — or sign in anytime.
        </p>
      </div>
      <ul>
        <li><strong>Faster forms</strong><small>Your company and contact details are saved and ready to use.</small></li>
        <li><strong>Recognized by NCST</strong><small>The portal knows who you are and keeps your request history.</small></li>
        <li><strong>Stay connected</strong><small>Opens the door for helpful follow-ups, reminders, and invitations.</small></li>
      </ul>
      <button type="button" onClick={onSignIn}>Employer sign in</button>
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
