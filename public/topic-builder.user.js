// ==UserScript==
// @name         Google Classroom Topic Builder
// @namespace    https://github.com/MarkAlanBrest/google-classroom-topic-builder
// @version      2.4.0
// @description  AI-powered Google Classroom topic builder — upload source material, get an AI-drafted lesson summary, assignment, vocabulary and resources, then download the files to upload into Classroom yourself. Uses your own Claude API key. No Google API/OAuth needed.
// @author       MarkAlanBrest
// @homepageURL  https://career-toolkit-ruby.vercel.app/
// @supportURL   https://career-toolkit-ruby.vercel.app/
// @updateURL    https://career-toolkit-ruby.vercel.app/topic-builder.user.js
// @downloadURL  https://career-toolkit-ruby.vercel.app/topic-builder.user.js
// @match        https://classroom.google.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      api.anthropic.com
// @connect      cdnjs.cloudflare.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__TOPIC_BUILDER__) return;
  window.__TOPIC_BUILDER__ = true;
  if (window.top !== window.self) return;

  // ── DISABLE / UNINSTALL ─────────────────────────────────────────────────
  if (typeof GM_registerMenuCommand === 'function') {
    if (GM_getValue('tb_disabled', false)) {
      GM_registerMenuCommand('▶ Enable Topic Builder', () => {
        GM_setValue('tb_disabled', false);
        window.location.reload();
      });
      return;
    }
    GM_registerMenuCommand('⏸ Disable Topic Builder', () => {
      GM_setValue('tb_disabled', true);
      window.location.reload();
    });
  } else if (GM_getValue('tb_disabled', false)) {
    return;
  }

  // ── CONSTANTS ────────────────────────────────────────────────────────────
  const CLAUDE_MODEL = 'claude-sonnet-4-6';
  const CLAUDE_MAX_TOKENS = 4000;
  const SOURCE_MAX_CHARS = 15000;
  const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const ASSIGNMENT_TYPES = [
    { key: 'assignmentQuestions', label: 'Questions / Worksheet', desc: 'Comprehension and knowledge-check questions tied directly to the material.', guidance: 'a set of 6-10 comprehension/knowledge-check questions (short answer or open-ended) directly tied to the source material, formatted as numbered questions in "instructions"' },
    { key: 'assignmentResearch', label: 'Research Project', desc: 'Students investigate a related topic beyond the source material using outside sources.', guidance: 'a research project prompt requiring students to investigate a related topic beyond the source material using outside sources, with clear deliverable expectations' },
    { key: 'assignmentCreative', label: 'Creative Assignment', desc: 'A creative product — e.g. a presentation, poster, or video — demonstrating understanding.', guidance: 'a creative assignment (e.g. a presentation, poster, video, or infographic) where students demonstrate understanding of the material in a creative format, with clear deliverable expectations' },
  ];

  const CONTENT_ITEMS = [
    { key: 'lessonSummary', label: 'Lesson Summary', desc: 'A written summary of what the lesson covers.' },
    { key: 'vocabulary', label: 'Vocabulary', desc: 'Key terms and definitions from the material.' },
    { key: 'resources', label: 'Resources', desc: 'Supporting links/readings, only if genuinely useful.' },
    ...ASSIGNMENT_TYPES,
    { key: 'form', label: 'Google Form (quiz)', desc: 'Comprehension-check questions. Drafted for reference only — you copy them into a Form yourself, export isn\'t built yet.' },
    { key: 'projectGuide', label: 'Project Guide', desc: 'A hands-on project guide, if the material calls for one. Drafted for reference only — export isn\'t built yet.' },
  ];

  // ── STATE ────────────────────────────────────────────────────────────────
  const state = {
    step: 'setup', // setup -> upload -> select -> review -> download
    claudeKey: GM_getValue('tb_claude_key', ''),
    courseId: null,
    sourceFileName: '',
    sourceText: '',
    parsing: false,
    parseError: '',
    truncated: false,
    selected: {
      lessonSummary: false, vocabulary: false, resources: false,
      assignmentQuestions: false, assignmentResearch: false, assignmentCreative: false,
      form: false, projectGuide: false,
    },
    analyzing: false,
    analyzeError: '',
    draft: null,
    downloadError: '',
    downloading: false,
    downloaded: false,
    downloadedFiles: [],
  };
  if (state.claudeKey) state.step = 'upload';

  // ── GM/NETWORK HELPERS ───────────────────────────────────────────────────
  function gmFetch(opts) {
    console.log('[Topic Builder] gmFetch: dispatching', opts.method || 'GET', opts.url);
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.body,
        timeout: opts.timeout || 60000,
        onload: (res) => { console.log('[Topic Builder] gmFetch: onload fired for', opts.url); resolve(res); },
        onerror: (err) => { console.error('[Topic Builder] gmFetch: onerror fired for', opts.url, err); reject(new Error('Network error contacting ' + opts.url)); },
        ontimeout: () => { console.error('[Topic Builder] gmFetch: ontimeout fired for', opts.url); reject(new Error('Request timed out — please try again.')); },
      });
    });
  }

  function stripMarkdownFence(text) {
    return String(text || '').trim().replace(/^```(?:json|html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // ── COURSE DETECTION (display only — no API calls) ──────────────────────
  function getCourseIdFromUrl() {
    const m = window.location.pathname.match(/\/c\/([^/]+)/);
    return m ? m[1] : null;
  }

  // ── CLAUDE ───────────────────────────────────────────────────────────────
  async function callClaude(prompt, maxTokens) {
    if (!state.claudeKey) throw new Error('No Claude API key set — add it in Setup.');
    console.log('[Topic Builder] callClaude: sending request, prompt length', prompt.length);
    const res = await gmFetch({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens || CLAUDE_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
      timeout: 120000,
    });
    console.log('[Topic Builder] callClaude: got response, status', res.status, 'body preview:', String(res.responseText || '').slice(0, 300));
    let data = {};
    try { data = JSON.parse(res.responseText || '{}'); } catch (e) { /* non-JSON body */ }
    if (res.status < 200 || res.status >= 300) {
      throw new Error((data && data.error && data.error.message) || ('Claude API error (HTTP ' + res.status + ')'));
    }
    return (data.content && data.content[0] && data.content[0].text) || '';
  }

  function buildDraftPrompt(sourceText, selected) {
    const schemaLines = ['"topicName": string'];
    const guidelines = ['- topicName: a short, clear title for this lesson/topic.'];

    if (selected.lessonSummary) {
      schemaLines.push('"lessonSummary": string');
      guidelines.push('- lessonSummary: 2-4 plain-text paragraphs (no markdown formatting) summarizing what the lesson covers.');
    }
    if (selected.vocabulary) {
      schemaLines.push('"vocabulary": [{"term": string, "definition": string}]');
      guidelines.push('- vocabulary: 5-10 key terms actually present in the source material.');
    }
    if (selected.resources) {
      schemaLines.push('"resources": [{"title": string, "url": string, "note": string}]');
      guidelines.push('- resources: only include if genuinely useful, else []. Never invent a URL — leave "url" as "" rather than guessing.');
    }
    ASSIGNMENT_TYPES.forEach((t) => {
      if (selected[t.key]) {
        schemaLines.push('"' + t.key + '": {"title": string, "instructions": string, "points": number}');
        guidelines.push('- ' + t.key + ': ' + t.guidance + '.');
      }
    });
    if (selected.form) {
      schemaLines.push('"formQuestions": [{"question": string, "type": "MULTIPLE_CHOICE" or "SHORT_ANSWER", "options": [string]}]');
      guidelines.push('- formQuestions: 5-8 short comprehension-check questions based on the material.');
    }
    if (selected.projectGuide) {
      schemaLines.push('"projectGuide": string');
      guidelines.push('- projectGuide: a hands-on project guide fitting this material.');
    }

    return 'You are an instructional designer helping a teacher build one Google Classroom Topic (lesson) from source material.\n\n' +
      'Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:\n' +
      '{\n  ' + schemaLines.join(',\n  ') + '\n}\n\n' +
      'Guidelines:\n' + guidelines.join('\n') + '\n\n' +
      'SOURCE MATERIAL:\n"""\n' + sourceText + '\n"""';
  }

  async function analyzeSource() {
    state.analyzing = true;
    state.analyzeError = '';
    render();
    try {
      let text = state.sourceText.trim();
      if (text.length > SOURCE_MAX_CHARS) { text = text.slice(0, SOURCE_MAX_CHARS); state.truncated = true; }
      const raw = await callClaude(buildDraftPrompt(text, state.selected), CLAUDE_MAX_TOKENS);
      const cleaned = stripMarkdownFence(raw);
      let draft;
      try {
        draft = JSON.parse(cleaned);
      } catch (e) {
        throw new Error('The AI response wasn\'t valid JSON. Try Analyze again. (' + e.message + ')');
      }
      draft.vocabulary = Array.isArray(draft.vocabulary) ? draft.vocabulary : [];
      draft.resources = Array.isArray(draft.resources) ? draft.resources : [];
      draft.formQuestions = Array.isArray(draft.formQuestions) ? draft.formQuestions : [];
      ASSIGNMENT_TYPES.forEach((t) => {
        if (state.selected[t.key]) draft[t.key] = draft[t.key] || { title: '', instructions: '', points: 100 };
      });
      state.draft = draft;
      state.step = 'review';
    } catch (e) {
      state.analyzeError = e.message || String(e);
    } finally {
      state.analyzing = false;
      render();
    }
  }

  // ── FILE PARSING ─────────────────────────────────────────────────────────
  let pdfWorkerBlobUrlPromise = null;
  function ensurePdfWorker() {
    if (pdfWorkerBlobUrlPromise) return pdfWorkerBlobUrlPromise;
    pdfWorkerBlobUrlPromise = gmFetch({ url: PDF_WORKER_URL, timeout: 30000 }).then((res) => {
      const blob = new Blob([res.responseText], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      // Setting GlobalWorkerOptions.workerSrc lets pdf.js assign the URL to a
      // <script>/Worker itself, which this page's Trusted Types CSP blocks.
      // Constructing the Worker ourselves (with a policy-wrapped URL) and
      // handing pdf.js the live worker via workerPort avoids that sink.
      const worker = new Worker(trustedScriptURL(url));
      window.pdfjsLib.GlobalWorkerOptions.workerPort = worker;
      return worker;
    });
    return pdfWorkerBlobUrlPromise;
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' took too long to parse.')), ms)),
    ]);
  }

  async function parsePDF(file) {
    await ensurePdfWorker();
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(' ') + '\n\n';
    }
    return text.trim();
  }

  async function parseDOCX(file) {
    const buf = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return (result.value || '').trim();
  }

  async function parseFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return withTimeout(parsePDF(file), 120000, 'This PDF');
    if (ext === 'docx') return withTimeout(parseDOCX(file), 120000, 'This DOCX');
    return withTimeout(file.text(), 60000, 'This file');
  }

  async function handleFileUpload(file) {
    state.parsing = true;
    state.parseError = '';
    state.truncated = false;
    render();
    try {
      const text = await parseFile(file);
      state.sourceFileName = file.name;
      state.sourceText = text;
    } catch (e) {
      state.parseError = e.message || String(e);
    } finally {
      state.parsing = false;
      render();
    }
  }

  // ── DOWNLOAD (local files — no Google API) ───────────────────────────────
  function safeFilename(s) {
    return (s || 'Topic').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 80);
  }

  function htmlPage(title, bodyHtml) {
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' +
      '<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1E293B;}' +
      'h1{font-size:22px;margin-bottom:4px;}h2{font-size:16px;border-bottom:2px solid #1a73e8;padding-bottom:4px;margin-top:32px;}' +
      'ul{padding-left:20px;}li{margin-bottom:8px;}.pts{color:#64748B;font-size:13px;margin-bottom:20px;}p{margin:0 0 12px;}</style>' +
      '</head><body>' + bodyHtml + '</body></html>';
  }

  function buildLessonSummaryHtml(d, selected) {
    let body = '<h1>' + escapeHtml(d.topicName) + '</h1>';
    if (selected.lessonSummary && d.lessonSummary) {
      body += '<h2>Lesson Summary</h2>' + d.lessonSummary.split('\n').filter(Boolean).map((p) => '<p>' + escapeHtml(p) + '</p>').join('');
    }
    if (selected.vocabulary && d.vocabulary.length) {
      body += '<h2>Vocabulary</h2><ul>' + d.vocabulary.map((v) => '<li><b>' + escapeHtml(v.term) + '</b>: ' + escapeHtml(v.definition) + '</li>').join('') + '</ul>';
    }
    if (selected.resources && d.resources.length) {
      body += '<h2>Resources</h2><ul>' + d.resources.map((r) =>
        '<li><b>' + escapeHtml(r.title || r.url || 'Resource') + '</b>' +
        (r.url ? ' — <a href="' + escapeAttr(r.url) + '">' + escapeHtml(r.url) + '</a>' : '') +
        (r.note ? ' (' + escapeHtml(r.note) + ')' : '') + '</li>'
      ).join('') + '</ul>';
    }
    return htmlPage(d.topicName + ' — Lesson Summary', body);
  }

  function buildAssignmentHtml(assignment, fallbackTitle) {
    const title = assignment.title || fallbackTitle;
    let body = '<h1>' + escapeHtml(title) + '</h1>';
    body += '<div class="pts">' + (assignment.points || 100) + ' points</div>';
    body += (assignment.instructions || '').split('\n').filter(Boolean).map((p) => '<p>' + escapeHtml(p) + '</p>').join('');
    return htmlPage(title, body);
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // Tried bundling these into a single .zip via JSZip, but generateAsync()
  // never resolved on this page (same "async callback silently never fires"
  // pattern hit earlier with GM_xmlhttpRequest and pdf.js's Worker) — a third
  // library behaving the same way here points at something structural about
  // this sandboxed execution context, not the individual libraries. Simple,
  // synchronous <a download> per file is what's actually proven reliable.
  function downloadAll() {
    state.downloadError = '';
    state.downloadedFiles = [];
    try {
      const d = state.draft;
      const s = state.selected;
      const base = safeFilename(d.topicName);
      const files = [];
      if (s.lessonSummary || s.vocabulary || s.resources) {
        files.push([base + ' - Lesson Summary.html', buildLessonSummaryHtml(d, s)]);
      }
      ASSIGNMENT_TYPES.forEach((t) => {
        if (s[t.key] && d[t.key]) {
          files.push([safeFilename(d[t.key].title || t.label) + '.html', buildAssignmentHtml(d[t.key], d.topicName + ' — ' + t.label)]);
        }
      });
      files.forEach(([filename, content]) => {
        downloadFile(filename, content, 'text/html');
        state.downloadedFiles.push(filename);
      });
      state.downloaded = true;
    } catch (e) {
      state.downloadError = e.message || String(e);
    }
    render();
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  // Uses Tampermonkey's native GM_addStyle (granted above), not a hand-rolled
  // <style> injection — the native version is built to bypass a page's CSP
  // style-src restrictions, which a plain document.createElement('style') is
  // NOT guaranteed to do.
  const CSS = `
  #tb-fab{position:fixed;right:22px;bottom:22px;z-index:99998;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1a73e8,#174ea6);color:#fff;border:none;box-shadow:0 6px 16px rgba(26,115,232,0.4);cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;transition:transform .15s;}
  #tb-fab:hover{transform:scale(1.07);}
  #tb-overlay{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:30px 20px;font-family:'Google Sans',Roboto,system-ui,-apple-system,sans-serif;}
  #tb-panel{background:#F8FAFC;border-radius:20px;max-width:900px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 60px);}
  .tb-topbar{background:linear-gradient(135deg,#1a73e8,#174ea6);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;}
  .tb-topbar h1{margin:0;font-size:18px;font-weight:700;}
  .tb-topbar-sub{font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px;}
  .tb-close{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;}
  .tb-close:hover{background:rgba(255,255,255,0.25);}
  .tb-stepbar{display:flex;gap:4px;padding:16px 24px 0;}
  .tb-stepdot{flex:1;height:4px;border-radius:4px;background:#E2E8F0;}
  .tb-stepdot.active{background:#1a73e8;}
  .tb-stepdot.done{background:#188038;}
  .tb-body{flex:1;overflow-y:auto;padding:20px 24px 24px;}
  .tb-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
  .tb-h2{font-size:17px;font-weight:700;color:#1E293B;margin:0 0 4px;}
  .tb-desc{font-size:13px;color:#64748B;margin:0 0 14px;}
  .tb-label{display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:4px;}
  .tb-hint{font-size:11px;color:#94A3B8;margin:4px 0 0;}
  .tb-input,.tb-textarea{width:100%;padding:9px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;color:#1E293B;background:#fff;box-sizing:border-box;font-family:inherit;}
  .tb-input:focus,.tb-textarea:focus{outline:none;border-color:#1a73e8;box-shadow:0 0 0 3px rgba(26,115,232,0.12);}
  .tb-textarea{resize:vertical;min-height:140px;}
  .tb-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:transform .15s;}
  .tb-btn:hover{transform:translateY(-1px);}
  .tb-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .tb-btn-primary{background:linear-gradient(135deg,#1a73e8,#174ea6);color:#fff;box-shadow:0 4px 14px rgba(26,115,232,0.3);}
  .tb-btn-secondary{background:#fff;color:#475569;border:1px solid #CBD5E1;}
  .tb-btn-success{background:linear-gradient(135deg,#188038,#0d652d);color:#fff;}
  .tb-btn-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}
  .tb-banner{padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px;}
  .tb-banner-ok{background:#E6F4EA;color:#188038;}
  .tb-banner-warn{background:#FEF7E0;color:#B06000;}
  .tb-banner-err{background:#FCE8E6;color:#C5221F;}
  .tb-vocab-row,.tb-res-row{padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:13px;}
  .tb-vocab-row b,.tb-res-row b{color:#1E293B;}
  .tb-file-chip{display:inline-flex;align-items:center;gap:6px;background:#E8F0FE;color:#174ea6;padding:5px 10px;border-radius:6px;font-size:12px;margin-top:8px;}
  `;

  function openOverlay() {
    if (document.getElementById('tb-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tb-overlay';
    setHTML(overlay,
      '<div id="tb-panel">' +
      '  <div class="tb-topbar">' +
      '    <div><h1>Google Classroom Topic Builder</h1><div class="tb-topbar-sub" id="tb-course-label"></div></div>' +
      '    <button class="tb-close" id="tb-close">Close</button>' +
      '  </div>' +
      '  <div class="tb-stepbar" id="tb-stepbar"></div>' +
      '  <div class="tb-body"></div>' +
      '</div>');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
    document.body.appendChild(overlay);
    overlay.querySelector('#tb-close').addEventListener('click', closeOverlay);
    render();
  }

  function closeOverlay() {
    const overlay = document.getElementById('tb-overlay');
    if (overlay) overlay.remove();
  }

  function renderStepbar() {
    const bar = document.getElementById('tb-stepbar');
    if (!bar) return;
    const steps = ['setup', 'upload', 'select', 'review', 'download'];
    const idx = steps.indexOf(state.step);
    setHTML(bar, steps.map((s, i) =>
      '<div class="tb-stepdot ' + (i < idx ? 'done' : i === idx ? 'active' : '') + '"></div>'
    ).join(''));
  }

  function courseLabel() {
    const el = document.getElementById('tb-course-label');
    if (!el) return;
    el.textContent = state.courseId ? ('Class ID: ' + state.courseId) : 'Open a class in Google Classroom for context (optional).';
  }

  function render() {
    const overlay = document.getElementById('tb-overlay');
    if (!overlay) return;
    const body = overlay.querySelector('.tb-body');
    if (state.step === 'setup') renderSetup(body);
    else if (state.step === 'upload') renderUpload(body);
    else if (state.step === 'select') renderSelect(body);
    else if (state.step === 'review') renderReview(body);
    else if (state.step === 'download') renderDownloadStep(body);
    renderStepbar();
    courseLabel();
  }

  function renderSetup(body) {
    setHTML(body,
      '<div class="tb-card">' +
      '  <div class="tb-h2">Claude API key</div>' +
      '  <div class="tb-desc">Used to draft the lesson summary, assignment, vocabulary and resources. Get one at console.anthropic.com — billed to your own account. This tool generates files locally; nothing is published to Google automatically — you upload them into Classroom yourself.</div>' +
      '  <input type="password" class="tb-input" id="tb-claude-key" placeholder="sk-ant-..." value="' + escapeAttr(state.claudeKey) + '">' +
      '</div>' +
      '<div class="tb-btn-row">' +
      '  <button class="tb-btn tb-btn-primary" id="tb-setup-next" ' + (state.claudeKey ? '' : 'disabled') + '>Next: Upload material →</button>' +
      '</div>');
    body.querySelector('#tb-claude-key').addEventListener('input', (e) => {
      state.claudeKey = e.target.value;
      GM_setValue('tb_claude_key', state.claudeKey);
      body.querySelector('#tb-setup-next').disabled = !state.claudeKey;
    });
    const nextBtn = body.querySelector('#tb-setup-next');
    if (nextBtn) nextBtn.addEventListener('click', () => { state.step = 'upload'; render(); });
  }

  function renderUpload(body) {
    const html =
      '<div class="tb-card">' +
      '  <div class="tb-h2">Source material</div>' +
      '  <div class="tb-desc">Upload a PDF or DOCX, or paste text directly. This becomes the basis for everything the AI drafts.</div>' +
      '  <input type="file" id="tb-file" accept=".pdf,.docx" ' + (state.parsing ? 'disabled' : '') + '>' +
      (state.sourceFileName ? '<div class="tb-file-chip">📄 ' + escapeHtml(state.sourceFileName) + '</div>' : '') +
      (state.parsing ? '<div class="tb-hint">Parsing…</div>' : '') +
      (state.parseError ? '<div class="tb-banner tb-banner-err" style="margin-top:10px;">' + escapeHtml(state.parseError) + '</div>' : '') +
      '  <div class="tb-label" style="margin-top:14px;">Or paste/edit text directly</div>' +
      '  <textarea class="tb-textarea" id="tb-source-text" placeholder="Paste lesson source material here...">' + escapeHtml(state.sourceText) + '</textarea>' +
      (state.truncated ? '<div class="tb-hint">Source was trimmed to ' + SOURCE_MAX_CHARS.toLocaleString() + ' characters for the AI call.</div>' : '') +
      '</div>' +
      '<div class="tb-btn-row">' +
      '  <button class="tb-btn tb-btn-secondary" id="tb-upload-back">← Back</button>' +
      '  <button class="tb-btn tb-btn-primary" id="tb-upload-next" ' + (!state.sourceText.trim() ? 'disabled' : '') + '>Next: Choose what to build →</button>' +
      '</div>';
    setHTML(body, html);

    body.querySelector('#tb-file').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
    });
    body.querySelector('#tb-source-text').addEventListener('input', (e) => {
      state.sourceText = e.target.value;
      const nextBtn = body.querySelector('#tb-upload-next');
      if (nextBtn) nextBtn.disabled = !state.sourceText.trim();
    });
    body.querySelector('#tb-upload-back').addEventListener('click', () => { state.step = 'setup'; render(); });
    body.querySelector('#tb-upload-next').addEventListener('click', () => { state.step = 'select'; render(); });
  }

  function renderSelect(body) {
    const anySelected = Object.values(state.selected).some(Boolean);
    const html =
      '<div class="tb-card">' +
      '  <div class="tb-h2">What should the AI build?</div>' +
      '  <div class="tb-desc">Pick what you want drafted from your source material.</div>' +
      CONTENT_ITEMS.map((item) =>
        '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #F1F5F9;cursor:pointer;">' +
        '<input type="checkbox" data-key="' + item.key + '" ' + (state.selected[item.key] ? 'checked' : '') + ' style="margin-top:3px;">' +
        '<span><b>' + escapeHtml(item.label) + '</b><br><span style="font-size:12px;color:#64748B;">' + escapeHtml(item.desc) + '</span></span>' +
        '</label>'
      ).join('') +
      '</div>' +
      (state.analyzeError ? '<div class="tb-banner tb-banner-err">' + escapeHtml(state.analyzeError) + '</div>' : '') +
      '<div class="tb-btn-row">' +
      '  <button class="tb-btn tb-btn-secondary" id="tb-select-back">← Back</button>' +
      '  <button class="tb-btn tb-btn-primary" id="tb-select-go" ' + (!anySelected || state.analyzing ? 'disabled' : '') + '>' +
      (state.analyzing ? 'Building…' : '✨ Build Selected') + '</button>' +
      '</div>';
    setHTML(body, html);

    body.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        state.selected[e.target.dataset.key] = e.target.checked;
        const goBtn = body.querySelector('#tb-select-go');
        if (goBtn) goBtn.disabled = !Object.values(state.selected).some(Boolean) || state.analyzing;
      });
    });
    body.querySelector('#tb-select-back').addEventListener('click', () => { state.step = 'upload'; render(); });
    body.querySelector('#tb-select-go').addEventListener('click', analyzeSource);
  }

  function renderReview(body) {
    const d = state.draft;
    const s = state.selected;
    if (!d) { state.step = 'select'; render(); return; }
    setHTML(body,
      '<div class="tb-card">' +
      '  <div class="tb-h2">Topic name</div>' +
      '  <input type="text" class="tb-input" id="tb-topic-name" value="' + escapeAttr(d.topicName || '') + '">' +
      '</div>' +
      (s.lessonSummary ?
        '<div class="tb-card">' +
        '  <div class="tb-h2">Lesson summary</div>' +
        '  <div class="tb-desc" style="white-space:pre-wrap;color:#334155;">' + escapeHtml(d.lessonSummary || '') + '</div>' +
        '</div>' : '') +
      (s.vocabulary ?
        '<div class="tb-card">' +
        '  <div class="tb-h2">Vocabulary (' + d.vocabulary.length + ')</div>' +
        d.vocabulary.map((v) => '<div class="tb-vocab-row"><b>' + escapeHtml(v.term) + '</b> — ' + escapeHtml(v.definition) + '</div>').join('') +
        '</div>' : '') +
      (s.resources ?
        '<div class="tb-card">' +
        '  <div class="tb-h2">Resources (' + d.resources.length + ')</div>' +
        (d.resources.length ? d.resources.map((r) => '<div class="tb-res-row"><b>' + escapeHtml(r.title || r.url) + '</b>' + (r.url ? ' — ' + escapeHtml(r.url) : '') + '</div>').join('') : '<div class="tb-desc">None suggested.</div>') +
        '</div>' : '') +
      ASSIGNMENT_TYPES.map((t) => (s[t.key] && d[t.key]) ?
        '<div class="tb-card">' +
        '  <div class="tb-h2">' + escapeHtml(t.label) + '</div>' +
        '  <div class="tb-label">Title</div>' +
        '  <input type="text" class="tb-input" id="tb-assign-title-' + t.key + '" value="' + escapeAttr(d[t.key].title || '') + '" style="margin-bottom:10px;">' +
        '  <div class="tb-desc" style="white-space:pre-wrap;color:#334155;">' + escapeHtml(d[t.key].instructions || '') + '</div>' +
        '  <div class="tb-label">Points</div>' +
        '  <input type="number" class="tb-input" id="tb-assign-points-' + t.key + '" value="' + (d[t.key].points || 100) + '" style="max-width:120px;">' +
        '</div>' : ''
      ).join('') +
      (s.form && d.formQuestions && d.formQuestions.length ?
        '<div class="tb-card">' +
        '  <div class="tb-h2">Quiz Questions (' + d.formQuestions.length + ')</div>' +
        '  <div class="tb-desc">Not exported yet — copy these into a Google Form yourself.</div>' +
        d.formQuestions.map((q, i) => '<div class="tb-vocab-row"><b>' + (i + 1) + '. ' + escapeHtml(q.question) + '</b>' + (q.options && q.options.length ? '<br>' + q.options.map(escapeHtml).join(' • ') : '') + '</div>').join('') +
        '</div>' : '') +
      (s.projectGuide && d.projectGuide ?
        '<div class="tb-card">' +
        '  <div class="tb-h2">Project Guide</div>' +
        '  <div class="tb-desc">Not exported yet — copy this yourself.</div>' +
        '  <div class="tb-desc" style="white-space:pre-wrap;color:#334155;">' + escapeHtml(d.projectGuide) + '</div>' +
        '</div>' : '') +
      '<div class="tb-btn-row">' +
      '  <button class="tb-btn tb-btn-secondary" id="tb-review-back">← Back</button>' +
      '  <button class="tb-btn tb-btn-secondary" id="tb-regenerate">↻ Regenerate</button>' +
      '  <button class="tb-btn tb-btn-primary" id="tb-review-next">Next: Download →</button>' +
      '</div>');

    body.querySelector('#tb-topic-name').addEventListener('input', (e) => { d.topicName = e.target.value; });
    ASSIGNMENT_TYPES.forEach((t) => {
      const titleInput = body.querySelector('#tb-assign-title-' + t.key);
      if (titleInput) titleInput.addEventListener('input', (e) => { d[t.key].title = e.target.value; });
      const pointsInput = body.querySelector('#tb-assign-points-' + t.key);
      if (pointsInput) pointsInput.addEventListener('input', (e) => { d[t.key].points = parseInt(e.target.value, 10) || 0; });
    });
    body.querySelector('#tb-review-back').addEventListener('click', () => { state.step = 'select'; render(); });
    body.querySelector('#tb-regenerate').addEventListener('click', analyzeSource);
    body.querySelector('#tb-review-next').addEventListener('click', () => { state.step = 'download'; render(); });
  }

  function renderDownloadStep(body) {
    setHTML(body,
      '<div class="tb-card">' +
      '  <div class="tb-h2">Download files</div>' +
      '  <div class="tb-desc">Saves one HTML file per thing you built (Lesson Summary bundles Vocabulary/Resources together; each assignment type is its own file). Open a file and use your browser\'s Print → Save as PDF if you want PDF instead. Upload them into the Topic in Classroom yourself.</div>' +
      (state.downloadError ? '<div class="tb-banner tb-banner-err">' + escapeHtml(state.downloadError) + '</div>' : '') +
      (state.downloaded ?
        '<div class="tb-banner tb-banner-ok">Downloaded to your browser\'s downloads folder:<br>' +
        state.downloadedFiles.map((f) => '• ' + escapeHtml(f)).join('<br>') +
        '</div>' : '') +
      '</div>' +
      '<div class="tb-btn-row">' +
      '  <button class="tb-btn tb-btn-secondary" id="tb-download-back">← Back</button>' +
      '  <button class="tb-btn tb-btn-success" id="tb-download-go">' + (state.downloaded ? '⬇ Download again' : '⬇ Download files') + '</button>' +
      '</div>');
    body.querySelector('#tb-download-back').addEventListener('click', () => { state.step = 'review'; render(); });
    body.querySelector('#tb-download-go').addEventListener('click', downloadAll);
  }

  // Google Classroom enforces Trusted Types (CSP require-trusted-types-for
  // 'script'), which rejects any raw-string assignment to .innerHTML.
  // DOMParser.parseFromString is a guarded sink too in current Chrome, so the
  // only real fix is to register an actual Trusted Types policy and pass its
  // TrustedHTML output to the sink. Try a few policy names in case
  // Classroom's CSP `trusted-types` directive restricts which names may be
  // created.
  let ttPolicy = null;
  let ttPolicyAttempted = false;
  function getTrustedTypesPolicy() {
    if (ttPolicyAttempted) return ttPolicy;
    ttPolicyAttempted = true;
    if (!window.trustedTypes || !window.trustedTypes.createPolicy) return null;
    const candidateNames = ['tb-html', 'topic-builder-html', 'default'];
    for (const name of candidateNames) {
      try {
        ttPolicy = window.trustedTypes.createPolicy(name, {
          createHTML: (s) => s,
          createScriptURL: (s) => s,
        });
        console.log('[Topic Builder] Trusted Types policy created:', name);
        return ttPolicy;
      } catch (e) {
        console.warn('[Topic Builder] could not create Trusted Types policy "' + name + '":', e.message);
      }
    }
    return null;
  }

  // Same Trusted Types enforcement also guards script/worker URLs
  // (TrustedScriptURL) — separate from the TrustedHTML sink above. pdf.js's
  // worker loader assigns a URL string internally, which this page rejects
  // the same way it rejected raw innerHTML strings.
  function trustedScriptURL(url) {
    const policy = getTrustedTypesPolicy();
    return policy ? policy.createScriptURL(url) : url;
  }

  function setHTML(el, html) {
    while (el.firstChild) el.removeChild(el.firstChild);
    const policy = getTrustedTypesPolicy();
    if (policy) {
      el.innerHTML = policy.createHTML(html);
      return;
    }
    console.error('[Topic Builder] No Trusted Types policy could be created — cannot render HTML on this page.');
    throw new Error('This page blocks HTML rendering (Trusted Types) and no policy name was accepted. See console for the per-name errors.');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // ── FAB + SPA-navigation watchdog ───────────────────────────────────────
  function injectFab() {
    if (document.getElementById('tb-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'tb-fab';
    btn.title = 'Topic Builder';
    btn.textContent = '✨';
    btn.addEventListener('click', () => {
      try {
        openOverlay();
      } catch (err) {
        console.error('[Topic Builder] openOverlay threw:', err);
        // prompt() pre-selects its text in a native, easily copy-pasteable
        // field — alert() text is a pain to select in most browsers.
        window.prompt('Topic Builder hit an error opening its panel. Copy this (Ctrl/Cmd+C) and share it:', (err && err.stack) || (err && err.message) || String(err));
      }
    });
    document.body.appendChild(btn);
  }

  function refreshCourseContext() {
    const id = getCourseIdFromUrl();
    if (id === state.courseId) return;
    state.courseId = id;
    if (document.getElementById('tb-overlay')) courseLabel();
  }

  function init() {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(CSS);
    } else {
      // Shouldn't happen with @grant GM_addStyle declared, but don't let a
      // missing grant silently leave the overlay unstyled — fall back to a
      // manual <style> tag rather than failing invisibly.
      const el = document.createElement('style');
      el.textContent = CSS;
      (document.head || document.documentElement).appendChild(el);
    }
    injectFab();
    refreshCourseContext();
    new MutationObserver(injectFab).observe(document.body, { childList: true, subtree: false });
    window.addEventListener('popstate', refreshCourseContext);
    setInterval(() => { injectFab(); refreshCourseContext(); }, 1500);
  }

  function waitAndLaunch(tries) {
    if (document.body) { init(); return; }
    if (tries > 40) return;
    setTimeout(() => waitAndLaunch(tries + 1), 250);
  }
  waitAndLaunch(0);
})();
