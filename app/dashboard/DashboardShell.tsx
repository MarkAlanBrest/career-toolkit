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
const RECENT_TOOLS_KEY = 'ncstDashboardRecentTools';

const HOME_TASKS = [
  { id: 'career-reports', eyebrow: 'Accreditation & reporting', action: 'Analyze files and build reports' },
  { id: 'resume-search', eyebrow: 'Employer outreach', action: 'Find qualified student resumes' },
  { id: 'employer-portal', eyebrow: 'Employer relationships', action: 'Manage employer services' },
  { id: 'canvas-broadcast', eyebrow: 'Student communication', action: 'Send a Canvas broadcast' },
  { id: 'lga-room', eyebrow: 'Events & meetings', action: 'Reserve the LG Room' },
  { id: 'resume-builder', eyebrow: 'Student documents', action: 'Build a professional resume' },
] as const;

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
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  const rememberTool = useCallback((id: string) => {
    if (id === HOME_ID || !isCareerToolId(id)) return;
    setRecentToolIds(current => {
      const next = [id, ...current.filter(toolId => toolId !== id)].slice(0, 3);
      localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (isSidebarMode(saved)) {
      setSidebarMode(saved);
    }
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_TOOLS_KEY) || '[]');
      if (Array.isArray(recent)) {
        setRecentToolIds(recent.filter((id): id is string => typeof id === 'string' && isCareerToolId(id)).slice(0, 3));
      }
    } catch {
      setRecentToolIds([]);
    }
  }, []);

  useEffect(() => {
    const tool = searchParams.get('tool');
    if (tool && isCareerToolId(tool)) {
      setActiveId(tool);
      rememberTool(tool);
    } else if (!tool) {
      setActiveId(HOME_ID);
    }
  }, [searchParams, rememberTool]);

  const activeTool = useMemo(
    () => CAREER_SERVICES_TOOLS.find(t => t.id === activeId),
    [activeId]
  );

  const selectTool = useCallback((id: string) => {
    setActiveId(id);
    rememberTool(id);
    const url = id === HOME_ID ? '/dashboard' : `/dashboard?tool=${id}`;
    window.history.replaceState(null, '', url);
  }, [rememberTool]);

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
  const homeTasks = HOME_TASKS.flatMap(task => {
    const tool = CAREER_SERVICES_TOOLS.find(item => item.id === task.id);
    return tool ? [{ ...task, tool }] : [];
  });
  const recentTools = recentToolIds.flatMap(id => {
    const tool = CAREER_SERVICES_TOOLS.find(item => item.id === id);
    return tool ? [tool] : [];
  });

  return (
    <div className={styles.dashboard}>
      <div className={styles.layout}>
        <section className={styles.main} aria-label="Tool workspace">
          <div className={styles.content}>
            {activeId === HOME_ID ? (
              <div className={styles.homePage}>
                <header className={styles.homeHero}>
                  <div className={styles.heroCopy}>
                    <span className={styles.heroEyebrow}>NCST Career Services</span>
                    <h1>Everything you need to move students forward.</h1>
                    <p>
                      Build reports, connect employers with talent, communicate with students,
                      and coordinate events from one focused workspace.
                    </p>
                    <div className={styles.heroActions}>
                      <button type="button" onClick={() => selectTool('career-reports')}>Open Reporting Hub</button>
                      <button type="button" className={styles.heroSecondary} onClick={() => selectTool('employer-portal')}>Employer Portal</button>
                    </div>
                  </div>
                  <aside className={styles.heroAccreditation}>
                    <span className={styles.heroAccreditationIcon} aria-hidden="true">A</span>
                    <div>
                      <strong>ACCSC rules built in</strong>
                      <p>The Reporting Hub checks uploaded records against the current accreditation rule set and keeps those rules attached to generated work.</p>
                      <button type="button" onClick={() => selectTool('career-reports')}>Analyze a file <span aria-hidden="true">→</span></button>
                    </div>
                  </aside>
                </header>

                <section className={styles.homeSection}>
                  <div className={styles.homeSectionHeading}>
                    <div><span>Start here</span><h2>What would you like to do?</h2></div>
                    <p>Choose a task and the right tool will open in this workspace.</p>
                  </div>
                  <div className={styles.taskGrid}>
                    {homeTasks.map(({ tool, eyebrow, action }) => (
                      <button type="button" className={styles.taskCard} key={tool.id} onClick={() => selectTool(tool.id)}>
                        <span className={styles.taskIcon} aria-hidden="true">{tool.icon}</span>
                        <span className={styles.taskText}>
                          <small>{eyebrow}</small>
                          <strong>{action}</strong>
                          <span>{tool.description}</span>
                        </span>
                        <span className={styles.taskArrow} aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                </section>

                <div className={styles.homeLower}>
                  <section className={styles.recentPanel}>
                    <div className={styles.homeSectionHeading}>
                      <div><span>Your workspace</span><h2>Continue working</h2></div>
                    </div>
                    {recentTools.length ? (
                      <div className={styles.recentList}>
                        {recentTools.map(tool => (
                          <button type="button" key={tool.id} onClick={() => selectTool(tool.id)}>
                            <span aria-hidden="true">{tool.icon}</span>
                            <span><strong>{tool.title}</strong><small>{tool.category}</small></span>
                            <span aria-hidden="true">→</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.recentEmpty}>Tools you open will appear here for quick access.</p>
                    )}
                  </section>

                  <aside className={styles.menuTip}>
                    <span>Workspace tip</span>
                    <h2>Make the toolbar fit your day.</h2>
                    <p>Use the gold control above the toolbar to switch between full labels, compact icons, or a hidden edge tab.</p>
                  </aside>
                </div>
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
