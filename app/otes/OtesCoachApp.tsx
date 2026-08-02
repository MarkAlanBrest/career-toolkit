'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCategoryGuidance } from '@/lib/otes/categoryGuidance';
import { computeAllCategoryProgress, overallProgress } from '@/lib/otes/progress';
import { buildCategoryReportHtml, buildFullReportHtml, downloadWordReport } from '@/lib/otes/reports';
import { OTES_RUBRIC, ORGANIZATIONAL_AREAS, getDomainAccomplishedComponents } from '@/lib/otes/rubric';
import { WOODS_TECH_EVALUATOR_HANDOUTS } from '@/lib/otes/starterPacks/woodsTechnology';
import { applyStarterPack } from '@/lib/otes/starterPacks';
import { createDefaultWorkspace, loadWorkspace, newId, saveWorkspace } from '@/lib/otes/storage';
import type {
  CategoryAction,
  CategoryCoachMessage,
  EvalLessonPlan,
  OtesWorkspace,
  TeacherProfile,
} from '@/lib/otes/types';
import styles from './otes.module.css';

type View = 'dashboard' | 'category' | 'eval' | 'rubric';

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OtesCoachApp() {
  const [workspace, setWorkspace] = useState<OtesWorkspace | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().slice(0, 10));
  const [coachInput, setCoachInput] = useState('');

  const [evalTopic, setEvalTopic] = useState('');
  const [evalCategoryId, setEvalCategoryId] = useState('');
  const [generatedEvalPlan, setGeneratedEvalPlan] = useState<Partial<EvalLessonPlan> | null>(null);

  useEffect(() => {
    setWorkspace(loadWorkspace());
  }, []);

  const persist = useCallback((updater: (prev: OtesWorkspace) => OtesWorkspace) => {
    setWorkspace(prev => {
      if (!prev) return prev;
      return saveWorkspace(updater(prev))!;
    });
  }, []);

  const categoryProgress = useMemo(() => (workspace ? computeAllCategoryProgress(workspace) : []), [workspace]);
  const totalProgress = useMemo(() => overallProgress(categoryProgress), [categoryProgress]);

  if (!workspace) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p>Loading your OTES workspace…</p>
        </main>
      </div>
    );
  }

  const selectedDomain = OTES_RUBRIC.find(d => d.id === selectedCategoryId);
  const selectedActions = workspace.actions.filter(a => a.categoryId === selectedCategoryId);
  const selectedMessages = workspace.coachMessages.filter(m => m.categoryId === selectedCategoryId);
  const selectedGuidance = selectedCategoryId ? getCategoryGuidance(selectedCategoryId) : null;

  const updateProfile = (patch: Partial<TeacherProfile>) => {
    persist(prev => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  };

  const openCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setView('category');
    setCoachInput('');
  };

  const addAction = () => {
    if (!selectedCategoryId || !actionTitle.trim()) return;
    const action: CategoryAction = {
      id: newId('action'),
      categoryId: selectedCategoryId,
      date: actionDate,
      title: actionTitle.trim(),
      description: actionDescription.trim(),
      createdAt: new Date().toISOString(),
    };
    persist(prev => ({ ...prev, actions: [action, ...prev.actions] }));
    setActionTitle('');
    setActionDescription('');
  };

  const sendCoachMessage = async () => {
    if (!selectedCategoryId || !coachInput.trim()) return;
    const userMessage: CategoryCoachMessage = {
      id: newId('msg'),
      categoryId: selectedCategoryId,
      role: 'user',
      content: coachInput.trim(),
      createdAt: new Date().toISOString(),
    };
    persist(prev => ({ ...prev, coachMessages: [...prev.coachMessages, userMessage] }));
    setCoachInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/otes/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          categoryId: selectedCategoryId,
          context: `Target: Accomplished. Actions logged: ${selectedActions.length}.`,
          teacherProfile: workspace.profile,
        }),
      });
      const data = await res.json();
      const coachMessage: CategoryCoachMessage = {
        id: newId('msg'),
        categoryId: selectedCategoryId,
        role: 'coach',
        content: data.answer || 'Keep logging your actions and working toward Accomplished.',
        createdAt: new Date().toISOString(),
      };
      persist(prev => ({ ...prev, coachMessages: [...prev.coachMessages, coachMessage] }));
    } catch {
      const fallback: CategoryCoachMessage = {
        id: newId('msg'),
        categoryId: selectedCategoryId,
        role: 'coach',
        content: 'Could not reach the coach. Try again, or use the suggestions above.',
        createdAt: new Date().toISOString(),
      };
      persist(prev => ({ ...prev, coachMessages: [...prev.coachMessages, fallback] }));
    } finally {
      setBusy(false);
    }
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
    if (!confirm('Load sample action logs and observation lesson plans? Your ratings and other data will be kept.')) return;
    persist(prev => applyStarterPack(prev, 'woods_technology'));
    setShowSettings(false);
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
          <h1>OTES 2.0 Coach</h1>
          <p>Rubric → Actions → Report</p>
        </div>
        <div className={styles.headerActions}>
          {view !== 'dashboard' && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setView('dashboard'); setSelectedCategoryId(null); }}>
              Dashboard
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
        {view === 'dashboard' && (
          <>
            <div className={styles.dashboardHero}>
              <div>
                <div className={styles.heroLabel}>Evidence documented toward Accomplished</div>
                <div className={styles.heroValue}>{totalProgress}%</div>
              </div>
              <div className={styles.heroStats}>
                <span>{workspace.actions.length} actions logged</span>
                <span>{workspace.evalLessonPlans.length} eval lesson plans</span>
              </div>
            </div>

            <div className={styles.categoryGrid}>
              {categoryProgress.map(progress => {
                const domain = OTES_RUBRIC.find(d => d.id === progress.categoryId)!;
                return (
                  <button
                    key={progress.categoryId}
                    type="button"
                    className={styles.categoryCard}
                    onClick={() => openCategory(progress.categoryId)}
                  >
                    <div className={styles.categoryCardTop}>
                      <h2>{progress.categoryName}</h2>
                    </div>
                    <div className={styles.categoryMeta}>{ORGANIZATIONAL_AREAS[domain.area]}</div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${progress.levelPercent}%` }} />
                    </div>
                    <div className={styles.categoryCardFooter}>
                      <span>{progress.actionCount} action{progress.actionCount === 1 ? '' : 's'} logged</span>
                      <span>Target: Accomplished</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === 'category' && selectedDomain && selectedGuidance && (
          <div className={styles.categoryPage}>
            <div className={styles.categoryPageHeader}>
              <div>
                <h2>{selectedDomain.name}</h2>
                <p>{ORGANIZATIONAL_AREAS[selectedDomain.area]}</p>
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => downloadWordReport(
                  buildCategoryReportHtml(workspace, selectedCategoryId!),
                  `otes-${selectedDomain.id}-report`,
                )}
              >
                Print Category Report
              </button>
            </div>

            <p className={styles.rubricLinkRow}>
              <button
                type="button"
                className={styles.rubricLinkBtn}
                onClick={() => {
                  setView('rubric');
                  requestAnimationFrame(() => {
                    document.getElementById(`rubric-${selectedDomain.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
              >
                View OTES 2.0 Accomplished rubric for {selectedDomain.name} →
              </button>
            </p>

            <section className={styles.card}>
              <h3>Suggestions</h3>
                <h4 className={styles.subheading}>Daily habits</h4>
                <ul className={styles.suggestionList}>
                  {selectedGuidance.dailyHabits.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
                <h4 className={styles.subheading}>Strategies toward Accomplished</h4>
                <ul className={styles.suggestionList}>
                  {selectedGuidance.strategies.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
                <h4 className={styles.subheading}>What Accomplished looks like</h4>
                <p className={styles.accomplishedText}>{selectedGuidance.accomplishedSummary}</p>
            </section>

            <section className={styles.card}>
              <h3>Category Coach</h3>
              <p className={styles.cardIntro}>Ask for recommendations specific to {selectedDomain.name}.</p>
              <div className={styles.coachThread}>
                {selectedMessages.length === 0 && (
                  <p className={styles.empty}>Start a conversation — try: &quot;What should I focus on this week?&quot;</p>
                )}
                {selectedMessages.map(msg => (
                  <div key={msg.id} className={msg.role === 'coach' ? styles.coachBubble : styles.userBubble}>
                    <div className={styles.bubbleRole}>{msg.role === 'coach' ? 'Coach' : 'You'}</div>
                    <div className={styles.bubbleText}>{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className={styles.coachInputRow}>
                <input
                  className={styles.input}
                  value={coachInput}
                  onChange={e => setCoachInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !busy && sendCoachMessage()}
                  placeholder="Ask your coach for this category…"
                />
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={sendCoachMessage} disabled={busy}>
                  {busy ? '…' : 'Send'}
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h3>Actions I Took</h3>
              <p className={styles.cardIntro}>Log what you did — this becomes your evidence in the Word report.</p>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>What did you do?</label>
                  <input className={styles.input} value={actionTitle} onChange={e => setActionTitle(e.target.value)} placeholder="e.g. Used exit tickets to adjust tomorrow's lesson" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Date</label>
                  <input className={styles.input} type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Details (optional)</label>
                <textarea className={styles.textarea} style={{ minHeight: 50 }} value={actionDescription} onChange={e => setActionDescription(e.target.value)} placeholder="Any details for your report…" />
              </div>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={addAction}>Log Action</button>

              <div style={{ marginTop: 20 }}>
                {selectedActions.length === 0 ? (
                  <p className={styles.empty}>No actions yet. Log your first one above.</p>
                ) : (
                  selectedActions.map(action => (
                    <div key={action.id} className={styles.actionItem}>
                      <div className={styles.actionDate}>{formatDate(action.date)}</div>
                      <strong>{action.title}</strong>
                      {action.description && <p>{action.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'rubric' && (
          <div className={styles.categoryPage}>
            <div className={styles.categoryPageHeader}>
              <div>
                <h2>OTES 2.0 Rubric</h2>
                <p>Accomplished-level descriptors for every rubric category — your target for growth planning.</p>
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
                        onClick={() => openCategory(domain.id)}
                      >
                        Work on {domain.name} →
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
              <label className={styles.label}>Sample content</label>
              <p className={styles.cardIntro} style={{ marginTop: 0 }}>
                Load sample action logs and observation lesson plans for woods technology classes.
              </p>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadWoodsTechStarterPack}>
                Load sample actions &amp; lesson plans
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
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { if (confirm('Reset all data?')) { setWorkspace(saveWorkspace(createDefaultWorkspace())!); setShowSettings(false); } }}>
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
