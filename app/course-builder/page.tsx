'use client';

import { useEffect, useState } from 'react';
import Editor from './Editor';
import { THEMES } from '@/lib/pageComponents';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#172A36';
const blue = '#0770B8';
const border = '#E2E8F0';
const muted = '#526A79';
const green = '#15803D';
const red = '#B91C1C';
const paper = '#F8FAFC';

type ItemKind = 'page' | 'assignment' | 'quiz';
type QuizGroupType = 'mc' | 'tf' | 'sa' | 'essay';
type QuizAnswer = { text: string; correct: boolean };
type QuizQuestion = { question: string; answers?: QuizAnswer[] };
type QuizGroup = { type: QuizGroupType; concept?: string; questions: QuizQuestion[] };

type BuilderItem = {
  id: string;
  kind: ItemKind;
  pageType: string;
  title: string;
  instructions: string;
  sourceText: string;
  sourceFileName: string;
  themeKey: string;
  html: string;
  pointValue: number;
  quizCounts: { mc: number; tf: number; sa: number; essay: number };
  quizGroups: QuizGroup[] | null;
};

type AddType = { key: string; label: string; icon: string; kind: ItemKind; pageType: string };
const ADD_TYPES: AddType[] = [
  { key: 'content', label: 'Content Page', icon: '📄', kind: 'page', pageType: 'Content Page' },
  { key: 'inline-q', label: 'Content + Inline Questions', icon: '🧠', kind: 'page', pageType: 'Content Page with Inline Questions' },
  { key: 'video', label: 'Video Page', icon: '🎬', kind: 'page', pageType: 'Video Page' },
  { key: 'flashcards', label: 'Flashcard Tile Page', icon: '🗂', kind: 'page', pageType: 'Flashcard Tile Page' },
  { key: 'discussion', label: 'Discussion Prompt', icon: '💬', kind: 'page', pageType: 'Discussion Prompt' },
  { key: 'assignment', label: 'Assignment', icon: '📝', kind: 'assignment', pageType: 'Assignment' },
  { key: 'quiz', label: 'Quiz', icon: '✏️', kind: 'quiz', pageType: 'Quiz' },
];

type Course = { id: number; name: string };
type Module = { id: number; name: string };
type Account = { accountId: string; accountToken: string };

function uid() { return 'it_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

function ensureAccount(): Account {
  let accountId = localStorage.getItem('cb_account_id') || '';
  let accountToken = localStorage.getItem('cb_account_token') || '';
  if (!accountToken) { accountToken = crypto.randomUUID(); localStorage.setItem('cb_account_token', accountToken); }
  if (!accountId) { accountId = crypto.randomUUID(); localStorage.setItem('cb_account_id', accountId); }
  return { accountId, accountToken };
}

function isItemBuilt(item: BuilderItem) {
  return item.kind === 'quiz' ? !!item.quizGroups && item.quizGroups.length > 0 : !!item.html;
}

function itemToHtmlText(item: BuilderItem): string {
  if (item.kind !== 'quiz') return item.html || '';
  const lines: string[] = [];
  let n = 1;
  for (const group of item.quizGroups || []) {
    for (const q of group.questions) {
      lines.push(`${n}) ${q.question}`);
      if (group.type === 'tf') lines.push('   True   False');
      else if (q.answers?.length) {
        const letters = 'ABCDEFG';
        q.answers.forEach((a, i) => lines.push(`   ${letters[i]}) ${a.text}${a.correct ? '  *correct*' : ''}`));
      }
      lines.push('');
      n += 1;
    }
  }
  return lines.join('\n');
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 13.5, fontFamily: font, color: navy };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.03em' };
const primaryBtn: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, background: blue, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, background: '#fff', color: navy, border: `1px solid ${border}`, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const ghostBtnSm: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, background: '#fff', color: navy, border: `1px solid ${border}`, fontWeight: 600, fontSize: 12, cursor: 'pointer' };

export default function CourseBuilderPage() {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [step, setStep] = useState<'layout' | 'build' | 'finish'>('layout');

  const [connected, setConnected] = useState(false);
  const [canvasDomain, setCanvasDomain] = useState('');
  const [canvasUserName, setCanvasUserName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [newModuleName, setNewModuleName] = useState('');
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [items, setItems] = useState<BuilderItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [showFinish, setShowFinish] = useState(false);
  const [finishMode, setFinishMode] = useState<'choose' | 'auto' | 'copy'>('choose');
  const [inserting, setInserting] = useState(false);
  const [insertResults, setInsertResults] = useState<{ title: string; status: string; error?: string }[] | null>(null);
  const [insertError, setInsertError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function refreshStatus(acct: Account) {
    fetch(`/api/canvas/status?accountId=${encodeURIComponent(acct.accountId)}&accountToken=${encodeURIComponent(acct.accountToken)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.connected) { setConnected(true); setCanvasDomain(data.domain || ''); setCanvasUserName(data.userName || ''); }
        else { setConnected(false); }
      })
      .catch(() => {});
  }

  useEffect(() => {
    const acct = ensureAccount();
    setAccount(acct);
    refreshStatus(acct);
    setReady(true);
  }, []);

  function loadCourses(acct: Account) {
    setLoadingCourses(true);
    fetch(`/api/canvas/courses?accountId=${encodeURIComponent(acct.accountId)}&accountToken=${encodeURIComponent(acct.accountToken)}`)
      .then(r => r.json())
      .then(data => setCourses(data?.courses || []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }

  useEffect(() => {
    if (connected && account) loadCourses(account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (!connected || !account || !courseId) { setModules([]); setModuleId(null); return; }
    fetch(`/api/canvas/modules?accountId=${encodeURIComponent(account.accountId)}&accountToken=${encodeURIComponent(account.accountToken)}&courseId=${courseId}`)
      .then(r => r.json())
      .then(data => setModules(data?.modules || []))
      .catch(() => {});
  }, [connected, account, courseId]);

  function addItem(type: AddType) {
    const item: BuilderItem = {
      id: uid(), kind: type.kind, pageType: type.pageType,
      title: type.label, instructions: '', sourceText: '', sourceFileName: '', themeKey: 'ocean', html: '', pointValue: 100,
      quizCounts: { mc: 3, tf: 2, sa: 0, essay: 0 }, quizGroups: null,
    };
    setItems(prev => [...prev, item]);
  }

  function updateItem(id: string, patch: Partial<BuilderItem>) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) { setItems(prev => prev.filter(it => it.id !== id)); }

  function moveItem(id: string, dir: -1 | 1) {
    setItems(prev => {
      const idx = prev.findIndex(it => it.id === id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  async function draftWithAI(item: BuilderItem) {
    if (!account) return;
    setDrafting(true);
    setDraftError('');
    try {
      const body: Record<string, unknown> = {
        accountId: account.accountId, accountToken: account.accountToken,
        kind: item.kind === 'quiz' ? 'quiz' : 'page',
        title: item.title, instructions: item.instructions, pageType: item.pageType,
        theme: item.themeKey, sourceText: item.sourceText,
      };
      if (item.kind === 'quiz') body.quiz = item.quizCounts;
      const res = await fetch('/api/course-builder/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setDraftError(data?.error || 'Could not generate content.'); return; }
      if (item.kind === 'quiz') updateItem(item.id, { quizGroups: data.groups || [] });
      else updateItem(item.id, { html: data.html || '' });
    } catch {
      setDraftError('Network error — try again.');
    } finally {
      setDrafting(false);
    }
  }

  async function uploadSourceFile(item: BuilderItem, file: File) {
    setUploadingId(item.id);
    setDraftError('');
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/parse-file', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b64, filename: file.name, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) { setDraftError(data?.error || 'Could not read that file.'); return; }
      updateItem(item.id, { sourceText: data.text || '', sourceFileName: file.name });
    } catch {
      setDraftError('Network error uploading the file — try again.');
    } finally {
      setUploadingId(null);
    }
  }

  async function insertAll() {
    if (!account || !courseId) return;
    setInserting(true);
    setInsertError('');
    setInsertResults(null);
    try {
      const res = await fetch('/api/canvas/insert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.accountId, accountToken: account.accountToken,
          courseId, moduleId: moduleId || undefined,
          newModuleName: moduleId ? undefined : (newModuleName.trim() || 'New Module'),
          placement,
          items: items.map(it => ({ type: it.kind, title: it.title, html: it.html, pointValue: it.pointValue, quizGroups: it.quizGroups || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) setInsertError(data?.error || 'Insert failed.');
      setInsertResults(data?.results || null);
    } catch {
      setInsertError('Network error — try again.');
    } finally {
      setInserting(false);
    }
  }

  function copyItem(item: BuilderItem) {
    const text = itemToHtmlText(item);
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  const activeItem = items.find(it => it.id === activeItemId) || null;

  if (!ready || !account) return <div style={{ minHeight: '100vh', background: paper }} />;

  return (
    <div style={{ minHeight: '100vh', background: paper, fontFamily: font, color: navy }}>
      <TopBar
        connected={connected} canvasDomain={canvasDomain} canvasUserName={canvasUserName}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 20px 60px' }}>
        <StepBar step={step} onNavigate={s => { if (s === 'build' && !activeItem) return; setStep(s); }} />

        {step === 'layout' && (
          <LayoutStep
            items={items} onAdd={addItem} onRemove={removeItem} onMove={moveItem}
            onUpdateTitle={(id, title) => updateItem(id, { title })}
            onNext={() => { if (items.length) { setActiveItemId(items[0].id); setStep('build'); } }}
          />
        )}

        {step === 'build' && activeItem && (
          <BuildStep
            items={items} activeItem={activeItem} onSelect={setActiveItemId}
            onUpdate={(patch) => updateItem(activeItem.id, patch)}
            drafting={drafting} draftError={draftError}
            onDraft={() => draftWithAI(activeItem)}
            uploadingId={uploadingId} onUploadFile={(file) => uploadSourceFile(activeItem, file)}
            onBack={() => setStep('layout')}
            onNext={() => setStep('finish')}
            buyCreditsUrl={`/buy-credits?accountId=${encodeURIComponent(account.accountId)}&accountToken=${encodeURIComponent(account.accountToken)}`}
          />
        )}

        {step === 'finish' && (
          <FinishStep items={items} onBack={() => setStep('build')} onOpenFinish={() => { setShowFinish(true); setFinishMode('choose'); }} />
        )}
      </div>

      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} title="Settings">
          <ConnectPanel
            account={account} connected={connected} canvasDomain={canvasDomain} canvasUserName={canvasUserName}
            onConnected={(domain, userName) => { setConnected(true); setCanvasDomain(domain); setCanvasUserName(userName); }}
            onDisconnected={() => { setConnected(false); setCanvasDomain(''); setCanvasUserName(''); setCourses([]); setCourseId(null); setModules([]); setModuleId(null); }}
          />
        </Modal>
      )}

      {showFinish && (
        <Modal onClose={() => setShowFinish(false)} title="Add this to Canvas">
          {finishMode === 'choose' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => setFinishMode('auto')} style={choiceCardStyle}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🚀</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Insert automatically</div>
                <div style={{ fontSize: 12, color: muted }}>Uses your Canvas API token to create everything directly in your course.</div>
              </button>
              <button onClick={() => setFinishMode('copy')} style={choiceCardStyle}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Copy &amp; paste myself</div>
                <div style={{ fontSize: 12, color: muted }}>No Canvas connection needed — copy each item and paste it in yourself.</div>
              </button>
            </div>
          )}

          {finishMode === 'auto' && !connected && (
            <ConnectPanel
              account={account} connected={connected} canvasDomain={canvasDomain} canvasUserName={canvasUserName}
              onConnected={(domain, userName) => { setConnected(true); setCanvasDomain(domain); setCanvasUserName(userName); }}
              onDisconnected={() => setConnected(false)}
            />
          )}

          {finishMode === 'auto' && connected && (
            <div>
              <label style={labelStyle}>Course</label>
              <select style={inputStyle} value={courseId ?? ''} onChange={e => setCourseId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">{loadingCourses ? 'Loading courses…' : 'Choose a course'}</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {courseId != null && (
                <>
                  <div style={{ height: 10 }} />
                  <label style={labelStyle}>Module</label>
                  <select style={inputStyle} value={moduleId ?? ''} onChange={e => setModuleId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">+ Create a new module</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {moduleId == null && <input style={{ ...inputStyle, marginTop: 8 }} placeholder="New module name" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} />}
                  <div style={{ height: 10 }} />
                  <label style={labelStyle}>Insert new items at the</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button style={placement === 'top' ? primaryBtn : secondaryBtn} onClick={() => setPlacement('top')}>Top</button>
                    <button style={placement === 'bottom' ? primaryBtn : secondaryBtn} onClick={() => setPlacement('bottom')}>Bottom</button>
                  </div>
                  <button style={{ ...primaryBtn, fontSize: 14.5, padding: '12px 24px' }} disabled={inserting} onClick={insertAll}>{inserting ? 'Inserting…' : '🚀 Insert into Canvas'}</button>
                  {insertError && <div style={{ color: red, fontSize: 12.5, marginTop: 10 }}>{insertError}</div>}
                  {insertResults && (
                    <div style={{ marginTop: 14 }}>
                      {insertResults.map((r, i) => (
                        <div key={i} style={{ fontSize: 12.5, color: r.status === 'inserted' ? green : red, marginBottom: 4 }}>
                          {r.status === 'inserted' ? '✓' : '✗'} {r.title}{r.error ? ` — ${r.error}` : ''}
                        </div>
                      ))}
                      <div style={{ fontSize: 12.5, color: muted, marginTop: 8 }}>Go to your course&apos;s Modules page — items are created unpublished.</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {finishMode === 'copy' && (
            <div>
              {items.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${border}` }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{it.title}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: isItemBuilt(it) ? green : '#B45309' }}>{isItemBuilt(it) ? '✓ Ready' : 'Not built'}</span>
                  <button style={ghostBtnSm} onClick={() => copyItem(it)}>{copiedId === it.id ? 'Copied!' : it.kind === 'quiz' ? 'Copy questions' : 'Copy HTML'}</button>
                </div>
              ))}
              <div style={{ fontSize: 12, color: muted, marginTop: 12 }}>Paste pages/assignments into Canvas&apos;s Rich Content Editor via the <strong>&lt;/&gt; HTML Editor</strong> toggle.</div>
            </div>
          )}

          {finishMode !== 'choose' && (
            <button style={{ ...ghostBtnSm, marginTop: 14 }} onClick={() => setFinishMode('choose')}>← Choose a different way</button>
          )}
        </Modal>
      )}
    </div>
  );
}

function TopBar({ connected, canvasDomain, canvasUserName, onOpenSettings }: { connected: boolean; canvasDomain: string; canvasUserName: string; onOpenSettings: () => void }) {
  return (
    <div style={{ background: navy, color: '#fff' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff' }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>◆</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Course Builder</span>
        </a>
        <nav style={{ display: 'flex', gap: 14, fontSize: 13 }}>
          <a href="/" style={{ color: '#B8C7D1', textDecoration: 'none' }}>Home</a>
          <a href="/features" style={{ color: '#B8C7D1', textDecoration: 'none' }}>Features</a>
          <a href="/pricing" style={{ color: '#B8C7D1', textDecoration: 'none' }}>AI Credits</a>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{connected ? `Connected · ${canvasUserName || canvasDomain}` : 'Not connected'}</span>
          <button onClick={onOpenSettings} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 7, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>⚙ Settings</button>
        </div>
      </div>
    </div>
  );
}

function StepBar({ step, onNavigate }: { step: string; onNavigate: (s: 'layout' | 'build' | 'finish') => void }) {
  const steps: ['layout' | 'build' | 'finish', string][] = [['layout', 'Add Content'], ['build', 'Build'], ['finish', 'Finish']];
  const idx = steps.findIndex(s => s[0] === step);
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
      {steps.map(([key, label], i) => (
        <button key={key} onClick={() => onNavigate(key)} style={{
          flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '9px 6px', borderRadius: 8,
          background: i === idx ? blue : i < idx ? '#DCFCE7' : '#fff',
          color: i === idx ? '#fff' : i < idx ? green : muted,
          border: `1px solid ${i === idx ? blue : border}`, cursor: 'pointer', fontFamily: font,
        }}>{label}</button>
      ))}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 460, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const choiceCardStyle: React.CSSProperties = { textAlign: 'left', background: paper, border: `1px solid ${border}`, borderRadius: 10, padding: 16, cursor: 'pointer' };

function ConnectPanel({ account, connected, canvasDomain, canvasUserName, onConnected, onDisconnected }: {
  account: Account; connected: boolean; canvasDomain: string; canvasUserName: string;
  onConnected: (domain: string, userName: string) => void; onDisconnected: () => void;
}) {
  const [domainInput, setDomainInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  async function connect() {
    setConnecting(true);
    setConnectError('');
    try {
      const res = await fetch('/api/canvas/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.accountId, accountToken: account.accountToken, domain: domainInput.trim(), token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setConnectError(data?.error || 'Could not connect.'); return; }
      onConnected(data.domain || domainInput.trim(), data.userName || '');
      setTokenInput('');
    } catch {
      setConnectError('Network error — try again.');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    await fetch('/api/canvas/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.accountId, accountToken: account.accountToken }),
    }).catch(() => {});
    onDisconnected();
  }

  if (connected) {
    return (
      <div>
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: green }}>✓ Connected as {canvasUserName || 'you'} on {canvasDomain}</div>
        </div>
        <button style={ghostBtnSm} onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      <label style={labelStyle}>Canvas domain</label>
      <input style={inputStyle} placeholder="yourschool.instructure.com" value={domainInput} onChange={e => setDomainInput(e.target.value)} />
      <div style={{ height: 10 }} />
      <label style={labelStyle}>Canvas API token</label>
      <input style={inputStyle} type="password" placeholder="Paste your personal access token" value={tokenInput} onChange={e => setTokenInput(e.target.value)} />
      <div style={{ fontSize: 12, color: muted, marginTop: 6, lineHeight: 1.6 }}>
        In Canvas: Account → Settings → <strong>Approved Integrations</strong> → <strong>+ New Access Token</strong>. Your own token, no IT approval needed.
      </div>
      {connectError && <div style={{ color: red, fontSize: 12.5, marginTop: 8 }}>{connectError}</div>}
      <button style={{ ...primaryBtn, marginTop: 12 }} disabled={connecting || !domainInput.trim() || !tokenInput.trim()} onClick={connect}>{connecting ? 'Connecting…' : 'Connect Canvas'}</button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>{children}</div>;
}

function FileUpload({ uploading, sourceFileName, onUpload, onClear }: { uploading: boolean; sourceFileName: string; onUpload: (file: File) => void; onClear: () => void }) {
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <label style={{ ...ghostBtnSm, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        📎 {uploading ? 'Reading…' : 'Upload source file'}
        <input
          type="file" accept=".pdf,.docx,.doc,.rtf,.txt,.md,.xlsx,.xls" style={{ display: 'none' }} disabled={uploading}
          onChange={e => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = ''; }}
        />
      </label>
      {sourceFileName && (
        <span style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          {sourceFileName} <button onClick={onClear} style={{ background: 'none', border: 'none', color: red, cursor: 'pointer', fontSize: 12 }}>remove</button>
        </span>
      )}
      <span style={{ fontSize: 11, color: muted }}>PDF, Word, or text — used as source material for AI drafts.</span>
    </div>
  );
}

function LayoutStep(props: {
  items: BuilderItem[]; onAdd: (t: AddType) => void; onRemove: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void;
  onUpdateTitle: (id: string, title: string) => void; onNext: () => void;
}) {
  const { items, onAdd, onRemove, onMove, onUpdateTitle, onNext } = props;
  return (
    <div>
      <Card>
        <label style={labelStyle}>Add items</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {ADD_TYPES.map(t => <button key={t.key} style={secondaryBtn} onClick={() => onAdd(t)}>{t.icon} {t.label}</button>)}
        </div>
      </Card>

      <Card>
        <label style={labelStyle}>Your module ({items.length} item{items.length === 1 ? '' : 's'})</label>
        {items.length === 0 && <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>Nothing yet — add items above.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {items.map((it, i) => {
            const meta = ADD_TYPES.find(t => t.kind === it.kind && t.pageType === it.pageType) || ADD_TYPES[0];
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px' }}>
                <span>{meta.icon}</span>
                <input style={{ ...inputStyle, flex: 1 }} value={it.title} onChange={e => onUpdateTitle(it.id, e.target.value)} />
                <button style={ghostBtnSm} disabled={i === 0} onClick={() => onMove(it.id, -1)}>↑</button>
                <button style={ghostBtnSm} disabled={i === items.length - 1} onClick={() => onMove(it.id, 1)}>↓</button>
                <button style={{ ...ghostBtnSm, color: red }} onClick={() => onRemove(it.id)}>Remove</button>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={primaryBtn} disabled={items.length === 0} onClick={onNext}>Next: Build →</button>
      </div>
    </div>
  );
}

function BuildStep(props: {
  items: BuilderItem[]; activeItem: BuilderItem; onSelect: (id: string) => void;
  onUpdate: (patch: Partial<BuilderItem>) => void;
  drafting: boolean; draftError: string; onDraft: () => void;
  uploadingId: string | null; onUploadFile: (file: File) => void;
  onBack: () => void; onNext: () => void; buyCreditsUrl: string;
}) {
  const { items, activeItem, onSelect, onUpdate, drafting, draftError, onDraft, uploadingId, onUploadFile, onBack, onNext, buyCreditsUrl } = props;
  const uploading = uploadingId === activeItem.id;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 16, maxWidth: '100%' }}>
      <div style={{ minWidth: 0 }}>
        {items.map(it => {
          const meta = ADD_TYPES.find(t => t.kind === it.kind && t.pageType === it.pageType) || ADD_TYPES[0];
          const active = it.id === activeItem.id;
          return (
            <div key={it.id} onClick={() => onSelect(it.id)} style={{
              padding: '9px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 13, marginBottom: 4,
              background: active ? blue : 'transparent', color: active ? '#fff' : navy, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{meta.icon}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
              {isItemBuilt(it) && <span>✓</span>}
            </div>
          );
        })}
      </div>

      <div style={{ minWidth: 0 }}>
        <Card>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={activeItem.title} onChange={e => onUpdate({ title: e.target.value })} />

          {activeItem.kind === 'assignment' && (
            <>
              <div style={{ height: 12 }} />
              <label style={labelStyle}>Points possible</label>
              <input style={{ ...inputStyle, maxWidth: 140 }} type="number" value={activeItem.pointValue} onChange={e => onUpdate({ pointValue: Number(e.target.value) || 0 })} />
            </>
          )}

          {activeItem.kind === 'quiz' ? (
            <>
              <div style={{ height: 12 }} />
              <label style={labelStyle}>Question counts</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['mc', 'tf', 'sa', 'essay'] as QuizGroupType[]).map(k => (
                  <label key={k} style={{ fontSize: 12, color: muted }}>
                    {({ mc: 'Multiple choice', tf: 'True/False', sa: 'Short answer', essay: 'Essay' } as Record<string, string>)[k]}
                    <input style={{ ...inputStyle, width: 60, marginTop: 4 }} type="number" min={0}
                      value={activeItem.quizCounts[k]}
                      onChange={e => onUpdate({ quizCounts: { ...activeItem.quizCounts, [k]: Math.max(0, Number(e.target.value) || 0) } })} />
                  </label>
                ))}
              </div>
              <div style={{ height: 12 }} />
              <label style={labelStyle}>Topic / source material</label>
              <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: font }} value={activeItem.instructions} onChange={e => onUpdate({ instructions: e.target.value })} placeholder="e.g. Photosynthesis — light-dependent and light-independent reactions" />
              <FileUpload uploading={uploading} sourceFileName={activeItem.sourceFileName} onUpload={onUploadFile} onClear={() => onUpdate({ sourceText: '', sourceFileName: '' })} />
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button style={primaryBtn} disabled={drafting} onClick={onDraft}>{drafting ? 'Drafting…' : '✨ Draft with AI'}</button>
                <a href={buyCreditsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: blue }}>Need AI credits?</a>
              </div>
              {draftError && (
                <div style={{ color: red, fontSize: 12.5, marginTop: 8 }}>
                  {draftError}{draftError.toLowerCase().includes('credit') && <> — <a href={buyCreditsUrl} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>buy credits →</a></>}
                </div>
              )}
              {activeItem.quizGroups && activeItem.quizGroups.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {activeItem.quizGroups.map((g, gi) => (
                    <div key={gi} style={{ border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginBottom: 8, background: paper }}>
                      {g.questions.map((q, qi) => (
                        <div key={qi} style={{ fontSize: 13, marginBottom: 6 }}>
                          <strong>{q.question}</strong>
                          {g.type !== 'essay' && g.type !== 'sa' && q.answers && (
                            <ol type="A" style={{ margin: '4px 0 0 18px', padding: 0 }}>
                              {q.answers.map((a, ai) => <li key={ai} style={{ color: a.correct ? green : navy, fontWeight: a.correct ? 700 : 400 }}>{a.text}{a.correct ? ' ✓' : ''}</li>)}
                            </ol>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ height: 12 }} />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={labelStyle}>AI instructions (optional)</label>
                  <input style={inputStyle} value={activeItem.instructions} onChange={e => onUpdate({ instructions: e.target.value })} placeholder="Describe what you want, then draft — or just build below" />
                </div>
                <div>
                  <label style={labelStyle}>Theme (for AI drafts)</label>
                  <select style={inputStyle} value={activeItem.themeKey} onChange={e => onUpdate({ themeKey: e.target.value })}>
                    {Object.entries(THEMES).map(([key, t]) => <option key={key} value={key}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <FileUpload uploading={uploading} sourceFileName={activeItem.sourceFileName} onUpload={onUploadFile} onClear={() => onUpdate({ sourceText: '', sourceFileName: '' })} />
              <div style={{ marginTop: 10 }}>
                <button style={primaryBtn} disabled={drafting} onClick={onDraft}>{drafting ? 'Drafting…' : '✨ Draft with AI'}</button>
              </div>
              <div style={{ marginTop: 4 }}>
                <a href={buyCreditsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: blue }}>Need AI credits?</a>
              </div>
              {draftError && (
                <div style={{ color: red, fontSize: 12.5, marginTop: 6 }}>
                  {draftError}{draftError.toLowerCase().includes('credit') && <> — <a href={buyCreditsUrl} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>buy credits →</a></>}
                </div>
              )}

              <div style={{ height: 14 }} />
              <label style={labelStyle}>Page canvas</label>
              <Editor html={activeItem.html} onChange={h => onUpdate({ html: h })} />
            </>
          )}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button style={secondaryBtn} onClick={onBack}>← Back</button>
          <button style={primaryBtn} onClick={onNext}>Next: Finish →</button>
        </div>
      </div>
    </div>
  );
}

function FinishStep({ items, onBack, onOpenFinish }: { items: BuilderItem[]; onBack: () => void; onOpenFinish: () => void }) {
  const builtCount = items.filter(isItemBuilt).length;
  return (
    <div>
      <Card>
        <label style={labelStyle}>Summary</label>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${border}` }}>
            <span style={{ flex: 1, fontSize: 13 }}>{it.title}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: isItemBuilt(it) ? green : '#B45309' }}>{isItemBuilt(it) ? '✓ Ready' : 'Not built'}</span>
          </div>
        ))}
        {builtCount < items.length && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#FEF9C3', borderRadius: 6, fontSize: 12, color: '#713F12' }}>
            {items.length - builtCount} item(s) haven&apos;t been built yet.
          </div>
        )}
      </Card>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={secondaryBtn} onClick={onBack}>← Back to Build</button>
        <button style={{ ...primaryBtn, fontSize: 14.5, padding: '12px 24px' }} onClick={onOpenFinish}>Add this to Canvas →</button>
      </div>
    </div>
  );
}
