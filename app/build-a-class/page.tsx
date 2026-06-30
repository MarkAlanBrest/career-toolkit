'use client';

import { useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type CheckKey = 'quiz' | 'vocab' | 'discussion' | 'written' | 'group' | 'reading' | 'video' | 'midterm';
type Checks = Record<CheckKey, boolean>;

interface ModuleEntry {
  id: number;
  name: string;
  description: string;
  notes: string;
  checks: Checks;
  files: File[];
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const blue = '#0770B8';
const ink = '#1B303D';
const muted = '#5A6E7A';
const line = '#D8E1E8';
const bg = '#F7F9FA';
const red = '#B91C1C';
const green = '#15803D';
const font = `"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

const card: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${line}`,
  borderRadius: 10,
  padding: '24px',
  marginBottom: 16,
};
const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  border: `1px solid ${line}`,
  borderRadius: 6,
  fontSize: 14,
  fontFamily: font,
  color: ink,
  outline: 'none',
  background: '#fff',
};
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 90 };
const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
  marginBottom: 5,
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: blue,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: font,
};
const secondaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: '#fff',
  color: ink,
  border: `1px solid ${line}`,
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: font,
};

const CHECK_LABELS: Record<CheckKey, string> = {
  quiz:       'Quiz',
  vocab:      'Vocabulary / Key Terms',
  discussion: 'Discussion post',
  written:    'Written / reflection assignment',
  group:      'Group project',
  reading:    'Reading / article activity',
  video:      'Video activity',
  midterm:    'Midterm exam',
};
const CHECK_KEYS = Object.keys(CHECK_LABELS) as CheckKey[];

function blankModule(): ModuleEntry {
  return {
    id: Date.now(),
    name: '', description: '', notes: '',
    checks: { quiz: false, vocab: false, discussion: false, written: false, group: false, reading: false, video: false, midterm: false },
    files: [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BuildAClass() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 fields
  const [teacherName, setTeacherName]   = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [className, setClassName]       = useState('');
  const [subject, setSubject]           = useState('');
  const [gradeLevel, setGradeLevel]     = useState('');
  const [description, setDescription]   = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);

  // Step 2 module state
  const [savedModules, setSavedModules] = useState<ModuleEntry[]>([]);
  const [mod, setMod]                   = useState<ModuleEntry>(blankModule());

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState('');
  const [error, setError]           = useState('');

  const syllabusRef = useRef<HTMLInputElement>(null);
  const filesRef    = useRef<HTMLInputElement>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function goToModules() {
    if (!teacherName.trim())                                        return setError('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail.trim())) return setError('Please enter a valid email address.');
    if (!className.trim())                                          return setError('Please enter the class name.');
    setError('');
    setStep(2);
  }

  function saveModule(andReview: boolean) {
    if (!mod.name.trim()) return setError('Please enter a name for this module.');
    setError('');
    const updated = [...savedModules, mod];
    setSavedModules(updated);
    if (andReview) setStep(3);
    else setMod(blankModule());
  }

  function setCheck(key: CheckKey, val: boolean) {
    setMod(m => ({ ...m, checks: { ...m.checks, [key]: val } }));
  }

  function addFiles(newFiles: File[]) {
    setMod(m => ({ ...m, files: [...m.files, ...newFiles] }));
  }

  function removeFile(index: number) {
    setMod(m => ({ ...m, files: m.files.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      // Collect all files to upload
      type UploadJob = { file: File; key: string };
      const jobs: UploadJob[] = [];
      if (syllabusFile) jobs.push({ file: syllabusFile, key: 'syllabus' });
      for (const m of savedModules) {
        for (const f of m.files) jobs.push({ file: f, key: `mod_${m.id}` });
      }

      // Validate sizes client-side (20MB per file)
      for (const { file } of jobs) {
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 20 MB per file).`);
        }
      }

      // Upload files one at a time
      const urlMap: Record<string, Array<{ name: string; url: string }>> = {};
      for (let i = 0; i < jobs.length; i++) {
        const { file, key } = jobs[i];
        setProgress(`Uploading file ${i + 1} of ${jobs.length}…`);
        const fd = new FormData();
        fd.append('file', file);
        const res  = await fetch('/api/build-a-class/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to upload ${file.name}.`);
        if (!urlMap[key]) urlMap[key] = [];
        urlMap[key].push({ name: file.name, url: data.url });
      }

      setProgress('Sending your class details…');

      const payload = {
        teacherName,
        teacherEmail,
        classInfo: { className, subject, gradeLevel, description, specialNotes, syllabusUrl: urlMap['syllabus']?.[0]?.url || '' },
        modules: savedModules.map(m => ({
          name: m.name,
          description: m.description,
          notes: m.notes,
          checks: m.checks,
          files: urlMap[`mod_${m.id}`] || [],
        })),
      };

      const res  = await fetch('/api/build-a-class/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed. Please try again.');

      setStep(4);
    } catch (err: unknown) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  }

  // ── Shared elements ───────────────────────────────────────────────────────────
  const outer: React.CSSProperties = { minHeight: '100vh', background: bg, fontFamily: font, color: ink, padding: '40px 20px 80px' };
  const wrap:  React.CSSProperties = { maxWidth: 660, margin: '0 auto' };

  const header = (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ display: 'inline-block', background: blue, color: '#fff', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', marginBottom: 10, textTransform: 'uppercase' }}>
        Canvas Class Builder
      </div>
      <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: ink }}>Build a Custom Canvas Class</h1>
      <p style={{ margin: 0, color: muted, fontSize: 15 }}>Tell me about your class and I'll build it for you in Canvas LMS.</p>
    </div>
  );

  const stepLabels = ['Class Info', 'Modules', 'Review'];
  const stepBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {stepLabels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: active ? blue : done ? green : muted, fontWeight: active || done ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: active ? blue : done ? green : '#E5E7EB', color: active || done ? '#fff' : muted, flexShrink: 0 }}>
                {done ? '✓' : n}
              </div>
              {label}
            </div>
            {i < stepLabels.length - 1 && <div style={{ flex: 1, height: 1, background: line, margin: '0 10px' }} />}
          </div>
        );
      })}
    </div>
  );

  const errorBox = error
    ? <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: red, fontSize: 13, marginBottom: 16 }}>{error}</div>
    : null;

  // ── Step 4: Done ──────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <div style={outer}>
        <div style={{ ...wrap, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 54, marginBottom: 16 }}>✅</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 24, color: ink }}>Your class is on its way!</h1>
          <p style={{ color: muted, fontSize: 15, maxWidth: 420, margin: '0 auto 12px' }}>
            I received everything and will get started building your Canvas class. I&apos;ll reach out to <strong>{teacherEmail}</strong> when it&apos;s ready.
          </p>
          <p style={{ color: muted, fontSize: 13 }}>Typical turnaround: 1–3 business days.</p>
        </div>
      </div>
    );
  }

  // ── Step 1: Class Info ────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={outer}>
        <div style={wrap}>
          {header}
          {stepBar}
          {errorBox}
          <div style={card}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>About Your Class</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Your Name <span style={{ color: red }}>*</span></label>
                <input style={input} value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label style={lbl}>Your Email <span style={{ color: red }}>*</span></label>
                <input style={input} type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} placeholder="jane@school.edu" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Class Name <span style={{ color: red }}>*</span></label>
              <input style={input} value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. AP US History" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Subject</label>
                <input style={input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Biology, English" />
              </div>
              <div>
                <label style={lbl}>Grade / Course Level</label>
                <input style={input} value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} placeholder="e.g. 10th Grade, Freshman" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Class Description</label>
              <textarea style={textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this class about? What do you want students to take away?" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Notes for Me</label>
              <textarea style={textarea} value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Specific requests, teaching style, grading preferences, anything else I should know..." />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Syllabus (optional)</label>
              <div
                style={{ border: `1px dashed ${line}`, borderRadius: 6, padding: '14px', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: syllabusFile ? green : muted, background: '#FAFBFC' }}
                onClick={() => syllabusRef.current?.click()}
              >
                {syllabusFile ? `✓ ${syllabusFile.name}` : 'Click to upload syllabus (PDF, Word, etc.)'}
              </div>
              <input ref={syllabusRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={e => { setSyllabusFile(e.target.files?.[0] || null); e.target.value = ''; }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={primaryBtn} onClick={goToModules}>Next: Add Modules →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Modules ───────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={outer}>
        <div style={wrap}>
          {header}
          {stepBar}
          {errorBox}

          {/* Saved modules list */}
          {savedModules.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7 }}>
                Saved ({savedModules.length})
              </div>
              {savedModules.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: `1px solid ${line}`, borderRadius: 6, marginBottom: 5, fontSize: 13 }}>
                  <span style={{ background: green, color: '#fff', borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>✓</span>
                  <span style={{ fontWeight: 600 }}>Module {i + 1}: {m.name}</span>
                  {m.files.length > 0 && <span style={{ color: muted, marginLeft: 2 }}>· {m.files.length} file{m.files.length !== 1 ? 's' : ''}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Current module form */}
          <div style={card}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Module {savedModules.length + 1}</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Module Name <span style={{ color: red }}>*</span></label>
              <input style={input} value={mod.name} onChange={e => { const v = e.target.value; setMod(m => ({ ...m, name: v })); }} placeholder="e.g. The American Revolution" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>What does this module cover?</label>
              <textarea style={{ ...textarea, minHeight: 100 }} value={mod.description} onChange={e => { const v = e.target.value; setMod(m => ({ ...m, description: v })); }} placeholder="Learning objectives, topics covered, key concepts students should understand..." />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ ...lbl, marginBottom: 10 }}>Include in this module</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {CHECK_KEYS.map(key => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '8px 10px', border: `1px solid ${mod.checks[key] ? blue : line}`, borderRadius: 6, background: mod.checks[key] ? '#EFF6FF' : '#fff', userSelect: 'none' }}>
                    <input type="checkbox" checked={mod.checks[key]} onChange={e => setCheck(key, e.target.checked)} style={{ accentColor: blue, width: 15, height: 15, flexShrink: 0 }} />
                    {CHECK_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Content Notes (optional)</label>
              <textarea style={{ ...textarea, minHeight: 100 }} value={mod.notes} onChange={e => { const v = e.target.value; setMod(m => ({ ...m, notes: v })); }} placeholder="Paste lesson plans, reading excerpts, notes, or anything you want me to reference for this module..." />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Files for this module (optional)</label>
              <div
                style={{ border: `1px dashed ${line}`, borderRadius: 6, padding: '14px', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: muted, background: '#FAFBFC' }}
                onClick={() => filesRef.current?.click()}
              >
                {mod.files.length > 0 ? `${mod.files.length} file${mod.files.length !== 1 ? 's' : ''} selected — click to add more` : 'Click to upload files (PDF, Word, images, etc.)'}
              </div>
              <input ref={filesRef} type="file" multiple style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.csv,.pptx,.ppt" onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
              {mod.files.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mod.files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', border: `1px solid ${blue}33`, borderRadius: 4, padding: '3px 8px', fontSize: 12 }}>
                      {f.name}
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: muted, fontSize: 16, padding: '0 0 0 3px', lineHeight: 1 }} onClick={() => removeFile(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={secondaryBtn} onClick={() => saveModule(false)}>Save & Add Another Module</button>
              <button style={primaryBtn} onClick={() => saveModule(true)}>Review My Class →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Review & Submit ────────────────────────────────────────────────────
  return (
    <div style={outer}>
      <div style={wrap}>
        {header}
        {stepBar}

        {/* Class summary */}
        <div style={card}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Class Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 14 }}>
            <div><span style={{ color: muted }}>Teacher: </span>{teacherName}</div>
            <div><span style={{ color: muted }}>Email: </span>{teacherEmail}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: muted }}>Class: </span><strong>{className}</strong></div>
            {subject    && <div><span style={{ color: muted }}>Subject: </span>{subject}</div>}
            {gradeLevel && <div><span style={{ color: muted }}>Level: </span>{gradeLevel}</div>}
            {syllabusFile && <div><span style={{ color: muted }}>Syllabus: </span>{syllabusFile.name}</div>}
          </div>
          {description   && <p style={{ margin: '12px 0 0', fontSize: 13, color: muted }}>{description}</p>}
          {specialNotes  && <p style={{ margin: '10px 0 0', fontSize: 13, color: muted, fontStyle: 'italic' }}>Notes: {specialNotes}</p>}
        </div>

        {/* Modules list */}
        <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>
          {savedModules.length} Module{savedModules.length !== 1 ? 's' : ''}
        </h3>
        {savedModules.map((m, i) => {
          const included = CHECK_KEYS.filter(k => m.checks[k]);
          return (
            <div key={m.id} style={{ ...card, padding: '16px 20px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Module {i + 1}: {m.name}</div>
              {m.description && <p style={{ margin: '0 0 8px', fontSize: 13, color: muted }}>{m.description}</p>}
              {included.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {included.map(k => (
                    <span key={k} style={{ background: '#EFF6FF', color: blue, border: `1px solid ${blue}33`, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                      {CHECK_LABELS[k]}
                    </span>
                  ))}
                </div>
              )}
              {m.files.length > 0 && <div style={{ fontSize: 12, color: muted }}>{m.files.length} file{m.files.length !== 1 ? 's' : ''} attached</div>}
            </div>
          );
        })}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8 }}>
          <button style={secondaryBtn} onClick={() => setStep(2)}>← Add More Modules</button>
          <button
            style={{ ...primaryBtn, opacity: submitting ? 0.65 : 1, cursor: submitting ? 'default' : 'pointer' }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (progress || 'Submitting…') : 'Submit My Class →'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: red, fontSize: 13, marginTop: 14 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
