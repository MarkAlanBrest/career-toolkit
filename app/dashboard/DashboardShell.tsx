'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CAREER_SERVICES_TOOLS,
  CAREER_TOOL_CATEGORIES,
} from '@/lib/careerServicesTools';
import styles from './dashboard.module.css';

const HOME_ID = 'home';

export default function DashboardShell() {
  const [activeId, setActiveId] = useState<string>(HOME_ID);

  const activeTool = useMemo(
    () => CAREER_SERVICES_TOOLS.find(t => t.id === activeId),
    [activeId]
  );

  const selectTool = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const iframeSrc = activeTool?.href ?? '';

  return (
    <div className={styles.dashboard}>
      <div className={styles.layout}>
        <section className={styles.main} aria-label="Tool workspace">
          <header className={styles.mainHeader}>
            <div>
              <h1>{activeId === HOME_ID ? 'NCST Career Services' : activeTool?.title ?? 'Tool'}</h1>
              <p>
                {activeId === HOME_ID
                  ? 'Select a tool from the menu on the right.'
                  : activeTool?.description}
              </p>
            </div>
            {activeTool && activeId !== HOME_ID && (
              <div className={styles.headerActions}>
                {activeTool.external && (
                  <a
                    className={styles.headerBtn}
                    href={activeTool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in new tab ↗
                  </a>
                )}
                <button type="button" className={styles.headerBtn} onClick={() => selectTool(HOME_ID)}>
                  Home
                </button>
              </div>
            )}
          </header>

          <div className={styles.content}>
            {activeId === HOME_ID ? (
              <div className={styles.welcome}>
                <h2>Career Services toolkit</h2>
                <p>
                  One workspace for reporting, employer outreach, student career documents,
                  Canvas messaging, and room reservations.
                </p>
                <p className={styles.welcomeHint}>
                  Pick a tool from the right-hand menu. Internal NCST apps load here. External tools
                  (resume builder) may open in a new tab if they cannot embed.
                </p>
              </div>
            ) : (
              <iframe
                className={styles.frame}
                src={iframeSrc}
                title={activeTool?.title ?? 'Career Services tool'}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
              />
            )}
          </div>
        </section>

        <aside className={styles.sidebar} aria-label="Tools menu">
          <div className={styles.sidebarBrand}>
            <strong>NCST</strong>
            <span>Career Services</span>
          </div>

          <nav className={styles.nav}>
            <button
              type="button"
              className={`${styles.navItem} ${activeId === HOME_ID ? styles.navItemActive : ''}`}
              onClick={() => selectTool(HOME_ID)}
            >
              Home
            </button>

            {CAREER_TOOL_CATEGORIES.map(category => {
              const tools = CAREER_SERVICES_TOOLS.filter(t => t.category === category);
              if (!tools.length) return null;
              return (
                <div key={category} className={styles.navGroup}>
                  <div className={styles.navGroupLabel}>{category}</div>
                  {tools.map(tool => (
                    <button
                      key={tool.id}
                      type="button"
                      className={`${styles.navItem} ${activeId === tool.id ? styles.navItemActive : ''} ${tool.external ? styles.navItemExternal : ''}`}
                      onClick={() => selectTool(tool.id)}
                    >
                      {tool.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>New Castle School of Trades</div>
        </aside>
      </div>
    </div>
  );
}
