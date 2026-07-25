'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './broadcast.module.css';

type CampusCode = 'NCST' | 'ELPC' | 'NATS';
type Delivery = 'inbox' | 'announcement' | 'both';
type Summary = {
  campus: CampusCode;
  campusName: string;
  courseCount: number;
  studentCount: number;
  courses: Array<{ id: number; name: string }>;
  calculatedAt: string;
  cached?: boolean;
};
type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
type Broadcast = {
  id: string;
  createdAt: string;
  campus: CampusCode;
  campusName: string;
  delivery?: Delivery | 'test';
  subject: string;
  body: string;
  recipientCount: number;
  eligibleCourseCount: number;
  status: 'Sent' | 'Partial failure' | 'Failed';
  sentCount: number;
  failedCount: number;
  errors: string[];
  expiresAt?: string;
};
type AdminAccount = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

const CAMPUSES: Array<{ code: CampusCode; name: string; location: string }> = [
  { code: 'NCST', name: 'New Castle', location: 'Pennsylvania' },
  { code: 'ELPC', name: 'East Liverpool', location: 'Ohio' },
  { code: 'NATS', name: 'Baltimore', location: 'Maryland' },
];

const blankSummary: Record<CampusCode, Summary | null> = { NCST: null, ELPC: null, NATS: null };

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

function Icon({ name }: { name: 'people' | 'book' | 'clock' | 'shield' | 'send' | 'refresh' }) {
  const paths = {
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function CanvasBroadcastPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<AdminAccount | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' });
  const [campus, setCampus] = useState<CampusCode>('ELPC');
  const [summaries, setSummaries] = useState(blankSummary);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reviewedSnapshot, setReviewedSnapshot] = useState('');
  const [subject, setSubject] = useState('');
  const [delivery, setDelivery] = useState<Delivery>('announcement');
  const [testCourseUrl, setTestCourseUrl] = useState('');
  const [bodyLength, setBodyLength] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [savingName, setSavingName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [modal, setModal] = useState<'save' | 'confirm' | 'details' | 'accounts' | 'courses' | null>(null);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const summary = summaries[campus];

  useEffect(() => {
    setTestCourseUrl(localStorage.getItem('canvas-broadcast-test-course-url') || '');
    void restoreSession();
  }, []);

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  }

  async function restoreSession() {
    try {
      const status = await api('/api/canvas-broadcast/auth');
      setSetupRequired(Boolean(status.setupRequired));
      if (status.authenticated) {
        setCurrentAccount(status.account);
        setEmail(status.account?.email || '');
        await loadWorkspace();
      }
    } catch {}
  }

  async function loadWorkspace() {
    const [templateData, historyData] = await Promise.all([
      api('/api/canvas-broadcast/templates'),
      api('/api/canvas-broadcast/history'),
    ]);
    setTemplates(templateData.templates);
    setHistory(historyData.broadcasts);
    setAuthorized(true);
    setNotice(null);
    void loadSummary(campus);
  }

  async function connect() {
    setNotice({ type: 'info', text: 'Signing in securely…' });
    try {
      await api('/api/canvas-broadcast/auth', {
        method: 'POST',
        body: JSON.stringify({ action: setupRequired ? 'setup' : 'login', name, email, password }),
      });
      const status = await api('/api/canvas-broadcast/auth');
      setCurrentAccount(status.account);
      setSetupRequired(false);
      setPassword('');
      await loadWorkspace();
    } catch (error) {
      setAuthorized(false);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to connect.' });
    }
  }

  async function signOut() {
    await api('/api/canvas-broadcast/auth', { method: 'DELETE' }).catch(() => null);
    setAuthorized(false);
    setCurrentAccount(null);
    setTemplates([]);
    setHistory([]);
    setSummaries(blankSummary);
    setNotice({ type: 'info', text: 'You have signed out.' });
  }

  async function openAccounts() {
    try {
      const data = await api('/api/canvas-broadcast/accounts');
      setAccounts(data.accounts);
      setEditingAccount(null);
      setAccountForm({ name: '', email: '', password: '' });
      setModal('accounts');
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load administrators.' });
    }
  }

  function editAccount(account: AdminAccount) {
    setEditingAccount(account);
    setAccountForm({ name: account.name, email: account.email, password: '' });
  }

  async function saveAccount() {
    try {
      const data = await api('/api/canvas-broadcast/accounts', {
        method: editingAccount ? 'PATCH' : 'POST',
        body: JSON.stringify({ id: editingAccount?.id, ...accountForm }),
      });
      setAccounts(items => editingAccount
        ? items.map(item => item.id === data.account.id ? data.account : item)
        : [...items, data.account]);
      if (currentAccount?.id === data.account.id) {
        setCurrentAccount(data.account);
        setEmail(data.account.email);
      }
      setEditingAccount(null);
      setAccountForm({ name: '', email: '', password: '' });
      setNotice({ type: 'success', text: editingAccount ? 'Administrator updated.' : 'Administrator added.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save administrator.' });
    }
  }

  async function removeAccount(account: AdminAccount) {
    if (!window.confirm(`Remove ${account.name} (${account.email})?`)) return;
    try {
      await api(`/api/canvas-broadcast/accounts?id=${encodeURIComponent(account.id)}`, { method: 'DELETE' });
      setAccounts(items => items.filter(item => item.id !== account.id));
      setNotice({ type: 'success', text: 'Administrator removed.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to remove administrator.' });
    }
  }

  async function loadSummary(code: CampusCode, force = false) {
    setSummaryLoading(true);
    setReviewedSnapshot('');
    setNotice(null);
    try {
      const suffix = force ? `&refresh=${Date.now()}` : '';
      const data = await api(`/api/canvas-broadcast/summary?campus=${code}${suffix}`);
      setSummaries(previous => ({ ...previous, [code]: data }));
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to calculate recipients.' });
    } finally {
      setSummaryLoading(false);
    }
  }

  function chooseCampus(code: CampusCode) {
    setCampus(code);
    if (!summaries[code] && authorized) void loadSummary(code);
  }

  function toggleDelivery(channel: 'inbox' | 'announcement') {
    const emailSelected = delivery === 'inbox' || delivery === 'both';
    const announcementSelected = delivery === 'announcement' || delivery === 'both';
    const nextEmail = channel === 'inbox' ? !emailSelected : emailSelected;
    const nextAnnouncement = channel === 'announcement' ? !announcementSelected : announcementSelected;
    if (!nextEmail && !nextAnnouncement) return;
    setDelivery(nextEmail && nextAnnouncement ? 'both' : nextEmail ? 'inbox' : 'announcement');
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function addLink() {
    const url = window.prompt('Enter the full link URL');
    if (url && /^https?:\/\//i.test(url)) runCommand('createLink', url);
  }

  function setEditorHtml(html: string) {
    if (editorRef.current) editorRef.current.innerHTML = html;
    setBodyLength(stripHtml(html).length);
  }

  function currentBody() {
    return editorRef.current?.innerHTML || '';
  }

  function loadTemplate() {
    const template = templates.find(item => item.id === selectedTemplate);
    if (!template) return;
    setSubject(template.subject);
    setEditorHtml(template.body);
    setNotice({ type: 'success', text: `“${template.name}” loaded. Review it before sending.` });
  }

  function openSave(template?: Template) {
    const target = template || templates.find(item => item.id === selectedTemplate) || null;
    setEditingTemplate(target);
    setSavingName(target?.name || subject || '');
    setModal('save');
  }

  async function saveMessage() {
    if (!savingName.trim() || !subject.trim() || !stripHtml(currentBody())) {
      setNotice({ type: 'error', text: 'Add a template name, subject, and message first.' });
      return;
    }
    try {
      const data = await api('/api/canvas-broadcast/templates', {
        method: 'POST',
        body: JSON.stringify({ id: editingTemplate?.id, name: savingName, subject, body: currentBody() }),
      });
      setTemplates(items => editingTemplate
        ? items.map(item => item.id === data.template.id ? data.template : item)
        : [data.template, ...items]);
      setSelectedTemplate(data.template.id);
      setModal(null);
      setNotice({ type: 'success', text: `Template “${data.template.name}” saved.` });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save template.' });
    }
  }

  async function removeTemplate() {
    const template = templates.find(item => item.id === selectedTemplate);
    if (!template || !window.confirm(`Delete “${template.name}”? This cannot be undone.`)) return;
    try {
      await api(`/api/canvas-broadcast/templates?id=${encodeURIComponent(template.id)}`, { method: 'DELETE' });
      setTemplates(items => items.filter(item => item.id !== template.id));
      setSelectedTemplate('');
      setNotice({ type: 'success', text: 'Template deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to delete template.' });
    }
  }

  function requestSend() {
    if (!summary || summaryLoading) {
      setNotice({ type: 'error', text: 'Wait for the recipient count to finish calculating.' });
      return;
    }
    if (!summary.studentCount) {
      setNotice({ type: 'error', text: 'There are no eligible active students for this campus.' });
      return;
    }
    if (reviewedSnapshot !== summary.calculatedAt) {
      setNotice({ type: 'error', text: 'Review and approve the eligible course list before posting.' });
      setModal('courses');
      return;
    }
    if (!subject.trim() || !stripHtml(currentBody())) {
      setNotice({ type: 'error', text: 'Add a subject and message before sending.' });
      return;
    }
    setModal('confirm');
  }

  async function send() {
    setSending(true);
    setModal(null);
    setNotice({ type: 'info', text: 'Sending broadcast. Keep this page open…' });
    try {
      const data = await api('/api/canvas-broadcast/send', {
        method: 'POST',
        body: JSON.stringify({
          campus,
          delivery,
          subject,
          body: currentBody(),
          expectedCourseIds: summary?.courses.map(course => course.id) || [],
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setHistory(items => [data.record, ...items].slice(0, 25));
      setSummaries(previous => ({ ...previous, [campus]: null }));
      const result = data.result;
      const deliveryLabel = delivery === 'both' ? 'Inbox messages and announcements' : delivery === 'inbox' ? 'Inbox messages' : 'Announcements';
      setNotice({
        type: result.status === 'Sent' ? 'success' : 'error',
        text: result.status === 'Sent'
          ? `${deliveryLabel} sent successfully.`
          : result.failed === 0
            ? `${deliveryLabel} sent with warnings. See broadcast details.`
            : `${deliveryLabel}: ${result.sent.toLocaleString()} accepted; ${result.failed.toLocaleString()} failed.`,
      });
      void loadSummary(campus);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'The broadcast failed.' });
      try {
        const data = await api('/api/canvas-broadcast/history');
        setHistory(data.broadcasts);
      } catch {}
    } finally {
      setSending(false);
    }
  }

  async function sendTest() {
    if (!subject.trim() || !stripHtml(currentBody())) {
      setNotice({ type: 'error', text: 'Add a subject and message before sending a test.' });
      return;
    }
    if (!testCourseUrl.trim()) {
      setNotice({ type: 'error', text: 'Enter the Canvas URL for your test course.' });
      return;
    }
    if (!window.confirm(`Send this test by ${delivery === 'both' ? 'email and announcement' : delivery === 'inbox' ? 'email' : 'announcement'} using only the selected test course? Email testing requires exactly one active student; announcement testing permits zero or one.`)) return;
    setTesting(true);
    localStorage.setItem('canvas-broadcast-test-course-url', testCourseUrl.trim());
    setNotice({ type: 'info', text: 'Checking the test course and sending the selected test delivery…' });
    try {
      const data = await api('/api/canvas-broadcast/test-send', {
        method: 'POST',
        body: JSON.stringify({
          campus,
          delivery,
          subject,
          body: currentBody(),
          courseUrl: testCourseUrl,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setHistory(items => [data.record, ...items].slice(0, 25));
      setNotice({
        type: data.result.status === 'Sent' ? 'success' : 'error',
        text: data.result.status === 'Sent'
          ? `Test ${delivery === 'both' ? 'email and announcement sent' : delivery === 'inbox' ? 'email sent' : 'announcement posted'} using “${data.course.name}” (${data.course.activeStudentCount} active student${data.course.activeStudentCount === 1 ? '' : 's'}).`
          : `The test had a partial failure. Open its broadcast details for the Canvas error.`,
      });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'The test message failed.' });
      try {
        const data = await api('/api/canvas-broadcast/history');
        setHistory(data.broadcasts);
      } catch {}
    } finally {
      setTesting(false);
    }
  }

  function showBroadcast(item: Broadcast) {
    setSelectedBroadcast(item);
    setModal('details');
  }

  function reuseBroadcast() {
    if (!selectedBroadcast) return;
    setSubject(selectedBroadcast.subject);
    setEditorHtml(selectedBroadcast.body);
    setCampus(selectedBroadcast.campus);
    setModal(null);
    setNotice({ type: 'success', text: 'Message loaded for reuse. It has not been sent.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.mark}>C</div>
          <div><strong>Canvas Broadcast Center</strong><span>Student Communications</span></div>
        </div>
        <div className={styles.secure}><Icon name="shield" /> Server-secured Canvas connection</div>
      </header>

      <div className={styles.shell}>
        <section className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>ADMINISTRATOR TOOL</span>
            <h1>Send a campus broadcast</h1>
            <p>Reach every active student in eligible Canvas courses with one clear, deduplicated message.</p>
          </div>
          <div className={styles.access}>
            {authorized ? (
              <div className={styles.signedIn}>
                <span>Signed in as <strong>{currentAccount?.name || 'Administrator'}</strong></span>
                <button onClick={() => void openAccounts()}>Manage admins</button>
                <button onClick={() => void signOut()}>Sign out</button>
              </div>
            ) : (
              <>
                <label htmlFor="login-email">{setupRequired ? 'Create first administrator' : 'Administrator login'}</label>
                <div className={styles.loginFields}>
                  {setupRequired && <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoComplete="name" />}
                  <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="username" />
                  <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && void connect()} placeholder="Password" autoComplete="current-password" />
                  <button onClick={() => void connect()} disabled={!email || !password || (setupRequired && !name)}>{setupRequired ? 'Create account' : 'Sign in'}</button>
                </div>
              </>
            )}
          </div>
        </section>

        {notice && <div className={`${styles.notice} ${styles[notice.type]}`} role="status">{notice.text}<button onClick={() => setNotice(null)} aria-label="Dismiss">×</button></div>}

        <section className={`${styles.card} ${!authorized ? styles.locked : ''}`} aria-disabled={!authorized}>
          <div className={styles.sectionHead}>
            <div><span className={styles.step}>01</span><h2>Choose a campus</h2></div>
            <span className={styles.hint}>Course codes are matched automatically</span>
          </div>
          <div className={styles.campusGrid}>
            {CAMPUSES.map(item => {
              const itemSummary = summaries[item.code];
              return (
                <button key={item.code} className={`${styles.campus} ${campus === item.code ? styles.campusActive : ''}`} onClick={() => chooseCampus(item.code)} disabled={!authorized}>
                  <span className={styles.radio} />
                  <span className={styles.campusCopy}><strong>{item.name}</strong><small>{item.location} · {item.code}</small></span>
                  {itemSummary && <span className={styles.campusCount}>{itemSummary.studentCount.toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {summaryLoading && (
          <div className={styles.loadingPanel} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <div>
              <strong>Loading {CAMPUSES.find(item => item.code === campus)?.name} — please wait</strong>
              <small>Scanning recent courses and active student enrollments. This may take a moment.</small>
            </div>
          </div>
        )}

        <section className={`${styles.summaryCard} ${!authorized ? styles.locked : ''}`}>
          <div className={styles.summaryIdentity}><span>RECIPIENT SUMMARY</span><strong>{CAMPUSES.find(item => item.code === campus)?.name}</strong><small>{summary ? `Calculated ${formatDate(summary.calculatedAt)}` : 'Select a campus to calculate'}</small></div>
          <div className={styles.metric}><div><Icon name="book" /></div><span><strong>{summaryLoading ? '—' : (summary?.courseCount ?? '—')}</strong><small>Eligible courses</small></span></div>
          <div className={styles.metric}><div><Icon name="people" /></div><span><strong>{summaryLoading ? '—' : (summary?.studentCount.toLocaleString() ?? '—')}</strong><small>Unique active students</small></span></div>
          <div className={styles.summaryActions}>
            <button className={styles.reviewButton} onClick={() => setModal('courses')} disabled={!authorized || summaryLoading || !summary?.courses.length}>{reviewedSnapshot === summary?.calculatedAt ? 'Courses reviewed ✓' : 'Review courses'}</button>
            <button className={styles.refresh} onClick={() => void loadSummary(campus, true)} disabled={!authorized || summaryLoading} title="Refresh recipient count"><Icon name="refresh" /></button>
          </div>
        </section>

        <section className={`${styles.card} ${!authorized ? styles.locked : ''}`}>
          <div className={styles.sectionHead}>
            <div><span className={styles.step}>02</span><h2>Compose broadcast</h2></div>
            <span className={styles.hint}>Send to eligible Canvas students and courses</span>
          </div>
          <label className={styles.label} htmlFor="subject">Subject</label>
          <input id="subject" className={styles.subject} value={subject} onChange={e => setSubject(e.target.value)} maxLength={255} placeholder="Enter a clear, specific subject" disabled={!authorized} />
          <div className={styles.editorLabel}><label className={styles.label}>Message</label><span>{bodyLength.toLocaleString()} characters</span></div>
          <div className={styles.editorUtility} role="toolbar" aria-label="Templates and delivery">
            <select aria-label="Saved message template" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} disabled={!authorized}>
              <option value="">Saved messages…</option>
              {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <button onClick={loadTemplate} disabled={!selectedTemplate}>Load</button>
            <button onClick={() => openSave()} disabled={!subject.trim()}>Save</button>
            <button onClick={() => openSave(templates.find(item => item.id === selectedTemplate))} disabled={!selectedTemplate}>Update</button>
            <button className={styles.utilityDanger} onClick={removeTemplate} disabled={!selectedTemplate}>Delete</button>
            <span className={styles.utilitySpacer} />
            <label className={styles.deliveryCheck}>
              <input
                type="checkbox"
                checked={delivery === 'inbox' || delivery === 'both'}
                onChange={() => toggleDelivery('inbox')}
              />
              Email
            </label>
            <label className={styles.deliveryCheck} title="Announcements are automatically deleted after seven days">
              <input
                type="checkbox"
                checked={delivery === 'announcement' || delivery === 'both'}
                onChange={() => toggleDelivery('announcement')}
              />
              Announcement <small>7 days</small>
            </label>
          </div>
          <div className={styles.toolbar} role="toolbar" aria-label="Message formatting">
            <button onClick={() => runCommand('bold')} title="Bold"><b>B</b></button>
            <button onClick={() => runCommand('italic')} title="Italic"><i>I</i></button>
            <span />
            <button onClick={() => runCommand('formatBlock', 'H2')} title="Heading">H2</button>
            <button onClick={() => runCommand('formatBlock', 'P')} title="Paragraph">P</button>
            <span />
            <button onClick={() => runCommand('insertUnorderedList')} title="Bulleted list">• List</button>
            <button onClick={() => runCommand('insertOrderedList')} title="Numbered list">1. List</button>
            <button onClick={addLink} title="Add link">Link</button>
          </div>
          <div ref={editorRef} className={styles.editor} contentEditable={authorized} suppressContentEditableWarning data-placeholder="Write your message to students here…" onInput={() => setBodyLength(stripHtml(currentBody()).length)} />
          <div className={styles.testCourse}>
            <div><strong>Test course</strong><small>Paste a Canvas course URL containing no more than one active student.</small></div>
            <input type="url" value={testCourseUrl} onChange={e => setTestCourseUrl(e.target.value)} onBlur={() => localStorage.setItem('canvas-broadcast-test-course-url', testCourseUrl.trim())} placeholder="https://your-school.instructure.com/courses/12345" />
          </div>
          <div className={styles.sendRow}>
            <div><Icon name="shield" /><span><strong>Confirmation required</strong><small>You’ll review the recipient count before anything is sent.</small></span></div>
            <div className={styles.sendActions}>
              <button className={styles.testButton} onClick={() => void sendTest()} disabled={!authorized || sending || testing || !subject.trim() || bodyLength === 0 || !testCourseUrl.trim()}>{testing ? 'SENDING TEST…' : delivery === 'both' ? 'TEST BOTH' : delivery === 'inbox' ? 'TEST EMAIL' : 'TEST ANNOUNCEMENT'}</button>
              <button className={styles.sendButton} onClick={requestSend} disabled={!authorized || sending || testing || summaryLoading || !summary?.studentCount || reviewedSnapshot !== summary?.calculatedAt}><Icon name="send" />{sending ? 'SENDING…' : delivery === 'both' ? 'SEND BOTH' : delivery === 'inbox' ? 'SEND EMAIL' : 'POST ANNOUNCEMENTS'}</button>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.historyCard} ${!authorized ? styles.locked : ''}`}>
          <div className={styles.sectionHead}>
            <div><span className={styles.step}>03</span><h2>Last 25 broadcasts</h2></div>
            <span className={styles.hint}>{history.length} recorded</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Date & time</th><th>Campus</th><th>Delivery</th><th>Subject</th><th>Recipients</th><th>Status</th></tr></thead>
              <tbody>
                {history.length ? history.map(item => (
                  <tr key={item.id} onClick={() => showBroadcast(item)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && showBroadcast(item)}>
                    <td>{formatDate(item.createdAt)}</td><td>{item.campusName}</td><td>{item.delivery === 'both' ? 'Both' : item.delivery === 'announcement' ? 'Announcement' : item.delivery === 'test' ? 'Test' : 'Email'}</td><td className={styles.subjectCell}>{item.subject}</td><td>{item.recipientCount.toLocaleString()}</td>
                    <td><span className={`${styles.status} ${styles[item.status.replace(' ', '').toLowerCase()]}`}>{item.status}</span></td>
                  </tr>
                )) : <tr><td colSpan={6} className={styles.empty}>No broadcasts have been sent yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modal && <div className={styles.backdrop} role="presentation" onMouseDown={e => e.target === e.currentTarget && !sending && setModal(null)}>
        <div className={styles.modal} role="dialog" aria-modal="true">
          {modal === 'save' && <>
            <span className={styles.modalKicker}>SAVED MESSAGE</span><h2>{editingTemplate ? 'Update template' : 'Save this message'}</h2>
            <p>Give this message a short name so administrators can find it later.</p>
            <label className={styles.label} htmlFor="template-name">Template name</label>
            <input id="template-name" autoFocus value={savingName} onChange={e => setSavingName(e.target.value)} maxLength={100} placeholder="e.g. Schedule reminder" />
            <div className={styles.modalActions}><button className={styles.secondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.primary} onClick={saveMessage}>Save template</button></div>
          </>}
          {modal === 'confirm' && summary && <>
            <div className={styles.confirmIcon}><Icon name="send" /></div>
            <span className={styles.modalKicker}>FINAL CONFIRMATION</span><h2>Ready to send?</h2>
            <p className={styles.confirmText}>You are about to send <strong>“{subject}”</strong> by <strong>{delivery === 'both' ? 'email and announcements' : delivery === 'inbox' ? 'email' : 'announcements'}</strong> at <strong>{summary.campusName}</strong>.</p>
            <div className={styles.confirmStats}><span><b>{summary.courseCount}</b> eligible courses</span><span><b>{summary.studentCount.toLocaleString()}</b> unique students</span></div>
            <div className={styles.warning}>{delivery === 'inbox'
              ? 'The app will create a separate private Canvas Inbox conversation for each unique student. Canvas sends external email according to each student’s notification preferences.'
              : delivery === 'both'
                ? 'The app will create private Inbox messages and post one announcement per eligible course. Students in multiple courses may see duplicate announcements. Announcements are deleted after seven days.'
                : 'The app will enable the Announcements navigation tab, show up to three recent announcements on each course homepage, and post one announcement per eligible course. Students in multiple courses may receive duplicates. Announcements are deleted after seven days.'}</div>
            <div className={styles.modalActions}><button className={styles.secondary} onClick={() => setModal(null)}>Go back</button><button className={styles.sendConfirm} onClick={send}>Confirm & send</button></div>
          </>}
          {modal === 'details' && selectedBroadcast && <>
            <div className={styles.detailHead}><div><span className={styles.modalKicker}>BROADCAST DETAILS</span><h2>{selectedBroadcast.subject}</h2></div><span className={`${styles.status} ${styles[selectedBroadcast.status.replace(' ', '').toLowerCase()]}`}>{selectedBroadcast.status}</span></div>
            <div className={styles.detailMeta}><span><b>Sent</b>{formatDate(selectedBroadcast.createdAt)}</span><span><b>Delivery</b>{selectedBroadcast.delivery === 'both' ? 'Email + Announcement' : selectedBroadcast.delivery === 'announcement' ? 'Announcement' : selectedBroadcast.delivery === 'test' ? 'Private test' : 'Canvas Inbox / Email'}</span><span><b>Recipients</b>{selectedBroadcast.recipientCount.toLocaleString()}</span><span><b>{selectedBroadcast.expiresAt ? 'Expires' : 'Courses'}</b>{selectedBroadcast.expiresAt ? formatDate(selectedBroadcast.expiresAt) : selectedBroadcast.eligibleCourseCount}</span></div>
            <iframe className={styles.preview} title="Broadcast message" sandbox="" srcDoc={`<!doctype html><style>body{font:15px/1.55 Arial,sans-serif;color:#26313a;padding:16px;margin:0}a{color:#146ca4}</style>${selectedBroadcast.body}`} />
            {selectedBroadcast.errors?.length > 0 && <div className={styles.errorDetails}><strong>Canvas/API details</strong>{selectedBroadcast.errors.map((error, index) => <p key={index}>{error}</p>)}</div>}
            <div className={styles.modalActions}><button className={styles.secondary} onClick={() => setModal(null)}>Close</button><button className={styles.primary} onClick={reuseBroadcast}>Reuse message</button></div>
          </>}
          {modal === 'accounts' && <>
            <span className={styles.modalKicker}>ACCESS MANAGEMENT</span>
            <h2>Administrators</h2>
            <p>Add or update the people who can use the Broadcast Center. Passwords are securely hashed and never displayed.</p>
            <div className={styles.accountList}>
              {accounts.map(account => (
                <div key={account.id} className={styles.accountRow}>
                  <div className={styles.accountAvatar}>{account.name.slice(0, 1).toUpperCase()}</div>
                  <div><strong>{account.name}</strong><span>{account.email}{account.id === currentAccount?.id ? ' · You' : ''}</span></div>
                  <button className={styles.textButton} onClick={() => editAccount(account)}>Edit</button>
                  <button className={styles.dangerButton} onClick={() => void removeAccount(account)} disabled={account.id === currentAccount?.id}>Remove</button>
                </div>
              ))}
            </div>
            <div className={styles.accountForm}>
              <h3>{editingAccount ? 'Edit administrator' : 'Add administrator'}</h3>
              <div className={styles.accountFields}>
                <label><span>Name</span><input value={accountForm.name} onChange={e => setAccountForm(form => ({ ...form, name: e.target.value }))} placeholder="Full name" /></label>
                <label><span>Email</span><input type="email" value={accountForm.email} onChange={e => setAccountForm(form => ({ ...form, email: e.target.value }))} placeholder="name@school.edu" /></label>
                <label className={styles.passwordField}><span>{editingAccount ? 'New password (optional)' : 'Password'}</span><input type="password" value={accountForm.password} onChange={e => setAccountForm(form => ({ ...form, password: e.target.value }))} placeholder={editingAccount ? 'Leave blank to keep current password' : 'At least 10 characters'} /></label>
              </div>
              <div className={styles.accountFormActions}>
                {editingAccount && <button className={styles.secondary} onClick={() => { setEditingAccount(null); setAccountForm({ name: '', email: '', password: '' }); }}>Cancel edit</button>}
                <button className={styles.primary} onClick={() => void saveAccount()} disabled={!accountForm.name || !accountForm.email || (!editingAccount && accountForm.password.length < 10)}>{editingAccount ? 'Save changes' : 'Add administrator'}</button>
              </div>
            </div>
            <div className={styles.modalActions}><button className={styles.secondary} onClick={() => setModal(null)}>Done</button></div>
          </>}
          {modal === 'courses' && summary && <>
            <span className={styles.modalKicker}>SAFETY REVIEW</span>
            <h2>Courses receiving this announcement</h2>
            <p>Review all {summary.courseCount} eligible courses for {summary.campusName}. The send will be blocked if this list changes afterward.</p>
            <div className={styles.courseReviewList}>
              {[...summary.courses].sort((a, b) => a.name.localeCompare(b.name)).map((course, index) => (
                <div key={course.id}><span>{index + 1}</span><strong>{course.name}</strong><small>Canvas course ID: {course.id}</small></div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondary} onClick={() => setModal(null)}>Cancel</button>
              <button className={styles.primary} onClick={() => { setReviewedSnapshot(summary.calculatedAt); setModal(null); setNotice({ type: 'success', text: `${summary.courseCount} courses reviewed and approved.` }); }}>I reviewed these courses</button>
            </div>
          </>}
        </div>
      </div>}
    </main>
  );
}
