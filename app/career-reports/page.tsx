'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import * as XLSX from 'xlsx';
import { evaluateAccscFlags } from '@/lib/careerReports/accscFlags';
import { ACCREDITATION_RULESET, type AccreditationRule } from '@/lib/careerReports/accreditationRules';
import { buildRecordsFromFiles, listPrograms, mergeRecords } from '@/lib/careerReports/workspace';
import type { AccscFlag, CareerRecord, ParsedFile, ReportResult, ReportType } from '@/lib/careerReports/types';
import { useDashboardEmbed } from '@/lib/useDashboardEmbed';
import styles from './career-reports.module.css';

function downloadReportExcel(result: ReportResult) {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(result.rows);
  XLSX.utils.book_append_sheet(wb, sheet, result.title.slice(0, 28));
  const rulesSheet = XLSX.utils.json_to_sheet(result.accreditationRules.map(rule => ({
    Rule: rule.title,
    Citation: rule.citation,
    Requirement: rule.summary,
    'Official source': rule.sourceUrl,
  })));
  XLSX.utils.book_append_sheet(wb, rulesSheet, 'Accreditation Rules');
  XLSX.writeFile(wb, `${result.reportType}-report.xlsx`);
}

function downloadAssistantContent(content: string, rules: AccreditationRule[]) {
  const ruleText = rules.length
    ? `\n\nAccreditation rules applied:\n${rules.map(rule => `- ${rule.citation}: ${rule.summary}\n  ${rule.sourceUrl}`).join('\n')}`
    : '';
  const blob = new Blob([
    `${content}${ruleText}\n\nHuman review and supporting documentation are required before official ACCSC submission.`,
  ], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'career-services-analysis.txt';
  link.click();
  URL.revokeObjectURL(url);
}

function requestedReportType(prompt: string): ReportType | null {
  const request = prompt.toLowerCase();
  const asksForReport = /\b(make|create|build|generate|run|export)\b/.test(request) || /\breport\b/.test(request);
  if (!asksForReport) return null;
  if (/\bpac\b|advisory committee/.test(request)) return 'pac_attendees';
  if (/career fair/.test(request)) return 'career_fair_registrations';
  if (/hire|hired|placement/.test(request)) return 'hires';
  if (/employer|directory|contact list/.test(request)) return 'employer_directory';
  if (/accsc|accreditation|gap|missing/.test(request)) return 'accreditation_gaps';
  return null;
}

export default function CareerReportsPage() {
  const embedded = useDashboardEmbed();
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [records, setRecords] = useState<CareerRecord[]>([]);
  const [flags, setFlags] = useState<AccscFlag[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerRules, setAnswerRules] = useState<AccreditationRule[]>([]);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [program, setProgram] = useState('');
  const [draggingFiles, setDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const programs = useMemo(() => listPrograms(records), [records]);
  const errorCount = flags.filter(f => f.severity === 'error').length;
  const warningCount = flags.filter(f => f.severity === 'warning').length;
  const assistantSuggestions = useMemo(() => {
    if (!records.length) return [];
    return [
      { label: 'Find missing ACCSC data', prompt: 'What data is missing for ACCSC?' },
      { label: 'Make a hires report', prompt: 'Make a reported hires report', reportType: 'hires' as ReportType },
      { label: 'Build employer directory', prompt: 'Make an employer directory', reportType: 'employer_directory' as ReportType },
      { label: 'Create PAC report', prompt: 'Make a PAC attendees report', reportType: 'pac_attendees' as ReportType },
      { label: 'Create career fair report', prompt: 'Make a career fair registrations report', reportType: 'career_fair_registrations' as ReportType },
    ];
  }, [records.length]);

  const refreshFlags = useCallback((recs: CareerRecord[]) => {
    setFlags(evaluateAccscFlags(recs));
  }, []);

  const applyRecords = useCallback((recs: CareerRecord[]) => {
    setRecords(recs);
    refreshFlags(recs);
    setReportResult(null);
  }, [refreshFlags]);

  const onUpload = async (selectedFiles: FileList | File[] | null) => {
    const filesToUpload = selectedFiles ? Array.from(selectedFiles) : [];
    if (!filesToUpload.length) return;
    setBusy(true);
    setParseErrors([]);
    try {
      const form = new FormData();
      filesToUpload.forEach(file => form.append('files', file));
      const res = await fetch('/api/career-reports/parse', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const newFiles = data.files as ParsedFile[];
      setFiles(prev => [...prev, ...newFiles]);
      if (data.errors?.length) setParseErrors(data.errors);

      const fromNew = buildRecordsFromFiles(newFiles);
      const merged = mergeRecords(records, fromNew);
      const mergedFlags = evaluateAccscFlags(merged);
      applyRecords(merged);
      const seriousFindings = mergedFlags.filter(flag => flag.severity === 'error').length;
      const warningFindings = mergedFlags.filter(flag => flag.severity === 'warning').length;
      setAnswer(
        `I processed ${newFiles.length} file${newFiles.length === 1 ? '' : 's'} and found ${fromNew.length} new record${fromNew.length === 1 ? '' : 's'}. Accreditation review found ${seriousFindings} serious issue${seriousFindings === 1 ? '' : 's'} and ${warningFindings} warning${warningFindings === 1 ? '' : 's'}. Choose a suggestion below or ask me what you need.`
      );
      setAnswerRules([]);
    } catch (err) {
      setParseErrors([(err as Error).message]);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingFiles(false);
    if (!busy) void onUpload(event.dataTransfer.files);
  };

  const ask = async (prompt = question) => {
    const nextQuestion = prompt.trim();
    if (!nextQuestion) return;
    setQuestion(nextQuestion);
    setReportResult(null);
    setBusy(true);
    setAnswer('Reviewing your workspace…');
    setAnswerRules([]);
    try {
      const res = await fetch('/api/career-reports/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nextQuestion, records, files, flags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Question failed');
      setAnswer(data.answer || data.localHint || 'No answer.');
      setAnswerRules(data.rules || []);
    } catch (err) {
      setAnswer((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runReport = async (reportType: ReportType, announceInAssistant = false) => {
    setBusy(true);
    if (announceInAssistant) setAnswer('Building your report…');
    try {
      const res = await fetch('/api/career-reports/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          records,
          flags,
          program,
          schoolName: 'New Castle School of Trades',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report failed');
      setReportResult(data.result);
      if (announceInAssistant) {
        setAnswer(`${data.result.title} is ready. ${data.result.summary} You can review it below or download it as an Excel file.`);
        setAnswerRules(data.result.accreditationRules || []);
      }
    } catch (err) {
      setParseErrors([(err as Error).message]);
    } finally {
      setBusy(false);
    }
  };

  const handleAssistantPrompt = (prompt: string, reportType?: ReportType) => {
    setQuestion(prompt);
    if (reportType) {
      void runReport(reportType, true);
    } else {
      void ask(prompt);
    }
  };

  const submitAssistantRequest = () => {
    const prompt = question.trim();
    if (!prompt) return;
    const reportType = requestedReportType(prompt);
    handleAssistantPrompt(prompt, reportType || undefined);
  };

  const clearAll = () => {
    setFiles([]);
    setRecords([]);
    setFlags([]);
    setReportResult(null);
    setAnswer('');
    setAnswerRules([]);
    setParseErrors([]);
  };

  return (
    <main className={`${styles.careerReports} ${embedded ? styles.embedded : ''}`}>
      <div className={styles.shell}>
        {!embedded && (
          <Link href="/dashboard" className={styles.backLink}>← Dashboard</Link>
        )}

        {!embedded && (
        <header className={styles.header}>
          <h1>Career Services Reporting Hub</h1>
          <p>
            Upload messy spreadsheets and documents. Ask questions or generate ACCSC-aligned reports.
            Carrie keeps her Excel workflow — this tool sorts the files and flags what accreditation needs.
          </p>
        </header>
        )}

        <aside className={styles.rulesBanner} aria-label="Accreditation rules in use">
          <div>
            <strong>ACCSC rules always on</strong>
            <span>
              Standards effective {ACCREDITATION_RULESET.standardsEffectiveDate} and {ACCREDITATION_RULESET.annualReportYear} Annual Report instructions are automatically included in every analysis and report.
            </span>
          </div>
          <div className={styles.rulesLinks}>
            <a href={ACCREDITATION_RULESET.standardsUrl} target="_blank" rel="noreferrer">Official standards</a>
            <a href={ACCREDITATION_RULESET.annualReportUrl} target="_blank" rel="noreferrer">Annual Report rules</a>
          </div>
        </aside>

        <div className={styles.reportStudio}>
          <div className={styles.controlColumn}>
          <section className={styles.card}>
            <h2>Upload files</h2>
            <p className={styles.meta}>Excel, CSV, PDF, Word, or plain text. Multiple files at once.</p>
            <div
              className={`${styles.upload} ${draggingFiles ? styles.uploadDragging : ''}`}
              onDragEnter={event => {
                event.preventDefault();
                if (!busy) setDraggingFiles(true);
              }}
              onDragOver={event => event.preventDefault()}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFiles(false);
              }}
              onDrop={onFileDrop}
            >
              <strong>{busy ? 'Processing files…' : 'Add files to your workspace'}</strong>
              <p>{busy ? 'Please keep this page open.' : 'Drag and drop files here, or use the picker below.'}</p>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt"
                aria-label="Choose report files"
                onChange={event => void onUpload(event.currentTarget.files)}
                disabled={busy}
              />
              <span className={styles.fileTypes}>Excel, CSV, PDF, Word, and text files</span>
            </div>
            <div style={{ marginTop: 12 }}>
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

          <section className={`${styles.card} ${styles.assistantCard}`}>
            <div className={styles.assistantHeading}>
              <span className={styles.assistantMark} aria-hidden="true">AI</span>
              <div>
                <h2>Reporting assistant</h2>
                <p>Ask a question or tell me which report to make.</p>
              </div>
            </div>

            <div className={styles.assistantWindow} aria-live="polite">
              <span className={styles.assistantLabel}>Assistant</span>
              <p>
                {busy
                  ? (answer || 'Working on your request…')
                  : records.length
                    ? (answer || reportResult
                      ? 'Your latest output is ready in the preview panel.'
                      : `I can work with ${records.length} records from ${files.length} file${files.length === 1 ? '' : 's'}. What would you like to do?`)
                    : 'Add one or more files, and I will suggest reports and questions based on what I find.'}
              </p>
              {records.length > 0 && (
                <div className={`${styles.findingsNotice} ${errorCount > 0 ? styles.findingsSerious : warningCount > 0 ? styles.findingsWarning : styles.findingsClear}`}>
                  <strong>
                    {errorCount > 0
                      ? 'Serious accreditation findings'
                      : warningCount > 0
                        ? 'Accreditation review warnings'
                        : 'No accreditation findings detected'}
                  </strong>
                  <span>
                    {errorCount > 0
                      ? `${errorCount} serious issue${errorCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'} need review.`
                      : warningCount > 0
                        ? `${warningCount} warning${warningCount === 1 ? '' : 's'} should be reviewed before submission.`
                        : 'The automated checks found no errors or warnings in the available records.'}
                  </span>
                </div>
              )}
            </div>

            {assistantSuggestions.length > 0 && (
              <div className={styles.suggestions} aria-label="Suggested actions">
                <span>Suggested next steps</span>
                <div>
                  {assistantSuggestions.map(suggestion => (
                    <button
                      type="button"
                      key={suggestion.label}
                      onClick={() => handleAssistantPrompt(suggestion.prompt, suggestion.reportType)}
                      disabled={busy}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.chatBox}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder={records.length ? 'Ask a question or request a report…' : 'Upload files to begin…'}
                onKeyDown={e => {
                  if (e.key === 'Enter' && records.length && !busy) submitAssistantRequest();
                }}
                disabled={!records.length || busy}
              />
              <button type="button" className={styles.btn} onClick={submitAssistantRequest} disabled={busy || !records.length || !question.trim()}>Send</button>
            </div>

            <div className={styles.quickReports}>
              <span>Quick report controls</span>
              <div className={styles.fieldRow}>
                <select value={program} onChange={e => setProgram(e.target.value)} aria-label="Program">
                  <option value="">All programs</option>
                  {programs.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <button type="button" onClick={() => void runReport('pac_attendees', true)} disabled={busy || !records.length}>PAC</button>
                <button type="button" onClick={() => void runReport('career_fair_registrations', true)} disabled={busy || !records.length}>Career fair</button>
                <button type="button" onClick={() => void runReport('hires', true)} disabled={busy || !records.length}>Hires</button>
                <button type="button" onClick={() => void runReport('employer_directory', true)} disabled={busy || !records.length}>Employers</button>
                <button type="button" onClick={() => void runReport('accreditation_gaps', true)} disabled={busy || !records.length}>ACCSC gaps</button>
              </div>
            </div>
          </section>
          </div>

        <section className={`${styles.card} ${styles.outputCard}`} aria-label="Generated output">
          <div className={styles.outputHeader}>
            <div>
              <span>Generated output</span>
              <h2>{reportResult?.title || (answer ? 'AI analysis' : 'Preview')}</h2>
            </div>
            <div className={styles.outputActions}>
              {reportResult && (
                <button type="button" onClick={() => downloadReportExcel(reportResult)}>Download Excel</button>
              )}
              {!reportResult && answer && (
                <button type="button" onClick={() => downloadAssistantContent(answer, answerRules)}>Download text</button>
              )}
              {(reportResult || answer) && (
                <button type="button" onClick={() => window.print()}>Print</button>
              )}
            </div>
          </div>

          {reportResult && (
            <>
              <p className={styles.outputSummary}>{reportResult.summary}</p>
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
              <div className={styles.reportRules}>
                <strong>Accreditation basis included with this report</strong>
                <ul>
                  {reportResult.accreditationRules.map(rule => (
                    <li key={rule.id}>
                      <a href={rule.sourceUrl} target="_blank" rel="noreferrer">{rule.citation}</a>
                      <span>{rule.summary}</span>
                    </li>
                  ))}
                </ul>
                <p>Human review and supporting documentation are required before official ACCSC submission.</p>
              </div>
            </>
          )}
          {!reportResult && answer && (
            <div className={styles.generatedContent}>
              <p>{answer}</p>
              {answerRules.length > 0 && (
                <div className={styles.reportRules}>
                  <strong>Accreditation rules applied</strong>
                  <ul>
                    {answerRules.map(rule => (
                      <li key={rule.id}>
                        <a href={rule.sourceUrl} target="_blank" rel="noreferrer">{rule.citation}</a>
                        <span>{rule.summary}</span>
                      </li>
                    ))}
                  </ul>
                  <p>Human review and supporting documentation are required before official ACCSC submission.</p>
                </div>
              )}
            </div>
          )}
          {!reportResult && !answer && (
            <div className={styles.outputEmpty}>
              <strong>Your report or analysis will appear here.</strong>
              <p>Upload files, then ask the assistant a question or request a report.</p>
            </div>
          )}
        </section>
        </div>

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
