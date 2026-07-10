'use client';

import { useEffect, useState } from 'react';

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
  html: string;
  pointValue: number;
  quizCounts: { mc: number; tf: number; sa: number; essay: number };
  quizGroups: QuizGroup[] | null;
};

type AddType = { key: string; label: string; icon: string; kind: ItemKind; pageType: string };
const ADD_TYPES: AddType[] = [
  { key: 'content', label: 'Content Page', icon: '📄', kind: 'page', pageType: 'Content Page' },
  { key: 'discussion', label: 'Discussion Prompt', icon: '💬', kind: 'page', pageType: 'Discussion Prompt' },
  { key: 'assignment', label: 'Assignment', icon: '📝', kind: 'assignment', pageType: 'Assignment' },
  { key: 'quiz', label: 'Quiz', icon: '✏️', kind: 'quiz', pageType: 'Quiz' },
];

type Course = { id: number; name: string };
type Module = { id: number; name: string };

function uid() { return 'it_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

function ensureAccount(): { accountId: string; accountToken: string } {
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
      if (group.type === 'tf') {
        lines.push('   True   False');
      } else if (q.answers?.length) {
        const letters = 'ABCDEFG';
        q.answers.forEach((a, i) => lines.push(`   ${letters[i]}) ${a.text}${a.correct ? '  *correct*' : ''}`));
      }
      lines.push('');
      n += 1;
    }
  }
  return lines.join('\n');
}

export default function CourseBuilderPage() {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<{ accountId: string; accountToken: string } | null>(null);
  const [step, setStep] = useState<'setup' | 'layout' | 'build' | 'insert'>('setup');

  const [connected, setConnected] = useState(false);
  const [canvasDomain, setCanvasDomain] = useState('');
  const [canvasUserName, setCanvasUserName] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [skipConnect, setSkipConnect] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [newModuleName, setNewModuleName] = useState('');
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [items, setItems] = useState<BuilderItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');

  const [inserting, setInserting] = useState(false);
  const [insertResults, setInsertResults] = useState<{ title: string; status: string; error?: string }[] | null>(null);
  const [insertError, setInsertError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const acct = ensureAccount();
    setAccount(acct);
    fetch(`/api/canvas/status?accountId=${encodeURIComponent(acct.accountId)}&accountToken=${encodeURIComponent(acct.accountToken)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.connected) {
          setConnected(true);
          setCanvasDomain(data.domain || '');
          setCanvasUserName(data.userName || '');
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!connected || !account || !courseId) { setModules([]); setModuleId(null); return; }
    fetch(`/api/canvas/modules?accountId=${encodeURIComponent(account.accountId)}&accountToken=${encodeURIComponent(account.accountToken)}&courseId=${courseId}`)
      .then(r => r.json())
      .then(data => setModules(data?.modules || []))
      .catch(() => {});
  }, [connected, account, courseId]);

  function loadCourses(acct: { accountId: string; accountToken: string }) {
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

  async function connectCanvas() {
    if (!account) return;
    setConnecting(true);
    setConnectError('');
    try {
      const res = await fetch('/api/canvas/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.accountId, accountToken: account.accountToken, domain: domainInput.trim(), token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setConnectError(data?.error || 'Could not connect.'); return; }
      setConnected(true);
      setCanvasDomain(data.domain || domainInput.trim());
      setCanvasUserName(data.userName || '');
      setTokenInput('');
    } catch {
      setConnectError('Network error — try again.');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectCanvas() {
    if (!account) return;
    await fetch('/api/canvas/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.accountId, accountToken: account.accountToken }),
    }).catch(() => {});
    setConnected(false);
    setCanvasDomain('');
    setCanvasUserName('');
    setCourses([]);
    setCourseId(null);
    setModules([]);
    setModuleId(null);
  }

  function addItem(type: AddType) {
    const item: BuilderItem = {
      id: uid(), kind: type.kind, pageType: type.pageType,
      title: type.label, instructions: '', html: '', pointValue: 100,
      quizCounts: { mc: 3, tf: 2, sa: 0, essay: 0 }, quizGroups: null,
    };
    setItems(prev => [...prev, item]);
  }

  function updateItem(id: string, patch: Partial<BuilderItem>) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id));
  }

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
          items: items.map(it => ({
            type: it.kind, title: it.title, html: it.html, pointValue: it.pointValue,
            quizGroups: it.quizGroups || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setInsertError(data?.error || 'Insert failed.'); }
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
  const builtCount = items.filter(isItemBuilt).length;

  if (!ready) {
    return <div style={{ minHeight: '100vh', background: paper }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: paper, fontFamily: font, color: navy }}>
      <div style={{ background: navy, color: '#fff' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>◆</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Canvas Course Builder</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
            {connected ? `Connected · ${canvasUserName || canvasDomain}` : 'Not connected'}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 20px 60px' }}>
        <StepBar step={step} />

        {step === 'setup' && (
          <SetupStep
            connected={connected} canvasDomain={canvasDomain} canvasUserName={canvasUserName}
            domainInput={domainInput} setDomainInput={setDomainInput}
            tokenInput={tokenInput} setTokenInput={setTokenInput}
            connecting={connecting} connectError={connectError}
            onConnect={connectCanvas} onDisconnect={disconnectCanvas}
            skipConnect={skipConnect} setSkipConnect={setSkipConnect}
            courses={courses} loadingCourses={loadingCourses}
            courseId={courseId} setCourseId={setCourseId}
            modules={modules} moduleId={moduleId} setModuleId={setModuleId}
            newModuleName={newModuleName} setNewModuleName={setNewModuleName}
            placement={placement} setPlacement={setPlacement}
            onNext={() => setStep('layout')}
          />
        )}

        {step === 'layout' && (
          <LayoutStep
            items={items} onAdd={addItem} onRemove={removeItem} onMove={moveItem}
            onUpdateTitle={(id, title) => updateItem(id, { title })}
            onBack={() => setStep('setup')}
            onNext={() => { if (items.length) { setActiveItemId(items[0].id); setStep('build'); } }}
          />
        )}

        {step === 'build' && activeItem && account && (
          <BuildStep
            items={items} activeItem={activeItem} onSelect={setActiveItemId}
            onUpdate={(patch) => updateItem(activeItem.id, patch)}
            manualMode={manualMode} setManualMode={setManualMode}
            drafting={drafting} draftError={draftError}
            onDraft={() => draftWithAI(activeItem)}
            onBack={() => setStep('layout')}
            onNext={() => setStep('insert')}
            buyCreditsUrl={`/buy-credits?accountId=${encodeURIComponent(account.accountId)}&accountToken=${encodeURIComponent(account.accountToken)}`}
          />
        )}

        {step === 'insert' && (
          <InsertStep
            connected={connected} items={items} builtCount={builtCount}
            courseId={courseId} moduleName={modules.find(m => m.id === moduleId)?.name || newModuleName || 'New Module'}
            placement={placement}
            inserting={inserting} insertResults={insertResults} insertError={insertError}
            onInsert={insertAll}
            copiedId={copiedId} onCopy={copyItem}
            onBack={() => setStep('build')}
          />
        )}
      </div>
    </div>
  );
}

function StepBar({ step }: { step: string }) {
  const steps = [['setup', 'Connect'], ['layout', 'Add Content'], ['build', 'Build'], ['insert', 'Review & Insert']];
  const idx = steps.findIndex(s => s[0] === step);
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
      {steps.map(([key, label], i) => (
        <div key={key} style={{
          flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '9px 6px', borderRadius: 8,
          background: i === idx ? blue : i < idx ? '#DCFCE7' : '#fff',
          color: i === idx ? '#fff' : i < idx ? green : muted,
          border: `1px solid ${i === idx ? blue : border}`,
        }}>{label}</div>
      ))}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: 18, marginBottom: 14, ...style }}>{children}</div>;
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 13.5, fontFamily: font, color: navy };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.03em' };
const primaryBtn: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, background: blue, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, background: '#fff', color: navy, border: `1px solid ${border}`, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const ghostBtnSm: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, background: '#fff', color: navy, border: `1px solid ${border}`, fontWeight: 600, fontSize: 12, cursor: 'pointer' };

function SetupStep(props: {
  connected: boolean; canvasDomain: string; canvasUserName: string;
  domainInput: string; setDomainInput: (v: string) => void;
  tokenInput: string; setTokenInput: (v: string) => void;
  connecting: boolean; connectError: string;
  onConnect: () => void; onDisconnect: () => void;
  skipConnect: boolean; setSkipConnect: (v: boolean) => void;
  courses: Course[]; loadingCourses: boolean;
  courseId: number | null; setCourseId: (v: number | null) => void;
  modules: Module[]; moduleId: number | null; setModuleId: (v: number | null) => void;
  newModuleName: string; setNewModuleName: (v: string) => void;
  placement: 'top' | 'bottom'; setPlacement: (v: 'top' | 'bottom') => void;
  onNext: () => void;
}) {
  const {
    connected, canvasDomain, canvasUserName, domainInput, setDomainInput, tokenInput, setTokenInput,
    connecting, connectError, onConnect, onDisconnect, skipConnect, setSkipConnect,
    courses, loadingCourses, courseId, setCourseId, modules, moduleId, setModuleId,
    newModuleName, setNewModuleName, placement, setPlacement, onNext,
  } = props;

  const canProceed = skipConnect || (connected && courseId != null);

  return (
    <div>
      {!connected && !skipConnect && (
        <Card>
          <label style={labelStyle}>Canvas domain</label>
          <input style={inputStyle} placeholder="yourschool.instructure.com" value={domainInput} onChange={e => setDomainInput(e.target.value)} />
          <div style={{ height: 10 }} />
          <label style={labelStyle}>Canvas API token</label>
          <input style={inputStyle} type="password" placeholder="Paste your personal access token" value={tokenInput} onChange={e => setTokenInput(e.target.value)} />
          <div style={{ fontSize: 12, color: muted, marginTop: 6, lineHeight: 1.6 }}>
            In Canvas: Account → Settings → scroll to <strong>Approved Integrations</strong> → <strong>+ New Access Token</strong>. Takes under a minute — no IT approval needed, it&apos;s your own token.
          </div>
          {connectError && <div style={{ color: red, fontSize: 12.5, marginTop: 8 }}>{connectError}</div>}
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={primaryBtn} disabled={connecting || !domainInput.trim() || !tokenInput.trim()} onClick={onConnect}>
              {connecting ? 'Connecting…' : 'Connect Canvas'}
            </button>
            <button style={secondaryBtn} onClick={() => setSkipConnect(true)}>Skip — I&apos;ll copy &amp; paste instead</button>
          </div>
        </Card>
      )}

      {connected && (
        <Card style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: green }}>✓ Connected as {canvasUserName || 'you'} on {canvasDomain}</div>
            <button style={ghostBtnSm} onClick={onDisconnect}>Disconnect</button>
          </div>
        </Card>
      )}

      {skipConnect && !connected && (
        <Card style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div style={{ fontSize: 13, color: '#92400E' }}>
            Copy-paste mode — you&apos;ll build content here, then copy each item and paste it into Canvas yourself.
          </div>
          <button style={{ ...ghostBtnSm, marginTop: 10 }} onClick={() => setSkipConnect(false)}>Actually, let me connect Canvas</button>
        </Card>
      )}

      {connected && (
        <Card>
          <label style={labelStyle}>Course</label>
          <select style={inputStyle} value={courseId ?? ''} onChange={e => setCourseId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{loadingCourses ? 'Loading courses…' : 'Choose a course'}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {courseId != null && (
            <>
              <div style={{ height: 12 }} />
              <label style={labelStyle}>Module</label>
              <select style={inputStyle} value={moduleId ?? ''} onChange={e => setModuleId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">+ Create a new module</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {moduleId == null && (
                <input style={{ ...inputStyle, marginTop: 8 }} placeholder="New module name" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} />
              )}

              <div style={{ height: 12 }} />
              <label style={labelStyle}>Insert new items at the</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={placement === 'top' ? primaryBtn : secondaryBtn} onClick={() => setPlacement('top')}>Top of module</button>
                <button style={placement === 'bottom' ? primaryBtn : secondaryBtn} onClick={() => setPlacement('bottom')}>Bottom of module</button>
              </div>
            </>
          )}
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={primaryBtn} disabled={!canProceed} onClick={onNext}>Next: Add Content →</button>
      </div>
    </div>
  );
}

function LayoutStep(props: {
  items: BuilderItem[]; onAdd: (t: AddType) => void; onRemove: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void;
  onUpdateTitle: (id: string, title: string) => void; onBack: () => void; onNext: () => void;
}) {
  const { items, onAdd, onRemove, onMove, onUpdateTitle, onBack, onNext } = props;
  return (
    <div>
      <Card>
        <label style={labelStyle}>Add items</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {ADD_TYPES.map(t => (
            <button key={t.key} style={secondaryBtn} onClick={() => onAdd(t)}>{t.icon} {t.label}</button>
          ))}
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

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={secondaryBtn} onClick={onBack}>← Back</button>
        <button style={primaryBtn} disabled={items.length === 0} onClick={onNext}>Next: Build →</button>
      </div>
    </div>
  );
}

function BuildStep(props: {
  items: BuilderItem[]; activeItem: BuilderItem; onSelect: (id: string) => void;
  onUpdate: (patch: Partial<BuilderItem>) => void;
  manualMode: boolean; setManualMode: (v: boolean) => void;
  drafting: boolean; draftError: string; onDraft: () => void;
  onBack: () => void; onNext: () => void; buyCreditsUrl: string;
}) {
  const { items, activeItem, onSelect, onUpdate, manualMode, setManualMode, drafting, draftError, onDraft, onBack, onNext, buyCreditsUrl } = props;
  const built = isItemBuilt(activeItem);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
      <div>
        {items.map(it => {
          const meta = ADD_TYPES.find(t => t.kind === it.kind && t.pageType === it.pageType) || ADD_TYPES[0];
          const active = it.id === activeItem.id;
          return (
            <div key={it.id} onClick={() => onSelect(it.id)} style={{
              padding: '9px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 13, marginBottom: 4,
              background: active ? blue : 'transparent', color: active ? '#fff' : navy,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{meta.icon}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
              {isItemBuilt(it) && <span>✓</span>}
            </div>
          );
        })}
      </div>

      <div>
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
                    <input
                      style={{ ...inputStyle, width: 60, marginTop: 4 }} type="number" min={0}
                      value={activeItem.quizCounts[k]}
                      onChange={e => onUpdate({ quizCounts: { ...activeItem.quizCounts, [k]: Math.max(0, Number(e.target.value) || 0) } })}
                    />
                  </label>
                ))}
              </div>
              <div style={{ height: 12 }} />
              <label style={labelStyle}>Topic / source material</label>
              <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: font }} value={activeItem.instructions} onChange={e => onUpdate({ instructions: e.target.value })} placeholder="e.g. Photosynthesis — light-dependent and light-independent reactions" />
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
              <div style={{ height: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Content</label>
                <button style={ghostBtnSm} onClick={() => setManualMode(!manualMode)}>{manualMode ? 'Switch to AI Assist' : 'Switch to manual'}</button>
              </div>
              {manualMode ? (
                <textarea style={{ ...inputStyle, minHeight: 220, fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12.5, marginTop: 8 }} value={activeItem.html} onChange={e => onUpdate({ html: e.target.value })} placeholder="Paste or write HTML directly…" />
              ) : (
                <>
                  <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: font, marginTop: 8 }} value={activeItem.instructions} onChange={e => onUpdate({ instructions: e.target.value })} placeholder="Describe what you want on this page…" />
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button style={primaryBtn} disabled={drafting} onClick={onDraft}>{drafting ? 'Drafting…' : '✨ Draft with AI'}</button>
                    <a href={buyCreditsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: blue }}>Need AI credits?</a>
                  </div>
                  {draftError && (
                    <div style={{ color: red, fontSize: 12.5, marginTop: 8 }}>
                      {draftError}{draftError.toLowerCase().includes('credit') && <> — <a href={buyCreditsUrl} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>buy credits →</a></>}
                    </div>
                  )}
                </>
              )}
              {activeItem.html && (
                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>Preview</label>
                  <div style={{ border: `1px solid ${border}`, borderRadius: 8, padding: 4, background: '#fff' }} dangerouslySetInnerHTML={{ __html: activeItem.html }} />
                </div>
              )}
            </>
          )}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button style={secondaryBtn} onClick={onBack}>← Back</button>
          <button style={primaryBtn} onClick={onNext}>Next: Review &amp; Insert →{!built && ' (unbuilt items become placeholders)'}</button>
        </div>
      </div>
    </div>
  );
}

function InsertStep(props: {
  connected: boolean; items: BuilderItem[]; builtCount: number; courseId: number | null; moduleName: string; placement: string;
  inserting: boolean; insertResults: { title: string; status: string; error?: string }[] | null; insertError: string;
  onInsert: () => void; copiedId: string | null; onCopy: (item: BuilderItem) => void; onBack: () => void;
}) {
  const { connected, items, builtCount, courseId, moduleName, placement, inserting, insertResults, insertError, onInsert, copiedId, onCopy, onBack } = props;

  return (
    <div>
      <Card>
        <label style={labelStyle}>Summary</label>
        {connected ? (
          <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>
            {items.length} item{items.length === 1 ? '' : 's'} → module &quot;{moduleName}&quot; (course {courseId}), added to the {placement}.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>Copy-paste mode — copy each item below and paste it into Canvas yourself.</div>
        )}
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${border}` }}>
            <span style={{ flex: 1, fontSize: 13 }}>{it.title}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: isItemBuilt(it) ? green : '#B45309' }}>{isItemBuilt(it) ? '✓ Ready' : 'Not built'}</span>
            {!connected && (
              <button style={ghostBtnSm} onClick={() => onCopy(it)}>{copiedId === it.id ? 'Copied!' : it.kind === 'quiz' ? 'Copy questions' : 'Copy HTML'}</button>
            )}
          </div>
        ))}
        {builtCount < items.length && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#FEF9C3', borderRadius: 6, fontSize: 12, color: '#713F12' }}>
            {items.length - builtCount} item(s) haven&apos;t been built yet{connected ? ' — they\'ll be inserted as empty placeholders.' : '.'}
          </div>
        )}
      </Card>

      {connected && (
        <Card>
          <button style={{ ...primaryBtn, fontSize: 14.5, padding: '12px 24px' }} disabled={inserting || !courseId} onClick={onInsert}>
            {inserting ? 'Inserting…' : '🚀 Insert into Canvas'}
          </button>
          {insertError && <div style={{ color: red, fontSize: 12.5, marginTop: 10 }}>{insertError}</div>}
          {insertResults && (
            <div style={{ marginTop: 14 }}>
              {insertResults.map((r, i) => (
                <div key={i} style={{ fontSize: 12.5, color: r.status === 'inserted' ? green : red, marginBottom: 4 }}>
                  {r.status === 'inserted' ? '✓' : '✗'} {r.title}{r.error ? ` — ${r.error}` : ''}
                </div>
              ))}
              <div style={{ fontSize: 12.5, color: muted, marginTop: 8 }}>Go to your course&apos;s Modules page — items are created unpublished, publish them when ready.</div>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button style={secondaryBtn} onClick={onBack}>← Back to Build</button>
      </div>
    </div>
  );
}
