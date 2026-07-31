'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CAREER_SERVICES_TOOLS,
  CAREER_TOOL_CATEGORIES,
  HOME_TOOL_ICON,
  isCareerToolId,
} from '@/lib/careerServicesTools';
import styles from './dashboard.module.css';

const HOME_ID = 'home';
const SIDEBAR_MODE_KEY = 'ncstDashboardSidebarMode';

type SidebarMode = 'text' | 'icons' | 'hidden';

const SIDEBAR_MODE_CYCLE: SidebarMode[] = ['text', 'icons', 'hidden'];

function isSidebarMode(value: string | null): value is SidebarMode {
  return value === 'text' || value === 'icons' || value === 'hidden';
}

function nextSidebarMode(current: SidebarMode): SidebarMode {
  const index = SIDEBAR_MODE_CYCLE.indexOf(current);
  return SIDEBAR_MODE_CYCLE[(index + 1) % SIDEBAR_MODE_CYCLE.length];
}

function sidebarModeToggleLabel(mode: SidebarMode): string {
  if (mode === 'text') return 'Icons';
  if (mode === 'icons') return 'Tab';
  return 'Menu';
}

function sidebarModeToggleHint(mode: SidebarMode): string {
  const next = nextSidebarMode(mode);
  if (next === 'icons') return 'Switch to icons only';
  if (next === 'hidden') return 'Hide menu (tab on edge)';
  return 'Show full menu with labels';
}

export default function DashboardShell() {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string>(HOME_ID);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('text');

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (isSidebarMode(saved)) {
      setSidebarMode(saved);
    }
  }, []);

  useEffect(() => {
    const tool = searchParams.get('tool');
    if (tool && isCareerToolId(tool)) {
      setActiveId(tool);
    } else if (!tool) {
      setActiveId(HOME_ID);
    }
  }, [searchParams]);

  const activeTool = useMemo(
    () => CAREER_SERVICES_TOOLS.find(t => t.id === activeId),
    [activeId]
  );

  const selectTool = useCallback((id: string) => {
    setActiveId(id);
    const url = id === HOME_ID ? '/dashboard' : `/dashboard?tool=${id}`;
    window.history.replaceState(null, '', url);
  }, []);

  const changeSidebarMode = useCallback((mode: SidebarMode) => {
    setSidebarMode(mode);
    localStorage.setItem(SIDEBAR_MODE_KEY, mode);
  }, []);

  const cycleSidebarMode = useCallback(() => {
    changeSidebarMode(nextSidebarMode(sidebarMode));
  }, [changeSidebarMode, sidebarMode]);

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
                  Use the gold menu button at the top of the right sidebar to cycle:
                  full labels → icons → tab. When hidden, click the gold
                  <strong> ☰ Menu</strong> tab on the right edge to bring it back.
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
            onClick={cycleSidebarMode}
            aria-label={sidebarModeToggleHint('hidden')}
            title={sidebarModeToggleHint('hidden')}
          >
            ☰ Menu
          </button>
        )}

        <aside
          className={`${styles.sidebar} ${styles[`sidebarMode${sidebarMode.charAt(0).toUpperCase()}${sidebarMode.slice(1)}`]}`}
          aria-label="Tools menu"
          aria-hidden={sidebarHidden}
        >
          <div className={styles.sidebarTop}>
            {activeTool && activeId !== HOME_ID && (
              <a
                className={`${styles.openFullPage} ${iconsOnly ? styles.openFullPageIcon : ''}`}
                href={activeTool.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${activeTool.title} in full page`}
              >
                {iconsOnly ? '↗' : 'Open full page ↗'}
              </a>
            )}

            <div className={styles.sidebarControls}>
              <button
                type="button"
                className={styles.modeToggleBtn}
                onClick={cycleSidebarMode}
                aria-label={sidebarModeToggleHint(sidebarMode)}
                title={sidebarModeToggleHint(sidebarMode)}
              >
                {sidebarModeToggleLabel(sidebarMode)}
              </button>
            </div>

            {!sidebarHidden && (
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
                      aria-current={activeId === tool.id ? 'page' : undefined}
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

          {!iconsOnly && (
            <div className={styles.sidebarFooter}>New Castle School of Trades</div>
          )}
        </aside>
      </div>
    </div>
  );
}
