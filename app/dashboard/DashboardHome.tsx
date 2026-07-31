'use client';

import {
  CAREER_SERVICES_TOOLS,
  CAREER_TOOL_CATEGORIES,
  type CareerTool,
} from '@/lib/careerServicesTools';
import styles from './dashboard.module.css';

type DashboardHomeProps = {
  onSelectTool: (id: string) => void;
};

const VALUE_PROPS = [
  {
    title: 'One workspace',
    body: 'Reports, employer outreach, student tools, and room booking — all reachable from a single sidebar.',
    icon: '◈',
  },
  {
    title: 'Built for your workflow',
    body: 'Open any tool in the main panel or full page. Collapse the menu to icons when you need more room.',
    icon: '⚡',
  },
  {
    title: 'Extend as you go',
    body: 'New tools plug into the same shell. If you can describe the job, you can ship a tool for it.',
    icon: '✦',
  },
];

function ToolCard({
  tool,
  onSelect,
}: {
  tool: CareerTool;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={styles.toolCard}
      onClick={() => onSelect(tool.id)}
    >
      <span className={styles.toolCardIcon} aria-hidden="true">
        {tool.icon}
      </span>
      <div className={styles.toolCardBody}>
        <strong>{tool.title}</strong>
        <p>{tool.description}</p>
      </div>
      <span className={styles.toolCardArrow} aria-hidden="true">
        →
      </span>
    </button>
  );
}

export default function DashboardHome({ onSelectTool }: DashboardHomeProps) {
  const featuredTool = CAREER_SERVICES_TOOLS[0];

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
          <div className={styles.heroActions}>
            {featuredTool && (
              <button
                type="button"
                className={styles.heroPrimaryBtn}
                onClick={() => onSelectTool(featuredTool.id)}
              >
                Open {featuredTool.title}
              </button>
            )}
            <a className={styles.heroSecondaryBtn} href="#tools">
              Browse all tools
            </a>
          </div>
        </div>

        <aside className={styles.heroPanel}>
          <span className={styles.heroPanelLabel}>Your toolkit</span>
          <ul className={styles.heroPanelList}>
            {VALUE_PROPS.map(item => (
              <li key={item.title}>
                <span className={styles.heroPanelIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </header>

      <section className={styles.homeSection} id="tools">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionKicker}>Everything in one place</span>
          <h2>Pick a tool and get to work</h2>
          <p>
            Each tool opens right here in the workspace. Use the sidebar to switch anytime,
            or open a tool in its own tab when you need the full screen.
          </p>
        </div>

        {CAREER_TOOL_CATEGORIES.map(category => {
          const tools = CAREER_SERVICES_TOOLS.filter(t => t.category === category);
          if (!tools.length) return null;

          return (
            <div key={category} className={styles.toolCategory}>
              <h3 className={styles.toolCategoryLabel}>{category}</h3>
              <div className={styles.toolGrid}>
                {tools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} onSelect={onSelectTool} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className={styles.homeCta}>
        <div className={styles.ctaInner}>
          <div>
            <span className={styles.sectionKicker}>Build what you need</span>
            <h2>Need a new tool? Add it to the toolkit.</h2>
            <p>
              This workspace is designed to grow with your team. Describe the workflow,
              wire up a page, and it slots into the same menu as everything else.
            </p>
          </div>
          <button
            type="button"
            className={styles.ctaButton}
            onClick={() => onSelectTool('career-reports')}
          >
            Start with Reporting hub
          </button>
        </div>
      </section>
    </div>
  );
}
