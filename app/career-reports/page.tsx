'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { evaluateAccscFlags } from '@/lib/careerReports/accscFlags';
import { buildRecordsFromFiles, listPrograms, mergeRecords } from '@/lib/careerReports/workspace';
import type { AccscFlag, CareerRecord, ParsedFile, ReportResult } from '@/lib/careerReports/types';
import styles from './career-reports.module.css';

function downloadReportExcel(result: ReportResult) {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(result.rows);
  XLSX.utils.book_append_sheet(wb, sheet, result.title.slice(0, 28));
  XLSX.writeFile(wb, `${result.reportType}-report.xlsx`);
}

export default function CareerReportsPage() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [records, setRecords] = useState<CareerRecord[]>([]);
  const [flags, setFlags] = useState<AccscFlag[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [program, setProgram] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));

  const programs = useMemo(() => listPrograms(records), [records]);
  const errorCount = flags.filter(f => f.severity === 'error').length;
  const warningCount = flags.filter(f => f.severity === 'warning').length;

  const refreshFlags = useCallback((recs: CareerRecord[]) => {
    setFlags(evaluateAccscFlags(recs));
  }, []);

  const applyRecords = useCallback((recs: CareerRecord[]) => {
    setRecords(recs);
    refreshFlags(recs);
    setReportResult(null);
  }, [refreshFlags]);

  const onUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setBusy(true);
    setParseErrors([]);
    try {
      const form = new FormData();
      Array.from(fileList).forEach(f => form.append('files', f));
      const res = await fetch('/api/career-reports/parse', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const newFiles = data.files as ParsedFile[];
      setFiles(prev => [...prev, ...newFiles]);
      if (data.errors?.length) setParseErrors(data.errors);

      const fromNew = buildRecordsFromFiles(newFiles);
      const merged = mergeRecords(records, fromNew);
      applyRecords(merged);
      const progs = listPrograms(merged);
      if (!program && progs.length) setProgram(progs[0]);
    } catch (err) {
      setParseErrors([(err as Error).message]);
    } finally {
      setBusy(false);
    }
  };

  const importPortal = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/career-reports/employer-portal');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const portalRecords = data.records as CareerRecord[];
      const portalFile: ParsedFile = {
        id: 'employer-portal',
        filename: 'Employer Portal',
        mimeType: 'portal',
        kind: 'spreadsheet',
        tables: [],
        textPreview: `${data.submissionCount} portal submissions`,
      };
      setFiles(prev => [...prev.filter(f => f.id !== 'employer-portal'), portalFile]);
      applyRecords(mergeRecords(records, portalRecords));
    } catch (err) {
      setParseErrors([(err as Error).message]);
    } finally {
      setBusy(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setBusy(true);
    setAnswer('');
    try {
      const res = await fetch('/api/career-reports/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, records, files, flags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Question failed');
      setAnswer(data.answer || data.localHint || 'No answer.');
    } catch (err) {
      setAnswer((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runReport = async (reportType: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/career-reports/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          records,
          flags,
          program: program || programs[0],
          reportDate,
          schoolName: 'New Castle School of Trades',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report failed');
      setReportResult(data.result);
    } catch (err) {
      setParseErrors([(err as Error).message]);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setRecords([]);
    setFlags([]);
    setReportResult(null);
    setAnswer('');
    setParseErrors([]);
  };

  return (
    <main className={styles.careerReports}>
      <div className={styles.shell}>
        <Link href="/dashboard" className={styles.backLink}>← Dashboard</Link>
        <Link href="/ge-chart" className={styles.backLink} style={{ marginLeft: 16 }}>G&E Chart →</Link>

        <header className={styles.header}>
          <h1>Career Services Reporting Hub</h1>
          <p>
            Upload messy spreadsheets and documents. Ask questions or generate ACCSC-aligned reports.
            Carrie keeps her Excel workflow — this tool sorts the files and flags what accreditation needs.
          </p>
        </header>

        <div className={styles.stats}>
          <div className={styles.stat}><strong>{files.length}</strong> files</div>
          <div className={styles.stat}><strong>{records.length}</strong> records</div>
          <div className={styles.stat}><strong>{errorCount}</strong> ACCSC errors</div>
          <div className={styles.stat}><strong>{warningCount}</strong> warnings</div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Upload files</h2>
            <p className={styles.meta}>Excel, CSV, PDF, Word, or plain text. Multiple files at once.</p>
            <label className={styles.upload}>
              <input type="file" multiple accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt" onChange={e => onUpload(e.target.files)} disabled={busy} />
              <p>{busy ? 'Processing…' : 'Click to add files'}</p>
            </label>
            <div style={{ marginTop: 12 }}>
              <button type="button" className={styles.btn} onClick={importPortal} disabled={busy}>Import employer portal data</button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={clearAll} disabled={busy}>Clear workspace</button>
            </div>
            {files.length > 0 && (
              <ul className={styles.fileList}>
                {files.map(f => (
                  <li key={f.id}>{f.filename} — {f.tables.length} table(s){f.parseWarning ? ` ⚠ ${f.parseWarning}` : ''}</li>
                ))}
              </ul>
            )}
            {parseErrors.length > 0 && (
              <div className={styles.errors}>{parseErrors.map(e => <div key={e}>{e}</div>)}</div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Ask a question</h2>
            <p className={styles.meta}>Examples: &quot;Who attended PAC?&quot; &quot;How many hires in Welding?&quot; &quot;What&apos;s missing for ACCSC?&quot;</p>
            <div className={styles.chatBox}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask about your data…"
                onKeyDown={e => e.key === 'Enter' && ask()}
              />
              <button type="button" className={styles.btn} onClick={ask} disabled={busy || !records.length}>Ask</button>
            </div>
            {answer && <div className={styles.answer}>{answer}</div>}
          </section>
        </div>

        <section className={styles.card}>
          <h2>Generate reports</h2>
          <div className={styles.fieldRow}>
            <select value={program} onChange={e => setProgram(e.target.value)}>
              <option value="">All programs</option>
              {programs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} aria-label="Report date" />
          </div>
          <button type="button" className={styles.btn} onClick={() => runReport('pac_attendees')} disabled={busy}>PAC attendees</button>
          <button type="button" className={styles.btn} onClick={() => runReport('career_fair_registrations')} disabled={busy}>Career fair</button>
          <button type="button" className={styles.btn} onClick={() => runReport('hires')} disabled={busy}>Hires</button>
          <button type="button" className={styles.btn} onClick={() => runReport('employer_directory')} disabled={busy}>Employers</button>
          <button type="button" className={styles.btn} onClick={() => runReport('accreditation_gaps')} disabled={busy}>ACCSC gaps</button>
          <button type="button" className={styles.btn} onClick={() => runReport('ge_chart_summary')} disabled={busy}>G&E summary</button>

          {reportResult && (
            <>
              <p className={styles.meta}><strong>{reportResult.title}</strong> — {reportResult.summary}</p>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => downloadReportExcel(reportResult)}>Download Excel</button>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>{reportResult.columns.map(c => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {reportResult.rows.map((row, i) => (
                      <tr key={i}>
                        {reportResult.columns.map(c => <td key={c}>{row[c] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {flags.length > 0 && (
          <section className={styles.card}>
            <h2>ACCSC flags ({flags.length})</h2>
            <div className={styles.flags}>
              {flags.slice(0, 50).map((f, i) => (
                <div key={`${f.recordId}-${i}`} className={f.severity === 'error' ? styles.flagError : styles.flagWarning}>
                  [{f.severity}] {f.studentName}: {f.message} ({f.rule})
                </div>
              ))}
              {flags.length > 50 && <p className={styles.meta}>…and {flags.length - 50} more. Run ACCSC gaps report for full list.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
