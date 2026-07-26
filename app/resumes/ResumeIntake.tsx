"use client";

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  MapPin,
  PencilLine,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type ResumeFields = {
  studentName: string;
  address: string;
  skills: string[];
  certifications: string[];
};

type ResumeRecord = ResumeFields & {
  id: string;
  file: File;
  program: string;
  graduationDate: string;
  status: "queued" | "parsing" | "ready" | "error" | "submitted";
  confidence: "high" | "medium" | "low";
  error?: string;
};

const FALLBACK_PROGRAMS = [
  "Automotive Technology",
  "Building Technology",
  "Combination Welding",
  "Electrical Technology",
  "Industrial Electro-Mechanical Technology",
  "Machinist & CNC Manufacturing",
  "Refrigeration & A/C Technology",
  "Commercial Truck Driving",
  "Diesel & Heavy Equipment Repair",
  "Heavy Equipment Operations with CDL Training",
  "Motorcycle & Power Equipment Technology",
  "East Liverpool, Combination Welding",
  "East Liverpool, Electrical & Industrial Maintenance",
  "East, Liverpool, Refrigeration & Climate Control",
];

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function idForFile(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

function acceptedFile(file: File) {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function listToText(items: string[]) {
  return items.join(", ");
}

function textToList(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ResumeIntake() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<ResumeRecord[]>([]);
  const [programs, setPrograms] = useState(FALLBACK_PROGRAMS);
  const [batchGraduationDate, setBatchGraduationDate] = useState("");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sharePointConnected, setSharePointConnected] = useState(false);

  useEffect(() => {
    fetch("/api/resumes/config")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.programs) && data.programs.length) {
          setPrograms(data.programs);
        }
        setSharePointConnected(Boolean(data.sharePointConnected));
      })
      .catch(() => undefined);
  }, []);

  const readyRecords = records.filter((record) => record.status === "ready");
  const submittedCount = records.filter((record) => record.status === "submitted").length;
  const parsing = records.some((record) => record.status === "parsing");
  const canSubmit =
    readyRecords.length > 0 &&
    readyRecords.every(
      (record) => record.studentName && record.program && record.graduationDate,
    );

  const progress = useMemo(() => {
    if (!records.length) return 0;
    const finished = records.filter((record) =>
      ["ready", "error", "submitted"].includes(record.status),
    ).length;
    return Math.round((finished / records.length) * 100);
  }, [records]);

  function updateRecord(id: string, patch: Partial<ResumeRecord>) {
    setRecords((current) =>
      current.map((record) => (record.id === id ? { ...record, ...patch } : record)),
    );
  }

  async function parseRecord(record: ResumeRecord) {
    updateRecord(record.id, { status: "parsing", error: undefined });
    const body = new FormData();
    body.append("file", record.file);

    try {
      const response = await fetch("/api/resumes/parse", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "This resume could not be read.");
      updateRecord(record.id, {
        ...data.resume,
        graduationDate: data.resume.graduationDate || record.graduationDate,
        status: "ready",
      });
    } catch (error) {
      updateRecord(record.id, {
        status: "error",
        error: error instanceof Error ? error.message : "This resume could not be read.",
      });
    }
  }

  function addFiles(files: File[]) {
    setNotice("");
    const existing = new Set(records.map((record) => `${record.file.name}-${record.file.size}`));
    const valid: ResumeRecord[] = [];
    let rejected = 0;

    for (const file of files) {
      if (
        !acceptedFile(file) ||
        file.size > MAX_FILE_BYTES ||
        existing.has(`${file.name}-${file.size}`)
      ) {
        rejected += 1;
        continue;
      }
      existing.add(`${file.name}-${file.size}`);
      valid.push({
        id: idForFile(file),
        file,
        studentName: "",
        address: "",
        skills: [],
        certifications: [],
        program: "",
        graduationDate: batchGraduationDate,
        status: "queued",
        confidence: "medium",
      });
    }

    if (rejected) {
      setNotice(
        `${rejected} file${rejected === 1 ? " was" : "s were"} skipped. Use unique PDF, DOC, or DOCX files under 15 MB.`,
      );
    }
    if (!valid.length) return;
    setRecords((current) => [...current, ...valid]);
    valid.forEach((record) => void parseRecord(record));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function applyBatchDetails() {
    setRecords((current) =>
      current.map((record) =>
        record.status === "submitted"
          ? record
          : {
              ...record,
              graduationDate: record.graduationDate || batchGraduationDate,
            },
      ),
    );
  }

  async function submitReady() {
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice("");

    for (const record of readyRecords) {
      const body = new FormData();
      body.append("file", record.file);
      body.append(
        "metadata",
        JSON.stringify({
          studentName: record.studentName,
          address: record.address,
          program: record.program,
          graduationDate: record.graduationDate,
          skills: record.skills,
          certifications: record.certifications,
        }),
      );

      try {
        const response = await fetch("/api/resumes/submit", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "SharePoint upload failed.");
        updateRecord(record.id, { status: "submitted", error: undefined });
      } catch (error) {
        updateRecord(record.id, {
          status: "error",
          error: error instanceof Error ? error.message : "SharePoint upload failed.",
        });
      }
    }

    setSubmitting(false);
  }

  function startNewBatch() {
    setRecords([]);
    setBatchGraduationDate("");
    setNotice("");
  }

  return (
    <main className="resume-app">
      <aside className="resume-rail">
        <div className="resume-brand">
          <div className="resume-brand-mark"><BriefcaseBusiness size={20} /></div>
          <div>
            <strong>Career Services</strong>
            <span>Resume Intake</span>
          </div>
        </div>

        <nav className="resume-steps" aria-label="Submission progress">
          <div className={`resume-step ${records.length ? "complete" : "active"}`}>
            <span>{records.length ? <Check size={15} /> : "1"}</span>
            <div><strong>Add resumes</strong><small>PDF, DOC, or DOCX</small></div>
          </div>
          <div className={`resume-step ${readyRecords.length ? "active" : ""} ${submittedCount ? "complete" : ""}`}>
            <span>{submittedCount ? <Check size={15} /> : "2"}</span>
            <div><strong>Review details</strong><small>Verify file details</small></div>
          </div>
          <div className={`resume-step ${submittedCount ? "complete active" : ""}`}>
            <span>{submittedCount ? <Check size={15} /> : "3"}</span>
            <div><strong>File in SharePoint</strong><small>Send for review</small></div>
          </div>
        </nav>

        <div className="resume-privacy">
          <ShieldCheck size={18} />
          <div>
            <strong>Handled securely</strong>
            <p>Files are processed only to extract resume details and are not stored by this app.</p>
          </div>
        </div>
      </aside>

      <section className="resume-workspace">
        <header className="resume-topbar">
          <a className="resume-back" href="/admin/dashboard"><ArrowLeft size={16} /> Dashboard</a>
          <div className={`resume-connection ${sharePointConnected ? "connected" : ""}`}>
            <span />
            {sharePointConnected ? "SharePoint connected" : "SharePoint setup needed"}
          </div>
        </header>

        <div className="resume-content">
          <div className="resume-heading">
            <div>
              <span className="resume-eyebrow">New submission</span>
              <h1>Prepare student resumes.</h1>
              <p>Upload a batch, confirm the details, and send clean records to SharePoint.</p>
            </div>
            {records.length > 0 && (
              <button className="resume-text-button" type="button" onClick={startNewBatch}>
                <RotateCcw size={15} /> Start over
              </button>
            )}
          </div>

          <section className="resume-batch-card">
            <div className="resume-section-title">
              <span>01</span>
              <div><h2>Graduation date</h2><p>Enter it here when it is not already included in the file.</p></div>
            </div>
            <div className="resume-batch-fields resume-date-only">
              <label>
                Graduation date
                <input
                  type="month"
                  value={batchGraduationDate}
                  onChange={(event) => setBatchGraduationDate(event.target.value)}
                />
              </label>
              <button type="button" className="resume-apply" onClick={applyBatchDetails} disabled={!records.length}>
                Apply to batch
              </button>
            </div>
          </section>

          <section className="resume-upload-section">
            <div className="resume-section-title">
              <span>02</span>
              <div><h2>Add resumes</h2><p>Files are read locally. A graduation month in the file is used automatically.</p></div>
            </div>
            <div
              className={`resume-dropzone ${dragging ? "dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === "Enter" && fileInput.current?.click()}
            >
              <input
                ref={fileInput}
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={onFileChange}
                hidden
              />
              <div className="resume-upload-icon"><UploadCloud size={25} /></div>
              <div><strong>Drop resumes here</strong><p>or <span>browse files</span> from your computer</p></div>
              <small>PDF, DOC, DOCX · 15 MB max per file</small>
            </div>
            {notice && <div className="resume-notice"><X size={15} /> {notice}</div>}
          </section>

          {records.length > 0 && (
            <section className="resume-review-section">
              <div className="resume-review-header">
                <div className="resume-section-title">
                  <span>03</span>
                  <div><h2>Review extracted details</h2><p>Correct anything before filing.</p></div>
                </div>
                <div className="resume-progress-copy">
                  <strong>{progress}%</strong>
                  <span>processed</span>
                </div>
              </div>
              <div className="resume-progress-track"><span style={{ width: `${progress}%` }} /></div>

              <div className="resume-records">
                {records.map((record, index) => (
                  <article className={`resume-record ${record.status}`} key={record.id}>
                    <div className="resume-file-row">
                      <div className="resume-file-icon"><FileText size={20} /></div>
                      <div className="resume-file-name">
                        <strong>{record.file.name}</strong>
                        <span>{formatFileSize(record.file.size)} · Resume {index + 1} of {records.length}</span>
                      </div>
                      <div className={`resume-record-state ${record.status}`}>
                        {record.status === "parsing" && <><LoaderCircle size={14} className="spin" /> Reading</>}
                        {record.status === "queued" && "Queued"}
                        {record.status === "ready" && (
                          <>
                            <CheckCircle2 size={14} />
                            Ready
                          </>
                        )}
                        {record.status === "error" && "Needs attention"}
                        {record.status === "submitted" && <><CheckCircle2 size={14} /> Filed</>}
                      </div>
                      {record.status !== "submitted" && (
                        <button
                          className="resume-remove"
                          type="button"
                          aria-label={`Remove ${record.file.name}`}
                          onClick={() => setRecords((current) => current.filter((item) => item.id !== record.id))}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {record.status === "error" && (
                      <div className="resume-error">
                        <p>{record.error}</p>
                        <button type="button" onClick={() => void parseRecord(record)}>Try again</button>
                      </div>
                    )}

                    {["ready", "submitted"].includes(record.status) && (
                      <div className="resume-record-fields">
                        <label>
                          Student name <span>Required</span>
                          <div className="resume-input-icon">
                            <PencilLine size={14} />
                            <input
                              value={record.studentName}
                              disabled={record.status === "submitted"}
                              onChange={(event) => updateRecord(record.id, { studentName: event.target.value })}
                              placeholder="Not found"
                            />
                          </div>
                        </label>
                        <label>
                          Address
                          <div className="resume-input-icon">
                            <MapPin size={14} />
                            <input
                              value={record.address}
                              disabled={record.status === "submitted"}
                              onChange={(event) => updateRecord(record.id, { address: event.target.value })}
                              placeholder="Not found"
                            />
                          </div>
                        </label>
                        <label>
                          Program <span>Required</span>
                          <div className="resume-select-wrap">
                            <select
                              value={record.program}
                              disabled={record.status === "submitted"}
                              onChange={(event) => updateRecord(record.id, { program: event.target.value })}
                            >
                              <option value="">Select a program</option>
                              {programs.map((program) => <option key={program}>{program}</option>)}
                            </select>
                            <ChevronDown size={16} />
                          </div>
                        </label>
                        <label>
                          Graduation date <span>Required</span>
                          <input
                            type="month"
                            value={record.graduationDate}
                            disabled={record.status === "submitted"}
                            onChange={(event) => updateRecord(record.id, { graduationDate: event.target.value })}
                          />
                        </label>
                        <label className="wide">
                          Skills
                          <textarea
                            value={listToText(record.skills)}
                            disabled={record.status === "submitted"}
                            onChange={(event) => updateRecord(record.id, { skills: textToList(event.target.value) })}
                            placeholder="No skills found"
                          />
                        </label>
                        <label className="wide">
                          Certifications
                          <textarea
                            value={listToText(record.certifications)}
                            disabled={record.status === "submitted"}
                            onChange={(event) => updateRecord(record.id, { certifications: textToList(event.target.value) })}
                            placeholder="No certifications found"
                          />
                        </label>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {records.length > 0 && (
            <footer className="resume-submit-bar">
              <div>
                <strong>{readyRecords.length} resume{readyRecords.length === 1 ? "" : "s"} ready to file</strong>
                <span>Status will be set to Pending Review.</span>
              </div>
              <button type="button" onClick={() => fileInput.current?.click()} className="resume-add-more">
                <Plus size={16} /> Add more
              </button>
              <button
                type="button"
                className="resume-submit"
                disabled={!canSubmit || parsing || submitting}
                onClick={() => void submitReady()}
              >
                {submitting ? <><LoaderCircle size={17} className="spin" /> Filing resumes…</> : <>File in SharePoint <ArrowRight size={17} /></>}
              </button>
            </footer>
          )}
        </div>
      </section>
    </main>
  );
}
