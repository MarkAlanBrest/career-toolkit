import Link from 'next/link';
import {
  CAREER_SERVICES_TOOLS,
  CAREER_TOOL_CATEGORIES,
} from '@/lib/careerServicesTools';
import styles from './dashboard.module.css';

function ToolCard({ tool }: { tool: typeof CAREER_SERVICES_TOOLS[number] }) {
  const linkLabel = tool.external ? 'Open tool ↗' : 'Open tool →';

  const inner = (
    <>
      <h3 className={styles.cardTitle}>
        {tool.title}
        {tool.external && <span className={styles.externalBadge}> · external</span>}
      </h3>
      <p className={styles.cardDesc}>{tool.description}</p>
      <span className={styles.cardLink}>{linkLabel}</span>
    </>
  );

  if (tool.external) {
    return (
      <a className={styles.card} href={tool.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <Link className={styles.card} href={tool.href}>
      {inner}
    </Link>
  );
}

export default function CareerServicesDashboardPage() {
  const byCategory = CAREER_TOOL_CATEGORIES.map(category => ({
    category,
    tools: CAREER_SERVICES_TOOLS.filter(t => t.category === category),
  }));

  return (
    <main className={styles.dashboard}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <h1>NCST Career Services</h1>
          <p>
            One place to open reporting, employer tools, student career builders, Canvas messaging,
            and room reservations. More tools can be added here as they are built.
          </p>
        </header>

        {byCategory.map(({ category, tools }) => (
          <section key={category} className={styles.section}>
            <h2 className={styles.sectionTitle}>{category}</h2>
            <div className={styles.grid}>
              {tools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
            </div>
          </section>
        ))}

        <p className={styles.footer}>
          New Castle School of Trades · Career Services toolkit
        </p>
      </div>
    </main>
  );
}
