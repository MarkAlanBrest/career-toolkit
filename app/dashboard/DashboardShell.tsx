'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CAREER_SERVICES_TOOLS,
  CAREER_TOOL_CATEGORIES,
  HOME_TOOL_ICON,
} from '@/lib/careerServicesTools';
import styles from './dashboard.module.css';

const HOME_ID = 'home';
const SIDEBAR_MODE_KEY = 'ncstDashboardSidebarMode';

type SidebarMode = 'text' | 'icons' | 'hidden';

function isSidebarMode(value: string | null): value is SidebarMode {
  return value === 'text' || value === 'icons' || value === 'hidden';
}

export default function DashboardShell() {
  const [activeId, setActiveId] = useState<string>(HOME_ID);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('text');

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (isSidebarMode(saved)) {
      setSidebarMode(saved);
    }
  }, []);

  const activeTool = useMemo(
    () => CAREER_SERVICES_TOOLS.find(t => t.id === activeId),
    [activeId]
  );

  const selectTool = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const changeSidebarMode = useCallback((mode: SidebarMode) => {
    setSidebarMode(mode);
    localStorage.setItem(SIDEBAR_MODE_KEY, mode);
  }, []);

  const iframeSrc = activeTool?.href ?? '';
  const iconsOnly = sidebarMode === 'icons';
  const sidebarHidden = sidebarMode === 'hidden';

  return (
    <div className={styles.dashboard}>
      <div className={styles.layout}>
        <section className={styles.main} aria-label="Tool workspace">
          <div className={styles.content}>
            {activeId === HOME_ID ? (
              <div className={styles.welcome}>
                <h2>Career Services toolkit</h2>
                <p>
                  One workspace for reporting, employer outreach, student career documents,
                  Canvas messaging, and room reservations.
                </p>
                <p className={styles.welcomeHint}>
                  Pick a tool from the right-hand menu. Use the menu controls at the bottom of
                  the sidebar to switch between text labels, icons, or hide the menu for full-screen
                  tools.
                </p>
              </div>
            ) : (
              <iframe
                className={styles.frame}
                src={iframeSrc}
                title={activeTool?.title ?? 'Career Services tool'}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
              />
            )}
          </div>
        </section>

        {sidebarHidden && (
          <button
            type="button"
            className={styles.sidebarReveal}
            onClick={() => changeSidebarMode('text')}
            aria-label="Show tools menu"
            title="Show tools menu"
          >
            ☰
          </button>
        )}

        <aside
          className={`${styles.sidebar} ${styles[`sidebarMode${sidebarMode.charAt(0).toUpperCase()}${sidebarMode.slice(1)}`]}`}
          aria-label="Tools menu"
          aria-hidden={sidebarHidden}
        >
          <div className={styles.sidebarBrand}>
            {iconsOnly ? (
              <span className={styles.sidebarBrandIcon} aria-hidden="true">N</span>
            ) : (
              <>
                <strong>NCST</strong>
                <span>Career Services</span>
              </>
            )}
          </div>

          <nav className={styles.nav}>
            <button
              type="button"
              className={`${styles.navItem} ${activeId === HOME_ID ? styles.navItemActive : ''} ${iconsOnly ? styles.navItemIcon : ''}`}
              onClick={() => selectTool(HOME_ID)}
              title={iconsOnly ? 'Home' : undefined}
            >
              {iconsOnly ? (
                <span className={styles.navIcon} aria-hidden="true">{HOME_TOOL_ICON}</span>
              ) : (
                'Home'
              )}
            </button>

            {CAREER_TOOL_CATEGORIES.map(category => {
              const tools = CAREER_SERVICES_TOOLS.filter(t => t.category === category);
              if (!tools.length) return null;
              return (
                <div key={category} className={styles.navGroup}>
                  {!iconsOnly && (
                    <div className={styles.navGroupLabel}>{category}</div>
                  )}
                  {tools.map(tool => (
                    <button
                      key={tool.id}
                      type="button"
                      className={`${styles.navItem} ${activeId === tool.id ? styles.navItemActive : ''} ${tool.external ? styles.navItemExternal : ''} ${iconsOnly ? styles.navItemIcon : ''}`}
                      onClick={() => selectTool(tool.id)}
                      title={iconsOnly ? tool.title : undefined}
                    >
                      {iconsOnly ? (
                        <span className={styles.navIcon} aria-hidden="true">{tool.icon}</span>
                      ) : (
                        tool.title
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>

          <div className={styles.sidebarControls}>
            <span className={styles.sidebarControlsLabel}>Menu</span>
            <div className={styles.modeButtons}>
              <button
                type="button"
                className={`${styles.modeBtn} ${sidebarMode === 'text' ? styles.modeBtnActive : ''}`}
                onClick={() => changeSidebarMode('text')}
                aria-label="Text menu"
                title="Text labels"
              >
                T
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${sidebarMode === 'icons' ? styles.modeBtnActive : ''}`}
                onClick={() => changeSidebarMode('icons')}
                aria-label="Icon menu"
                title="Icons only"
              >
                ⊞
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${sidebarMode === 'hidden' ? styles.modeBtnActive : ''}`}
                onClick={() => changeSidebarMode('hidden')}
                aria-label="Hide menu"
                title="Hide menu"
              >
                —
              </button>
            </div>
          </div>

          {!iconsOnly && (
            <div className={styles.sidebarFooter}>New Castle School of Trades</div>
          )}
        </aside>
      </div>
    </div>
  );
}
