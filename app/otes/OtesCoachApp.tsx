'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OTES_RUBRIC, PERFORMANCE_LEVELS, ORGANIZATIONAL_AREAS, getComponentById } from '@/lib/otes/rubric';
import { computeProgress } from '@/lib/otes/progress';
import { generateSuggestions } from '@/lib/otes/suggestions';
import {
  createDefaultWorkspace,
  exportWorkspace,
  importWorkspace,
  loadWorkspace,
  newId,
  saveWorkspace,
} from '@/lib/otes/storage';
import type {
  EvidenceEntry,
  GrowthGoal,
  LessonPlan,
  Observation,
  OtesWorkspace,
  PerformanceLevel,
  TeacherProfile,
} from '@/lib/otes/types';
import styles from './otes.module.css';

type Tab = 'overview' | 'rubric' | 'growth' | 'observations' | 'lessons' | 'evidence' | 'coach';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'rubric', label: 'Rubric' },
  { id: 'growth', label: 'Growth Plan' },
  { id: 'observations', label: 'Observations' },
  { id: 'lessons', label: 'Lesson Builder' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'coach', label: 'AI Coach' },
];

function levelClass(level: PerformanceLevel | null) {
  if (!level) return '';
  return styles[`level${level.charAt(0).toUpperCase()}${level.slice(1)}` as keyof typeof styles] ?? '';
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OtesCoachApp() {
  const [workspace, setWorkspace] = useState<OtesWorkspace>(createDefaultWorkspace);
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(['focus_for_learning']));
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  // Lesson builder form
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonDuration, setLessonDuration] = useState('45 minutes');
  const [lessonStandards, setLessonStandards] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [lessonTargetDomains, setLessonTargetDomains] = useState<string[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<Partial<LessonPlan> | null>(null);

  // Coach
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachComponentId, setCoachComponentId] = useState('');
  const [coachAnswer, setCoachAnswer] = useState('');

  // Growth goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalComponentId, setGoalComponentId] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  // Evidence form
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceComponentId, setEvidenceComponentId] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('');

  // Observation form
  const [obsDate, setObsDate] = useState('');
  const [obsType, setObsType] = useState<Observation['type']>('formal');
  const [obsNotes, setObsNotes] = useState('');
  const [obsFeedback, setObsFeedback] = useState('');

  useEffect(() => {
    setWorkspace(loadWorkspace());
  }, []);

  const persist = useCallback((updater: (prev: OtesWorkspace) => OtesWorkspace) => {
    setWorkspace(prev => {
      const next = saveWorkspace(updater(prev))!;
      return next;
    });
  }, []);

  const progress = useMemo(() => computeProgress(workspace.ratings), [workspace.ratings]);
  const suggestions = useMemo(() => generateSuggestions(workspace), [workspace]);

  const updateProfile = (patch: Partial<TeacherProfile>) => {
    persist(prev => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  };

  const updateRating = (componentId: string, currentLevel: PerformanceLevel) => {
    persist(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.componentId === componentId
          ? { ...r, currentLevel, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  };

  const updateRatingNotes = (componentId: string, notes: string) => {
    persist(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.componentId === componentId ? { ...r, notes } : r
      ),
    }));
  };

  const dismissSuggestion = (id: string) => {
    persist(prev => ({
      ...prev,
      dismissedSuggestions: [...prev.dismissedSuggestions, id],
    }));
  };

  const addGoal = () => {
    if (!goalTitle.trim()) return;
    const goal: GrowthGoal = {
      id: newId('goal'),
      componentId: goalComponentId,
      title: goalTitle.trim(),
      description: goalDescription.trim(),
      actions: [],
      deadline: goalDeadline,
      status: 'not_started',
      createdAt: new Date().toISOString(),
    };
    persist(prev => ({ ...prev, goals: [goal, ...prev.goals] }));
    setGoalTitle('');
    setGoalDescription('');
    setGoalDeadline('');
    setGoalComponentId('');
    setStatus('Growth goal added.');
  };

  const updateGoalStatus = (id: string, status: GrowthGoal['status']) => {
    persist(prev => ({
      ...prev,
      goals: prev.goals.map(g => (g.id === id ? { ...g, status } : g)),
    }));
  };

  const addEvidence = () => {
    if (!evidenceTitle.trim()) return;
    const entry: EvidenceEntry = {
      id: newId('ev'),
      componentId: evidenceComponentId,
      title: evidenceTitle.trim(),
      description: evidenceDescription.trim(),
      date: new Date().toISOString().slice(0, 10),
      source: evidenceSource.trim() || 'artifact',
      createdAt: new Date().toISOString(),
    };
    persist(prev => ({ ...prev, evidence: [entry, ...prev.evidence] }));
    setEvidenceTitle('');
    setEvidenceDescription('');
    setEvidenceSource('');
    setEvidenceComponentId('');
    setStatus('Evidence logged.');
  };

  const addObservation = () => {
    if (!obsDate) return;
    const obs: Observation = {
      id: newId('obs'),
      date: obsDate,
      type: obsType,
      focusDomains: [],
      notes: obsNotes.trim(),
      evaluatorFeedback: obsFeedback.trim(),
      lessonPlanId: null,
      createdAt: new Date().toISOString(),
    };
    persist(prev => ({ ...prev, observations: [obs, ...prev.observations] }));
    setObsDate('');
    setObsNotes('');
    setObsFeedback('');
    setStatus('Observation recorded.');
  };

  const generateLessonPlan = async () => {
    if (!lessonTopic.trim()) {
      setStatus('Enter a lesson topic first.');
      return;
    }
    setBusy(true);
    setStatus('Generating observation-ready lesson plan…');
    try {
      const res = await fetch('/api/otes/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: lessonTopic,
          subject: workspace.profile.subject,
          gradeLevel: workspace.profile.gradeLevel,
          duration: lessonDuration,
          standards: lessonStandards,
          additionalNotes: lessonNotes,
          targetDomainIds: lessonTargetDomains,
          teacherName: workspace.profile.name,
        }),
      });
      const plan = await res.json();
      setGeneratedPlan(plan);
      const saved: LessonPlan = {
        id: newId('lesson'),
        title: plan.title || lessonTopic,
        subject: plan.subject || workspace.profile.subject,
        gradeLevel: plan.gradeLevel || workspace.profile.gradeLevel,
        duration: plan.duration || lessonDuration,
        targetDomains: lessonTargetDomains,
        targetComponents: [],
        objective: plan.objective || '',
        standards: plan.standards || '',
        materials: plan.materials || [],
        hook: plan.hook || '',
        instruction: plan.instruction || [],
        differentiation: plan.differentiation || [],
        assessment: plan.assessment || [],
        closure: plan.closure || '',
        otesEvidence: plan.otesEvidence || [],
        reflection: plan.reflection || '',
        createdAt: new Date().toISOString(),
      };
      persist(prev => ({ ...prev, lessonPlans: [saved, ...prev.lessonPlans] }));
      setStatus('Lesson plan generated and saved.');
    } catch {
      setStatus('Could not generate lesson plan. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const askCoach = async () => {
    if (!coachQuestion.trim() && !coachComponentId) return;
    setBusy(true);
    setCoachAnswer('');
    try {
      const rating = workspace.ratings.find(r => r.componentId === coachComponentId);
      const res = await fetch('/api/otes/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: coachQuestion,
          componentId: coachComponentId || undefined,
          currentLevel: rating?.currentLevel,
          teacherProfile: workspace.profile,
        }),
      });
      const data = await res.json();
      setCoachAnswer(data.answer || 'No response.');
    } catch {
      setCoachAnswer('Could not reach the coach. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const downloadLessonPlan = (plan: LessonPlan | Partial<LessonPlan>) => {
    const text = [
      `# ${plan.title}`,
      `Subject: ${plan.subject} | Grade: ${plan.gradeLevel} | Duration: ${plan.duration}`,
      '',
      `## Learning Objective`,
      plan.objective,
      '',
      `## Standards`,
      plan.standards,
      '',
      `## Materials`,
      ...(plan.materials || []).map(m => `- ${m}`),
      '',
      `## Hook / Opening`,
      plan.hook,
      '',
      `## Instruction`,
      ...(plan.instruction || []).map((s, i) => `${i + 1}. ${s}`),
      '',
      `## Differentiation`,
      ...(plan.differentiation || []).map(s => `- ${s}`),
      '',
      `## Assessment`,
      ...(plan.assessment || []).map(s => `- ${s}`),
      '',
      `## Closure`,
      plan.closure,
      '',
      `## OTES 2.0 Evidence (Accomplished)`,
      ...(plan.otesEvidence || []).map(s => `- ${s}`),
      '',
      `## Reflection`,
      plan.reflection,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(plan.title || 'lesson-plan').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importWorkspace(String(reader.result));
        setWorkspace(saveWorkspace(imported)!);
        setStatus('Workspace imported successfully.');
      } catch {
        setStatus('Invalid import file.');
      }
    };
    reader.readAsText(file);
  };

  const toggleDomain = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allComponents = OTES_RUBRIC.flatMap(d =>
    d.components.map(c => ({ ...c, domainId: d.id, domainName: d.name }))
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>OTES 2.0 Coach</h1>
          <p>Work toward Accomplished across all six rubric domains</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              const blob = new Blob([exportWorkspace(workspace)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `otes-coach-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export Data
          </button>
        </div>
      </header>

      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="OTES Coach sections">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${styles.navBtn} ${tab === t.id ? styles.navBtnActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className={styles.main}>
          {status && (
            <div className={styles.card} style={{ padding: '10px 14px', marginBottom: 12, fontSize: '0.86rem' }}>
              {status}
              <button type="button" onClick={() => setStatus('')} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
          )}

          {tab === 'overview' && (
            <>
              <div className={styles.grid3}>
                <div className={styles.statCard}>
                  <div className={styles.statValue} style={{ color: '#1e5f4a' }}>{progress.overallPercent}%</div>
                  <div className={styles.statLabel}>Progress to Accomplished</div>
                  <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress.overallPercent}%` }} /></div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue} style={{ color: '#1e8449' }}>{progress.accomplishedCount}</div>
                  <div className={styles.statLabel}>Accomplished Components</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue} style={{ color: '#2980b9' }}>{progress.skilledCount}</div>
                  <div className={styles.statLabel}>Skilled Components</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue} style={{ color: '#e67e22' }}>{progress.developingCount + progress.ineffectiveCount}</div>
                  <div className={styles.statLabel}>Growth Areas</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{progress.unratedCount}</div>
                  <div className={styles.statLabel}>Not Yet Rated</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{workspace.goals.filter(g => g.status !== 'completed').length}</div>
                  <div className={styles.statLabel}>Active Goals</div>
                </div>
              </div>

              <div className={styles.card}>
                <h2>Domain Progress</h2>
                {progress.domainProgress.map(d => (
                  <div key={d.domainId} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 4 }}>
                      <span>{d.domainName}</span>
                      <span>{d.percent}% · {d.gapCount} gap{d.gapCount === 1 ? '' : 's'}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${d.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <h2>Personalized Suggestions</h2>
                {suggestions.length === 0 ? (
                  <p className={styles.empty}>You&apos;re on track! Keep collecting evidence and preparing for observations.</p>
                ) : (
                  suggestions.slice(0, 8).map(s => (
                    <div key={s.id} className={styles.suggestionCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <strong>{s.title}</strong>
                        <span className={`${styles.badge} ${styles[`badge${s.priority.charAt(0).toUpperCase()}${s.priority.slice(1)}` as 'badgeHigh']}`}>{s.priority}</span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '0.88rem', lineHeight: 1.45 }}>{s.description}</p>
                      <ol style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.84rem' }}>
                        {s.actionSteps.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        {s.componentId && (
                          <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => { setTab('rubric'); setExpandedDomains(prev => new Set([...prev, s.domainId || ''])); }}>
                            View Rubric
                          </button>
                        )}
                        <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => dismissSuggestion(s.id)}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'rubric' && (
            <div className={styles.card}>
              <h2>OTES 2.0 Self-Assessment</h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#6b7f93' }}>
                Rate yourself honestly on each component. Target: Accomplished. Evaluators score holistically — use this to identify where to focus your growth.
              </p>
              {OTES_RUBRIC.map(domain => (
                <div key={domain.id} className={styles.domainBlock}>
                  <button type="button" className={styles.domainHeader} onClick={() => toggleDomain(domain.id)}>
                    <span>{domain.name} <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#6b7f93' }}>({ORGANIZATIONAL_AREAS[domain.area]})</span></span>
                    <span>{expandedDomains.has(domain.id) ? '−' : '+'}</span>
                  </button>
                  {expandedDomains.has(domain.id) && (
                    <div className={styles.domainBody}>
                      {domain.components.map(component => {
                        const rating = workspace.ratings.find(r => r.componentId === component.id);
                        return (
                          <div key={component.id} className={styles.componentCard}>
                            <h3>{component.name}</h3>
                            <div className={styles.listMeta}>Elements: {component.elements.join(', ')} · Evidence: {component.evidenceSources.join(', ')}</div>
                            <div className={styles.levelPicker}>
                              {PERFORMANCE_LEVELS.map(level => (
                                <button
                                  key={level.id}
                                  type="button"
                                  className={`${styles.levelBtn} ${rating?.currentLevel === level.id ? styles.levelBtnActive : ''} ${levelClass(level.id)}`}
                                  style={rating?.currentLevel === level.id ? { color: level.color } : undefined}
                                  onClick={() => updateRating(component.id, level.id)}
                                >
                                  {level.label}
                                </button>
                              ))}
                            </div>
                            {rating?.currentLevel && (
                              <p style={{ fontSize: '0.84rem', lineHeight: 1.45, margin: '6px 0' }}>
                                <strong className={levelClass(rating.currentLevel)}>{PERFORMANCE_LEVELS.find(l => l.id === rating.currentLevel)?.label}:</strong>{' '}
                                {component.levels[rating.currentLevel]}
                              </p>
                            )}
                            {rating?.currentLevel && rating.currentLevel !== 'accomplished' && (
                              <div style={{ background: '#f0faf5', borderRadius: 6, padding: '8px 10px', fontSize: '0.82rem', marginTop: 6 }}>
                                <strong>Path to Accomplished:</strong>
                                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                                  {component.accomplishedActions.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                              </div>
                            )}
                            <div className={styles.field} style={{ marginTop: 8, marginBottom: 0 }}>
                              <label className={styles.label}>Notes / Evidence reminders</label>
                              <textarea
                                className={styles.textarea}
                                style={{ minHeight: 50 }}
                                value={rating?.notes ?? ''}
                                onChange={e => updateRatingNotes(component.id, e.target.value)}
                                placeholder="What evidence will you bring to your evaluator?"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'growth' && (
            <>
              <div className={styles.card}>
                <h2>Add Growth Plan Goal</h2>
                <p style={{ fontSize: '0.86rem', color: '#6b7f93', margin: '0 0 12px' }}>
                  Ohio evaluators expect goals tied to the rubric. Link each goal to a component you want to improve.
                </p>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Goal title</label>
                    <input className={styles.input} value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="e.g. Increase student-to-student discourse" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Rubric component</label>
                    <select className={styles.select} value={goalComponentId} onChange={e => setGoalComponentId(e.target.value)}>
                      <option value="">Select component…</option>
                      {allComponents.map(c => (
                        <option key={c.id} value={c.id}>{c.domainName}: {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description & actions</label>
                  <textarea className={styles.textarea} value={goalDescription} onChange={e => setGoalDescription(e.target.value)} placeholder="What will you do? How will you measure success?" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Deadline</label>
                  <input className={styles.input} type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
                </div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={addGoal}>Add Goal</button>
              </div>

              <div className={styles.card}>
                <h2>Your Goals ({workspace.goals.length})</h2>
                {workspace.goals.length === 0 ? (
                  <p className={styles.empty}>No growth goals yet. Add one above to start your Professional Growth Plan.</p>
                ) : (
                  workspace.goals.map(goal => {
                    const match = goal.componentId ? getComponentById(goal.componentId) : null;
                    return (
                      <div key={goal.id} className={styles.listItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <strong>{goal.title}</strong>
                          <select
                            className={styles.select}
                            style={{ width: 'auto' }}
                            value={goal.status}
                            onChange={e => updateGoalStatus(goal.id, e.target.value as GrowthGoal['status'])}
                          >
                            <option value="not_started">Not started</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        {match && <div className={styles.listMeta}>{match.domain.name} → {match.component.name}</div>}
                        {goal.description && <p style={{ margin: '6px 0 0', fontSize: '0.88rem' }}>{goal.description}</p>}
                        {goal.deadline && <div className={styles.listMeta}>Deadline: {formatDate(goal.deadline)}</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === 'observations' && (
            <>
              <div className={styles.card}>
                <h2>Log Observation / Conference</h2>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Date</label>
                    <input className={styles.input} type="date" value={obsDate} onChange={e => setObsDate(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Type</label>
                    <select className={styles.select} value={obsType} onChange={e => setObsType(e.target.value as Observation['type'])}>
                      <option value="formal">Formal observation (30 min)</option>
                      <option value="walkthrough">Walkthrough / informal</option>
                      <option value="pre_conference">Pre-conference</option>
                      <option value="post_conference">Post-conference</option>
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Your notes / focus areas</label>
                  <textarea className={styles.textarea} value={obsNotes} onChange={e => setObsNotes(e.target.value)} placeholder="What domains will you showcase? What HQSD will you bring?" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Evaluator feedback</label>
                  <textarea className={styles.textarea} value={obsFeedback} onChange={e => setObsFeedback(e.target.value)} placeholder="Record feedback after the post-conference" />
                </div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={addObservation}>Save</button>
              </div>

              <div className={styles.card}>
                <h2>Observation Timeline</h2>
                {workspace.observations.length === 0 ? (
                  <p className={styles.empty}>No observations logged yet. Add your pre-conference and formal observation dates.</p>
                ) : (
                  workspace.observations.map(obs => (
                    <div key={obs.id} className={styles.listItem}>
                      <strong>{obs.type.replace(/_/g, ' ')}</strong> — {formatDate(obs.date)}
                      {obs.notes && <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>{obs.notes}</p>}
                      {obs.evaluatorFeedback && <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#2d5a87' }}><em>Evaluator:</em> {obs.evaluatorFeedback}</p>}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'lessons' && (
            <>
              <div className={styles.card}>
                <h2>Observation Lesson Builder</h2>
                <p style={{ fontSize: '0.86rem', color: '#6b7f93', margin: '0 0 12px' }}>
                  Generate a lesson plan designed to produce observable Accomplished-level evidence for your evaluator.
                </p>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Lesson topic *</label>
                    <input className={styles.input} value={lessonTopic} onChange={e => setLessonTopic(e.target.value)} placeholder="e.g. Equivalent fractions using visual models" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Duration</label>
                    <input className={styles.input} value={lessonDuration} onChange={e => setLessonDuration(e.target.value)} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Ohio Learning Standards</label>
                  <input className={styles.input} value={lessonStandards} onChange={e => setLessonStandards(e.target.value)} placeholder="e.g. MA.4.NSO.1.5" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Target rubric domains (select gaps to showcase)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {OTES_RUBRIC.map(d => (
                      <label key={d.id} style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={lessonTargetDomains.includes(d.id)}
                          onChange={e => {
                            setLessonTargetDomains(prev =>
                              e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id)
                            );
                          }}
                        />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Additional notes</label>
                  <textarea className={styles.textarea} value={lessonNotes} onChange={e => setLessonNotes(e.target.value)} placeholder="Class context, student needs, specific strategies to include…" />
                </div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={generateLessonPlan} disabled={busy}>
                  {busy ? 'Generating…' : 'Generate Lesson Plan'}
                </button>
              </div>

              {generatedPlan && (
                <div className={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ margin: 0 }}>{generatedPlan.title}</h2>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => downloadLessonPlan(generatedPlan)}>
                      Download
                    </button>
                  </div>
                  {[
                    ['Objective', generatedPlan.objective],
                    ['Standards', generatedPlan.standards],
                    ['Hook', generatedPlan.hook],
                    ['Closure', generatedPlan.closure],
                    ['Reflection', generatedPlan.reflection],
                  ].map(([label, value]) => value ? (
                    <div key={label} className={styles.lessonSection}>
                      <h3>{label}</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{value}</p>
                    </div>
                  ) : null)}
                  {([
                    { label: 'Materials', items: generatedPlan.materials },
                    { label: 'Instruction', items: generatedPlan.instruction },
                    { label: 'Differentiation', items: generatedPlan.differentiation },
                    { label: 'Assessment', items: generatedPlan.assessment },
                    { label: 'OTES Evidence', items: generatedPlan.otesEvidence },
                  ] as const).map(section => section.items?.length ? (
                    <div key={section.label} className={styles.lessonSection}>
                      <h3>{section.label}</h3>
                      <ul>{section.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                  ) : null)}
                </div>
              )}

              {workspace.lessonPlans.length > 0 && (
                <div className={styles.card}>
                  <h2>Saved Lesson Plans</h2>
                  {workspace.lessonPlans.map(plan => (
                    <div key={plan.id} className={styles.listItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>{plan.title}</strong>
                        <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => { setGeneratedPlan(plan); downloadLessonPlan(plan); }}>
                          View / Download
                        </button>
                      </div>
                      <div className={styles.listMeta}>{formatDate(plan.createdAt)} · {plan.duration}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'evidence' && (
            <>
              <div className={styles.card}>
                <h2>Log Evidence</h2>
                <p style={{ fontSize: '0.86rem', color: '#6b7f93', margin: '0 0 12px' }}>
                  Document artifacts throughout the year — lesson plans, HQSD, family communication, peer collaboration.
                </p>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Title</label>
                    <input className={styles.input} value={evidenceTitle} onChange={e => setEvidenceTitle(e.target.value)} placeholder="e.g. Q1 benchmark growth data" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Rubric component</label>
                    <select className={styles.select} value={evidenceComponentId} onChange={e => setEvidenceComponentId(e.target.value)}>
                      <option value="">Select component…</option>
                      {allComponents.map(c => (
                        <option key={c.id} value={c.id}>{c.domainName}: {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <textarea className={styles.textarea} value={evidenceDescription} onChange={e => setEvidenceDescription(e.target.value)} placeholder="What does this evidence show? How does it support an Accomplished rating?" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Source type</label>
                  <input className={styles.input} value={evidenceSource} onChange={e => setEvidenceSource(e.target.value)} placeholder="e.g. pre-conference, artifact, student portfolio" />
                </div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={addEvidence}>Log Evidence</button>
              </div>

              <div className={styles.card}>
                <h2>Evidence Log ({workspace.evidence.length})</h2>
                {workspace.evidence.length === 0 ? (
                  <p className={styles.empty}>No evidence logged yet. Start documenting artifacts for your evaluation portfolio.</p>
                ) : (
                  workspace.evidence.map(entry => {
                    const match = entry.componentId ? getComponentById(entry.componentId) : null;
                    return (
                      <div key={entry.id} className={styles.listItem}>
                        <strong>{entry.title}</strong>
                        {match && <div className={styles.listMeta}>{match.domain.name} → {match.component.name}</div>}
                        {entry.description && <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>{entry.description}</p>}
                        <div className={styles.listMeta}>{formatDate(entry.date)} · {entry.source}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === 'coach' && (
            <div className={styles.card}>
              <h2>AI Evaluation Coach</h2>
              <p style={{ fontSize: '0.86rem', color: '#6b7f93', margin: '0 0 12px' }}>
                Ask for specific advice on moving toward Accomplished. Select a rubric component for targeted coaching.
              </p>
              <div className={styles.field}>
                <label className={styles.label}>Rubric component (optional)</label>
                <select className={styles.select} value={coachComponentId} onChange={e => setCoachComponentId(e.target.value)}>
                  <option value="">General coaching…</option>
                  {allComponents.map(c => (
                    <option key={c.id} value={c.id}>{c.domainName}: {c.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Your question</label>
                <textarea
                  className={styles.textarea}
                  value={coachQuestion}
                  onChange={e => setCoachQuestion(e.target.value)}
                  placeholder="e.g. How can I show Accomplished-level differentiation in a 30-minute observation?"
                />
              </div>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={askCoach} disabled={busy}>
                {busy ? 'Thinking…' : 'Ask Coach'}
              </button>
              {coachAnswer && (
                <div className={styles.coachAnswer} style={{ marginTop: 16 }}>
                  {coachAnswer}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Teacher Profile & Data</h2>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} value={workspace.profile.name} onChange={e => updateProfile({ name: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>School</label>
              <input className={styles.input} value={workspace.profile.school} onChange={e => updateProfile({ school: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>District</label>
              <input className={styles.input} value={workspace.profile.district} onChange={e => updateProfile({ district: e.target.value })} />
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>Subject</label>
                <input className={styles.input} value={workspace.profile.subject} onChange={e => updateProfile({ subject: e.target.value })} placeholder="e.g. Mathematics" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Grade level</label>
                <input className={styles.input} value={workspace.profile.gradeLevel} onChange={e => updateProfile({ gradeLevel: e.target.value })} placeholder="e.g. 4th grade" />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Evaluation year</label>
              <input className={styles.input} value={workspace.profile.evaluationYear} onChange={e => updateProfile({ evaluationYear: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Import workspace (JSON)</label>
              <input ref={importRef} type="file" accept=".json" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { if (confirm('Reset all data? This cannot be undone.')) { const fresh = createDefaultWorkspace(); setWorkspace(saveWorkspace(fresh)!); setShowSettings(false); } }}>
                Reset All Data
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
