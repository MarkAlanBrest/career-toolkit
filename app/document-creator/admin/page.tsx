'use client';

import { useEffect, useState } from 'react';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#1E293B';
const blue = '#1E4D8C';
const border = '#E2E8F0';
const muted = '#64748B';
const green = '#15803D';
const red = '#DC2626';

// Older saved settings store one of these named IDs instead of a hex color — migrate on read.
const LEGACY_THEME_HEX: Record<string, string> = { navy: '#1E293B', cobalt: '#1D4ED8', forest: '#166534', burgundy: '#7F1D1D' };
function themeToHex(v: string | undefined): string {
  if (!v) return '#1E293B';
  if (LEGACY_THEME_HEX[v]) return LEGACY_THEME_HEX[v];
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#1E293B';
}

type Session = { email: string; name: string; role: string; schoolId: string; schoolName: string; accountId: string; accountToken: string };
type Teacher = { email: string; name: string; active: boolean; createdAt: string; sharepointFolderPath: string };
type Department = { id: string; label: string };
type DocType = { id: string; label: string; icon: string; color: string; desc?: string; departmentId?: string };
type StyleOptions = {
  lines: boolean;
  numbered: boolean;
  infoBar: boolean;
  callouts: boolean;
  checklist: boolean;
  signature: boolean;
  pageNumbers: boolean;
  icons: boolean;
  headerStyle: string;
};
const DEFAULT_STYLE_OPTIONS: StyleOptions = {
  lines: false,
  numbered: false,
  infoBar: false,
  callouts: false,
  checklist: false,
  signature: false,
  pageNumbers: false,
  icons: false,
  headerStyle: 'classic',
};
const HEADER_STYLE_OPTIONS = [
  { id: 'classic', label: 'Classic band', desc: 'Light tinted header with a strong top rule.' },
  { id: 'letterhead', label: 'Formal letterhead', desc: 'Logo/name treatment with a clean rule beneath.' },
  { id: 'sidebar', label: 'Modern sidebar', desc: 'Vertical accent bar with compact title block.' },
  { id: 'minimal', label: 'Minimal top rule', desc: 'White header, thin accent line, restrained spacing.' },
];
type RefDoc = { id: string; name: string; filename: string; chars: number; uploadedAt: string };

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'teaching', label: 'Teaching' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'financialaid', label: 'Financial Aid' },
  { id: 'careerplacement', label: 'Career Placement' },
  { id: 'operations', label: 'Operations' },
  { id: 'other', label: 'Other' },
];

const DEFAULT_DOC_TYPES: DocType[] = [
  { id: 'syllabus',       label: 'Syllabus',               icon: '📋', color: '#7C3AED' },
  { id: 'worksheet',      label: 'Worksheet',              icon: '📝', color: '#2563EB' },
  { id: 'lessonplan',     label: 'Lesson Plan',            icon: '📚', color: '#0891B2' },
  { id: 'rubric',         label: 'Rubric',                 icon: '✅', color: '#16A34A' },
  { id: 'test',           label: 'Test / Quiz',            icon: '📊', color: '#DC2626' },
  { id: 'projectguide',   label: 'Project Guide',          icon: '🏗️', color: '#D97706' },
  { id: 'research',       label: 'Research Assignment',    icon: '🔬', color: '#7C3AED' },
  { id: 'studyguide',     label: 'Study Guide',            icon: '📖', color: '#0891B2' },
  { id: 'safetycontract', label: 'Safety Contract',        icon: '⚠️', color: '#DC2626' },
  { id: 'missingwork',    label: 'Missing Work Form',      icon: '📋', color: '#475569' },
  { id: 'obschecklist',   label: 'Observation Checklist',  icon: '✅', color: '#16A34A' },
  { id: 'incident',       label: 'Incident Report',        icon: '🚨', color: '#DC2626' },
  { id: 'vocablist',      label: 'Vocabulary List',         icon: '🔤', color: '#0E7490' },
  { id: 'readingguide',  label: 'Reading Guide',           icon: '📰', color: '#065F46' },
  { id: 'funactivity',   label: 'Fun Activity',            icon: '🎯', color: '#B45309' },
  { id: 'creative',      label: 'Creative Assignment',     icon: '🎨', color: '#6D28D9' },
  { id: 'custom',        label: 'Custom Document',         icon: '📄', color: '#475569' },
  { id: 'resourceguide', label: 'Resource Guide',          icon: '🔗', color: '#0F766E' },
  { id: 'certificate',   label: 'Certificate of Completion', icon: '🏆', color: '#92400E' },
  { id: 'icebreaker',    label: 'Icebreaker Activity Guide', icon: '🤝', color: '#0369A1' },
  { id: 'concernnotice', label: 'Academic Concern Notice', icon: '🚩', color: '#9F1239' },
  { id: 'advisingsummary', label: 'Advising/Progress Summary', icon: '🧭', color: '#5B21B6' },
];
const LEGACY_DEPARTMENT_BY_TYPE: Record<string, string> = {
  worksheet: 'teaching', studyguide: 'teaching', vocablist: 'teaching', readingguide: 'teaching',
  funactivity: 'teaching', creative: 'teaching', lessonplan: 'teaching', projectguide: 'teaching',
  research: 'teaching', test: 'teaching', rubric: 'teaching', icebreaker: 'teaching',
  syllabus: 'operations', safetycontract: 'operations', missingwork: 'operations', obschecklist: 'operations',
  incident: 'operations', concernnotice: 'operations', advisingsummary: 'operations',
};
function slugDepartment(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function departmentForType(type: DocType): string {
  return type.departmentId || LEGACY_DEPARTMENT_BY_TYPE[type.id] || 'other';
}
type UsageEntry = { email: string; name: string; docType: string; docTypeLabel: string; model: string; ts: number };
type UsageStats = {
  totalAll: number;
  totalMonth: number;
  byTeacher: { name: string; email: string; total: number; thisMonth: number }[];
  byDocType: { label: string; count: number }[];
  recent: UsageEntry[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: navy }}>{title}</div>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Btn({ onClick, disabled, color = blue, children }: { onClick?: () => void; disabled?: boolean; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: color,
        color: '#fff',
        border: 'none',
        borderRadius: 999,
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontFamily: font,
        boxShadow: '0 8px 16px rgba(15,23,42,.12)',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        padding: '10px 12px',
        border: `1px solid ${border}`,
        borderRadius: 10,
        fontSize: 13,
        fontFamily: font,
        color: navy,
        outline: 'none',
        minWidth: 0,
        background: '#fff',
        boxShadow: 'inset 0 1px 2px rgba(15,23,42,.03)',
      }}
    />
  );
}

function Help({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}>
      <span
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        aria-label="Help"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#EFF6FF', color: blue, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #BFDBFE', lineHeight: 1, userSelect: 'none', flexShrink: 0 }}
      >?</span>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 22, left: 0, zIndex: 50, width: 260, background: navy, color: '#E2E8F0', fontSize: 11, fontWeight: 400, lineHeight: 1.5, padding: '10px 12px', borderRadius: 10, boxShadow: '0 10px 24px rgba(15,23,42,.3)' }}>
            {text}
          </div>
        </>
      )}
    </span>
  );
}


export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState(green);
  const [activeTab, setActiveTab] = useState<'school' | 'documents' | 'teachers'>('documents');

  // Add teacher form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newFolderPath, setNewFolderPath] = useState('');
  const [adding, setAdding] = useState(false);

  // Reset password
  const [resetEmail, setResetEmail] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetting, setResetting] = useState(false);

  // Set SharePoint folder
  const [folderEmail, setFolderEmail] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  const [model, setModel] = useState<string>('claude-haiku-4-5');
  const [savingModel, setSavingModel] = useState(false);
  const [logo, setLogo] = useState<string>('');
  const [savingLogo, setSavingLogo] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('teaching');
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [docNotes, setDocNotes] = useState<Record<string, string>>({});
  const [docQuestions, setDocQuestions] = useState<Record<string, string>>({});
  const [docStyles, setDocStyles] = useState<Record<string, StyleOptions>>({});
  const [docThemes, setDocThemes] = useState<Record<string, string>>({});
  const [savingSchool, setSavingSchool] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeDepartmentId, setNewTypeDepartmentId] = useState('teaching');
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>('');

  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Reference documents (school catalog, course lists, etc.)
  const [refDocs, setRefDocs] = useState<RefDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [docRefs, setDocRefs] = useState<Record<string, string[]>>({});

  function showMsg(text: string, color = green) { setMsg(text); setMsgColor(color); setTimeout(() => setMsg(''), 4000); }

  useEffect(() => {
    fetch('/api/document-creator/auth/session')
      .then(r => r.json())
      .then(data => {
        if (!data.session) { window.location.href = '/document-creator/login'; return; }
        if (data.session.role !== 'admin') { window.location.href = '/document-creator'; return; }
        setSession(data.session);
        setLoading(false);
        loadTeachers();
        loadModel();
        loadDocs();
      })
      .catch(() => { window.location.href = '/document-creator/login'; });
  }, []);

  function loadTeachers() {
    setLoadingTeachers(true);
    fetch('/api/document-creator/admin/teachers')
      .then(r => r.json())
      .then(data => { if (data.teachers) setTeachers(data.teachers); })
      .catch(() => {})
      .finally(() => setLoadingTeachers(false));
  }

  async function addTeacher() {
    if (!newEmail || !newName || !newPass) { showMsg('All fields required.', red); return; }
    setAdding(true);
    try {
      const resp = await fetch('/api/document-creator/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, password: newPass, sharepointFolderPath: newFolderPath }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed to add teacher.', red); return; }
      setNewEmail(''); setNewName(''); setNewPass(''); setNewFolderPath('');
      showMsg('Teacher added successfully.');
      loadTeachers();
    } finally {
      setAdding(false);
    }
  }

  async function removeTeacher(email: string) {
    if (!confirm(`Remove ${email}? Their account will be deactivated.`)) return;
    const resp = await fetch('/api/document-creator/admin/teachers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (resp.ok) { showMsg('Teacher removed.'); loadTeachers(); }
    else { const d = await resp.json(); showMsg(d.error || 'Failed.', red); }
  }

  async function resetPassword() {
    if (!resetEmail || !resetPass) { showMsg('Email and new password required.', red); return; }
    setResetting(true);
    try {
      const resp = await fetch('/api/document-creator/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, password: resetPass }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed.', red); return; }
      setResetEmail(''); setResetPass('');
      showMsg('Password reset successfully.');
    } finally {
      setResetting(false);
    }
  }

  async function saveFolderPath() {
    if (!folderEmail) { showMsg('Email required.', red); return; }
    setSavingFolder(true);
    try {
      const resp = await fetch('/api/document-creator/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: folderEmail, sharepointFolderPath: folderPath }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed.', red); return; }
      setFolderEmail(''); setFolderPath('');
      showMsg('SharePoint folder saved.');
      loadTeachers();
    } finally {
      setSavingFolder(false);
    }
  }

  function loadUsage() {
    setLoadingUsage(true);
    fetch('/api/document-creator/usage/stats')
      .then(r => r.json())
      .then(data => { if (data.totalAll !== undefined) setUsage(data); })
      .catch(() => {})
      .finally(() => setLoadingUsage(false));
  }

  function loadDocs() {
    setLoadingDocs(true);
    fetch('/api/document-creator/documents')
      .then(r => r.json())
      .then(data => { if (data.documents) setRefDocs(data.documents); })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showMsg('File must be under 8 MB.', red); e.target.value = ''; return; }
    const docName = newDocName.trim() || file.name.replace(/\.[^./]+$/, '');
    setUploadingDoc(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const parseResp = await fetch('/api/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b64, filename: file.name, mimeType: file.type }),
      });
      const parsed = await parseResp.json();
      if (!parseResp.ok) { showMsg(parsed.error || 'Could not extract text from this file.', red); return; }

      const resp = await fetch('/api/document-creator/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: docName, filename: file.name, text: parsed.text }),
      });
      const data = await resp.json();
      if (!resp.ok) { showMsg(data.error || 'Failed to save document.', red); return; }
      setNewDocName('');
      showMsg(`"${docName}" added.`);
      loadDocs();
    } catch {
      showMsg('Upload failed. Please try again.', red);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  }

  async function removeDoc(id: string, name: string) {
    if (!confirm(`Remove "${name}"? Document types referencing it will stop using it.`)) return;
    const resp = await fetch('/api/document-creator/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (resp.ok) { showMsg('Document removed.'); loadDocs(); }
    else { const d = await resp.json(); showMsg(d.error || 'Failed.', red); }
  }

  function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function loadModel() {
    fetch('/api/document-creator/settings')
      .then(r => r.json())
      .then(d => {
        if (d.adminSettings?.model) setModel(d.adminSettings.model === 'claude-haiku-4-5' ? d.adminSettings.model : 'claude-haiku-4-5');
        if (d.adminSettings?.logo !== undefined) setLogo(d.adminSettings.logo || '');
        if (d.adminSettings?.schoolName) setSchoolName(d.adminSettings.schoolName);
        {
          const savedDepartments: Department[] = Array.isArray(d.adminSettings?.departments) && d.adminSettings.departments.length
            ? [...d.adminSettings.departments]
            : [...DEFAULT_DEPARTMENTS];
          DEFAULT_DEPARTMENTS.forEach(def => {
            if (!savedDepartments.find(dep => dep.id === def.id)) savedDepartments.push(def);
          });
          setDepartments(savedDepartments);
          setNewTypeDepartmentId(prev => savedDepartments.find(dep => dep.id === prev) ? prev : (savedDepartments[0]?.id || 'other'));
          setSelectedDepartmentId(prev => savedDepartments.find(dep => dep.id === prev) ? prev : (savedDepartments[0]?.id || 'other'));
          // A school's saved list is a snapshot from whenever it was last saved — merge in
          // any built-in type added since then so new document types actually show up.
          const types: DocType[] = d.docTypes?.length ? [...d.docTypes] : [...DEFAULT_DOC_TYPES];
          DEFAULT_DOC_TYPES.forEach(def => {
            if (!types.find(t => t.id === def.id)) types.push(def);
          });
          const normalizedTypes = types.map(t => ({ ...t, departmentId: departmentForType(t) }));
          setDocTypes(normalizedTypes);
          setSelectedDocTypeId(prev => prev && normalizedTypes.find(t => t.id === prev) ? prev : (normalizedTypes[0]?.id || ''));
          const notes: Record<string, string> = {};
          const questions: Record<string, string> = {};
          const styles: Record<string, StyleOptions> = {};
          const themes: Record<string, string> = {};
          const refs: Record<string, string[]> = {};
          normalizedTypes.forEach((t: DocType) => {
            notes[t.id] = d.adminSettings?.[t.id]?.notes || '';
            const q = d.adminSettings?.[t.id]?.questions;
            questions[t.id] = Array.isArray(q) ? q.join('\n') : '';
            styles[t.id] = { ...DEFAULT_STYLE_OPTIONS, ...(d.adminSettings?.[t.id]?.styleOptions || {}) };
            themes[t.id] = themeToHex(d.adminSettings?.[t.id]?.theme);
            const rd = d.adminSettings?.[t.id]?.referenceDocs;
            refs[t.id] = Array.isArray(rd) ? rd : [];
          });
          setDocNotes(notes);
          setDocQuestions(questions);
          setDocStyles(styles);
          setDocThemes(themes);
          setDocRefs(refs);
        }
      })
      .catch(() => {});
  }

  async function saveModel(newModel: string) {
    setModel(newModel);
    setSavingModel(true);
    try {
      const settingsResp = await fetch('/api/document-creator/settings');
      const settingsData = await settingsResp.json();
      const updated = { ...(settingsData.adminSettings || {}), model: newModel };
      await fetch('/api/document-creator/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSettings: updated }),
      });
      showMsg(`Model switched to ${newModel === 'claude-haiku-4-5' ? 'Haiku ($0.03/doc)' : 'Sonnet ($0.10/doc)'}.`);
    } catch {
      showMsg('Failed to save model preference.', red);
    } finally {
      setSavingModel(false);
    }
  }

  async function patchSettings(patch: Record<string, unknown>) {
    const settingsResp = await fetch('/api/document-creator/settings');
    const settingsData = await settingsResp.json();
    const updated = { ...(settingsData.adminSettings || {}), ...patch };
    await fetch('/api/document-creator/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSettings: updated }),
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showMsg('Logo must be under 1 MB.', red); return; }
    setSavingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 400 / img.width, 200 / img.height);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      setLogo(dataUrl);
      await patchSettings({ logo: dataUrl });
      showMsg('Logo saved.');
    } catch { showMsg('Failed to save logo.', red); }
    finally { setSavingLogo(false); }
  }

  async function removeLogo() {
    setLogo('');
    setSavingLogo(true);
    try { await patchSettings({ logo: '' }); showMsg('Logo removed.'); }
    catch { showMsg('Failed to remove logo.', red); }
    finally { setSavingLogo(false); }
  }

  async function saveSchoolSettings() {
    setSavingSchool(true);
    try {
      const settingsResp = await fetch('/api/document-creator/settings');
      const settingsData = await settingsResp.json();
      const updated: Record<string, unknown> = { ...(settingsData.adminSettings || {}), schoolName, departments };
      docTypes.forEach(t => {
        updated[t.id] = {
          notes: docNotes[t.id] || '',
          questions: docQuestions[t.id] ? [docQuestions[t.id]] : [],
          styleOptions: docStyles[t.id] || DEFAULT_STYLE_OPTIONS,
          theme: themeToHex(docThemes[t.id]),
          referenceDocs: docRefs[t.id] || [],
        };
      });
      await fetch('/api/document-creator/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSettings: updated, docTypes }),
      });
      showMsg('School settings saved.');
    } catch { showMsg('Failed to save.', red); }
    finally { setSavingSchool(false); }
  }

  function addDocType() {
    if (!newTypeName.trim()) { showMsg('Enter a document type name.', red); return; }
    const id = newTypeName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (docTypes.find(t => t.id === id)) { showMsg('A type with that name already exists.', red); return; }
    setDocTypes([...docTypes, { id, label: newTypeName.trim(), icon: '📄', color: '#475569', desc: newTypeDesc.trim(), departmentId: newTypeDepartmentId }]);
    setDocNotes({ ...docNotes, [id]: '' });
    setSelectedDocTypeId(id);
    setNewTypeName('');
    setNewTypeDesc('');
  }

  function addDepartment() {
    const label = newDepartmentName.trim();
    if (!label) { showMsg('Enter a department name.', red); return; }
    const id = slugDepartment(label);
    if (!id) { showMsg('Use letters or numbers in the department name.', red); return; }
    if (departments.find(d => d.id === id)) { showMsg('That department already exists.', red); return; }
    setDepartments([...departments, { id, label }]);
    setSelectedDepartmentId(id);
    setNewTypeDepartmentId(id);
    setNewDepartmentName('');
  }

  function removeDepartment(id: string) {
    if (departments.length <= 1) { showMsg('Keep at least one department.', red); return; }
    if (docTypes.some(t => departmentForType(t) === id)) { showMsg('Move or remove documents in this department first.', red); return; }
    const remaining = departments.filter(d => d.id !== id);
    setDepartments(remaining);
    if (selectedDepartmentId === id) setSelectedDepartmentId(remaining[0]?.id || 'other');
    if (newTypeDepartmentId === id) setNewTypeDepartmentId(remaining[0]?.id || 'other');
  }

  async function removeDocType(id: string) {
    if (!confirm(`Remove this document type? Its requirements will also be deleted.`)) return;
    const remaining = docTypes.filter(t => t.id !== id);
    const newNotes = { ...docNotes }; delete newNotes[id];
    const newQuestions = { ...docQuestions }; delete newQuestions[id];
    const newStyles = { ...docStyles }; delete newStyles[id];
    const newThemes = { ...docThemes }; delete newThemes[id];
    const newRefs = { ...docRefs }; delete newRefs[id];

    setDocTypes(remaining);
    setDocNotes(newNotes);
    setDocQuestions(newQuestions);
    setDocStyles(newStyles);
    setDocThemes(newThemes);
    setDocRefs(newRefs);
    if (selectedDocTypeId === id) setSelectedDocTypeId(remaining[0]?.id || '');

    try {
      const settingsResp = await fetch('/api/document-creator/settings');
      const settingsData = await settingsResp.json();
      const updated: Record<string, unknown> = { ...(settingsData.adminSettings || {}), departments };
      delete updated[id];
      remaining.forEach(t => {
        updated[t.id] = {
          notes: newNotes[t.id] || '',
          questions: newQuestions[t.id] ? [newQuestions[t.id]] : [],
          styleOptions: newStyles[t.id] || DEFAULT_STYLE_OPTIONS,
          theme: themeToHex(newThemes[t.id]),
          referenceDocs: newRefs[t.id] || [],
        };
      });
      await fetch('/api/document-creator/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSettings: updated, docTypes: remaining }),
      });
      showMsg('Document type removed.');
    } catch {
      showMsg('Removed here, but failed to save — it may reappear on reload. Try again.', red);
    }
  }

  async function logout() {
    await fetch('/api/document-creator/auth/logout', { method: 'POST' });
    window.location.href = '/document-creator/login';
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: font, color: muted }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font }}>
      <div style={{ background: navy, color: '#fff', padding: '0 24px', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Document Creator Admin</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/document-creator" style={{ color: '#CBD5E1', fontSize: 13, textDecoration: 'none' }}>Open App</a>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #475569', color: '#CBD5E1', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: font }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '16px auto 24px', padding: '0 16px 24px' }}>
        {msg && (
          <div style={{ background: msgColor === green ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msgColor === green ? '#86EFAC' : '#FCA5A5'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: msgColor }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, background: '#E2E8F0', padding: 4, borderRadius: 12, marginBottom: 12 }}>
          {([
            { id: 'documents', label: 'Documents' },
            { id: 'school', label: 'School' },
            { id: 'teachers', label: 'Teachers' },
          ] as { id: typeof activeTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, border: 'none', borderRadius: 10, padding: '10px 12px', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? navy : muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, boxShadow: activeTab === tab.id ? '0 2px 8px rgba(15,23,42,.08)' : 'none' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'school' && (
          <>
            <Section title="School Profile">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>School / Institution Name<Help text="Shown on generated documents wherever the school name appears." /></div>
                  <Input value={schoolName} onChange={setSchoolName} placeholder="e.g. Riverside Technical College" />
                </div>
                <div>
                  <Btn onClick={saveSchoolSettings} disabled={savingSchool}>{savingSchool ? 'Saving...' : 'Save School Details'}</Btn>
                </div>
              </div>
            </Section>

            <Section title="Brand Assets">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {logo ? (
                  <div style={{ background: '#1E293B', borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 170 }}>
                    <img src={logo} style={{ height: 54, maxWidth: 180, objectFit: 'contain', display: 'block' }} alt="School logo" />
                  </div>
                ) : (
                  <div style={{ width: 160, height: 86, background: '#F8FAFC', border: `2px dashed ${border}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: muted }}>No logo yet</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={{ display: 'inline-block', background: blue, color: '#fff', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: savingLogo ? 'not-allowed' : 'pointer', opacity: savingLogo ? 0.6 : 1 }}>
                    {savingLogo ? 'Saving...' : logo ? 'Replace Logo' : 'Upload Logo'}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={savingLogo} style={{ display: 'none' }} />
                  </label>
                  {logo && (
                    <button onClick={removeLogo} disabled={savingLogo} style={{ marginLeft: 8, background: 'none', border: `1px solid ${border}`, borderRadius: 999, padding: '8px 14px', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: font }}>Remove</button>
                  )}
                  <div style={{ fontSize: 12, color: muted, marginTop: 10 }}>PNG, SVG, or JPG. Max 1 MB. Shown in the top-left of every generated document.</div>
                </div>
              </div>
            </Section>
          </>
        )}

        {activeTab === 'documents' && (
          <>
            <Section title="Reference Library">
              <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
                Keep school catalogs, program descriptions, and other source-of-truth files here so each document type can reference the right documents.
              </div>

              {loadingDocs ? (
                <div style={{ color: muted, fontSize: 13 }}>Loading...</div>
              ) : refDocs.length === 0 ? (
                <div style={{ color: muted, fontSize: 13, marginBottom: 10 }}>No reference documents yet. Add one below.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${border}` }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>File</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: muted, fontWeight: 600 }}>Size</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Added</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {refDocs.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: '8px 8px', color: navy, fontWeight: 500 }}>{d.name}</td>
                        <td style={{ padding: '8px 8px', color: muted }}>{d.filename}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', color: muted }}>{Math.round(d.chars / 1000).toLocaleString()}k chars</td>
                        <td style={{ padding: '8px 8px', color: muted }}>{new Date(d.uploadedAt).toLocaleDateString()}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                          <button onClick={() => removeDoc(d.id, d.name)} style={{ background: 'none', border: 'none', color: red, cursor: 'pointer', fontSize: 13, fontFamily: font }}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Input value={newDocName} onChange={setNewDocName} placeholder='Name (optional — e.g. "School Catalog 2026")' />
                <label style={{ display: 'inline-block', background: blue, color: '#fff', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: uploadingDoc ? 'not-allowed' : 'pointer', opacity: uploadingDoc ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                  {uploadingDoc ? 'Uploading...' : 'Upload File'}
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleDocUpload} disabled={uploadingDoc} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>PDF, Word, Excel, or plain text. Max 8 MB. Text is extracted automatically. If you leave the name blank, the filename is used.</div>
            </Section>

            <Section title="Document Setup">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Departments</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {departments.map(dep => (
                      <span key={dep.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${border}`, borderRadius: 999, padding: '6px 10px', fontSize: 12, color: navy, background: '#F8FAFC' }}>
                        {dep.label}
                        <button onClick={() => removeDepartment(dep.id)} style={{ border: 'none', background: 'transparent', color: muted, cursor: 'pointer', fontSize: 12 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Input value={newDepartmentName} onChange={setNewDepartmentName} placeholder="Add department" />
                    <Btn onClick={addDepartment}>+ Add</Btn>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Requirements Per Document Type<Help text="Pick a document type from the dropdown to configure it. Each type has its own requirements, style, theme, reference documents, and teacher questions -- settings don't carry over between types." /></div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>AI follows these exactly and they override teacher input.</div>
                  {docTypes.length === 0 ? (
                    <div style={{ fontSize: 12, color: muted }}>No document types yet — add one below.</div>
                  ) : (() => {
                    const docsInDepartment = docTypes.filter(dt => departmentForType(dt) === selectedDepartmentId);
                    const t = docsInDepartment.find(dt => dt.id === selectedDocTypeId) || docsInDepartment[0] || docTypes[0];
                    return (
                      <div style={{ border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ background: '#F8FAFC', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}` }}>
                          <select
                            value={t.id}
                            onChange={e => setSelectedDocTypeId(e.target.value)}
                            style={{ flex: 1, fontSize: 13, fontWeight: 600, color: navy, fontFamily: font, padding: '7px 8px', border: `1px solid ${border}`, borderRadius: 8, background: '#fff', cursor: 'pointer' }}
                          >
                            {(docsInDepartment.length ? docsInDepartment : docTypes).map(dt => (
                              <option key={dt.id} value={dt.id}>{dt.icon} {dt.label}</option>
                            ))}
                          </select>
                          <button onClick={() => removeDocType(t.id)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', color: muted, fontSize: 11, padding: '4px 8px', fontFamily: font }}>Remove</button>
                        </div>
                        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Admin Requirements<Help text="Rules the AI must follow exactly for this document type, overriding anything the teacher enters. Keep it as a tight, specific list — very long or open-ended requirements make the AI more likely to run out of room and cut the document short." /></div>
                            <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>AI follows these exactly and they override the teacher.</div>
                            <textarea value={docNotes[t.id] || ''} onChange={e => setDocNotes({ ...docNotes, [t.id]: e.target.value })} rows={5} placeholder={"e.g. Always include the attendance policy. Require OSHA PPE language.\nIf no grading scale is provided, use: 90-100 A, 80-89 B, 70-79 C, below 70 F.\nAlways format Teacher Name, Course, and Date at the top and bottom.\nDo not include a grading scale unless provided by the teacher."}
                              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, fontFamily: font, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5, outline: 'none' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Document Style<Help text="Optional formatting touches applied throughout the document for this type — e.g. numbered sections or a signature block. Leave all unchecked to let the AI choose formatting freely." /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'start', marginBottom: 10 }}>
                              <div>
                                <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 4 }}>Header style</div>
                                <select
                                  value={(docStyles[t.id] || DEFAULT_STYLE_OPTIONS).headerStyle || 'classic'}
                                  onChange={e => {
                                    const cur = docStyles[t.id] || DEFAULT_STYLE_OPTIONS;
                                    setDocStyles(prev => ({ ...prev, [t.id]: { ...cur, headerStyle: e.target.value } }));
                                  }}
                                  style={{ width: '100%', fontSize: 12, color: navy, fontFamily: font, padding: '6px 8px', border: `1px solid ${border}`, borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                                >
                                  {HEADER_STYLE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                </select>
                              </div>
                              <div style={{ fontSize: 11, color: muted, lineHeight: 1.45, paddingTop: 20 }}>
                                {HEADER_STYLE_OPTIONS.find(opt => opt.id === ((docStyles[t.id] || DEFAULT_STYLE_OPTIONS).headerStyle || 'classic'))?.desc}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                              {([
                                { key: 'lines' as const, label: 'Divider lines' },
                                { key: 'numbered' as const, label: 'Numbered sections' },
                                { key: 'infoBar' as const, label: 'Teacher info bar' },
                                { key: 'callouts' as const, label: 'Callout boxes' },
                                { key: 'checklist' as const, label: 'Checklist bullets' },
                                { key: 'signature' as const, label: 'Signature block' },
                                { key: 'pageNumbers' as const, label: 'Page numbers' },
                                { key: 'icons' as const, label: 'Section icons' },
                              ] as { key: Exclude<keyof StyleOptions, 'headerStyle'>; label: string }[]).map(opt => {
                                const cur = docStyles[t.id] || DEFAULT_STYLE_OPTIONS;
                                return (
                                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: navy }}>
                                    <input type="checkbox" checked={cur[opt.key]} onChange={() => setDocStyles(prev => ({ ...prev, [t.id]: { ...cur, [opt.key]: !cur[opt.key] } }))} style={{ flexShrink: 0 }} />
                                    {opt.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Document Theme<Help text="Sets the accent color used for this document type's header, borders, and table headings." /></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input type="color" value={themeToHex(docThemes[t.id])} onChange={e => setDocThemes(prev => ({ ...prev, [t.id]: e.target.value }))}
                                style={{ width: 44, height: 32, padding: 0, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                              <span style={{ fontSize: 12, color: muted, fontFamily: 'monospace' }}>{themeToHex(docThemes[t.id]).toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>Header background, section borders, and table headers for this document type.</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Reference Documents<Help text="Check any uploaded files (course catalogs, program descriptions, etc.) that should be pulled from as source material specifically for this document type. Upload new files from the Reference Documents section further up this page." /></div>
                            <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Selected documents are included as source material when generating this document type.</div>
                            {refDocs.length === 0 ? (
                              <div style={{ fontSize: 12, color: muted }}>No reference documents uploaded yet — see the Reference Documents section above.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {refDocs.map(d => {
                                  const selected = (docRefs[t.id] || []).includes(d.id);
                                  return (
                                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: navy }}>
                                      <input type="checkbox" checked={selected} onChange={() => {
                                        const cur = docRefs[t.id] || [];
                                        const next = selected ? cur.filter(id => id !== d.id) : [...cur, d.id];
                                        setDocRefs(prev => ({ ...prev, [t.id]: next }));
                                      }} style={{ flexShrink: 0 }} />
                                      {d.name}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Detailed Instructions<Help text="Shown to teachers as guidance above the description box when creating this document type — useful for telling them exactly what details the AI needs." /></div>
                            <textarea
                              value={docQuestions[t.id] || ''}
                              onChange={e => setDocQuestions({ ...docQuestions, [t.id]: e.target.value })}
                              rows={4}
                              placeholder={'What subject or course is this for?\nWhat level or grade?\nWhat topic or chapter?\nWhat types of questions? (multiple choice, short answer, etc.)'}
                              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, fontFamily: font, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5, outline: 'none' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ paddingTop: 10, borderTop: `1px solid ${border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Add Document Type</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <Input value={newTypeName} onChange={setNewTypeName} placeholder="Type name (e.g. Parent Letter)" />
                    <Input value={newTypeDesc} onChange={setNewTypeDesc} placeholder="Short description (optional)" />
                  </div>
                  <select
                    value={newTypeDepartmentId}
                    onChange={e => setNewTypeDepartmentId(e.target.value)}
                    style={{ width: '100%', fontSize: 13, color: navy, fontFamily: font, padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, background: '#fff', cursor: 'pointer', marginBottom: 8 }}
                  >
                    {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.label}</option>)}
                  </select>
                  <Btn onClick={addDocType}>+ Add Type</Btn>
                </div>

                <div>
                  <Btn onClick={saveSchoolSettings} disabled={savingSchool}>{savingSchool ? 'Saving...' : 'Save Document Settings'}</Btn>
                </div>
              </div>
            </Section>
          </>
        )}

        {activeTab === 'teachers' && (
          <>
            <Section title={`Teacher Management (${teachers.length})`}>
              {loadingTeachers ? (
                <div style={{ color: muted, fontSize: 13 }}>Loading...</div>
              ) : teachers.length === 0 ? (
                <div style={{ color: muted, fontSize: 13 }}>No teachers yet. Add one below.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${border}` }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>SharePoint Folder</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600 }}>Added</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.email} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: '8px 8px', color: navy, fontWeight: 500 }}>{t.name}</td>
                        <td style={{ padding: '8px 8px', color: muted }}>{t.email}</td>
                        <td style={{ padding: '8px 8px', color: muted }}>{t.sharepointFolderPath || <span style={{ fontStyle: 'italic' }}>Not set</span>}</td>
                        <td style={{ padding: '8px 8px', color: muted }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                          <button onClick={() => removeTeacher(t.email)} style={{ background: 'none', border: 'none', color: red, cursor: 'pointer', fontSize: 13, fontFamily: font }}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ borderTop: `1px solid ${border}`, marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Add Teacher</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Input value={newName} onChange={setNewName} placeholder="Full Name" />
                    <Input value={newEmail} onChange={setNewEmail} placeholder="email@school.edu" type="email" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Input value={newPass} onChange={setNewPass} placeholder="Temporary password (min 8 chars)" type="password" />
                    <Input value={newFolderPath} onChange={setNewFolderPath} placeholder="SharePoint folder (optional, e.g. Teachers/Ms.Lee)" />
                    <Btn onClick={addTeacher} disabled={adding}>{adding ? 'Adding...' : 'Add Teacher'}</Btn>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Access & Delivery">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Reset Password</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Input value={resetEmail} onChange={setResetEmail} placeholder="teacher@school.edu" type="email" />
                    <Input value={resetPass} onChange={setResetPass} placeholder="New password (min 8 chars)" type="password" />
                    <Btn onClick={resetPassword} disabled={resetting}>{resetting ? 'Saving...' : 'Reset'}</Btn>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>SharePoint Folder</div>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
                    Documents that teacher saves via "Save to SharePoint" go into this subfolder of the shared site's document library. Leave blank to disable the button for that teacher.
                    <Help text="Documents this teacher saves to SharePoint go into this subfolder of the shared site's document library. Leave blank to disable the Save to SharePoint button for this teacher." />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Input value={folderEmail} onChange={setFolderEmail} placeholder="teacher@school.edu" type="email" />
                    <Input value={folderPath} onChange={setFolderPath} placeholder="SharePoint folder path (e.g. Teachers/Ms.Lee)" />
                    <Btn onClick={saveFolderPath} disabled={savingFolder}>{savingFolder ? 'Saving...' : 'Save'}</Btn>
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}

        <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
          Account ID: <span style={{ fontFamily: 'monospace' }}>{session?.accountId}</span>
        </div>
      </div>
    </div>
  );
}
