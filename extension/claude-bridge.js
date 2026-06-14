(async function () {
  'use strict';
  if (!window.location.hostname.includes('claude.ai')) return;

  const CONTEXT_KEY = 'ce_claude_context';
  let ctx = null;
  let subReady = false;
  let bar = null;

  // ── CONTEXT ───────────────────────────────────────────────────────────────
  async function loadContext() {
    const stored = await new Promise(r => chrome.storage.local.get(CONTEXT_KEY, r));
    ctx = stored[CONTEXT_KEY] || null;
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[CONTEXT_KEY]) {
      ctx = changes[CONTEXT_KEY].newValue;
      subReady = false;
      renderBar();
    }
  });

  // ── TOOLBAR ───────────────────────────────────────────────────────────────
  function injectBar() {
    if (document.getElementById('ce-bar')) return;
    bar = document.createElement('div');
    bar.id = 'ce-bar';
    bar.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:2147483647',
      'background:#2d3b45', 'color:#fff', 'padding:8px 16px',
      'display:flex', 'align-items:center', 'gap:10px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:13px', 'box-shadow:0 -2px 12px rgba(0,0,0,.35)',
    ].join(';');
    document.body.appendChild(bar);
    renderBar();
  }

  function mkBtn(label, css, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.style.cssText = `padding:6px 14px;border-radius:4px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;${css}`;
    b.onclick = onClick;
    return b;
  }

  function renderBar() {
    if (!bar) return;
    bar.innerHTML = '';

    const logo = document.createElement('span');
    logo.style.cssText = 'font-weight:700;font-size:13px;white-space:nowrap;flex-shrink:0;color:#e5e7eb;';
    logo.textContent = '✦ Canvas Enhancer';
    bar.appendChild(logo);

    if (!ctx) {
      const hint = document.createElement('span');
      hint.style.cssText = 'font-size:12px;color:#9ca3af;';
      hint.textContent = 'Open SpeedGrader to load a student';
      bar.appendChild(hint);
      return;
    }

    // Student info
    const info = document.createElement('div');
    info.style.cssText = 'display:flex;flex-direction:column;gap:1px;min-width:0;';
    const nameEl = document.createElement('span');
    nameEl.style.cssText = 'font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    nameEl.textContent = ctx.studentName || 'Student';
    const metaEl = document.createElement('span');
    metaEl.style.cssText = 'font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    metaEl.textContent = [
      ctx.assignmentName,
      ctx.settings?.totalPoints ? `${ctx.settings.totalPoints} pts` : null,
      ctx.settings?.gradingIntensity,
    ].filter(Boolean).join(' · ');
    info.appendChild(nameEl);
    info.appendChild(metaEl);
    bar.appendChild(info);

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    bar.appendChild(spacer);

    const hasAttachments = ctx.attachments?.length > 0;
    const subIsText = ctx.subText && !ctx.subText.startsWith('[File upload');

    // Grab Submission button
    if (hasAttachments && !subReady && !subIsText) {
      bar.appendChild(mkBtn('📎 Grab Submission', 'background:#374151;color:#fff;border:1px solid #6b7280;', grabSubmission));
    } else if (subReady || subIsText) {
      const ok = document.createElement('span');
      ok.style.cssText = 'font-size:12px;color:#4ade80;white-space:nowrap;flex-shrink:0;';
      ok.textContent = '✓ Submission ready';
      bar.appendChild(ok);
    }

    // Grade button
    bar.appendChild(mkBtn('✦ Grade', 'background:#0770B8;color:#fff;', sendGradingPrompt));

    // Copy Comment button
    bar.appendChild(mkBtn('⎘ Copy Comment', 'background:#059669;color:#fff;', copyLastComment));
  }

  function setStatus(msg, isError) {
    if (!bar) return;
    let s = bar.querySelector('#ce-status');
    if (!s) {
      s = document.createElement('span');
      s.id = 'ce-status';
      s.style.cssText = 'font-size:12px;white-space:nowrap;flex-shrink:0;';
      bar.appendChild(s);
    }
    s.style.color = isError ? '#f87171' : '#9ca3af';
    s.textContent = msg;
  }

  // ── GRAB SUBMISSION ───────────────────────────────────────────────────────
  async function grabSubmission() {
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
      subReady = true;
      renderBar();
    } catch (e) {
      setStatus('Error: ' + e.message, true);
    }
  }

  // ── BUILD PROMPT ──────────────────────────────────────────────────────────
  function buildPrompt() {
    if (!ctx) return '';
    const st = ctx.settings || {};
    const total = st.totalPoints || 100;
    const firstName = ctx.studentName ? ctx.studentName.split(' ')[0] : 'the student';
    const intensityMap = {
      lenient:  'Be generous. Give benefit of the doubt. Focus on what the student did well.',
      balanced: 'Grade fairly. Acknowledge strengths and note specific weaknesses.',
      strict:   'Hold students to high standards. Be thorough in identifying errors.',
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
    p += `\nTOTAL POINTS: ${total}\n\n`;
    if (st.rubricText)         p += `RUBRIC / GRADING CRITERIA:\n${st.rubricText}\n\n`;
    if (st.answerKey)          p += `ANSWER KEY:\n${st.answerKey}\n\n`;
    if (st.customInstructions) p += `ADDITIONAL INSTRUCTIONS:\n${st.customInstructions}\n\n`;
    p += `STUDENT SUBMISSION:\n${(ctx.subText || '').slice(0, 18000)}\n\n`;
    p += `Grade this submission. DO NOT penalize for things not in the rubric.\n\n`;
    p += `Respond in EXACTLY this format:\nSCORE: [number]/${total}\nFEEDBACK:\n- TEACHER CHECK: [items teacher must manually verify, if any]\n- [Address ${firstName} by name, summarize overall performance]\n- [Specific finding on a rubric criterion]\n- [Another criterion or area for improvement]\n\nRules: first bullet MUST start with TEACHER CHECK:. Use 3-5 bullets total.`;
    return p;
  }

  // ── SEND PROMPT TO CLAUDE ─────────────────────────────────────────────────
  async function sendGradingPrompt() {
    if (!ctx) return;

    const needsGrab = ctx.attachments?.length && ctx.subText?.startsWith('[File upload');
    if (needsGrab) await grabSubmission();

    const prompt = buildPrompt();
    const input = findInput();
    if (!input) {
      setStatus('Could not find chat input — try refreshing the page', true);
      return;
    }

    input.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, prompt);

    setTimeout(() => {
      const sendBtn = findSendButton();
      if (sendBtn) sendBtn.click();
      else setStatus('Type is ready — press Enter to send', false);
    }, 150);
  }

  function findInput() {
    const selectors = [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][data-testid]',
      'div[contenteditable="true"]',
      'textarea[placeholder]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findSendButton() {
    const selectors = [
      'button[aria-label="Send message"]',
      'button[aria-label="Send Message"]',
      'button[data-testid="send-button"]',
      'button[type="submit"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && !el.disabled) return el;
    }
    return null;
  }

  // ── COPY COMMENT ──────────────────────────────────────────────────────────
  function copyLastComment() {
    const selectors = [
      '[data-testid="claude-ai-turn"] .prose',
      '[data-testid="claude-ai-turn"]',
      '.font-claude-message',
      '[data-is-streaming="false"]',
      'div.prose',
    ];
    let lastMsg = null;
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length) { lastMsg = els[els.length - 1]; break; }
    }
    if (!lastMsg) {
      setStatus('No response found yet — wait for Claude to finish', true);
      return;
    }
    const raw = lastMsg.innerText || lastMsg.textContent || '';
    const feedbackMatch = raw.match(/FEEDBACK:\s*([\s\S]+)/i);
    const lines = (feedbackMatch ? feedbackMatch[1] : raw).split('\n');
    const comment = lines
      .filter(l => !/^[-*]?\s*(TEACHER CHECK|WARN|WARNING|⚠)/i.test(l.trim()) && l.trim())
      .join('\n')
      .trim();
    navigator.clipboard.writeText(comment).then(() => {
      const btn = bar?.querySelector('button:last-child');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = '#047857';
        setTimeout(() => { btn.textContent = orig; btn.style.background = '#059669'; }, 2000);
      }
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  async function init() {
    await loadContext();

    const tryInject = () => {
      if (document.body) injectBar();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInject);
    } else {
      tryInject();
    }

    // Re-inject if claude.ai does a full SPA navigation
    const obs = new MutationObserver(() => {
      if (!document.getElementById('ce-bar') && document.body) injectBar();
    });
    obs.observe(document.documentElement, { childList: true, subtree: false });
  }

  init();
})();
