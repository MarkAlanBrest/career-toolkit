'use client';

import { useEffect, useMemo, useState } from 'react';

type Course = { id: number; name: string; course_code?: string };
type Assignment = { id: number; name: string; points_possible?: number; needs_grading_count?: number };
type Attachment = { id?: number; filename?: string; display_name?: string; url?: string; preview_url?: string; 'content-type'?: string; content_type?: string };
type User = { id: number; name: string; sortable_name?: string };
type Submission = {
  id?: number;
  user_id: number;
  user?: User;
  workflow_state?: string;
  score?: number | null;
  grade?: string | null;
  body?: string | null;
  url?: string | null;
  attachments?: Attachment[];
  submitted_at?: string | null;
};

const S = {
  page: { minHeight: '100vh', background: '#f5f5f5', color: '#2d3b45', display: 'flex', flexDirection: 'column' as const },
  topbar: { height: 54, background: '#2d3b45', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', boxSizing: 'border-box' as const },
  shell: { display: 'grid', gridTemplateColumns: '300px minmax(420px, 1fr) 380px', gap: 0, flex: 1, minHeight: 0 },
  pane: { background: '#fff', borderRight: '1px solid #c7cdd1', minHeight: 0, overflow: 'auto' },
  rightPane: { background: '#fff', borderLeft: '1px solid #c7cdd1', minHeight: 0, overflow: 'auto' },
  section: { padding: 14, borderBottom: '1px solid #e6e8ea' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#5f6b73', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box' as const, border: '1px solid #c7cdd1', borderRadius: 4, padding: '8px 10px', fontSize: 14, color: '#2d3b45', background: '#fff' },
  button: { border: '1px solid #0b6f92', background: '#0b6f92', color: '#fff', borderRadius: 4, padding: '8px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #c7cdd1', background: '#fff', color: '#2d3b45', borderRadius: 4, padding: '8px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  subtle: { color: '#6b7780', fontSize: 12, lineHeight: 1.4 },
  title: { fontSize: 16, fontWeight: 800, margin: '0 0 4px' },
  textarea: { width: '100%', minHeight: 120, boxSizing: 'border-box' as const, border: '1px solid #c7cdd1', borderRadius: 4, padding: 10, fontSize: 13, lineHeight: 1.45, resize: 'vertical' as const, fontFamily: 'inherit' },
};

function cleanHtml(html: string) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function buildPrompt(args: { assignment?: Assignment; submission?: Submission; criteria: string; commentStyle: string; totalPoints: string }) {
  const student = args.submission?.user?.name?.split(' ')[0] || 'the student';
  const bodyText = args.submission?.body ? cleanHtml(args.submission.body) : '';
  const attachmentText = args.submission?.attachments?.length
    ? `\nAttachments: ${args.submission.attachments.map(a => a.filename || a.display_name || 'file').join(', ')}`
    : '';
  return `Grade this Canvas submission.
Assignment: ${args.assignment?.name || 'Current assignment'}
Total points: ${args.totalPoints || args.assignment?.points_possible || 100}
Comment style: ${args.commentStyle}

GRADING CRITERIA:
${args.criteria || 'Grade fairly using the assignment expectations. Be specific and concise.'}

SUBMISSION:
${bodyText || args.submission?.url || '(No text entry available. Use attachments or Canvas preview if needed.)'}${attachmentText}

Respond exactly like this:
SCORE: [number]
COMMENTS:
[student-facing feedback]
TEACHER CHECK:
[private items the teacher should verify before posting]`;
}

function parseAiResult(text: string) {
  const score = text.match(/SCORE:\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '';
  const commentsMatch = text.match(/COMMENTS:\s*([\s\S]*?)(?:TEACHER CHECK:|$)/i);
  const checkMatch = text.match(/TEACHER CHECK:\s*([\s\S]*)/i);
  return {
    score,
    comments: (commentsMatch?.[1] || text).trim(),
    teacherCheck: (checkMatch?.[1] || '').trim(),
  };
}

export default function GraderPage() {
  const [canvasBase, setCanvasBase] = useState('');
  const [token, setToken] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courseId, setCourseId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [criteria, setCriteria] = useState('');
  const [commentStyle, setCommentStyle] = useState('Encouraging, specific, and concise');
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [teacherCheck, setTeacherCheck] = useState('');
  const [status, setStatus] = useState('Connect to Canvas to load grading work.');
  const [busy, setBusy] = useState(false);

  const selectedAssignment = assignments.find(a => String(a.id) === assignmentId);
  const selectedSubmission = submissions.find(s => String(s.user_id) === studentId);
  const needsGrading = useMemo(() => submissions.filter(s => s.workflow_state === 'submitted' && (s.score == null || s.grade == null)), [submissions]);
  const totalPoints = String(selectedAssignment?.points_possible || 100);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedBase = localStorage.getItem('ce_grader_canvas_base') || '';
    const savedToken = localStorage.getItem('ce_grader_canvas_token') || '';
    setCanvasBase(params.get('canvasBase') || savedBase);
    setToken(savedToken);
    setCourseId(params.get('courseId') || '');
    setAssignmentId(params.get('assignmentId') || '');
  }, []);

  useEffect(() => {
    if (!courseId || !assignmentId) return;
    setCriteria(localStorage.getItem(`ce_grader_criteria_${courseId}_${assignmentId}`) || '');
  }, [courseId, assignmentId]);

  useEffect(() => {
    if (!courseId || !assignmentId) return;
    localStorage.setItem(`ce_grader_criteria_${courseId}_${assignmentId}`, criteria);
  }, [criteria, courseId, assignmentId]);

  useEffect(() => {
    if (!selectedSubmission) return;
    setScore(selectedSubmission.score == null ? '' : String(selectedSubmission.score));
    setComments('');
    setTeacherCheck('');
  }, [selectedSubmission?.user_id]);

  async function canvas(path: string, method = 'GET', body?: unknown) {
    const res = await fetch('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasBase, token, path, method, body }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Canvas request failed (${res.status})`);
    return data;
  }

  async function connect() {
    if (!canvasBase || !token) {
      setStatus('Enter your Canvas URL and API token first.');
      return;
    }
    setBusy(true);
    setStatus('Loading Canvas courses...');
    try {
      localStorage.setItem('ce_grader_canvas_base', canvasBase.replace(/\/$/, ''));
      localStorage.setItem('ce_grader_canvas_token', token);
      const data = await canvas('/api/v1/courses?enrollment_type=teacher&state[]=available&state[]=created&include[]=term&per_page=100');
      setCourses(Array.isArray(data) ? data : []);
      setStatus('Courses loaded.');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadAssignments(nextCourseId = courseId) {
    if (!nextCourseId) return;
    setBusy(true);
    setStatus('Loading assignments...');
    try {
      const data = await canvas(`/api/v1/courses/${nextCourseId}/assignments?order_by=due_at&per_page=100`);
      setAssignments(Array.isArray(data) ? data : []);
      setSubmissions([]);
      setAssignmentId('');
      setStudentId('');
      setStatus('Assignments loaded.');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadSubmissions(nextAssignmentId = assignmentId) {
    if (!courseId || !nextAssignmentId) return;
    setBusy(true);
    setStatus('Loading submissions that need grading...');
    try {
      const data = await canvas(`/api/v1/courses/${courseId}/assignments/${nextAssignmentId}/submissions?include[]=user&include[]=attachments&include[]=submission_comments&per_page=100`);
      const list = Array.isArray(data) ? data : [];
      setSubmissions(list);
      const first = list.find(s => s.workflow_state === 'submitted' && (s.score == null || s.grade == null)) || list[0];
      setStudentId(first ? String(first.user_id) : '');
      setStatus(`${list.length} submissions loaded.`);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateDraft() {
    if (!selectedSubmission || !selectedAssignment) {
      setStatus('Choose a submission first.');
      return;
    }
    setBusy(true);
    setStatus('Drafting AI feedback...');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 1200,
          messages: [{ role: 'user', content: buildPrompt({ assignment: selectedAssignment, submission: selectedSubmission, criteria, commentStyle, totalPoints }) }],
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'AI request failed');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          const evt = JSON.parse(raw);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            full += evt.delta.text;
          }
        }
      }
      const parsed = parseAiResult(full);
      setScore(parsed.score);
      setComments(parsed.comments);
      setTeacherCheck(parsed.teacherCheck);
      setStatus('AI draft ready. Review before saving.');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveGrade() {
    if (!selectedSubmission || !assignmentId) return;
    setBusy(true);
    setStatus('Saving grade and comment to Canvas...');
    try {
      await canvas(`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${selectedSubmission.user_id}`, 'PUT', {
        submission: score ? { posted_grade: score } : undefined,
        comment: comments ? { text_comment: comments } : undefined,
      });
      setStatus('Saved to Canvas.');
      await loadSubmissions(assignmentId);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={S.page}>
      <header style={S.topbar}>
        <div>
          <strong style={{ fontSize: 17 }}>Canvas Enhancer Grader</strong>
          <span style={{ marginLeft: 12, color: '#c8d8e4', fontSize: 13 }}>SpeedGrader-style workspace with AI feedback built in</span>
        </div>
        <div style={{ fontSize: 12, color: busy ? '#f8d775' : '#d9e4ea' }}>{status}</div>
      </header>

      <div style={S.shell}>
        <aside style={S.pane}>
          <section style={S.section}>
            <label style={S.label}>Canvas URL</label>
            <input style={S.input} value={canvasBase} onChange={e => setCanvasBase(e.target.value)} placeholder="https://school.instructure.com" />
            <label style={{ ...S.label, marginTop: 10 }}>Canvas API Token</label>
            <input style={S.input} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token" />
            <button style={{ ...S.button, width: '100%', marginTop: 10 }} onClick={connect} disabled={busy}>Connect</button>
          </section>

          <section style={S.section}>
            <label style={S.label}>Course</label>
            <select style={S.input} value={courseId} onChange={e => { setCourseId(e.target.value); loadAssignments(e.target.value); }}>
              <option value="">Choose course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name || c.course_code}</option>)}
            </select>
            <label style={{ ...S.label, marginTop: 10 }}>Assignment</label>
            <select style={S.input} value={assignmentId} onChange={e => { setAssignmentId(e.target.value); loadSubmissions(e.target.value); }}>
              <option value="">Choose assignment</option>
              {assignments.map(a => <option key={a.id} value={a.id}>{a.name}{a.needs_grading_count ? ` (${a.needs_grading_count})` : ''}</option>)}
            </select>
          </section>

          <section style={S.section}>
            <h2 style={S.title}>Needs Grading</h2>
            <p style={{ ...S.subtle, marginTop: 0 }}>{needsGrading.length} submitted items in this assignment.</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {(needsGrading.length ? needsGrading : submissions).map(s => (
                <button
                  key={s.user_id}
                  onClick={() => setStudentId(String(s.user_id))}
                  style={{
                    ...S.secondaryButton,
                    textAlign: 'left',
                    borderColor: String(s.user_id) === studentId ? '#0b6f92' : '#c7cdd1',
                    background: String(s.user_id) === studentId ? '#eef8fb' : '#fff',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 800 }}>{s.user?.name || `Student ${s.user_id}`}</span>
                  <span style={S.subtle}>{s.score == null ? 'Ungraded' : `Score: ${s.score}`} · {formatDate(s.submitted_at)}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section style={{ background: '#f8f9fa', minHeight: 0, overflow: 'auto' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #c7cdd1', background: '#fff' }}>
            <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>{selectedAssignment?.name || 'Choose an assignment'}</h1>
            <div style={S.subtle}>{selectedSubmission?.user?.name || 'No student selected'} · {totalPoints} possible points</div>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ background: '#fff', border: '1px solid #c7cdd1', borderRadius: 4, minHeight: 420, padding: 18 }}>
              <h2 style={S.title}>Submission Preview</h2>
              {selectedSubmission?.body ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 14 }}>{cleanHtml(selectedSubmission.body)}</div>
              ) : selectedSubmission?.url ? (
                <a href={selectedSubmission.url} target="_blank" rel="noreferrer">Open submitted URL</a>
              ) : selectedSubmission?.attachments?.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedSubmission.attachments.map((a, i) => (
                    <a key={i} href={a.url || a.preview_url || '#'} target="_blank" rel="noreferrer" style={{ color: '#0b6f92', fontWeight: 700 }}>
                      {a.filename || a.display_name || `Attachment ${i + 1}`}
                    </a>
                  ))}
                </div>
              ) : (
                <p style={S.subtle}>No submission selected yet.</p>
              )}
            </div>
          </div>
        </section>

        <aside style={S.rightPane}>
          <section style={S.section}>
            <h2 style={S.title}>Grading Criteria</h2>
            <textarea style={{ ...S.textarea, minHeight: 170 }} value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Paste rubric, answer key, or grading rules for this assignment." />
            <label style={{ ...S.label, marginTop: 10 }}>Comment Style</label>
            <input style={S.input} value={commentStyle} onChange={e => setCommentStyle(e.target.value)} />
          </section>

          <section style={S.section}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...S.button, flex: 1 }} onClick={generateDraft} disabled={busy || !selectedSubmission}>AI Draft</button>
              <button style={{ ...S.secondaryButton, flex: 1 }} onClick={() => { setScore(''); setComments(''); setTeacherCheck(''); }}>Clear</button>
            </div>
          </section>

          <section style={S.section}>
            <label style={S.label}>Score</label>
            <input style={S.input} value={score} onChange={e => setScore(e.target.value)} placeholder={`0-${totalPoints}`} />
            <label style={{ ...S.label, marginTop: 12 }}>Student Comments</label>
            <textarea style={{ ...S.textarea, minHeight: 190 }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Feedback to post in Canvas." />
            <label style={{ ...S.label, marginTop: 12 }}>Teacher Check</label>
            <textarea style={{ ...S.textarea, minHeight: 90, background: '#fffdf4' }} value={teacherCheck} onChange={e => setTeacherCheck(e.target.value)} placeholder="Private notes for you before posting." />
            <button style={{ ...S.button, width: '100%', marginTop: 12, background: '#2f855a', borderColor: '#2f855a' }} onClick={saveGrade} disabled={busy || !selectedSubmission}>
              Save to Canvas
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
