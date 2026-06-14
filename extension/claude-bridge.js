(async function () {
  'use strict';
  if (document.getElementById('ce-bar')) return;

  const CONTEXT_KEY = 'ce_claude_context';
  const PANEL_H     = 220;  // px — top panel height

  const DS = {
    blue:   '#0770B8',
    text:   '#2D3B45',
    gray:   '#F5F5F5',
    border: '#C7CDD1',
    muted:  '#6B7280',
    green:  '#127A1B',
    red:    '#C0392B',
    white:  '#FFFFFF',
    font:   '-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif',
  };

  let ctx       = null;
  let fileReady = false;
  let panel     = null;
  let spacer    = null;

  // ── CONTEXT ───────────────────────────────────────────────────────────────
  async function loadContext() {
    const s = await new Promise(r => chrome.storage.local.get(CONTEXT_KEY, r));
    ctx = s[CONTEXT_KEY] || null;
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (!changes[CONTEXT_KEY]) return;
    ctx = changes[CONTEXT_KEY].newValue;
    fileReady = false;
    renderPanel();
  });

  // ── HELPERS ───────────────────────────────────────────────────────────────
  function el(tag, css, attrs) {
    const e = document.createElement(tag);
    if (css)   e.style.cssText = css;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  function mkBtn(text, bgColor, onClick) {
    const b = el('button', `
      padding:5px 11px;border:none;border-radius:3px;
      font-size:12px;font-weight:600;cursor:pointer;
      font-family:${DS.font};white-space:nowrap;flex-shrink:0;
      background:${bgColor};color:#fff;
      transition:opacity .12s;
    `, { type: 'button', textContent: text });
    b.addEventListener('click', onClick);
    b.addEventListener('mouseenter', () => b.style.opacity = '.85');
    b.addEventListener('mouseleave', () => b.style.opacity = '1');
    return b;
  }

  // ── PANEL INJECT ──────────────────────────────────────────────────────────
  function injectPanel() {
    if (document.getElementById('ce-bar') || !document.body) return;

    // Spacer pushes the AI page content below our panel
    spacer = el('div', `height:${PANEL_H}px;display:block;flex-shrink:0;`);
    spacer.id = 'ce-spacer';
    document.body.insertBefore(spacer, document.body.firstChild);

    panel = el('div', `
      position:fixed;top:0;left:0;right:0;z-index:2147483647;
      height:${PANEL_H}px;
      background:${DS.white};
      border-bottom:3px solid ${DS.blue};
      box-shadow:0 2px 12px rgba(0,0,0,.1);
      font-family:${DS.font};font-size:13px;color:${DS.text};
      display:flex;flex-direction:column;
    `);
    panel.id = 'ce-bar';
    document.body.appendChild(panel);
    renderPanel();
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  function renderPanel() {
    if (!panel) return;
    panel.innerHTML = '';

    // ── ROW 1: brand + student info + action buttons ──────────────────────
    const row1 = el('div', `
      display:flex;align-items:center;gap:10px;
      padding:8px 14px 7px;flex-shrink:0;
      border-bottom:1px solid ${DS.border};
    `);

    // Brand
    const brand = el('span', `font-weight:800;font-size:12px;color:${DS.blue};white-space:nowrap;flex-shrink:0;`);
    brand.textContent = '✦ Canvas Enhancer';
    row1.appendChild(brand);

    // Student info
    const info = el('div', 'min-width:0;flex:1;');
    if (ctx?.studentName) {
      const nameEl = el('div', `font-weight:700;font-size:13px;color:${DS.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
      nameEl.textContent = ctx.studentName;
      info.appendChild(nameEl);

      const metaEl = el('div', `font-size:11px;color:${DS.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;`);
      const parts = [ctx.assignmentName];
      if (ctx.attachments?.length) parts.push('📎 ' + ctx.attachments.map(a => a.filename).join(', '));
      metaEl.textContent = parts.filter(Boolean).join('  ·  ');
      info.appendChild(metaEl);
    } else {
      const empty = el('div', `font-size:12px;color:${DS.muted};`);
      empty.textContent = 'Open SpeedGrader to load a student';
      info.appendChild(empty);
    }
    row1.appendChild(info);

    // Status span (used for file fetch progress, errors)
    const statusEl = el('span', `font-size:11px;white-space:nowrap;flex-shrink:0;`);
    statusEl.id = 'ce-status';
    row1.appendChild(statusEl);

    // Action buttons
    const actions = el('div', 'display:flex;gap:6px;flex-shrink:0;align-items:center;');

    if (ctx?.mode === 'criteria') {
      actions.appendChild(mkBtn('▶ Start Builder', DS.blue, sendCriteriaPrompt));
      actions.appendChild(mkBtn('⎘ Copy Criteria', DS.green, copyCriteria));
    } else {
      const hasFiles = ctx?.attachments?.length > 0;
      const hasText  = ctx?.subText && !ctx.subText.startsWith('[File upload');

      if (hasFiles && !fileReady && !hasText) {
        const grabBtn = mkBtn('📎 Grab File', DS.muted, grabFile);
        grabBtn.style.background = DS.gray;
        grabBtn.style.color = DS.text;
        grabBtn.style.border = `1px solid ${DS.border}`;
        actions.appendChild(grabBtn);
      } else if (fileReady || hasText) {
        const ok = el('span', `font-size:11px;color:${DS.green};white-space:nowrap;`);
        ok.textContent = '✓ File ready';
        actions.appendChild(ok);
      }

      actions.appendChild(mkBtn('✦ Grade Student', DS.blue, sendGradePrompt));
      actions.appendChild(mkBtn('⎘ Copy Comments', DS.green, copyComments));
    }

    row1.appendChild(actions);
    panel.appendChild(row1);

    // Criteria mode: no grade/save rows needed
    if (ctx?.mode === 'criteria') return;

    // ── ROW 2: grade input + save to canvas ───────────────────────────────
    const row2 = el('div', `
      display:flex;align-items:center;gap:8px;
      padding:6px 14px;flex-shrink:0;
    `);

    const gradeLab = el('label', `font-size:11px;font-weight:600;color:${DS.text};white-space:nowrap;flex-shrink:0;`);
    gradeLab.textContent = 'Grade:';

    const gradeIn = el('input', `
      width:80px;padding:5px 8px;flex-shrink:0;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;
    `, { id: 'ce-grade-in', type: 'text', placeholder: 'e.g. 92' });
    gradeIn.addEventListener('focus', () => gradeIn.style.borderColor = DS.blue);
    gradeIn.addEventListener('blur',  () => gradeIn.style.borderColor = DS.border);

    const saveBtn = mkBtn('💾 Save to Canvas', DS.green, saveToCanvas);
    saveBtn.id = 'ce-save-btn';

    const saveMsg = el('span', `font-size:11px;flex:1;`);
    saveMsg.id = 'ce-save-msg';

    row2.appendChild(gradeLab);
    row2.appendChild(gradeIn);
    row2.appendChild(saveBtn);
    row2.appendChild(saveMsg);
    panel.appendChild(row2);

    // ── ROW 3: comments textarea (fills remaining height) ─────────────────
    const row3 = el('div', `flex:1;padding:0 14px 8px;display:flex;flex-direction:column;`);

    const commentsIn = el('textarea', `
      flex:1;width:100%;box-sizing:border-box;
      padding:5px 8px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:12px;font-family:${DS.font};color:${DS.text};
      resize:none;outline:none;line-height:1.5;
    `);
    commentsIn.id = 'ce-comments-in';
    commentsIn.placeholder = 'Paste AI comments here — then Save to Canvas';
    commentsIn.addEventListener('focus', () => commentsIn.style.borderColor = DS.blue);
    commentsIn.addEventListener('blur',  () => commentsIn.style.borderColor = DS.border);

    row3.appendChild(commentsIn);
    panel.appendChild(row3);
  }

  // ── SAVE TO CANVAS ────────────────────────────────────────────────────────
  async function saveToCanvas() {
    if (!ctx?.courseId) { showSaveMsg('No student loaded — open SpeedGrader', true); return; }

    const grade   = document.getElementById('ce-grade-in')?.value.trim()    || '';
    const comment = document.getElementById('ce-comments-in')?.value.trim() || '';
    if (!grade && !comment) { showSaveMsg('Enter a grade or comments first', true); return; }

    const sb = document.getElementById('ce-save-btn');
    if (sb) { sb.disabled = true; sb.textContent = 'Saving…'; }

    const body = {};
    if (grade)   body.submission = { posted_grade: grade };
    if (comment) body.comment    = { text_comment: comment };

    const res = await new Promise(resolve => chrome.runtime.sendMessage({
      type: 'CANVAS_API',
      payload: {
        url:    `${ctx.canvasOrigin}/api/v1/courses/${ctx.courseId}/assignments/${ctx.assignmentId}/submissions/${ctx.studentId}`,
        token:  ctx.token,
        method: 'PUT',
        body,
      },
    }, resolve));

    if (sb) { sb.disabled = false; sb.textContent = '💾 Save to Canvas'; }

    if (res?.error) {
      showSaveMsg('Error: ' + res.error, true);
    } else {
      showSaveMsg('✓ Saved to Canvas!', false);
      setTimeout(() => showSaveMsg(''), 3000);
    }
  }

  function showSaveMsg(text, isErr) {
    const e = document.getElementById('ce-save-msg');
    if (!e) return;
    e.textContent = text;
    e.style.color = isErr ? DS.red : DS.green;
  }

  function showStatus(msg, isErr) {
    const e = document.getElementById('ce-status');
    if (!e) return;
    e.textContent = msg;
    e.style.color = isErr ? DS.red : DS.muted;
  }

  // ── FILE FETCH ────────────────────────────────────────────────────────────
  async function grabFile() {
    if (!ctx?.attachments?.length) return;
    showStatus('Fetching file…');
    try {
      const parts = [];
      for (const att of ctx.attachments) {
        showStatus(`Reading ${att.filename}…`);
        let downloadUrl = att.url;
        if (att.id && ctx.token) {
          try {
            const info = await new Promise(resolve =>
              chrome.runtime.sendMessage({
                type: 'CANVAS_API',
                payload: { url: `${ctx.canvasOrigin}/api/v1/files/${att.id}`, token: ctx.token },
              }, resolve)
            );
            if (info?.url) downloadUrl = info.url;
          } catch(_) {}
        }
        const res = await new Promise(resolve =>
          chrome.runtime.sendMessage({
            type: 'PARSE_FILE',
            payload: { fileUrl: downloadUrl, token: ctx.token, filename: att.filename, mimeType: att.mimeType },
          }, resolve)
        );
        if (res?.error) throw new Error(res.error);
        const text = res?.text?.trim();
        if (!text) throw new Error(`Could not extract text from ${att.filename}`);
        parts.push(`[${att.filename}]\n${text}`);
      }
      ctx.subText = parts.join('\n\n');
      chrome.storage.local.set({ [CONTEXT_KEY]: ctx });
      fileReady = true;
      showStatus('');
      renderPanel();
    } catch(e) {
      showStatus('Error: ' + e.message, true);
    }
  }

  // ── GRADE PROMPT ──────────────────────────────────────────────────────────
  function buildGradePrompt() {
    if (!ctx) return '';
    const st  = ctx.settings || {};
    const tot = st.totalPoints || 100;
    const fn  = ctx.studentName ? ctx.studentName.split(' ')[0] : 'the student';
    const intensityMap = {
      lenient:  'Be generous. Give benefit of the doubt. Focus on what the student did well.',
      balanced: 'Grade fairly. Acknowledge strengths and note specific weaknesses.',
      strict:   'Hold to high standards. Be thorough identifying errors.',
    };
    const toneMap = {
      encouraging: 'Start with positives, then constructive feedback. Be warm and supportive.',
      neutral:     'Be objective and professional.',
      direct:      'Be concise and direct. Focus on what needs improvement.',
    };

    let p = `You are an expert teacher grading a student assignment.\nStudent: ${ctx.studentName || 'Student'}\n`;
    if (ctx.assignmentName) p += `Assignment: ${ctx.assignmentName}\n`;
    p += `\nGRADING APPROACH: ${intensityMap[st.gradingIntensity] || intensityMap.balanced}\n`;
    p += `FEEDBACK TONE: ${toneMap[st.feedbackTone] || toneMap.encouraging}\n`;
    if (st.acceptIntent)  p += `ACCEPT INTENT: Give credit if the student conveys the correct meaning even if wording differs.\n`;
    if (st.partialCredit) p += `PARTIAL CREDIT: Award partial credit for partially correct answers.\n`;
    p += `\nTOTAL POINTS: ${tot}\n\n`;
    if (st.rubricText)         p += `RUBRIC / GRADING CRITERIA:\n${st.rubricText}\n\n`;
    if (st.answerKey)          p += `ANSWER KEY:\n${st.answerKey}\n\n`;
    if (st.customInstructions) p += `ADDITIONAL INSTRUCTIONS:\n${st.customInstructions}\n\n`;
    p += `STUDENT SUBMISSION:\n${(ctx.subText || '').slice(0, 18000)}\n\n`;
    p += `Grade this submission. DO NOT penalize for things not in the rubric.\n\n`;
    p += `Respond in EXACTLY this format:\nSCORE: [number]/${tot}\nFEEDBACK:\n- TEACHER CHECK: [items to manually verify, if any]\n- [Address ${fn} by name, overall performance]\n- [Specific criterion finding]\n- [Another finding or area for improvement]\n\nFirst bullet MUST start with TEACHER CHECK:. Use 3–5 bullets total.`;
    return p;
  }

  const CRITERIA_PROMPT = `You are helping a teacher set up AI grading criteria. Ask these questions ONE AT A TIME and wait for each answer:

1. What is the assignment name?
2. What is the total point value?
3. How strict should grading be? (Lenient / Balanced / Strict)
4. What feedback tone? (Encouraging / Neutral / Direct)
5. Do you have a rubric or grading criteria? (Paste it in, or describe what you're looking for)
6. Do you have an answer key? (Type "none" to skip)
7. Any special grading instructions or things to watch for?

Once you have all answers, output EXACTLY this block:

---GRADING CRITERIA---
TOTAL POINTS: [number]
GRADING STYLE: [lenient/balanced/strict]
FEEDBACK TONE: [encouraging/neutral/direct]
RUBRIC:
[rubric content]
ANSWER KEY:
[answer key or none]
INSTRUCTIONS:
[additional instructions or none]
---END CRITERIA---`;

  async function sendGradePrompt() {
    if (!ctx) return;
    const needsFile = ctx.attachments?.length && ctx.subText?.startsWith('[File upload');
    if (needsFile) await grabFile();
    injectAndSend(buildGradePrompt());
  }

  function sendCriteriaPrompt() { injectAndSend(CRITERIA_PROMPT); }

  // ── INJECT INTO CHAT ──────────────────────────────────────────────────────
  function injectAndSend(text) {
    const inp = findInput();
    if (!inp) { showStatus('Could not find chat input — refresh page', true); return; }
    inp.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    setTimeout(() => {
      const sb = findSendBtn();
      if (sb) sb.click();
      else showStatus('Prompt ready — press Enter to send');
    }, 150);
  }

  function findInput() {
    for (const sel of [
      'div.ProseMirror[contenteditable="true"]',
      '#prompt-textarea',
      'div[contenteditable="true"][data-testid]',
      'div[contenteditable="true"]',
      'textarea',
    ]) {
      const e = document.querySelector(sel);
      if (e) return e;
    }
    return null;
  }

  function findSendBtn() {
    for (const sel of [
      'button[aria-label="Send message"]',
      'button[aria-label="Send Message"]',
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[type="submit"]',
    ]) {
      const e = document.querySelector(sel);
      if (e && !e.disabled) return e;
    }
    return null;
  }

  // ── COPY ──────────────────────────────────────────────────────────────────
  function getLastAIMessage() {
    for (const sel of [
      '[data-testid="claude-ai-turn"] .prose',
      '[data-testid="claude-ai-turn"]',
      '.font-claude-message',
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"]',
      'div.prose',
    ]) {
      const els = document.querySelectorAll(sel);
      if (els.length) return els[els.length - 1];
    }
    return null;
  }

  function copyComments() {
    const msg = getLastAIMessage();
    if (!msg) { showStatus('Wait for AI to finish responding', true); return; }
    const raw   = msg.innerText || '';
    const match = raw.match(/FEEDBACK:\s*([\s\S]+)/i);
    const lines = (match ? match[1] : raw).split('\n');
    const text  = lines
      .filter(l => !/^[-*]?\s*(TEACHER CHECK|WARN|WARNING|⚠)/i.test(l.trim()) && l.trim())
      .join('\n').trim();
    navigator.clipboard.writeText(text)
      .then(() => {
        // Auto-fill comments textarea if visible
        const ta = document.getElementById('ce-comments-in');
        if (ta) { ta.value = text; ta.style.borderColor = DS.green; setTimeout(() => { ta.style.borderColor = DS.border; }, 1500); }
        showStatus('✓ Copied!');
        setTimeout(() => showStatus(''), 2500);
      })
      .catch(() => showStatus('Clipboard error', true));
  }

  function copyCriteria() {
    const msg = getLastAIMessage();
    if (!msg) { showStatus('Wait for AI to finish responding', true); return; }
    const raw   = msg.innerText || '';
    const match = raw.match(/---GRADING CRITERIA---([\s\S]+?)---END CRITERIA---/i);
    navigator.clipboard.writeText(match ? match[0] : raw)
      .then(() => { showStatus('✓ Criteria copied!'); setTimeout(() => showStatus(''), 2500); })
      .catch(() => showStatus('Clipboard error', true));
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  async function init() {
    await loadContext();
    if (document.body) injectPanel();
    else document.addEventListener('DOMContentLoaded', injectPanel);

    new MutationObserver(() => {
      if (!document.getElementById('ce-bar') && document.body) injectPanel();
    }).observe(document.documentElement, { childList: true });
  }

  init();
})();
