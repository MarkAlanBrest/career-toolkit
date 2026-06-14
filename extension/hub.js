(function () {
  'use strict';
  if (document.getElementById('ce-hub')) return;

  // ── DESIGN TOKENS ──────────────────────────────────────────────────────────
  const DS = {
    // Toolbar (mirrors Canvas global nav)
    navBg:      '#394B58',
    navHover:   '#4A6072',
    navActive:  '#1B303D',
    navBorder:  'rgba(255,255,255,.1)',
    navText:    '#FFFFFF',

    // Panel / content
    blue:   '#0770B8',
    blueBg: '#E8F1F8',
    text:   '#2D3B45',
    gray:   '#F5F5F5',
    border: '#C7CDD1',
    muted:  '#6B7280',
    green:  '#127A1B',
    white:  '#FFFFFF',
    font:   '-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif',
  };

  const TOOLBAR_W = 52;

  const AI_PROVIDERS = [
    { id: 'claude',      label: 'Claude (claude.ai)',     url: 'https://claude.ai/new' },
    { id: 'chatgpt',     label: 'ChatGPT (chatgpt.com)',  url: 'https://chatgpt.com/' },
    { id: 'gemini',      label: 'Gemini (Google)',        url: 'https://gemini.google.com/app' },
    { id: 'copilot',     label: 'Microsoft Copilot',      url: 'https://copilot.microsoft.com/' },
    { id: 'perplexity',  label: 'Perplexity',             url: 'https://www.perplexity.ai/' },
  ];

  const TOOLS = [
    { id: 'quick-ai',  icon: '⚡', label: 'Quick AI',         noPanel: true },
    { id: 'ai-grader', icon: '🎓', label: 'AI Grader' },
    { id: 'cheater',   icon: '🔍', label: 'Cheater Detector' },
    { id: 'reports',   icon: '📊', label: 'Reports' },
    { id: 'scheduler', icon: '📅', label: 'Scheduler' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ];

  let _active      = null;   // tool id with open panel
  let _expanded    = true;   // toolbar visible
  let _panelCleanup = null;  // storage listener teardown for active panel

  // ── HELPERS ────────────────────────────────────────────────────────────────
  function el(tag, css, attrs) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  // ── TOOLBAR ────────────────────────────────────────────────────────────────
  const toolbar = el('div', `
    position:fixed;top:0;right:0;bottom:0;width:${TOOLBAR_W}px;
    z-index:2147483640;
    background:${DS.navBg};
    box-shadow:-2px 0 10px rgba(0,0,0,.25);
    display:flex;flex-direction:column;align-items:center;
    font-family:${DS.font};
    transition:transform .2s ease;
  `);
  toolbar.id = 'ce-hub';

  // Brand dot
  const brand = el('div', `
    width:100%;height:48px;flex-shrink:0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    border-bottom:1px solid ${DS.navBorder};gap:3px;
  `);
  const dot1 = el('div', `width:7px;height:7px;border-radius:50%;background:${DS.navText};`);
  const dot2 = el('div', `width:3px;height:3px;border-radius:50%;background:${DS.navText};opacity:.4;`);
  brand.appendChild(dot1);
  brand.appendChild(dot2);
  toolbar.appendChild(brand);

  // Nav
  const nav = el('div', `
    flex:1;width:100%;
    display:flex;flex-direction:column;align-items:center;
    padding:8px 0;gap:2px;overflow-y:auto;overflow-x:hidden;
  `);

  const btnMap = {};
  for (const tool of TOOLS) {
    const btn = el('button', `
      width:100%;height:52px;
      border:none;border-left:3px solid transparent;
      background:transparent;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:3px;font-family:${DS.font};transition:background .12s;flex-shrink:0;
      box-sizing:border-box;
    `, { type: 'button', title: tool.label });

    const icon = el('span', 'font-size:18px;line-height:1;pointer-events:none;');
    icon.textContent = tool.icon;

    const label = el('span', `font-size:9px;color:${DS.navText};opacity:.75;pointer-events:none;letter-spacing:.3px;text-transform:uppercase;`);
    label.textContent = tool.label.split(' ')[0];

    btn.appendChild(icon);
    btn.appendChild(label);

    btn.addEventListener('mouseenter', () => {
      if (_active !== tool.id) btn.style.background = DS.navHover;
    });
    btn.addEventListener('mouseleave', () => {
      if (_active !== tool.id) btn.style.background = 'transparent';
    });
    btn.addEventListener('click', () => onToolClick(tool));

    btnMap[tool.id] = btn;
    nav.appendChild(btn);
  }
  toolbar.appendChild(nav);

  // Collapse button
  const collapseBtn = el('button', `
    width:100%;height:40px;flex-shrink:0;
    border:none;border-top:1px solid ${DS.navBorder};
    background:transparent;cursor:pointer;
    font-size:12px;color:${DS.navText};opacity:.6;
    font-family:${DS.font};
    display:flex;align-items:center;justify-content:center;
    transition:opacity .12s;
  `, { type: 'button', title: 'Collapse toolbar', textContent: '◀' });
  collapseBtn.addEventListener('mouseenter', () => collapseBtn.style.opacity = '1');
  collapseBtn.addEventListener('mouseleave', () => collapseBtn.style.opacity = '.6');
  collapseBtn.addEventListener('click', toggleToolbar);
  toolbar.appendChild(collapseBtn);

  // ── COLLAPSED TAB ──────────────────────────────────────────────────────────
  const tab = el('button', `
    position:fixed;top:50%;right:0;transform:translateY(-50%);
    z-index:2147483641;
    width:18px;height:72px;
    border:none;
    border-radius:4px 0 0 4px;
    background:${DS.navBg};
    box-shadow:-2px 0 8px rgba(0,0,0,.3);
    cursor:pointer;display:none;
    align-items:center;justify-content:center;
    font-size:10px;color:${DS.navText};
    font-family:${DS.font};
  `, { type: 'button', title: 'Open Canvas Enhancer', textContent: '▶' });
  tab.addEventListener('click', toggleToolbar);

  // ── PANEL ──────────────────────────────────────────────────────────────────
  const panel = el('div', `
    position:fixed;top:0;bottom:0;right:${TOOLBAR_W}px;
    width:30vw;min-width:460px;max-width:580px;
    z-index:2147483639;
    background:${DS.white};
    border-left:1px solid ${DS.border};
    box-shadow:-4px 0 16px rgba(0,0,0,.1);
    display:none;flex-direction:column;
    font-family:${DS.font};
  `);
  panel.id = 'ce-hub-panel';

  const panelHeader = el('div', `
    height:44px;flex-shrink:0;
    background:${DS.white};
    border-bottom:1px solid ${DS.border};
    display:flex;align-items:center;padding:0 16px;gap:8px;
  `);

  const panelTitle = el('span', `
    flex:1;color:${DS.text};font-size:14px;font-weight:700;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  `);

  const panelClose = el('button', `
    background:none;border:none;color:${DS.muted};
    font-size:20px;cursor:pointer;line-height:1;
    padding:0 2px;font-family:${DS.font};flex-shrink:0;
    transition:color .12s;
  `, { type: 'button', textContent: '×', title: 'Close' });
  panelClose.addEventListener('mouseenter', () => panelClose.style.color = DS.text);
  panelClose.addEventListener('mouseleave', () => panelClose.style.color = DS.muted);
  panelClose.addEventListener('click', closePanel);

  panelHeader.appendChild(panelTitle);
  panelHeader.appendChild(panelClose);

  const panelBody = el('div', `
    flex:1;min-height:0;padding:20px 16px;
    color:${DS.text};font-size:13px;line-height:1.5;
    display:flex;flex-direction:column;overflow:hidden;
  `);
  panelBody.id = 'ce-hub-panel-body';

  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);

  // ── PANEL CONTENT ──────────────────────────────────────────────────────────
  function placeholder(icon, title, sub) {
    panelBody.innerHTML = '';
    const wrap = el('div', 'text-align:center;padding:40px 0;');
    const iEl = el('div', 'font-size:40px;margin-bottom:14px;');
    iEl.textContent = icon;
    const tEl = el('div', `font-size:15px;font-weight:700;color:${DS.text};margin-bottom:6px;`);
    tEl.textContent = title;
    const sEl = el('div', `font-size:13px;color:${DS.muted};`);
    sEl.textContent = sub;
    wrap.appendChild(iEl); wrap.appendChild(tEl); wrap.appendChild(sEl);
    panelBody.appendChild(wrap);
  }

  function row(label, inputEl, hint) {
    const wrap = el('div', 'display:flex;flex-direction:column;gap:5px;');
    const lab = el('label', `font-size:12px;font-weight:600;color:${DS.text};`);
    lab.textContent = label;
    wrap.appendChild(lab);
    wrap.appendChild(inputEl);
    if (hint) {
      const h = el('div', `font-size:11px;color:${DS.muted};margin-top:1px;`);
      h.textContent = hint;
      wrap.appendChild(h);
    }
    return wrap;
  }

  function input(id, type, placeholder, value) {
    return el('input', `
      width:100%;box-sizing:border-box;
      padding:8px 10px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;
      transition:border-color .15s;
    `, { id, type, placeholder, value: value || '' });
  }

  function btn(text, css, id) {
    const b = el('button', `
      padding:9px 20px;border:none;border-radius:3px;
      font-size:13px;font-weight:600;cursor:pointer;
      font-family:${DS.font};width:100%;
      transition:opacity .15s;
      ${css}
    `, { type: 'button', textContent: text });
    if (id) b.id = id;
    b.addEventListener('mouseenter', () => b.style.opacity = '.88');
    b.addEventListener('mouseleave', () => b.style.opacity = '1');
    return b;
  }

  function divider() {
    return el('hr', `border:none;border-top:1px solid ${DS.border};margin:4px 0;`);
  }

  async function renderSettings() {
    const stored = await new Promise(r =>
      chrome.storage.local.get(['ce_canvas_token','ce_teacher_name','ce_license_key','ce_ai_provider'], r)
    );
    panelBody.innerHTML = '';

    const stack = el('div', 'display:flex;flex-direction:column;gap:18px;');

    // Heading
    const head = el('div', '');
    const ht = el('div', `font-size:15px;font-weight:700;color:${DS.text};margin-bottom:3px;`);
    ht.textContent = 'Global Settings';
    const hs = el('div', `font-size:12px;color:${DS.muted};`);
    hs.textContent = 'Applies to all Canvas Enhancer tools.';
    head.appendChild(ht); head.appendChild(hs);
    stack.appendChild(head);

    const nameIn    = input('ce-s-name',    'text',     'Your display name',      stored.ce_teacher_name || '');
    const tokenIn   = input('ce-s-token',   'password', 'Paste your Canvas token', stored.ce_canvas_token || '');
    const licenseIn = input('ce-s-license', 'text',     'Enter your license key',  stored.ce_license_key  || '');

    // AI provider select
    const providerSel = el('select', `
      width:100%;box-sizing:border-box;
      padding:8px 10px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;cursor:pointer;
    `);
    providerSel.id = 'ce-s-provider';
    for (const p of AI_PROVIDERS) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      if (p.id === (stored.ce_ai_provider || 'claude')) opt.selected = true;
      providerSel.appendChild(opt);
    }
    providerSel.addEventListener('focus', () => providerSel.style.borderColor = DS.blue);
    providerSel.addEventListener('blur',  () => providerSel.style.borderColor = DS.border);

    // Focus ring on text inputs
    for (const inp of [nameIn, tokenIn, licenseIn]) {
      inp.addEventListener('focus', () => inp.style.borderColor = DS.blue);
      inp.addEventListener('blur',  () => inp.style.borderColor = DS.border);
    }

    stack.appendChild(row('AI Chat Window', providerSel, 'Used by Quick AI and AI Grader'));
    stack.appendChild(row('Teacher Name', nameIn));
    stack.appendChild(row('Canvas API Token', tokenIn, 'Canvas → Account → Settings → New Access Token'));
    stack.appendChild(row('License Key', licenseIn));

    const saveBtn = btn('Save Settings', `background:${DS.blue};color:#fff;`, 'ce-s-save');
    const saveMsg = el('div', `font-size:12px;text-align:center;color:${DS.green};min-height:16px;`);

    saveBtn.addEventListener('click', () => {
      chrome.storage.local.set({
        ce_ai_provider:   providerSel.value,
        ce_canvas_token:  tokenIn.value.trim(),
        ce_teacher_name:  nameIn.value.trim(),
        ce_license_key:   licenseIn.value.trim(),
      }, () => {
        saveMsg.textContent = '✓ Saved';
        setTimeout(() => { saveMsg.textContent = ''; }, 2500);
      });
    });

    stack.appendChild(saveBtn);
    stack.appendChild(saveMsg);
    stack.appendChild(divider());

    // About
    const about = el('div', `font-size:12px;color:${DS.muted};display:flex;flex-direction:column;gap:5px;`);
    const av = el('div', `font-weight:600;color:${DS.text};`);
    av.textContent = 'Canvas Enhancer v3.0';
    const au = el('div', '');
    au.textContent = 'To uninstall: Chrome menu → More tools → Extensions → Remove';
    about.appendChild(av); about.appendChild(au);
    stack.appendChild(about);

    panelBody.appendChild(stack);
  }

  // ── AI GRADER ──────────────────────────────────────────────────────────────
  async function renderAIGrader() {
    const stored = await new Promise(r =>
      chrome.storage.local.get(['ce_claude_context', 'ce_criteria'], r)
    );
    let ctx         = stored.ce_claude_context || null;
    let allCriteria = stored.ce_criteria       || {};
    let activeTab   = 'grade';
    let chatHistory = [];
    let streaming   = false;
    let activePort  = null;
    let fileReady   = false;
    let actionBar   = null;
    let onStreamDone = (text) => {
      const m = text.match(/SCORE:\s*(\d+)/i);
      if (m) { const g = document.getElementById('ce-grade-in'); if (g && !g.value) g.value = m[1]; }
    };

    function criteriaKey()   { return ctx ? `${ctx.courseId}_${ctx.assignmentId}` : null; }
    function savedCriteria() { const k = criteriaKey(); return k ? (allCriteria[k] || '') : ''; }

    // ── TAB BAR ──────────────────────────────────────────────────────────────
    const tabBar = el('div', `
      display:flex;margin:-20px -16px 0;flex-shrink:0;
      border-bottom:1px solid ${DS.border};
    `);

    function mkTab(id, label) {
      const t = el('button', `
        flex:1;padding:10px 8px;border:none;background:transparent;
        font-size:12px;font-weight:600;cursor:pointer;font-family:${DS.font};
        border-bottom:2px solid ${activeTab === id ? DS.blue : 'transparent'};
        color:${activeTab === id ? DS.blue : DS.muted};transition:all .12s;
      `, { type: 'button', textContent: label });
      t.addEventListener('click', () => {
        activeTab = id; chatHistory = []; chatArea.innerHTML = ''; rebuild();
      });
      return t;
    }

    // ── STUDENT CARD ─────────────────────────────────────────────────────────
    function buildStudentCard() {
      const card = el('div', `
        background:${DS.gray};border-radius:3px;padding:10px 12px;flex-shrink:0;
      `);
      if (ctx?.studentName) {
        const n = el('div', `font-size:14px;font-weight:700;color:${DS.text};`);
        n.textContent = ctx.studentName;
        card.appendChild(n);
        const parts = [ctx.assignmentName, ctx.attachments?.length ? '📎 ' + ctx.attachments.map(a => a.filename).join(', ') : null].filter(Boolean);
        if (parts.length) {
          const m = el('div', `font-size:11px;color:${DS.muted};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
          m.textContent = parts.join('  ·  ');
          card.appendChild(m);
        }
      } else {
        const e = el('div', `font-size:12px;color:${DS.muted};text-align:center;`);
        e.textContent = 'Open SpeedGrader to load a student';
        card.appendChild(e);
      }
      return card;
    }

    // ── CHAT AREA ─────────────────────────────────────────────────────────────
    const chatArea = el('div', `
      flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:10px 0;
    `);

    function addMessage(role, content) {
      const isUser = role === 'user';
      const wrap   = el('div', 'display:flex;flex-direction:column;gap:2px;');
      const lbl    = el('div', `font-size:10px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:${DS.muted};padding:0 2px;text-align:${isUser?'right':'left'};`);
      lbl.textContent = isUser ? 'You' : 'Claude';
      const bubble = el('div', `
        padding:9px 11px;border-radius:3px;font-size:13px;line-height:1.55;
        background:${isUser ? DS.blueBg : DS.gray};color:${DS.text};
        border:1px solid ${isUser ? '#B8D4EA' : DS.border};
        white-space:pre-wrap;word-break:break-word;
      `);
      bubble.textContent = content;
      wrap.appendChild(lbl); wrap.appendChild(bubble);
      chatArea.appendChild(wrap);
      chatArea.scrollTop = chatArea.scrollHeight;
      return bubble;
    }

    // ── STREAMING ─────────────────────────────────────────────────────────────
    function streamToClaudeAPI(messages) {
      if (streaming) return;
      streaming = true;
      setInputsDisabled(true);
      let bubble   = addMessage('assistant', '');
      let fullText = '';
      const port   = chrome.runtime.connect({ name: 'ce-stream' });
      activePort   = port;
      port.onMessage.addListener(msg => {
        if (msg.type === 'chunk') {
          fullText += msg.text;
          bubble.textContent = fullText;
          chatArea.scrollTop = chatArea.scrollHeight;
        }
        if (msg.type === 'done') {
          chatHistory.push({ role: 'assistant', content: fullText });
          streaming = false; activePort = null;
          setInputsDisabled(false);
          onStreamDone(fullText);
        }
        if (msg.type === 'error') {
          bubble.textContent = 'Error: ' + msg.error;
          bubble.style.color = '#C0392B';
          streaming = false; activePort = null;
          setInputsDisabled(false);
        }
      });
      port.postMessage({ type: 'STREAM_GENERATE', payload: { messages, max_tokens: 1500, model: 'claude-haiku-4-5-20251001' } });
    }

    function setInputsDisabled(d) {
      const i = document.getElementById('ce-chat-input');
      const s = document.getElementById('ce-send-btn');
      if (i) i.disabled = d;
      if (s) s.disabled = d;
    }

    // ── FILE GRAB ─────────────────────────────────────────────────────────────
    async function grabFile() {
      if (!ctx?.attachments?.length) return;
      const status = addMessage('assistant', 'Fetching file…');
      try {
        const parts = [];
        for (const att of ctx.attachments) {
          status.textContent = `Reading ${att.filename}…`;
          let url = att.url;
          if (att.id && ctx.token) {
            try {
              const info = await new Promise(r => chrome.runtime.sendMessage({ type: 'CANVAS_API', payload: { url: `${ctx.canvasOrigin}/api/v1/files/${att.id}`, token: ctx.token } }, r));
              if (info?.url) url = info.url;
            } catch(_) {}
          }
          const res = await new Promise(r => chrome.runtime.sendMessage({ type: 'PARSE_FILE', payload: { fileUrl: url, token: ctx.token, filename: att.filename, mimeType: att.mimeType } }, r));
          if (res?.error) throw new Error(res.error);
          const text = res?.text?.trim();
          if (!text) throw new Error(`Could not extract text from ${att.filename}`);
          parts.push(`[${att.filename}]\n${text}`);
        }
        ctx.subText = parts.join('\n\n');
        chrome.storage.local.set({ ce_claude_context: ctx });
        fileReady = true;
        status.textContent = '✓ File ready';
        status.style.color = DS.green;
        rebuildActionBar();
      } catch(e) {
        status.textContent = 'File error: ' + e.message;
        status.style.color = '#C0392B';
      }
    }

    // ── GRADE PROMPT ──────────────────────────────────────────────────────────
    function buildGradePrompt() {
      const st  = ctx?.settings || {};
      const tot = st.totalPoints || 100;
      const fn  = ctx?.studentName?.split(' ')[0] || 'the student';
      const intensity = { lenient: 'Be generous.', balanced: 'Grade fairly.', strict: 'Hold to high standards.' };
      const tone      = { encouraging: 'Warm and supportive.', neutral: 'Objective and professional.', direct: 'Concise, focus on improvements.' };
      let p = `Grade this student assignment.\nStudent: ${ctx?.studentName || 'Student'}\n`;
      if (ctx?.assignmentName) p += `Assignment: ${ctx.assignmentName}\n`;
      p += `\nGrading: ${intensity[st.gradingIntensity] || intensity.balanced}  Tone: ${tone[st.feedbackTone] || tone.encouraging}\n`;
      p += `Total points: ${tot}\n\n`;
      if (st.rubricText) p += `RUBRIC:\n${st.rubricText}\n\n`;
      if (st.answerKey)  p += `ANSWER KEY:\n${st.answerKey}\n\n`;
      p += `SUBMISSION:\n${(ctx?.subText || '(no submission)').slice(0, 18000)}\n\n`;
      p += `Respond in EXACTLY this format:\nSCORE: [number]/${tot}\nFEEDBACK:\n- TEACHER CHECK: [items to verify manually]\n- [Address ${fn} by name, overall]\n- [Specific finding]\n- [Another finding]\n\nUse 3–5 bullets. First must be TEACHER CHECK.`;
      return p;
    }

    async function gradeStudent() {
      const needsFile = ctx?.attachments?.length && (!ctx.subText || ctx.subText.startsWith('[File upload'));
      if (needsFile) await grabFile();
      const prompt = buildGradePrompt();
      chatHistory.push({ role: 'user', content: prompt });
      addMessage('user', '✦ Grade this student\'s submission');
      streamToClaudeAPI([...chatHistory]);
    }

    function extractComments() {
      const last = [...chatHistory].reverse().find(m => m.role === 'assistant');
      if (!last) return '';
      const match = last.content.match(/FEEDBACK:\s*([\s\S]+)/i);
      const lines = (match ? match[1] : last.content).split('\n');
      return lines.filter(l => !/^[-*]?\s*(TEACHER CHECK|⚠)/i.test(l.trim()) && l.trim()).join('\n').trim();
    }

    // ── ACTION BAR ────────────────────────────────────────────────────────────
    function buildActionBar() {
      actionBar = el('div', `display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;`);
      rebuildActionBar();
      return actionBar;
    }

    function rebuildActionBar() {
      if (!actionBar) return;
      actionBar.innerHTML = '';
      const hasFiles = ctx?.attachments?.length > 0;
      const hasText  = ctx?.subText && !ctx.subText.startsWith('[File upload');
      if (hasFiles && !fileReady && !hasText) {
        const g = btn('📎 Grab File', `background:${DS.gray};color:${DS.text};border:1px solid ${DS.border};`);
        g.addEventListener('click', grabFile);
        actionBar.appendChild(g);
      } else if (fileReady || hasText) {
        const ok = el('span', `font-size:11px;color:${DS.green};align-self:center;`);
        ok.textContent = '✓ File ready';
        actionBar.appendChild(ok);
      }
      const g = btn('✦ Grade Student', `background:${DS.blue};color:#fff;flex:1;`);
      g.addEventListener('click', gradeStudent);
      actionBar.appendChild(g);
      const c = btn('⎘ Copy', `background:${DS.gray};color:${DS.text};border:1px solid ${DS.border};`);
      c.addEventListener('click', () => {
        const text = extractComments();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => { c.textContent = '✓ Copied'; setTimeout(() => { c.textContent = '⎘ Copy'; }, 2000); });
      });
      actionBar.appendChild(c);
    }

    // ── SAVE ROW ──────────────────────────────────────────────────────────────
    function buildSaveRow() {
      const row     = el('div', `display:flex;align-items:center;gap:8px;flex-shrink:0;`);
      const lab     = el('label', `font-size:12px;font-weight:600;color:${DS.text};white-space:nowrap;flex-shrink:0;`);
      lab.textContent = 'Grade:';
      const gradeIn = el('input', `
        width:72px;padding:7px 8px;flex-shrink:0;
        border:1px solid ${DS.border};border-radius:3px;
        font-size:13px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;
      `, { id:'ce-grade-in', type:'text', placeholder:'0–100' });
      gradeIn.addEventListener('focus', () => gradeIn.style.borderColor = DS.blue);
      gradeIn.addEventListener('blur',  () => gradeIn.style.borderColor = DS.border);
      const saveBtn = btn('💾 Save to Canvas', `background:${DS.green};color:#fff;flex:1;`);
      saveBtn.id = 'ce-grade-save';
      const saveMsg = el('span', `font-size:11px;flex-shrink:0;`);
      saveBtn.addEventListener('click', async () => {
        if (!ctx?.courseId) { saveMsg.style.color='#C0392B'; saveMsg.textContent='No student loaded'; return; }
        const grade   = gradeIn.value.trim();
        const comment = extractComments();
        if (!grade && !comment) { saveMsg.style.color='#C0392B'; saveMsg.textContent='Grade student first'; return; }
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
        const body = {};
        if (grade)   body.submission = { posted_grade: grade };
        if (comment) body.comment    = { text_comment: comment };
        const res = await new Promise(r => chrome.runtime.sendMessage({ type:'CANVAS_API', payload:{ url:`${ctx.canvasOrigin}/api/v1/courses/${ctx.courseId}/assignments/${ctx.assignmentId}/submissions/${ctx.studentId}`, token:ctx.token, method:'PUT', body } }, r));
        saveBtn.disabled = false; saveBtn.textContent = '💾 Save to Canvas';
        if (res?.error) { saveMsg.style.color='#C0392B'; saveMsg.textContent='Error: '+res.error; }
        else { saveMsg.style.color=DS.green; saveMsg.textContent='✓ Saved'; setTimeout(()=>{saveMsg.textContent='';},3000); }
      });
      row.appendChild(lab); row.appendChild(gradeIn); row.appendChild(saveBtn); row.appendChild(saveMsg);
      return row;
    }

    // ── CHAT INPUT ────────────────────────────────────────────────────────────
    function buildChatInput(placeholder) {
      const wrap = el('div', `display:flex;gap:6px;flex-shrink:0;padding-top:6px;border-top:1px solid ${DS.border};`);
      const inp  = el('textarea', `
        flex:1;padding:7px 10px;border:1px solid ${DS.border};border-radius:3px;
        font-size:13px;font-family:${DS.font};color:${DS.text};
        resize:none;outline:none;height:36px;line-height:1.4;overflow:hidden;
      `);
      inp.id = 'ce-chat-input';
      inp.placeholder = placeholder || 'Ask a follow-up…';
      inp.addEventListener('focus', () => inp.style.borderColor = DS.blue);
      inp.addEventListener('blur',  () => inp.style.borderColor = DS.border);
      inp.addEventListener('input', () => { inp.style.height='36px'; inp.style.height=Math.min(inp.scrollHeight,80)+'px'; });
      inp.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();} });
      const sendBtn = btn('Send', `background:${DS.blue};color:#fff;padding:7px 14px;width:auto;`);
      sendBtn.id = 'ce-send-btn';
      sendBtn.addEventListener('click', sendChat);
      wrap.appendChild(inp); wrap.appendChild(sendBtn);
      return wrap;
    }

    function sendChat() {
      const inp = document.getElementById('ce-chat-input');
      if (!inp || streaming) return;
      const text = inp.value.trim();
      if (!text) return;
      inp.value = ''; inp.style.height = '36px';
      chatHistory.push({ role:'user', content:text });
      addMessage('user', text);
      streamToClaudeAPI([...chatHistory]);
    }

    // ── GRADE TAB ─────────────────────────────────────────────────────────────
    const content = el('div', `flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;padding-top:10px;overflow:hidden;`);

    function buildGradeTab() {
      content.innerHTML = '';
      content.appendChild(buildStudentCard());
      content.appendChild(chatArea);
      content.appendChild(buildActionBar());
      content.appendChild(buildSaveRow());
      content.appendChild(buildChatInput('Ask a follow-up…'));
    }

    // ── CRITERIA TAB ──────────────────────────────────────────────────────────
    const CRITERIA_START = `You are helping a teacher build AI grading criteria. Ask ONE question at a time and wait for each answer. Start with: "What is the assignment name?"

Cover in order: assignment name → total points → grading strictness (Lenient/Balanced/Strict, explain each) → feedback tone (Encouraging/Neutral/Direct, explain each) → rubric or criteria → answer key → special instructions.

Once you have all answers, output ONLY this block:

---GRADING CRITERIA---
TOTAL POINTS: [number]
GRADING STYLE: [lenient/balanced/strict]
FEEDBACK TONE: [encouraging/neutral/direct]
RUBRIC:
[rubric]
ANSWER KEY:
[answer key or none]
INSTRUCTIONS:
[instructions or none]
---END CRITERIA---`;

    function buildCriteriaTab() {
      content.innerHTML = '';
      const saved  = savedCriteria();
      const lab    = el('div', `font-size:12px;font-weight:600;color:${DS.text};flex-shrink:0;`);
      lab.textContent = 'Saved Criteria';
      const area   = el('textarea', `
        width:100%;box-sizing:border-box;padding:8px 10px;height:90px;flex-shrink:0;
        border:1px solid ${DS.border};border-radius:3px;
        font-size:11px;font-family:${DS.font};color:${DS.text};
        resize:none;outline:none;background:${DS.gray};
      `);
      area.id = 'ce-criteria-area';
      area.placeholder = 'No criteria saved — use the chat below to build one';
      area.value = saved;
      area.addEventListener('focus', () => area.style.borderColor = DS.blue);
      area.addEventListener('blur',  () => area.style.borderColor = DS.border);

      const cMsg   = el('div', `font-size:11px;min-height:14px;flex-shrink:0;`);
      const btnRow = el('div', `display:flex;gap:6px;flex-shrink:0;`);

      const saveC  = btn('💾 Save', `background:${DS.green};color:#fff;flex:1;`);
      saveC.addEventListener('click', () => {
        const k = criteriaKey();
        if (!k) { cMsg.style.color='#C0392B'; cMsg.textContent='Open SpeedGrader first'; return; }
        const t = document.getElementById('ce-criteria-area')?.value.trim()||'';
        allCriteria = { ...allCriteria, [k]: t };
        chrome.storage.local.set({ ce_criteria: allCriteria });
        cMsg.style.color=DS.green; cMsg.textContent='✓ Saved'; setTimeout(()=>{cMsg.textContent='';},2500);
      });
      const delC   = btn('🗑 Delete', `background:${DS.gray};color:#C0392B;border:1px solid ${DS.border};flex:1;`);
      delC.addEventListener('click', () => {
        const k = criteriaKey(); if (!k) return;
        const u = {...allCriteria}; delete u[k]; allCriteria = u;
        chrome.storage.local.set({ ce_criteria: u });
        area.value=''; cMsg.style.color=DS.muted; cMsg.textContent='Deleted'; setTimeout(()=>{cMsg.textContent='';},2000);
      });
      btnRow.appendChild(saveC); btnRow.appendChild(delC);

      content.appendChild(lab); content.appendChild(area); content.appendChild(btnRow); content.appendChild(cMsg);
      content.appendChild(el('hr', `border:none;border-top:1px solid ${DS.border};margin:4px 0;flex-shrink:0;`));
      content.appendChild(chatArea);

      const startBtn = btn('▶ Start Criteria Builder', `background:${DS.blue};color:#fff;flex-shrink:0;`);
      startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        chatHistory.push({ role:'user', content:'Help me build grading criteria' });
        addMessage('user', 'Help me build grading criteria');
        onStreamDone = (text) => {
          const m = text.match(/---GRADING CRITERIA---([\s\S]+?)---END CRITERIA---/i);
          if (m) { area.value = m[0]; cMsg.style.color=DS.blue; cMsg.textContent='↑ Criteria detected — Save when ready'; }
        };
        streamToClaudeAPI([{ role:'user', content: CRITERIA_START }]);
      });
      content.appendChild(startBtn);
      content.appendChild(buildChatInput('Answer here…'));
    }

    // ── REBUILD ───────────────────────────────────────────────────────────────
    function rebuild() {
      tabBar.innerHTML = '';
      tabBar.appendChild(mkTab('grade',    '🎓  Grade'));
      tabBar.appendChild(mkTab('criteria', '📋  Criteria'));
      activeTab === 'grade' ? buildGradeTab() : buildCriteriaTab();
    }

    // ── STORAGE LISTENER ──────────────────────────────────────────────────────
    const listener = changes => {
      if (!changes.ce_claude_context) return;
      ctx = changes.ce_claude_context.newValue;
      fileReady = false; chatHistory = []; chatArea.innerHTML = '';
      if (activeTab === 'grade') buildGradeTab();
    };
    chrome.storage.onChanged.addListener(listener);
    _panelCleanup = () => {
      chrome.storage.onChanged.removeListener(listener);
      if (activePort) try { activePort.disconnect(); } catch(_) {}
    };

    panelBody.appendChild(tabBar);
    panelBody.appendChild(content);
    rebuild();
  }

  // ── TOOL CLICK ─────────────────────────────────────────────────────────────
  function onToolClick(tool) {
    if (tool.noPanel) { openQuickAI(); return; }
    if (_active === tool.id) { closePanel(); return; }
    openPanel(tool);
  }

  function openQuickAI() {
    chrome.storage.local.get('ce_ai_provider', ({ ce_ai_provider }) => {
      const provider = AI_PROVIDERS.find(p => p.id === ce_ai_provider) || AI_PROVIDERS[0];
      chrome.runtime.sendMessage({
        type: 'OPEN_CLAUDE_SPLIT',
        payload: {
          url:         provider.url,
          screenWidth:  window.screen.availWidth,
          screenHeight: window.screen.availHeight,
          screenTop:    window.screen.availTop  || 0,
          screenLeft:   window.screen.availLeft || 0,
        },
      });
    });
  }

  function setActive(id) {
    if (_active && btnMap[_active]) {
      btnMap[_active].style.background = 'transparent';
      btnMap[_active].style.borderLeftColor = 'transparent';
      const lbl = btnMap[_active].querySelector('span:last-child');
      if (lbl) lbl.style.opacity = '.75';
    }
    _active = id;
    if (id && btnMap[id]) {
      btnMap[id].style.background = DS.navActive;
      btnMap[id].style.borderLeftColor = DS.navText;
      const lbl = btnMap[id].querySelector('span:last-child');
      if (lbl) lbl.style.opacity = '1';
    }
  }

  async function openPanel(tool) {
    setActive(tool.id);
    panelTitle.textContent = tool.label;
    panelBody.innerHTML = '';

    switch (tool.id) {
      case 'ai-grader':  await renderAIGrader();                                                     break;
      case 'cheater':    placeholder('🔍', 'Cheater Detector',  'Coming soon.');                    break;
      case 'reports':    placeholder('📊', 'Reports',           'Coming soon.');                    break;
      case 'scheduler':  placeholder('📅', 'Scheduler',         'Coming soon.');                    break;
      case 'settings':   await renderSettings();                                                     break;
    }

    panel.style.display = 'flex';
  }

  function closePanel() {
    if (_panelCleanup) { _panelCleanup(); _panelCleanup = null; }
    panel.style.display = 'none';
    setActive(null);
  }

  // ── COLLAPSE / EXPAND ──────────────────────────────────────────────────────
  function toggleToolbar() {
    _expanded = !_expanded;
    toolbar.style.transform = _expanded ? 'none' : `translateX(${TOOLBAR_W}px)`;
    tab.style.display = _expanded ? 'none' : 'flex';
    if (!_expanded) {
      closePanel();
      panel.style.right = '0';
    } else {
      panel.style.right = `${TOOLBAR_W}px`;
    }
    collapseBtn.textContent = _expanded ? '◀' : '▶';
  }

  // ── MOUNT ──────────────────────────────────────────────────────────────────
  function mount() {
    document.body.appendChild(toolbar);
    document.body.appendChild(panel);
    document.body.appendChild(tab);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
