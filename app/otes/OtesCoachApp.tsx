'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCategoryGuidance } from '@/lib/otes/categoryGuidance';
import { fetchCloudWorkspace, isRemoteNewer, saveCloudWorkspace, type SyncStatus } from '@/lib/otes/cloudSync';
import { buildCategoryReportHtml, buildFullReportHtml, downloadWordReport } from '@/lib/otes/reports';
import { OTES_RUBRIC, ORGANIZATIONAL_AREAS, getDomainAccomplishedComponents } from '@/lib/otes/rubric';
import { countTasksWithNotes, createTask, getCategoryTasks } from '@/lib/otes/tasks';
import { WOODS_TECH_EVALUATOR_HANDOUTS } from '@/lib/otes/starterPacks/woodsTechnology';
import { applyStarterPack } from '@/lib/otes/starterPacks';
import { createDefaultWorkspace, downloadWorkspaceBackup, importWorkspaceFromJson, loadWorkspace, newId, saveWorkspace } from '@/lib/otes/storage';
import type {
  EvalLessonPlan,
  OtesWorkspace,
  TeacherProfile,
} from '@/lib/otes/types';
import styles from './otes.module.css';

type View = 'home' | 'eval' | 'rubric';

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function scrollToCategory(categoryId: string) {
  requestAnimationFrame(() => {
    document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function syncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case 'loading': return 'Loading…';
    case 'syncing': return 'Saving…';
    case 'synced': return 'Saved';
    case 'offline': return 'Offline — saved on this device';
    case 'disabled': return 'Saved on this device';
  }
}

export default function OtesCoachApp() {
  const [workspace, setWorkspace] = useState<OtesWorkspace | null>(null);
  const [view, setView] = useState<View>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newTaskLabels, setNewTaskLabels] = useState<Record<string, string>>({});

  const [evalTopic, setEvalTopic] = useState('');
  const [evalCategoryId, setEvalCategoryId] = useState('');
  const [generatedEvalPlan, setGeneratedEvalPlan] = useState<Partial<EvalLessonPlan> | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const importInputRef = useRef<HTMLInputElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudEnabledRef = useRef(false);

  const queueCloudSave = useCallback((workspaceToSave: OtesWorkspace) => {
    if (!cloudEnabledRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    setSyncStatus('syncing');
    syncTimeoutRef.current = setTimeout(() => {
      void saveCloudWorkspace(workspaceToSave)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('offline'));
    }, 1500);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initWorkspace() {
      const local = loadWorkspace();
      try {
        const { enabled, workspace: remote } = await fetchCloudWorkspace();
        if (cancelled) return;

        cloudEnabledRef.current = enabled;
        if (!enabled) {
          setWorkspace(local);
          setSyncStatus('disabled');
          return;
        }

        let resolved = local;
        if (remote && isRemoteNewer(local, remote)) {
          resolved = importWorkspaceFromJson(JSON.stringify(remote));
        } else {
          try {
            await saveCloudWorkspace(local);
          } catch {
            setSyncStatus('offline');
            setWorkspace(local);
            return;
          }
        }

        setWorkspace(resolved);
        setSyncStatus('synced');
      } catch {
        if (!cancelled) {
          setWorkspace(local);
          setSyncStatus('offline');
        }
      }
    }

    void initWorkspace();
    return () => {
      cancelled = true;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  const persist = useCallback((updater: (prev: OtesWorkspace) => OtesWorkspace) => {
    setWorkspace(prev => {
      if (!prev) return prev;
      const next = saveWorkspace(updater(prev))!;
      queueCloudSave(next);
      return next;
    });
  }, [queueCloudSave]);

  if (!workspace) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p>Loading your OTES workspace…</p>
        </main>
      </div>
    );
  }

  const updateProfile = (patch: Partial<TeacherProfile>) => {
    persist(prev => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  };

  const updateTask = (taskId: string, patch: Partial<{ label: string; notes: string }>) => {
    const now = new Date().toISOString();
    persist(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, ...patch, updatedAt: now } : task,
      ),
    }));
  };

  const deleteTask = (taskId: string) => {
    persist(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
    }));
  };

  const addTask = (categoryId: string) => {
    const label = newTaskLabels[categoryId]?.trim();
    if (!label) return;
    persist(prev => ({
      ...prev,
      tasks: [...prev.tasks, createTask(categoryId, label)],
    }));
    setNewTaskLabels(prev => ({ ...prev, [categoryId]: '' }));
  };

  const goToCategory = (categoryId: string) => {
    setView('home');
    scrollToCategory(categoryId);
  };

  const generateEvalLesson = async () => {
    if (!evalTopic.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/otes/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: evalTopic,
          subject: workspace.profile.subject,
          gradeLevel: workspace.profile.gradeLevel,
          targetDomainIds: evalCategoryId ? [evalCategoryId] : [],
          teacherName: workspace.profile.name,
        }),
      });
      const plan = await res.json();
      const saved: EvalLessonPlan = {
        id: newId('eval'),
        topic: evalTopic,
        title: plan.title || evalTopic,
        subject: plan.subject || workspace.profile.subject,
        gradeLevel: plan.gradeLevel || workspace.profile.gradeLevel,
        duration: plan.duration || '45 minutes',
        categoryId: evalCategoryId || OTES_RUBRIC[0].id,
        objective: plan.objective || '',
        standards: plan.standards || '',
        hook: plan.hook || '',
        instruction: plan.instruction || [],
        differentiation: plan.differentiation || [],
        assessment: plan.assessment || [],
        closure: plan.closure || '',
        otesEvidence: plan.otesEvidence || [],
        createdAt: new Date().toISOString(),
      };
      persist(prev => ({ ...prev, evalLessonPlans: [saved, ...prev.evalLessonPlans] }));
      setGeneratedEvalPlan(saved);
    } finally {
      setBusy(false);
    }
  };

  const loadWoodsTechStarterPack = () => {
    if (!confirm('Load sample task notes and observation lesson plans? Your current data will be kept.')) return;
    persist(prev => applyStarterPack(prev, 'woods_technology'));
    setShowSettings(false);
  };

  const exportBackup = () => {
    downloadWorkspaceBackup(workspace);
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      if (!confirm('Replace this browser\'s data with the backup file?')) return;
      const imported = importWorkspaceFromJson(text);
      setWorkspace(imported);
      queueCloudSave(imported);
      setShowSettings(false);
    } catch {
      alert('Could not read that file. Choose an otes-workspace.json backup.');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const syncNow = async () => {
    if (!cloudEnabledRef.current) return;
    setSyncStatus('syncing');
    try {
      const { workspace: remote } = await fetchCloudWorkspace();
      if (remote && workspace && isRemoteNewer(workspace, remote)) {
        if (confirm('A newer copy was found online. Replace this device\'s data?')) {
          const imported = importWorkspaceFromJson(JSON.stringify(remote));
          setWorkspace(imported);
        }
      } else if (workspace) {
        await saveCloudWorkspace(workspace);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
      alert('Could not sync right now. Your data is still saved on this device.');
    }
  };

  const downloadEvaluatorHandout = (key: 'wt1Rafter' | 'wt24Joinery') => {
    const handout = WOODS_TECH_EVALUATOR_HANDOUTS[key];
    const text = [
      `# Evaluator Handout: ${handout.title}`,
      '',
      '## Pre-Conference Talking Points',
      ...handout.preConference.map(item => `- ${item}`),
      '',
      '## Evidence Checklist',
      ...handout.evidenceChecklist.map(item => `- [ ] ${item}`),
      '',
      '## Notes',
      '',
    ].join('\n');
    const blob = new Blob([text], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluator-handout-${key.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEvalPlan = (plan: EvalLessonPlan | Partial<EvalLessonPlan>) => {
    const text = [
      `# Evaluation Lesson Plan: ${plan.title}`,
      `Topic: ${plan.topic || plan.title}`,
      `Subject: ${plan.subject} | Grade: ${plan.gradeLevel}`,
      '',
      `## Objective\n${plan.objective}`,
      `## Standards\n${plan.standards}`,
      `## Opening\n${plan.hook}`,
      `## Instruction\n${(plan.instruction || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      `## Differentiation\n${(plan.differentiation || []).map(s => `- ${s}`).join('\n')}`,
      `## Assessment\n${(plan.assessment || []).map(s => `- ${s}`).join('\n')}`,
      `## Closure\n${plan.closure}`,
      `## OTES Evidence\n${(plan.otesEvidence || []).map(s => `- ${s}`).join('\n')}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eval-lesson-${(plan.title || 'plan').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>OTES Action Log</h1>
          <p>Log your practice · Export your report</p>
          <p className={styles.syncStatus}>{syncStatusLabel(syncStatus)}</p>
        </div>
        <div className={styles.headerActions}>
          {view !== 'home' && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setView('home')}>
              Action Log
            </button>
          )}
          {view !== 'rubric' && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setView('rubric')}>
              Rubric
            </button>
          )}
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setView('eval')}>
            Eval Lesson Plan
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => downloadWordReport(buildFullReportHtml(workspace), 'otes-full-growth-report')}>
            Full Report
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {view === 'home' && (
          <div className={styles.logPage}>
            <div className={styles.logIntro}>
              <p>{countTasksWithNotes(workspace)} strategies with notes across all categories.</p>
            </div>

            {OTES_RUBRIC.map(domain => {
              const guidance = getCategoryGuidance(domain.id);
              const tasks = getCategoryTasks(workspace, domain.id);
              return (
                <section key={domain.id} id={`category-${domain.id}`} className={styles.categorySection}>
                  <div className={styles.categoryPageHeader}>
                    <div>
                      <h2>{domain.name}</h2>
                      <p>{ORGANIZATIONAL_AREAS[domain.area]}</p>
                    </div>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => downloadWordReport(
                        buildCategoryReportHtml(workspace, domain.id),
                        `otes-${domain.id}-report`,
                      )}
                    >
                      Print report
                    </button>
                  </div>

                  <section className={styles.card}>
                    <h3>What Accomplished looks like</h3>
                    <p className={styles.accomplishedText}>{guidance.accomplishedSummary}</p>
                  </section>

                  <section className={styles.taskSection}>
                    <div className={styles.taskSectionHeader}>
                      <h3>Strategies &amp; tasks</h3>
                      <p className={styles.cardIntro}>Each card is a strategy toward Accomplished — edit the title, track your notes, add your own, or delete what you do not need.</p>
                    </div>

                    <div className={styles.taskGrid}>
                      {tasks.map(task => (
                        <article key={task.id} className={styles.taskSticky}>
                          <div className={styles.taskStickyHeader}>
                            <textarea
                              className={styles.taskLabelInput}
                              value={task.label}
                              rows={1}
                              onChange={e => {
                                updateTask(task.id, { label: e.target.value });
                                resizeTextarea(e.target);
                              }}
                              ref={resizeTextarea}
                              aria-label="Task title"
                            />
                            <button
                              type="button"
                              className={styles.taskDelete}
                              onClick={() => deleteTask(task.id)}
                              aria-label={`Delete ${task.label}`}
                            >
                              Delete
                            </button>
                          </div>
                          <textarea
                            className={styles.taskNotes}
                            value={task.notes}
                            onChange={e => updateTask(task.id, { notes: e.target.value })}
                            placeholder="Your notes…"
                          />
                        </article>
                      ))}
                    </div>

                    <div className={styles.addTaskRow}>
                      <input
                        className={styles.input}
                        value={newTaskLabels[domain.id] ?? ''}
                        onChange={e => setNewTaskLabels(prev => ({ ...prev, [domain.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addTask(domain.id)}
                        placeholder="New strategy to track…"
                      />
                      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => addTask(domain.id)}>
                        Add strategy
                      </button>
                    </div>
                  </section>
                </section>
              );
            })}
          </div>
        )}

        {view === 'rubric' && (
          <div className={styles.categoryPage}>
            <div className={styles.categoryPageHeader}>
              <div>
                <h2>OTES 2.0 Rubric</h2>
                <p>Accomplished-level descriptors for every rubric category.</p>
              </div>
            </div>

            {(['instructional_planning', 'instruction_and_assessment', 'professionalism'] as const).map(area => {
              const domains = OTES_RUBRIC.filter(d => d.area === area);
              if (!domains.length) return null;
              return (
                <section key={area} className={styles.rubricAreaSection}>
                  <h3 className={styles.rubricAreaTitle}>{ORGANIZATIONAL_AREAS[area]}</h3>
                  {domains.map(domain => (
                    <article key={domain.id} className={styles.card} id={`rubric-${domain.id}`}>
                      <div className={styles.rubricDomainHeader}>
                        <h3>{domain.name}</h3>
                        <span className={styles.rubricDomainMeta}>
                          Standards: {domain.standards.join(', ')}
                        </span>
                      </div>
                      <div className={styles.rubricGoalList}>
                        {getDomainAccomplishedComponents(domain.id).map(component => (
                          <article key={component.id} className={styles.rubricGoalBlock}>
                            <h4 className={styles.rubricGoalTitle}>{component.name}</h4>
                            <p className={styles.rubricGoalText}>{component.accomplished}</p>
                            {component.elements.length > 0 && (
                              <p className={styles.rubricGoalMeta}>Rubric elements: {component.elements.join(', ')}</p>
                            )}
                          </article>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        style={{ marginTop: 12 }}
                        onClick={() => goToCategory(domain.id)}
                      >
                        Go to {domain.name} →
                      </button>
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        )}

        {view === 'eval' && (
          <div className={styles.categoryPage}>
            <div className={styles.categoryPageHeader}>
              <div>
                <h2>Evaluation Lesson Plan</h2>
                <p>For your 3 formal observations — generate when admin needs a lesson plan.</p>
              </div>
            </div>

            <section className={styles.card}>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Lesson topic</label>
                  <input className={styles.input} value={evalTopic} onChange={e => setEvalTopic(e.target.value)} placeholder="e.g. Analyzing primary sources" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Showcase this rubric category (optional)</label>
                  <select className={styles.select} value={evalCategoryId} onChange={e => setEvalCategoryId(e.target.value)}>
                    <option value="">Any category</option>
                    {OTES_RUBRIC.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={generateEvalLesson} disabled={busy}>
                {busy ? 'Generating…' : 'Create Lesson Plan'}
              </button>
            </section>

            {generatedEvalPlan && (
              <section className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{generatedEvalPlan.title}</h3>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => downloadEvalPlan(generatedEvalPlan)}>Download Word</button>
                </div>
                <p><strong>Objective:</strong> {generatedEvalPlan.objective}</p>
                <p><strong>Standards:</strong> {generatedEvalPlan.standards}</p>
              </section>
            )}

            {workspace.evalLessonPlans.length > 0 && (
              <section className={styles.card}>
                <h3>Previous eval lesson plans</h3>
                {workspace.evalLessonPlans.map(plan => (
                  <div key={plan.id} className={styles.actionItem}>
                    <strong>{plan.title}</strong>
                    <div className={styles.actionDate}>{formatDate(plan.createdAt)}</div>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} style={{ marginTop: 6 }} onClick={() => downloadEvalPlan(plan)}>Download</button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </main>

      {showSettings && (
        <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            {(['name', 'school', 'district', 'subject', 'gradeLevel', 'evaluationYear'] as const).map(field => (
              <div key={field} className={styles.field}>
                <label className={styles.label}>{field === 'gradeLevel' ? 'Grade level' : field === 'evaluationYear' ? 'Evaluation year' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  className={styles.input}
                  value={workspace.profile[field]}
                  onChange={e => updateProfile({ [field]: e.target.value })}
                />
              </div>
            ))}
            <div className={styles.field}>
              <label className={styles.label}>Cloud sync</label>
              <p className={styles.cardIntro} style={{ marginTop: 0 }}>
                {syncStatus === 'disabled'
                  ? 'Cloud sync is not enabled on this deployment yet. Use export/import below for a manual backup.'
                  : 'Your strategies and notes save automatically to a file on Vercel. Open the app on any device to pick up where you left off.'}
              </p>
              {syncStatus !== 'disabled' && (
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void syncNow()}>
                  Sync now
                </button>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Backup &amp; restore</label>
              <p className={styles.cardIntro} style={{ marginTop: 0 }}>
                Download or upload a backup file if you need a manual copy.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={exportBackup}>
                  Export backup
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => importInputRef.current?.click()}
                >
                  Import backup
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void importBackup(file);
                  }}
                />
              </div>
            </div>
            <div className={styles.field}>
              <p className={styles.cardIntro} style={{ marginTop: 0 }}>
                Load sample strategy notes and observation lesson plans for woods technology classes.
              </p>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadWoodsTechStarterPack}>
                Load sample strategies &amp; lesson plans
              </button>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Evaluator handouts</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => downloadEvaluatorHandout('wt1Rafter')}>
                  WT1 Rafter handout
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => downloadEvaluatorHandout('wt24Joinery')}>
                  WT2–4 Joinery handout
                </button>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { if (confirm('Reset all data?')) { const reset = saveWorkspace(createDefaultWorkspace())!; setWorkspace(reset); queueCloudSave(reset); setShowSettings(false); } }}>
                Reset
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
