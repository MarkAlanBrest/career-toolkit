'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { formatDate, reportingPeriod } from '@/lib/geChart/accscRules';
import { downloadBuffer, exportReportWorkbook } from '@/lib/geChart/exportExcel';
import { generateGeChartReport, listPrograms, programLengthFromStudents } from '@/lib/geChart/generateReport';
import { parseStudentExcel, templateToArrayBuffer } from '@/lib/geChart/parseExcel';
import type { GeChartReport, StudentRow } from '@/lib/geChart/types';
import styles from './ge-chart.module.css';

export default function GeChartPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [report, setReport] = useState<GeChartReport | null>(null);
  const [programs, setPrograms] = useState<string[]>([]);

  const [schoolName, setSchoolName] = useState('New Castle School of Trades');
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [programTitle, setProgramTitle] = useState('');
  const [programLength, setProgramLength] = useState(12);

  const onFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const { rows, errors } = parseStudentExcel(buffer);
    setStudents(rows);
    setParseErrors(errors);
    setReport(null);
    const progs = listPrograms(rows);
    setPrograms(progs);
    if (progs.length === 1) {
      setProgramTitle(progs[0]);
      setProgramLength(programLengthFromStudents(rows, progs[0]));
    }
  }, []);

  const buildReport = () => {
    if (!programTitle) return;
    const config = {
      reportDate: new Date(reportDate + 'T12:00:00'),
      schoolName,
      programTitle,
      programLengthMonths: programLength,
    };
    setReport(generateGeChartReport(students, config));
  };

  const downloadTemplate = () => {
    downloadBuffer(templateToArrayBuffer(), 'ncst-ge-chart-template.xlsx');
  };

  const downloadReport = () => {
    if (!report) return;
    const safe = programTitle.replace(/[^\w]+/g, '-').toLowerCase();
    downloadBuffer(exportReportWorkbook(report), `ge-chart-${safe}.xlsx`);
  };

  const previewPeriod = programTitle
    ? reportingPeriod({
        reportDate: new Date(reportDate + 'T12:00:00'),
        schoolName,
        programTitle,
        programLengthMonths: programLength,
      })
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/employer-portal" className={styles.backLink}>← Back to Employer Portal</Link>

        <header className={styles.header}>
          <h1>G&amp;E Chart Report Builder</h1>
          <p>
            Upload Career Services Excel data and generate ACCSC Graduation &amp; Employment Chart reports,
            graduation summary, employment summary, and data gap checklist.
          </p>
        </header>

        <section className={styles.card}>
          <h2>1. Download template</h2>
          <p className={styles.meta}>
            Fill one row per student. Use the column headers exactly as shown in the template.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={downloadTemplate}>
              Download Excel template
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h2>2. Upload filled spreadsheet</h2>
          <label className={styles.uploadZone}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            <p>Click to upload Excel file (.xlsx)</p>
            {students.length > 0 && (
              <p className={styles.meta}>{students.length} student rows loaded</p>
            )}
          </label>
          {parseErrors.length > 0 && (
            <div className={styles.errors}>
              {parseErrors.map((err) => <div key={err}>{err}</div>)}
            </div>
          )}
        </section>

        {students.length > 0 && (
          <section className={styles.card}>
            <h2>3. Report settings</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="school">School name</label>
                <input id="school" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="reportDate">Report date</label>
                <input id="reportDate" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="program">Program</label>
                <select
                  id="program"
                  value={programTitle}
                  onChange={(e) => {
                    setProgramTitle(e.target.value);
                    setProgramLength(programLengthFromStudents(students, e.target.value));
                  }}
                >
                  <option value="">Select program…</option>
                  {programs.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="length">Program length (months)</label>
                <input
                  id="length"
                  type="number"
                  min={1}
                  value={programLength}
                  onChange={(e) => setProgramLength(Number(e.target.value))}
                />
              </div>
            </div>
            {previewPeriod && (
              <p className={styles.meta}>
                Reporting period for cohort starts:{' '}
                <strong>{formatDate(previewPeriod.start)}</strong> through{' '}
                <strong>{formatDate(previewPeriod.end)}</strong>
              </p>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={buildReport} disabled={!programTitle}>
                Generate reports
              </button>
            </div>
          </section>
        )}

        {report && (
          <>
            <section className={styles.card}>
              <h2>G&amp;E Chart — {report.config.programTitle}</h2>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <strong>{report.totals.graduationRate ?? '—'}%</strong>
                  <span>Graduation rate</span>
                </div>
                <div className={styles.stat}>
                  <strong>{report.totals.employmentRate ?? '—'}%</strong>
                  <span>Employment rate</span>
                </div>
                <div className={styles.stat}>
                  <strong>{report.totals.graduatesWithin150}</strong>
                  <span>Graduates</span>
                </div>
                <div className={styles.stat}>
                  <strong>{report.totals.employedInField}</strong>
                  <span>Employed in field</span>
                </div>
                <div className={styles.stat}>
                  <strong>{report.gaps.length}</strong>
                  <span>Data gaps</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.btn} onClick={downloadReport}>
                  Download all reports (Excel)
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h2>G&amp;E Chart by cohort</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Started</th>
                      <th>Graduates</th>
                      <th>Grad %</th>
                      <th>Employed</th>
                      <th>Emp %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.cohorts.map((c) => (
                      <tr key={c.cohortKey}>
                        <td>{c.cohortLabel}</td>
                        <td>{c.started}</td>
                        <td>{c.graduatesWithin150}</td>
                        <td>{c.graduationRate ?? '—'}%</td>
                        <td>{c.employedInField}</td>
                        <td>{c.employmentRate ?? '—'}%</td>
                      </tr>
                    ))}
                    <tr>
                      <td><strong>TOTAL</strong></td>
                      <td>{report.totals.started}</td>
                      <td>{report.totals.graduatesWithin150}</td>
                      <td>{report.totals.graduationRate ?? '—'}%</td>
                      <td>{report.totals.employedInField}</td>
                      <td>{report.totals.employmentRate ?? '—'}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {report.gaps.length > 0 && (
              <section className={styles.card}>
                <h2>Data gaps (fix before audit)</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Student</th>
                        <th>Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.gaps.map((g, i) => (
                        <tr key={`${g.rowNumber}-${g.field}-${i}`}>
                          <td>{g.rowNumber}</td>
                          <td>{g.studentName}</td>
                          <td className={styles.gapBadge}>{g.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
