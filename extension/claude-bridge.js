(async function () {
  'use strict';
  if (!window.location.hostname.includes('claude.ai')) return;

  const CONTEXT_KEY = 'ce_claude_context';
  let ctx = null;
  let bar = null;
  let fileReady = false;

  // ── CONTEXT ───────────────────────────────────────────────────────────────
  async function loadContext() {
    const s = await new Promise(r => chrome.storage.local.get(CONTEXT_KEY, r));
    ctx = s[CONTEXT_KEY] || null;
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[CONTEXT_KEY]) {
      ctx = changes[CONTEXT_KEY].newValue;
      fileReady = false;
      renderBar();
    }
  });

  // ── BAR ───────────────────────────────────────────────────────────────────
  function injectBar() {
    if (document.getElementById('ce-bar') || !document.body) return;
    bar = document.createElement('div');
    bar.id = 'ce-bar';
    bar.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:2147483647',
      'background:#fff', 'border-top:2px solid #0770B8',
      'padding:10px 16px',
      'display:flex', 'align-items:center', 'gap:10px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:13px', 'color:#2d3b45',
      'box-shadow:0 -2px 12px rgba(0,0,0,.08)',
    ].join(';');
    document.body.appendChild(bar);
    renderBar();
  }

  function mkBtn(text, css, onClick) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    b.style.cssText = `padding:7px 16px;border-radius:3px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;${css}`;
    b.onclick = onClick; return b;
  }

  function renderBar() {
    if (!bar) return;
    bar.innerHTML = '';

    const logo = document.createElement('span');
    logo.style.cssText = 'font-weight:700;font-size:13px;color:#0770B8;white-space:nowrap;flex-shrink:0;margin-right:4px;';
    logo.textContent = '✦ Canvas Enhancer';
    bar.appendChild(logo);

    if (!ctx) {
      const msg = document.createElement('span');
      msg.style.cssText = 'font-size:12px;color:#9ca3af;';
      msg.textContent = 'Open SpeedGrader to load a student';
      bar.appendChild(msg);
      return;
    }

    if (ctx.mode === 'criteria') {
      renderCriteriaBar();
    } else {
      renderGradeBar();
    }
  }

  // ── GRADE BAR ─────────────────────────────────────────────────────────────
  function renderGradeBar() {
    const info = document.createElement('div');
    info.style.cssText = 'min-width:0;flex:1;';
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#2d3b45;';
    nameEl.textContent = ctx.studentName || 'Student';
    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    metaEl.textContent = [ctx.assignmentName, ctx.settings?.totalPoints ? `${ctx.settings.totalPoints} pts` : null, ctx.settings?.gradingIntensity].filter(Boolean).join(' · ');
    info.appendChild(nameEl); info.appendChild(metaEl);
    bar.appendChild(info);

    const hasFiles = ctx.attachments?.length > 0;
    const hasText  = ctx.subText && !ctx.subText.startsWith('[File upload');

    if (hasFiles && !fileReady && !hasText) {
      bar.appendChild(mkBtn('📎 Grab File', 'background:#f5f5f5;color:#2d3b45;border:1px solid #c7cdd1;', grabFile));
    } else if (fileReady || hasText) {
      const ok = document.createElement('span');
      ok.style.cssText = 'font-size:12px;color:#127a1b;flex-shrink:0;white-space:nowrap;';
      ok.textContent = '✓ Ready';
      bar.appendChild(ok);
    }

    bar.appendChild(mkBtn('✦ Grade Submission', 'background:#0770B8;color:#fff;', sendGradePrompt));
    bar.appendChild(mkBtn('⎘ Copy Comments', 'background:#059669;color:#fff;font-size:14px;padding:8px 22px;', copyComments));
  }

  // ── CRITERIA BAR ──────────────────────────────────────────────────────────
  function renderCriteriaBar() {
    const info = document.createElement('div');
    info.style.cssText = 'min-width:0;flex:1;';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:600;font-size:13px;color:#2d3b45;';
    titleEl.textContent = 'Criteria Builder';
    const subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:11px;color:#6b7280;';
    subEl.textContent = ctx.assignmentName ? `for ${ctx.assignmentName}` : 'Building grading criteria';
    info.appendChild(titleEl); info.appendChild(subEl);
    bar.appendChild(info);

    bar.appendChild(mkBtn('▶ Start Builder', 'background:#0770B8;color:#fff;', sendCriteriaPrompt));
    bar.appendChild(mkBtn('⎘ Copy Criteria', 'background:#059669;color:#fff;font-size:14px;padding:8px 22px;', copyCriteria));
  }

  // ── FILE FETCH ────────────────────────────────────────────────────────────
  async function grabFile() {
    if (!ctx?.attachments?.length) return;
    setStatus('Fetching file…');
    try {
      const parts = [];
      for (const att of ctx.attachments) {
        const res = await new Promise(resolve =>
          chrome.runtime.sendMessage({
            type: 'PARSE_FILE',
            payload: { fileUrl: att.url, token: ctx.token, filename: att.filename, mimeType: att.mimeType },
          }, resolve)
        );
        if (res?.error) throw new Error(res.error);
        parts.push(`[${att.filename}]\n${res?.text || '(no text extracted)'}`);
      }
      ctx.subText = parts.join('\n\n');
      chrome.storage.local.set({ [CONTEXT_KEY]: ctx });
      fileReady = true;
      renderBar();
    } catch(e) {
      setStatus('Error: ' + e.message, true);
    }
  }

  function setStatus(msg, isErr) {
    if (!bar) return;
    let s = bar.querySelector('#ce-status');
    if (!s) {
      s = document.createElement('span'); s.id = 'ce-status';
      s.style.cssText = 'font-size:12px;flex-shrink:0;'; bar.appendChild(s);
    }
    s.style.color = isErr ? '#c0392b' : '#6b7280';
    s.textContent = msg;
  }

  // ── PROMPTS ───────────────────────────────────────────────────────────────
  function buildGradePrompt() {
    if (!ctx) return '';
    const st  = ctx.settings || {};
    const tot = st.totalPoints || 100;
    const fn  = ctx.studentName ? ctx.studentName.split(' ')[0] : 'the student';
    const intensityMap = { lenient: 'Be generous. Give benefit of the doubt. Focus on what the student did well.', balanced: 'Grade fairly. Acknowledge strengths and note specific weaknesses.', strict: 'Hold to high standards. Be thorough identifying errors.' };
    const toneMap = { encouraging: 'Start with positives, then constructive feedback. Be warm and supportive.', neutral: 'Be objective and professional.', direct: 'Be concise and direct. Focus on what needs improvement.' };

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

  const CRITERIA_PROMPT = `You are helping a teacher set up AI grading criteria for their class. Ask these questions ONE AT A TIME and wait for each answer before asking the next:

1. What is the assignment name?
2. What is the total point value?
3. How strict should grading be?
   - Lenient = benefit of the doubt, focus on what student did well
   - Balanced = fair and consistent
   - Strict = hold to high standards
4. What feedback tone?
   - Encouraging = warm, start with positives
   - Neutral = objective and professional
   - Direct = concise, focus on improvements
5. Do you have a rubric or grading criteria? (Paste it in, or describe what you're looking for)
6. Do you have an answer key? (Type "none" to skip)
7. Any special grading instructions or things to watch for?

Once you have all the answers, output EXACTLY this block (I will copy it into my grading tool):

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
    if (needsFile) { await grabFile(); }
    injectAndSend(buildGradePrompt());
  }

  function sendCriteriaPrompt() {
    injectAndSend(CRITERIA_PROMPT);
  }

  function injectAndSend(text) {
    const input = findInput();
    if (!input) { setStatus('Could not find chat input — refresh the page', true); return; }
    input.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    setTimeout(() => {
      const btn = findSendBtn();
      if (btn) btn.click();
      else setStatus('Prompt ready — press Enter to send');
    }, 150);
  }

  function findInput() {
    const selectors = [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-testid]',
      'div[contenteditable="true"]',
      'textarea',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findSendBtn() {
    const selectors = ['button[aria-label="Send message"]', 'button[aria-label="Send Message"]', 'button[data-testid="send-button"]', 'button[type="submit"]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && !el.disabled) return el;
    }
    return null;
  }

  // ── COPY ──────────────────────────────────────────────────────────────────
  function getLastClaudeMessage() {
    const selectors = ['[data-testid="claude-ai-turn"] .prose', '[data-testid="claude-ai-turn"]', '.font-claude-message', 'div.prose'];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length) return els[els.length - 1];
    }
    return null;
  }

  function copyComments() {
    const msg = getLastClaudeMessage();
    if (!msg) { setStatus('Wait for Claude to finish responding', true); return; }
    const raw = msg.innerText || '';
    const match = raw.match(/FEEDBACK:\s*([\s\S]+)/i);
    const lines = (match ? match[1] : raw).split('\n');
    const comment = lines.filter(l => !/^[-*]?\s*(TEACHER CHECK|WARN|WARNING|⚠)/i.test(l.trim()) && l.trim()).join('\n').trim();
    navigator.clipboard.writeText(comment).then(() => flash('⎘ Copy Comments', '✓ Copied!'));
  }

  function copyCriteria() {
    const msg = getLastClaudeMessage();
    if (!msg) { setStatus('Wait for Claude to finish responding', true); return; }
    const raw = msg.innerText || '';
    const match = raw.match(/---GRADING CRITERIA---([\s\S]+?)---END CRITERIA---/i);
    navigator.clipboard.writeText(match ? match[0] : raw).then(() => flash('⎘ Copy Criteria', '✓ Copied!'));
  }

  function flash(origText, newText) {
    if (!bar) return;
    for (const b of bar.querySelectorAll('button')) {
      if (b.textContent === origText) {
        const origBg = b.style.background;
        b.textContent = newText; b.style.background = '#047857';
        setTimeout(() => { b.textContent = origText; b.style.background = origBg; }, 2000);
        break;
      }
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  async function init() {
    await loadContext();

    if (document.body) injectBar();
    else document.addEventListener('DOMContentLoaded', injectBar);

    // Re-inject after SPA navigation
    new MutationObserver(() => {
      if (!document.getElementById('ce-bar') && document.body) injectBar();
    }).observe(document.documentElement, { childList: true });
  }

  init();
})();
