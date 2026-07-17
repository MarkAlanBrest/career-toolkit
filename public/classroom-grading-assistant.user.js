// ==UserScript==
// @name         Google Classroom Grading Assistant
// @namespace    https://github.com/MarkAlanBrest/google-classroom-grading-assistant
// @version      1.0.0
// @description  AI-assisted grading for Google Classroom — set a rubric/answer key once, pull each student's submission, get a suggested grade + comments, and insert the grade into Classroom's own grade box. Uses your own Claude API key. No Google API/OAuth needed — submission fetch rides your existing browser session.
// @author       MarkAlanBrest
// @homepageURL  https://career-toolkit-ruby.vercel.app/
// @supportURL   https://career-toolkit-ruby.vercel.app/
// @updateURL    https://career-toolkit-ruby.vercel.app/classroom-grading-assistant.user.js
// @downloadURL  https://career-toolkit-ruby.vercel.app/classroom-grading-assistant.user.js
// @match        https://classroom.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      api.anthropic.com
// @connect      docs.google.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__GRADING_ASSISTANT__) return;
  window.__GRADING_ASSISTANT__ = true;
  if (window.top !== window.self) return;

  // ── DISABLE / UNINSTALL ─────────────────────────────────────────────────
  if (typeof GM_registerMenuCommand === 'function') {
    if (GM_getValue('ga_disabled', false)) {
      GM_registerMenuCommand('▶ Enable Grading Assistant', () => {
        GM_setValue('ga_disabled', false);
        window.location.reload();
      });
      return;
    }
    GM_registerMenuCommand('⏸ Disable Grading Assistant', () => {
      GM_setValue('ga_disabled', true);
      window.location.reload();
    });
  } else if (GM_getValue('ga_disabled', false)) {
    return;
  }

  // ── CONSTANTS ────────────────────────────────────────────────────────────
  const CLAUDE_MODEL = 'claude-sonnet-4-6';
  const CLAUDE_MAX_TOKENS = 1500;
  // Confirmed against a real Classroom grading page (aria-label="Grade" on
  // the score <input>) — this is the one selector we know is real. Everything
  // else (submission link, student name) is best-effort/heuristic and shown
  // in the UI so failures are visible rather than silent.
  const GRADE_INPUT_SELECTOR = 'input[aria-label="Grade"]';

  // ── STATE ────────────────────────────────────────────────────────────────
  const state = {
    claudeKey: GM_getValue('ga_claude_key', ''),
    rubric: GM_getValue('ga_rubric', ''),
    maxPoints: GM_getValue('ga_max_points', 100),
    detectedFile: null, // { id, url, type }
    submissionText: '',
    fetching: false,
    fetchError: '',
    grading: false,
    gradeError: '',
    suggestedGrade: '',
    suggestedComments: '',
    insertError: '',
    inserted: false,
  };

  // ── GM/NETWORK HELPERS ───────────────────────────────────────────────────
  function gmFetch(opts) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.body,
        timeout: opts.timeout || 60000,
        onload: (res) => resolve(res),
        onerror: () => reject(new Error('Network error contacting ' + opts.url)),
        ontimeout: () => reject(new Error('Request timed out — please try again.')),
      });
    });
  }

  function stripMarkdownFence(text) {
    return String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // ── CLAUDE ───────────────────────────────────────────────────────────────
  async function callClaude(prompt, maxTokens) {
    if (!state.claudeKey) throw new Error('No Claude API key set — add it in Setup.');
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
      timeout: 60000,
    });
    let data = {};
    try { data = JSON.parse(res.responseText || '{}'); } catch (e) { /* non-JSON body */ }
    if (res.status < 200 || res.status >= 300) {
      throw new Error((data && data.error && data.error.message) || ('Claude API error (HTTP ' + res.status + ')'));
    }
    return (data.content && data.content[0] && data.content[0].text) || '';
  }

  function buildGradingPrompt() {
    return 'You are grading a student\'s submission against the rubric/answer key below. Be specific and reference the rubric — no generic praise.\n\n' +
      'RUBRIC / ANSWER KEY (out of ' + state.maxPoints + ' points):\n"""\n' + state.rubric + '\n"""\n\n' +
      'STUDENT SUBMISSION:\n"""\n' + state.submissionText + '\n"""\n\n' +
      'Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:\n' +
      '{"grade": number, "comments": string}\n' +
      '- grade: a number from 0 to ' + state.maxPoints + '.\n' +
      '- comments: 2-4 sentences of specific, constructive feedback a teacher could paste directly as a private comment — reference what the rubric asked for and what was/wasn\'t met.';
  }

  async function gradeSubmission() {
    state.grading = true;
    state.gradeError = '';
    render();
    try {
      if (!state.rubric.trim()) throw new Error('Add a rubric/answer key first.');
      if (!state.submissionText.trim()) throw new Error('Fetch or paste the submission first.');
      const raw = await callClaude(buildGradingPrompt(), CLAUDE_MAX_TOKENS);
      const cleaned = stripMarkdownFence(raw);
      let result;
      try {
        result = JSON.parse(cleaned);
      } catch (e) {
        throw new Error('The AI response wasn\'t valid JSON. Try again. (' + e.message + ')');
      }
      state.suggestedGrade = String(result.grade != null ? result.grade : '');
      state.suggestedComments = result.comments || '';
      state.inserted = false;
    } catch (e) {
      state.gradeError = e.message || String(e);
    } finally {
      state.grading = false;
      render();
    }
  }

  // ── SUBMISSION DETECTION + FETCH ─────────────────────────────────────────
  // Best-effort: scan links/iframes on the grading page for a Docs/Drive file
  // ID. Only Google Docs export (plain text) is auto-fetched; other file
  // types are detected but left for the teacher to open/paste manually,
  // since their export endpoints aren't as uniform.
  function detectSubmissionFile() {
    const candidates = [
      ...[...document.querySelectorAll('a[href]')].map((a) => a.href),
      ...[...document.querySelectorAll('iframe[src]')].map((f) => f.src),
    ];
    for (const url of candidates) {
      const m = url.match(/\/document\/d\/([-\w]{20,})/);
      if (m) return { id: m[1], url, type: 'doc' };
    }
    for (const url of candidates) {
      const m = url.match(/\/(?:presentation|spreadsheets)\/d\/([-\w]{20,})/) || url.match(/\/file\/d\/([-\w]{20,})/);
      if (m) return { id: m[1], url, type: 'other' };
    }
    return null;
  }

  async function fetchSubmission() {
    state.fetchError = '';
    state.fetching = true;
    render();
    try {
      const file = detectSubmissionFile();
      state.detectedFile = file;
      if (!file) {
        throw new Error('No Google Doc/Drive link found on this page — paste the submission text manually below.');
      }
      if (file.type !== 'doc') {
        throw new Error('Detected a non-Doc file (Slides/Sheets/upload) — open it yourself and paste the text below; auto-fetch only supports Google Docs right now.');
      }
      const res = await gmFetch({
        url: 'https://docs.google.com/document/d/' + file.id + '/export?format=txt',
        timeout: 30000,
      });
      if (res.status < 200 || res.status >= 300) {
        throw new Error('Could not fetch the doc (HTTP ' + res.status + ') — you may need to open it once yourself first, or paste the text manually.');
      }
      state.submissionText = res.responseText || '';
    } catch (e) {
      state.fetchError = e.message || String(e);
    } finally {
      state.fetching = false;
      render();
    }
  }

  // ── INSERT GRADE (fills Classroom's own grade box, triggers its native save) ──
  function insertGrade() {
    state.insertError = '';
    try {
      const input = document.querySelector(GRADE_INPUT_SELECTOR);
      if (!input) throw new Error('Could not find the grade box on this page (selector: ' + GRADE_INPUT_SELECTOR + ').');
      // Wiz/Angular-style controlled inputs ignore a plain `.value =` set —
      // go through the native setter so the framework's own change detection
      // picks it up, same trick used for React-controlled inputs.
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, state.suggestedGrade);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
      input.blur();
      state.inserted = true;
    } catch (e) {
      state.insertError = e.message || String(e);
    }
    render();
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  const CSS = `
  #ga-fab{position:fixed;right:22px;bottom:86px;z-index:99998;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;border:none;box-shadow:0 6px 16px rgba(124,58,237,0.4);cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;transition:transform .15s;}
  #ga-fab:hover{transform:scale(1.07);}
  #ga-overlay{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:30px 20px;font-family:'Google Sans',Roboto,system-ui,-apple-system,sans-serif;}
  #ga-panel{background:#F8FAFC;border-radius:20px;max-width:820px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 60px);}
  .ga-topbar{background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;}
  .ga-topbar h1{margin:0;font-size:18px;font-weight:700;}
  .ga-close{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;}
  .ga-close:hover{background:rgba(255,255,255,0.25);}
  .ga-body{flex:1;overflow-y:auto;padding:20px 24px 24px;}
  .ga-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
  .ga-h2{font-size:16px;font-weight:700;color:#1E293B;margin:0 0 4px;}
  .ga-desc{font-size:13px;color:#64748B;margin:0 0 12px;}
  .ga-label{display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:4px;}
  .ga-input,.ga-textarea{width:100%;padding:9px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;color:#1E293B;background:#fff;box-sizing:border-box;font-family:inherit;}
  .ga-input:focus,.ga-textarea:focus{outline:none;border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,0.12);}
  .ga-textarea{resize:vertical;min-height:90px;}
  .ga-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:transform .15s;}
  .ga-btn:hover{transform:translateY(-1px);}
  .ga-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .ga-btn-primary{background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;}
  .ga-btn-secondary{background:#fff;color:#475569;border:1px solid #CBD5E1;}
  .ga-btn-success{background:linear-gradient(135deg,#188038,#0d652d);color:#fff;}
  .ga-btn-row{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
  .ga-banner{padding:10px 14px;border-radius:8px;font-size:12px;margin-top:10px;}
  .ga-banner-ok{background:#E6F4EA;color:#188038;}
  .ga-banner-warn{background:#FEF7E0;color:#B06000;}
  .ga-banner-err{background:#FCE8E6;color:#C5221F;}
  .ga-preview{max-height:160px;overflow-y:auto;white-space:pre-wrap;font-size:12px;color:#334155;background:#F8FAFC;border:1px solid #e5e7eb;border-radius:8px;padding:10px;}
  `;

  function openOverlay() {
    if (document.getElementById('ga-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ga-overlay';
    setHTML(overlay,
      '<div id="ga-panel">' +
      '  <div class="ga-topbar"><h1>Grading Assistant</h1><button class="ga-close" id="ga-close">Close</button></div>' +
      '  <div class="ga-body"></div>' +
      '</div>');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
    document.body.appendChild(overlay);
    overlay.querySelector('#ga-close').addEventListener('click', closeOverlay);
    render();
  }

  function closeOverlay() {
    const overlay = document.getElementById('ga-overlay');
    if (overlay) overlay.remove();
  }

  function render() {
    const overlay = document.getElementById('ga-overlay');
    if (!overlay) return;
    const body = overlay.querySelector('.ga-body');
    if (!state.claudeKey) renderSetup(body);
    else renderMain(body);
  }

  function renderSetup(body) {
    setHTML(body,
      '<div class="ga-card">' +
      '  <div class="ga-h2">Claude API key</div>' +
      '  <div class="ga-desc">Used to grade submissions against your rubric. Get one at console.anthropic.com — billed to your own account.</div>' +
      '  <input type="password" class="ga-input" id="ga-claude-key" placeholder="sk-ant-...">' +
      '  <div class="ga-btn-row"><button class="ga-btn ga-btn-primary" id="ga-setup-go" disabled>Continue</button></div>' +
      '</div>');
    const keyInput = body.querySelector('#ga-claude-key');
    const goBtn = body.querySelector('#ga-setup-go');
    keyInput.addEventListener('input', (e) => { goBtn.disabled = !e.target.value.trim(); });
    goBtn.addEventListener('click', () => {
      state.claudeKey = keyInput.value.trim();
      GM_setValue('ga_claude_key', state.claudeKey);
      render();
    });
  }

  function renderMain(body) {
    setHTML(body,
      '<div class="ga-card">' +
      '  <div class="ga-h2">Rubric / Answer Key</div>' +
      '  <div class="ga-desc">Set once per assignment — reused for every student until you change it.</div>' +
      '  <textarea class="ga-textarea" id="ga-rubric" placeholder="Paste your rubric, answer key, or grading criteria...">' + escapeHtml(state.rubric) + '</textarea>' +
      '  <div class="ga-label" style="margin-top:10px;">Points possible</div>' +
      '  <input type="number" class="ga-input" id="ga-max-points" value="' + state.maxPoints + '" style="max-width:120px;">' +
      '</div>' +

      '<div class="ga-card">' +
      '  <div class="ga-h2">Submission</div>' +
      '  <div class="ga-desc">' +
      (state.detectedFile ? 'Detected: <a href="' + escapeAttr(state.detectedFile.url) + '" target="_blank">' + escapeHtml(state.detectedFile.url) + '</a>' : 'Not detected yet — click Fetch, or paste the text below yourself.') +
      '  </div>' +
      '  <div class="ga-btn-row">' +
      '    <button class="ga-btn ga-btn-secondary" id="ga-fetch" ' + (state.fetching ? 'disabled' : '') + '>' + (state.fetching ? 'Fetching…' : '⤓ Fetch Submission') + '</button>' +
      '  </div>' +
      (state.fetchError ? '<div class="ga-banner ga-banner-warn">' + escapeHtml(state.fetchError) + '</div>' : '') +
      '  <div class="ga-label" style="margin-top:10px;">Submission text (edit or paste manually if auto-fetch didn\'t work)</div>' +
      '  <textarea class="ga-textarea" id="ga-submission-text" placeholder="Submission text goes here...">' + escapeHtml(state.submissionText) + '</textarea>' +
      '</div>' +

      '<div class="ga-card">' +
      '  <div class="ga-h2">AI Suggestion</div>' +
      '  <div class="ga-btn-row">' +
      '    <button class="ga-btn ga-btn-primary" id="ga-grade" ' + (state.grading ? 'disabled' : '') + '>' + (state.grading ? 'Grading…' : '✨ Grade with AI') + '</button>' +
      '  </div>' +
      (state.gradeError ? '<div class="ga-banner ga-banner-err">' + escapeHtml(state.gradeError) + '</div>' : '') +
      (state.suggestedGrade !== '' || state.suggestedComments ?
        '<div class="ga-label" style="margin-top:12px;">Suggested grade (out of ' + state.maxPoints + ')</div>' +
        '<input type="number" class="ga-input" id="ga-suggested-grade" value="' + escapeAttr(state.suggestedGrade) + '" style="max-width:120px;">' +
        '<div class="ga-label" style="margin-top:10px;">Comments</div>' +
        '<textarea class="ga-textarea" id="ga-suggested-comments">' + escapeHtml(state.suggestedComments) + '</textarea>' +
        '<div class="ga-btn-row">' +
        '  <button class="ga-btn ga-btn-secondary" id="ga-copy-comments">📋 Copy comments</button>' +
        '  <button class="ga-btn ga-btn-success" id="ga-insert-grade">' + (state.inserted ? '✓ Inserted' : '⬇ Insert grade into Classroom') + '</button>' +
        '</div>' +
        (state.insertError ? '<div class="ga-banner ga-banner-err">' + escapeHtml(state.insertError) + '</div>' : '') +
        (state.inserted ? '<div class="ga-banner ga-banner-ok">Grade box filled — paste the comment into Classroom\'s private comment field yourself, then move to the next student.</div>' : '')
        : '') +
      '</div>');

    body.querySelector('#ga-rubric').addEventListener('input', (e) => { state.rubric = e.target.value; GM_setValue('ga_rubric', state.rubric); });
    body.querySelector('#ga-max-points').addEventListener('input', (e) => { state.maxPoints = parseInt(e.target.value, 10) || 100; GM_setValue('ga_max_points', state.maxPoints); });
    body.querySelector('#ga-fetch').addEventListener('click', fetchSubmission);
    body.querySelector('#ga-submission-text').addEventListener('input', (e) => { state.submissionText = e.target.value; });
    body.querySelector('#ga-grade').addEventListener('click', gradeSubmission);
    const gradeInput = body.querySelector('#ga-suggested-grade');
    if (gradeInput) gradeInput.addEventListener('input', (e) => { state.suggestedGrade = e.target.value; });
    const commentsInput = body.querySelector('#ga-suggested-comments');
    if (commentsInput) commentsInput.addEventListener('input', (e) => { state.suggestedComments = e.target.value; });
    const copyBtn = body.querySelector('#ga-copy-comments');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(state.suggestedComments).then(() => {
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => { copyBtn.textContent = '📋 Copy comments'; }, 1500);
      });
    });
    const insertBtn = body.querySelector('#ga-insert-grade');
    if (insertBtn) insertBtn.addEventListener('click', insertGrade);
  }

  // Same Trusted Types handling proven out in the Topic Builder script —
  // Google Classroom rejects raw-string .innerHTML assignment, so route
  // through a registered policy.
  let ttPolicy = null;
  let ttPolicyAttempted = false;
  function getTrustedTypesPolicy() {
    if (ttPolicyAttempted) return ttPolicy;
    ttPolicyAttempted = true;
    if (!window.trustedTypes || !window.trustedTypes.createPolicy) return null;
    const candidateNames = ['ga-html', 'grading-assistant-html', 'default'];
    for (const name of candidateNames) {
      try {
        ttPolicy = window.trustedTypes.createPolicy(name, { createHTML: (s) => s, createScriptURL: (s) => s });
        return ttPolicy;
      } catch (e) { /* try next name */ }
    }
    return null;
  }

  function setHTML(el, html) {
    while (el.firstChild) el.removeChild(el.firstChild);
    const policy = getTrustedTypesPolicy();
    if (policy) {
      el.innerHTML = policy.createHTML(html);
      return;
    }
    throw new Error('This page blocks HTML rendering (Trusted Types) and no policy name was accepted.');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // ── FAB + SPA watchdog ───────────────────────────────────────────────────
  function injectFab() {
    if (document.getElementById('ga-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'ga-fab';
    btn.title = 'Grading Assistant';
    btn.textContent = '📝';
    btn.addEventListener('click', () => {
      try {
        openOverlay();
      } catch (err) {
        window.prompt('Grading Assistant hit an error. Copy this and share it:', (err && err.stack) || String(err));
      }
    });
    document.body.appendChild(btn);
  }

  function init() {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(CSS);
    } else {
      const el = document.createElement('style');
      el.textContent = CSS;
      (document.head || document.documentElement).appendChild(el);
    }
    injectFab();
    new MutationObserver(injectFab).observe(document.body, { childList: true, subtree: false });
    setInterval(injectFab, 1500);
  }

  function waitAndLaunch(tries) {
    if (document.body) { init(); return; }
    if (tries > 40) return;
    setTimeout(() => waitAndLaunch(tries + 1), 250);
  }
  waitAndLaunch(0);
})();
