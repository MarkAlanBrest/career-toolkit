import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, FileDown, Loader2, Moon, Printer, Search, Sun, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportCatalog } from '../data/reportCatalog';
import { buildCourseHealth, buildMissingWorkRows, buildStudentMetrics } from '../reports/builders';
import { CanvasClient } from '../services/canvasClient';
import { NotesStore } from '../services/notesStore';
import type { CanvasCourse, CanvasEnrollment, CanvasSubmission, CanvasUser } from '../types/canvas';
import type { ReportId, StudentMetrics } from '../types/reports';
import { downloadCsv } from '../utils/exportCsv';
import { exportElementPdf } from '../utils/exportPdf';
import { formatDate, formatDateTime, formatPercent, formatScore } from '../utils/format';

type AppProps = {
  courseId: string;
  onClose: () => void;
};

export function App({ courseId, onClose }: AppProps) {
  const client = useMemo(() => new CanvasClient(), []);
  const notesStore = useMemo(() => new NotesStore(), []);
  const printRef = useRef<HTMLDivElement>(null);
  const [activeReport, setActiveReport] = useState<ReportId>('student-snapshot');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<CanvasCourse | null>(null);
  const [students, setStudents] = useState<CanvasUser[]>([]);
  const [enrollments, setEnrollments] = useState<CanvasEnrollment[]>([]);
  const [submissions, setSubmissions] = useState<CanvasSubmission[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [courseData, studentData, enrollmentData, submissionData] = await Promise.all([
          client.getCurrentCourse(courseId),
          client.getStudents(courseId),
          client.getEnrollments(courseId),
          client.getSubmissions(courseId, 'all'),
        ]);
        if (!active) return;
        setCourse(courseData);
        setStudents(studentData);
        setEnrollments(enrollmentData);
        setSubmissions(submissionData);
        setSelectedStudentId(studentData[0]?.id || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [client, courseId]);

  const selectedStudent = students.find(student => student.id === selectedStudentId) || null;
  const studentMetrics = selectedStudent ? buildStudentMetrics(selectedStudent, enrollments, submissions) : null;
  const courseHealth = course ? buildCourseHealth(course, enrollments, submissions) : null;
  const missingRows = buildMissingWorkRows(students, submissions);
  const filteredStudents = students.filter(student => student.name.toLowerCase().includes(studentSearch.toLowerCase()));

  function csvRows() {
    if (activeReport === 'missing-work') return missingRows;
    if (activeReport === 'course-health' && courseHealth) return [courseHealth];
    if (studentMetrics) {
      return [{
        student: studentMetrics.student.name,
        currentGrade: studentMetrics.currentGrade,
        currentScore: studentMetrics.currentScore,
        missingCount: studentMetrics.missingCount,
        lateCount: studentMetrics.lateCount,
        submissionRate: studentMetrics.submissionRate,
        lastCourseActivity: studentMetrics.lastCourseActivity,
      }];
    }
    return [];
  }

  async function exportPdf() {
    if (!printRef.current) return;
    await exportElementPdf(printRef.current, `${activeReport}.pdf`);
  }

  const shellClass = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';

  return (
    <div id="crp-root" className={`fixed inset-0 z-[100000] ${shellClass}`}>
      <div className="flex h-full">
        <aside className={`crp-no-print w-72 border-r ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} flex flex-col`}>
          <div className="flex items-center gap-2 border-b border-slate-200/20 px-4 py-4">
            <BarChart3 className="h-5 w-5 text-canvas-blue" />
            <div>
              <div className="text-sm font-black uppercase tracking-wide">Canvas Reports Pro</div>
              <div className="text-xs opacity-70">{course?.name || `Course ${courseId}`}</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {reportCatalog.map(report => (
              <button
                key={report.id}
                type="button"
                onClick={() => setActiveReport(report.id)}
                className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  activeReport === report.id ? 'bg-canvas-blue text-white' : darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">{report.title}</div>
                <div className={`text-xs ${activeReport === report.id ? 'text-blue-50' : 'opacity-65'}`}>{report.description}</div>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className={`crp-no-print flex items-center justify-between border-b px-5 py-3 ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-black">{reportCatalog.find(report => report.id === activeReport)?.title}</h1>
                <p className="text-xs opacity-70">Canvas data only. No AI predictions or generated conclusions.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border px-3 py-2 text-sm font-bold" onClick={() => window.print()} type="button"><Printer className="mr-1 inline h-4 w-4" />Print</button>
              <button className="rounded-md border px-3 py-2 text-sm font-bold" onClick={exportPdf} type="button"><FileDown className="mr-1 inline h-4 w-4" />PDF</button>
              <button className="rounded-md border px-3 py-2 text-sm font-bold" onClick={() => downloadCsv(`${activeReport}.csv`, csvRows())} type="button">CSV</button>
              <button className="rounded-md border p-2" onClick={() => setDarkMode(value => !value)} type="button" aria-label="Toggle dark mode">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className="rounded-md border p-2" onClick={onClose} type="button" aria-label="Close reports"><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading && <LoadingState />}
            {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {!loading && !error && (
              <div ref={printRef} id="crp-print-area" className={`mx-auto max-w-6xl rounded-md border p-6 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <ReportContextBar
                  students={filteredStudents}
                  selectedStudentId={selectedStudentId}
                  setSelectedStudentId={setSelectedStudentId}
                  studentSearch={studentSearch}
                  setStudentSearch={setStudentSearch}
                  showStudentSelector={activeReport.startsWith('student') || activeReport === 'grade-documentation' || activeReport === 'communication-timeline'}
                />
                {activeReport === 'student-snapshot' && studentMetrics && <StudentSnapshot metrics={studentMetrics} />}
                {activeReport === 'student-conference' && studentMetrics && <StudentConference metrics={studentMetrics} />}
                {activeReport === 'course-health' && courseHealth && <CourseHealth metrics={courseHealth} />}
                {activeReport === 'missing-work' && <MissingWork rows={missingRows} />}
                {activeReport === 'communication-timeline' && studentMetrics && <CommunicationTimeline metrics={studentMetrics} />}
                {activeReport === 'student-case-file' && studentMetrics && <StudentCaseFile metrics={studentMetrics} />}
                {activeReport === 'instructor-notes' && selectedStudent && <InstructorNotes courseId={courseId} student={selectedStudent} notesStore={notesStore} />}
                {activeReport === 'no-login' && <NoLogin students={students} enrollments={enrollments} />}
                {activeReport === 'grade-documentation' && studentMetrics && <GradeDocumentation metrics={studentMetrics} />}
                {activeReport === 'assignment-analytics' && <Placeholder title="Assignment Analytics" />}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="flex h-72 items-center justify-center text-sm opacity-70"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading Canvas report data...</div>;
}

function ReportContextBar(props: {
  students: CanvasUser[];
  selectedStudentId: number | null;
  setSelectedStudentId: (id: number) => void;
  studentSearch: string;
  setStudentSearch: (value: string) => void;
  showStudentSelector: boolean;
}) {
  if (!props.showStudentSelector) return null;
  return (
    <div className="crp-no-print mb-5 grid gap-3 md:grid-cols-[1fr_260px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900" value={props.studentSearch} onChange={event => props.setStudentSearch(event.target.value)} placeholder="Search students" />
      </label>
      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900" value={props.selectedStudentId || ''} onChange={event => props.setSelectedStudentId(Number(event.target.value))}>
        {props.students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
      </select>
    </div>
  );
}

function StudentSnapshot({ metrics }: { metrics: StudentMetrics }) {
  return (
    <section>
      <ReportTitle title="Student Snapshot Report" subtitle={metrics.student.name} />
      <MetricGrid items={[
        ['Current Grade', metrics.currentGrade],
        ['Current Score', formatScore(metrics.currentScore)],
        ['Missing Assignments', metrics.missingCount],
        ['Late Assignments', metrics.lateCount],
        ['Submission Rate', formatPercent(metrics.submissionRate)],
        ['Discussion Participation', metrics.discussionParticipation],
        ['Last Login', formatDate(metrics.lastLogin)],
        ['Last Course Activity', formatDateTime(metrics.lastCourseActivity)],
      ]} />
      <TwoColumnNotes />
    </section>
  );
}

function StudentConference({ metrics }: { metrics: StudentMetrics }) {
  return (
    <section>
      <ReportTitle title="Student Conference Report" subtitle={metrics.student.name} />
      <MetricGrid items={[
        ['Current Grade', metrics.currentGrade],
        ['Current Score', formatScore(metrics.currentScore)],
        ['Missing Work', metrics.missingCount],
        ['Late Work', metrics.lateCount],
      ]} />
      <GradeDocumentation metrics={metrics} compact />
      <TwoColumnNotes includeActionPlan />
    </section>
  );
}

function CourseHealth({ metrics }: { metrics: ReturnType<typeof buildCourseHealth> }) {
  return (
    <section>
      <ReportTitle title="Course Health Report" subtitle={metrics.courseName} />
      <MetricGrid items={[
        ['Students', metrics.studentCount],
        ['Course Average', formatScore(metrics.courseAverage)],
        ['Highest Grade', formatScore(metrics.highestGrade)],
        ['Lowest Grade', formatScore(metrics.lowestGrade)],
        ['Missing Assignments', metrics.missingAssignmentCount],
        ['Late Assignments', metrics.lateAssignmentCount],
        ['Inactive Students', metrics.inactiveStudentCount],
      ]} />
      <div className="mt-6 h-72 rounded-md border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.gradeDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#0770B8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MissingWork({ rows }: { rows: ReturnType<typeof buildMissingWorkRows> }) {
  return (
    <section>
      <ReportTitle title="Missing Work Report" subtitle={`${rows.length} missing assignment records`} />
      <DataTable headers={['Student', 'Assignment', 'Due Date', 'Days Overdue']} rows={rows.map(row => [row.studentName, row.assignmentName, formatDate(row.dueDate), row.daysOverdue ?? 'N/A'])} />
    </section>
  );
}

function CommunicationTimeline({ metrics }: { metrics: StudentMetrics }) {
  const events = metrics.submissions
    .flatMap(submission => (submission.submission_comments || []).map(comment => ({
      date: comment.created_at,
      title: submission.assignment?.name || 'Assignment comment',
      body: comment.comment,
      author: comment.author_name,
    })))
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section>
      <ReportTitle title="Communication Timeline Report" subtitle={metrics.student.name} />
      <div className="space-y-3">
        {events.length ? events.map(event => (
          <div key={`${event.date}-${event.title}`} className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">{formatDateTime(event.date)} by {event.author}</div>
            <div className="mt-1 font-bold">{event.title}</div>
            <p className="mt-1 text-sm text-slate-700">{event.body}</p>
          </div>
        )) : <EmptyReport message="No submission comments found in loaded Canvas data." />}
      </div>
    </section>
  );
}

function StudentCaseFile({ metrics }: { metrics: StudentMetrics }) {
  return (
    <section>
      <ReportTitle title="Student Case File" subtitle={metrics.student.name} />
      <StudentSnapshot metrics={metrics} />
      <GradeDocumentation metrics={metrics} compact />
      <CommunicationTimeline metrics={metrics} />
    </section>
  );
}

function InstructorNotes({ courseId, student, notesStore }: { courseId: string; student: CanvasUser; notesStore: NotesStore }) {
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);

  useEffect(() => {
    notesStore.notesForStudent(courseId, String(student.id)).then(setNotes);
  }, [courseId, notesStore, student.id]);

  async function save() {
    if (!body.trim()) return;
    await notesStore.saveNote({ courseId, studentId: String(student.id), studentName: student.name, body: body.trim(), tags: [] });
    setBody('');
    setNotes(await notesStore.notesForStudent(courseId, String(student.id)));
  }

  return (
    <section>
      <ReportTitle title="Instructor Notes" subtitle={student.name} />
      <div className="crp-no-print mb-4">
        <textarea className="min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900" value={body} onChange={event => setBody(event.target.value)} placeholder="Add a private instructor note..." />
        <button className="mt-2 rounded-md bg-canvas-blue px-4 py-2 text-sm font-bold text-white" onClick={save} type="button">Save Note</button>
      </div>
      <div className="space-y-3">
        {notes.map(note => (
          <div key={note.id} className="rounded-md border border-slate-200 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">{formatDateTime(note.createdAt)}</div>
            <p className="mt-1 text-sm">{note.body}</p>
          </div>
        ))}
        {!notes.length && <EmptyReport message="No instructor notes saved for this student." />}
      </div>
    </section>
  );
}

function NoLogin({ students, enrollments }: { students: CanvasUser[]; enrollments: CanvasEnrollment[] }) {
  const rows = enrollments
    .filter(enrollment => !enrollment.last_activity_at || (daysAgo(enrollment.last_activity_at) ?? 0) >= 7)
    .map(enrollment => {
      const student = students.find(item => item.id === enrollment.user_id);
      return [student?.name || `Student ${enrollment.user_id}`, formatDateTime(enrollment.last_activity_at), daysAgo(enrollment.last_activity_at) ?? 'N/A'];
    });
  return (
    <section>
      <ReportTitle title="No Login Report" subtitle="Students with no course activity in 7 or more days" />
      <DataTable headers={['Student', 'Last Course Activity', 'Days Since Activity']} rows={rows} />
    </section>
  );
}

function GradeDocumentation({ metrics, compact = false }: { metrics: StudentMetrics; compact?: boolean }) {
  const rows = metrics.submissions.map(submission => [
    submission.assignment?.name || `Assignment ${submission.assignment_id}`,
    formatDate(submission.assignment?.due_at),
    formatDateTime(submission.submitted_at),
    submission.grade || submission.score || 'N/A',
    submission.missing ? 'Yes' : 'No',
    submission.late ? 'Yes' : 'No',
  ]);
  return (
    <section className={compact ? 'mt-6' : ''}>
      {!compact && <ReportTitle title="Grade Documentation Report" subtitle={metrics.student.name} />}
      <DataTable headers={['Assignment', 'Due Date', 'Submission Date', 'Grade', 'Missing', 'Late']} rows={rows} />
    </section>
  );
}

function Placeholder({ title }: { title: string }) {
  return <EmptyReport message={`${title} is scaffolded in the report catalog and will use the existing assignment analytics builder next.`} />;
}

function ReportTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 border-b border-slate-200 pb-4">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Generated {formatDateTime(new Date().toISOString())}</p>
    </div>
  );
}

function MetricGrid({ items }: { items: Array<[string, string | number | null]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{value ?? 'N/A'}</div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>{headers.map(header => <th key={header} className="px-3 py-2 font-black">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-200">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <EmptyReport message="No rows found for this report." />}
    </div>
  );
}

function TwoColumnNotes({ includeActionPlan = false }: { includeActionPlan?: boolean }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="min-h-36 rounded-md border border-slate-200 p-4">
        <div className="font-black">Instructor Notes</div>
      </div>
      <div className="min-h-36 rounded-md border border-slate-200 p-4">
        <div className="font-black">{includeActionPlan ? 'Action Plan and Follow-Up' : 'Follow-Up Notes'}</div>
      </div>
    </div>
  );
}

function EmptyReport({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{message}</div>;
}

function daysAgo(value?: string | null) {
  if (!value) return null;
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return null;
  return Math.floor((Date.now() - date) / 86400000);
}
