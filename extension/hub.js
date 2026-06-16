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

  const TOOLBAR_W  = 52;
  const SPEEDGRADER = /speed_grader/.test(window.location.href);
  const TOP_OFFSET  = SPEEDGRADER ? 60 : 0;

  const AI_PROVIDERS = [
    { id: 'claude',      label: 'Claude (claude.ai)',     url: 'https://claude.ai/new' },
    { id: 'chatgpt',     label: 'ChatGPT (chatgpt.com)',  url: 'https://chatgpt.com/' },
    { id: 'gemini',      label: 'Gemini (Google)',        url: 'https://gemini.google.com/app' },
    { id: 'copilot',     label: 'Microsoft Copilot',      url: 'https://copilot.microsoft.com/' },
    { id: 'perplexity',  label: 'Perplexity',             url: 'https://www.perplexity.ai/' },
  ];

  const TOOLS = [
    { id: 'quick-ai',  icon: '⚡', label: 'Chat',      noPanel: true, desc: 'Opens a floating AI window alongside Canvas. Ask questions, draft responses, or brainstorm — without leaving your course.' },
    { id: 'cheater',   icon: '🔍', label: 'Audit',                   desc: 'Canvas-based audit. Flags submission, quiz, timing, and answer-pattern conditions for teacher review.' },
    { id: 'quiz',      icon: '✅', label: 'Quiz',      noPanel: true, desc: 'AI quiz builder. Generate multiple-choice, true/false, and short-answer questions from any topic or pasted content.' },
    { id: 'message',   icon: '✉️',  label: 'Message',  noPanel: true, desc: 'Automated student messaging. Send reminders, missing-work alerts, and progress updates directly via the Canvas inbox.' },
    { id: 'reports',   icon: '📊', label: 'Reports',                 desc: 'Canvas course checkups that turn gradebook data into clear next steps.' },
    { id: 'scheduler', icon: '📅', label: 'Scheduler',               desc: 'Drag-and-drop assignment scheduler. Set due dates and availability windows, then push them to Canvas in bulk.' },
    { id: 'notes',     icon: '📝', label: 'Notes',                   desc: 'Private teacher notes. Save, edit, and delete quick notes while working in Canvas.' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ];

  let _active      = null;          // tool id with open panel
  let _expanded    = !SPEEDGRADER;  // SpeedGrader starts minimized
  let _panelCleanup = null;  // storage listener teardown for active panel

  function isQuizListPage() {
    return /^\/courses\/\d+\/quizzes(?:\/|$)/.test(window.location.pathname);
  }

  function updateQuizToolVisibility() {
    const quizBtn = btnMap['quiz'];
    if (quizBtn) {
      quizBtn.style.display = isQuizListPage() ? 'flex' : 'none';
    }
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  function el(tag, css, attrs) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  // ── TOOLBAR ────────────────────────────────────────────────────────────────
  const toolbar = el('div', `
    position:fixed;top:${TOP_OFFSET}px;right:0;bottom:0;width:${TOOLBAR_W}px;
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
      display:flex;align-items:center;justify-content:center;
      font-family:${DS.font};transition:background .12s;flex-shrink:0;
      box-sizing:border-box;
    `, { type: 'button', title: tool.label });

    const inner = el('div', `
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:3px;pointer-events:none;
    `);

    const icon = el('span', 'font-size:18px;line-height:1;display:block;text-align:center;');
    icon.textContent = tool.icon;

    const label = el('span', `display:block;text-align:center;font-size:9px;color:${DS.navText};opacity:.75;letter-spacing:.3px;text-transform:uppercase;`);
    label.textContent = tool.label.split(' ')[0];

    inner.appendChild(icon);
    inner.appendChild(label);
    btn.appendChild(inner);

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
    position:fixed;top:${TOP_OFFSET}px;bottom:0;right:${TOOLBAR_W}px;
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
      chrome.storage.local.get(['ce_canvas_token','ce_teacher_name','ce_license_key','ce_ai_provider','ce_grading_model','ce_features'], r)
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

    // Grading quality select
    const gradingModelSel = el('select', `
      width:100%;box-sizing:border-box;
      padding:8px 10px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;cursor:pointer;
    `);
    gradingModelSel.id = 'ce-s-grading-model';
    for (const [value, label] of [
      ['claude-haiku-4-5-20251001', 'Standard — faster, lower cost'],
      ['claude-sonnet-4-6',         'High Quality — slower, higher cost'],
    ]) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === (stored.ce_grading_model || 'claude-haiku-4-5-20251001')) opt.selected = true;
      gradingModelSel.appendChild(opt);
    }
    gradingModelSel.addEventListener('focus', () => gradingModelSel.style.borderColor = DS.blue);
    gradingModelSel.addEventListener('blur',  () => gradingModelSel.style.borderColor = DS.border);

    stack.appendChild(row('AI Chat Window', providerSel, 'Used by the Chat button'));
    stack.appendChild(row('Grading Quality', gradingModelSel, 'Standard is recommended — quality difference is minimal for rubric grading'));
    stack.appendChild(row('Teacher Name', nameIn));
    stack.appendChild(row('Canvas API Token', tokenIn, 'Canvas → Account → Settings → New Access Token'));
    stack.appendChild(row('License Key', licenseIn));

    const saveBtn = btn('Save Settings', `background:${DS.blue};color:#fff;`, 'ce-s-save');
    const saveMsg = el('div', `font-size:12px;text-align:center;color:${DS.green};min-height:16px;`);

    saveBtn.addEventListener('click', () => {
      const features = {};
      for (const tool of TOOLS) {
        if (tool.id === 'settings' || !tool.desc) continue;
        const cb = document.getElementById(`ce-feat-${tool.id}`);
        if (cb) features[tool.id] = cb.checked;
      }
      chrome.storage.local.set({
        ce_ai_provider:    providerSel.value,
        ce_grading_model:  gradingModelSel.value,
        ce_canvas_token:   tokenIn.value.trim(),
        ce_teacher_name:   nameIn.value.trim(),
        ce_license_key:    licenseIn.value.trim(),
        ce_features:       features,
      }, () => {
        applyFeatures(features);
        saveMsg.textContent = '✓ Saved';
        setTimeout(() => { saveMsg.textContent = ''; }, 2500);
      });
    });

    stack.appendChild(saveBtn);
    stack.appendChild(saveMsg);
    stack.appendChild(divider());

    // Features toggle section
    const featHead = el('div', '');
    const fht = el('div', `font-size:15px;font-weight:700;color:${DS.text};margin-bottom:3px;`);
    fht.textContent = 'Features';
    const fhs = el('div', `font-size:12px;color:${DS.muted};`);
    fhs.textContent = 'Toggle tools on or off. Disabled tools are hidden from the toolbar.';
    featHead.appendChild(fht); featHead.appendChild(fhs);
    stack.appendChild(featHead);

    const savedFeatures = stored.ce_features || {};
    const featureItems = el('div', `display:flex;flex-direction:column;gap:6px;`);
    for (const tool of TOOLS) {
      if (tool.id === 'settings' || !tool.desc) continue;
      const isOn = savedFeatures[tool.id] !== false;
      const featureRow = el('div', `
        display:flex;align-items:flex-start;gap:10px;
        padding:10px 12px;border:1px solid ${DS.border};border-radius:3px;
        background:${DS.white};
      `);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isOn;
      cb.id = `ce-feat-${tool.id}`;
      cb.style.cssText = `margin-top:3px;flex-shrink:0;width:15px;height:15px;cursor:pointer;accent-color:${DS.blue};`;
      const textBlock = el('div', 'flex:1;min-width:0;');
      const nameLabel = el('label', `
        font-size:13px;font-weight:600;color:${DS.text};
        cursor:pointer;display:flex;align-items:center;gap:5px;margin-bottom:3px;
      `);
      nameLabel.htmlFor = `ce-feat-${tool.id}`;
      nameLabel.textContent = `${tool.icon}  ${tool.label}`;
      const descDiv = el('div', `font-size:11px;color:${DS.muted};line-height:1.45;`);
      descDiv.textContent = tool.desc;
      textBlock.appendChild(nameLabel);
      textBlock.appendChild(descDiv);
      featureRow.appendChild(cb);
      featureRow.appendChild(textBlock);
      featureItems.appendChild(featureRow);
    }
    stack.appendChild(featureItems);
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

  // ── REPORTS ────────────────────────────────────────────────────────────────
  async function renderReports() {
    panelBody.innerHTML = '';
    panelBody.style.padding = '0';
    panelBody.style.overflow = 'hidden';

    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token', 'ce_reports_prefs'], r));
    const token      = stored.ce_canvas_token;
    const savedPrefs = stored.ce_reports_prefs || {};
    const urlCourseId = window.location.href.match(/\/courses\/(\d+)/)?.[1] || null;
    let selectedCourseId = savedPrefs.selectedId || urlCourseId || null;
    const origin = window.location.origin;

    if (!token) {
      panelBody.style.padding = '20px 16px';
      placeholder('📊', 'Reports', 'Add your Canvas API token in Settings first.');
      return;
    }

    function savePrefs(patch) {
      chrome.storage.local.get('ce_reports_prefs', d => {
        chrome.storage.local.set({ ce_reports_prefs: { ...(d.ce_reports_prefs || {}), ...patch } });
      });
    }

    async function api(path) {
      return new Promise(r => chrome.runtime.sendMessage({
        type: 'CANVAS_API',
        payload: { url: `${origin}${path}`, token },
      }, r));
    }

    // ── COURSE PICKER ──────────────────────────────────────────────────────
    const pickerWrap = el('div', `
      flex-shrink:0;padding:8px 10px 8px;
      background:${DS.gray};border-bottom:1px solid ${DS.border};
    `);

    // Filter checkboxes row
    const filterRow = el('div', `display:flex;align-items:center;gap:12px;margin-bottom:6px;`);
    const pickerHdr = el('div', `font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${DS.muted};flex:1;`);
    pickerHdr.textContent = 'Course';

    function mkChk(label, key) {
      const lbl = el('label', `display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:${DS.muted};user-select:none;white-space:nowrap;`);
      const chk = el('input', `cursor:pointer;accent-color:${DS.blue};`, { type: 'checkbox' });
      chk.checked = savedPrefs[key] === true;
      lbl.appendChild(chk);
      lbl.appendChild(document.createTextNode(label));
      return { lbl, chk };
    }
    const { lbl: pubLbl, chk: pubChk }  = mkChk('Published only', 'publishedOnly');
    const { lbl: dashLbl, chk: dashChk } = mkChk('Dashboard only', 'dashOnly');

    filterRow.appendChild(pickerHdr);
    filterRow.appendChild(pubLbl);
    filterRow.appendChild(dashLbl);

    // Course dropdown
    const courseSelect = el('select', `
      width:100%;padding:5px 8px;border:1px solid ${DS.border};border-radius:3px;
      font-size:12px;font-family:${DS.font};color:${DS.text};background:${DS.white};
      cursor:pointer;
    `);
    const selectLoading = el('option', '');
    selectLoading.textContent = 'Loading courses…';
    courseSelect.appendChild(selectLoading);
    courseSelect.disabled = true;

    pickerWrap.appendChild(filterRow);
    pickerWrap.appendChild(courseSelect);

    // ── TABS ───────────────────────────────────────────────────────────────
    let activeTab = 'health';

    const tabBar = el('div', `
      display:flex;flex-shrink:0;
      border-bottom:2px solid ${DS.border};
      background:${DS.white};
    `);

    const tabContent = el('div', `
      flex:1;min-height:0;overflow-y:auto;
      padding:16px;display:flex;flex-direction:column;gap:12px;
    `);

    panelBody.appendChild(pickerWrap);
    panelBody.appendChild(tabBar);
    panelBody.appendChild(tabContent);

    const TABS = [
      { id: 'health', label: 'Course Snapshot' },
      { id: 'atrisk', label: 'At-Risk Students' },
    ];

    const tabBtns = {};
    function setTab(id) {
      activeTab = id;
      for (const [tid, tb] of Object.entries(tabBtns)) {
        const active = tid === id;
        tb.style.color             = active ? DS.blue  : DS.muted;
        tb.style.borderBottomColor = active ? DS.blue  : 'transparent';
        tb.style.fontWeight        = active ? '700'    : '500';
      }
      renderTab();
    }

    for (const t of TABS) {
      const tb = el('button', `
        flex:1;padding:11px 6px;font-size:12px;
        border:none;border-bottom:2px solid transparent;margin-bottom:-2px;
        background:transparent;cursor:pointer;color:${DS.muted};font-weight:500;
        font-family:${DS.font};transition:all .15s;
      `, { type: 'button', textContent: t.label });
      tb.addEventListener('click', () => setTab(t.id));
      tabBtns[t.id] = tb;
      tabBar.appendChild(tb);
    }

    // ── SHARED HELPERS ─────────────────────────────────────────────────────
    function recItem(text, type) {
      const bg   = type === 'ok' ? '#F0FDF4' : type === 'warn' ? '#FFFBEB' : DS.blueBg;
      const border = type === 'ok' ? '#86EFAC' : type === 'warn' ? '#FDE68A' : DS.border;
      const icon = type === 'ok' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
      const d = el('div', `padding:9px 12px;border-radius:3px;background:${bg};border:1px solid ${border};font-size:12px;line-height:1.5;color:${DS.text};`);
      d.textContent = `${icon}  ${text}`;
      return d;
    }

    function sectionHead(text) {
      const d = el('div', `font-size:13px;font-weight:700;color:${DS.text};margin-bottom:4px;`);
      d.textContent = text;
      return d;
    }

    function statusMsg(container, text, type) {
      container.innerHTML = '';
      const bg = type === 'err' ? '#FEF2F2' : DS.blueBg;
      const co = type === 'err' ? '#991B1B' : DS.blue;
      const d = el('div', `padding:10px;border-radius:3px;background:${bg};color:${co};font-size:12px;`);
      d.textContent = text;
      container.appendChild(d);
    }

    // ── COURSE SNAPSHOT ────────────────────────────────────────────────────
    async function renderHealthTab() {
      const desc = el('div', `font-size:12px;color:${DS.muted};line-height:1.6;`);
      desc.textContent = 'A quick Canvas checkup that shows what needs attention and what to do next.';
      tabContent.appendChild(desc);

      const runBtn = btn('Run Course Snapshot', `background:${DS.blue};color:#fff;`);
      tabContent.appendChild(runBtn);

      const results = el('div', 'display:flex;flex-direction:column;gap:10px;');
      tabContent.appendChild(results);

      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true; runBtn.textContent = 'Checking course...';
        results.innerHTML = '';

        try {
          const [assignments, enrollments] = await Promise.all([
            api(`/api/v1/courses/${selectedCourseId}/assignments?per_page=100`),
            api(`/api/v1/courses/${selectedCourseId}/enrollments?type[]=StudentEnrollment&per_page=100&include[]=grades`),
          ]);

          const uniqueEnrollments = Object.values((enrollments || []).reduce((map, e) => {
            if (e?.user_id != null) map[e.user_id] = map[e.user_id] || e;
            return map;
          }, {}));
          const studentCount = uniqueEnrollments.length;
          if (!studentCount) { statusMsg(results, 'No enrolled students found.', 'err'); return; }

          const topAssignments = (assignments || []).filter(a => a.points_possible > 0).slice(0, 30);
          const subMap = {};
          await Promise.all(topAssignments.map(async a => {
            const subs = await api(`/api/v1/courses/${selectedCourseId}/assignments/${a.id}/submissions?per_page=200`);
            subMap[a.id] = subs || [];
          }));

          function uniqueStudentSubmissions(subs) {
            const byUser = {};
            for (const sub of (subs || [])) {
              if (sub?.user_id == null) continue;
              const current = byUser[sub.user_id];
              if (!current) {
                byUser[sub.user_id] = sub;
                continue;
              }
              if (current.missing && !sub.missing) {
                byUser[sub.user_id] = sub;
                continue;
              }
              const currentTime = Date.parse(current.graded_at || current.submitted_at || current.cached_due_date || '') || 0;
              const nextTime = Date.parse(sub.graded_at || sub.submitted_at || sub.cached_due_date || '') || 0;
              if (nextTime > currentTime) byUser[sub.user_id] = sub;
            }
            return Object.values(byUser);
          }

          const uniqueSubMap = {};
          for (const a of topAssignments) uniqueSubMap[a.id] = uniqueStudentSubmissions(subMap[a.id] || []);
          const allSubs = Object.values(uniqueSubMap).flat();

          // Per-assignment stats
          const stats = topAssignments.map(a => {
            const subs      = uniqueSubMap[a.id] || [];
            const submitted = subs.filter(s => s.submitted_at).length;
            const missing   = subs.filter(s => s.missing).length;
            const graded    = subs.filter(s => s.score != null && a.points_possible > 0);
            const avgPct    = graded.length ? graded.reduce((s, x) => s + (x.score / a.points_possible) * 100, 0) / graded.length : null;
            return {
              name:           a.name,
              dueAt:          a.due_at,
              pointsPossible: a.points_possible,
              submissionTypes: a.submission_types || [],
              completionRate: studentCount > 0 ? Math.min(100, (submitted / studentCount) * 100) : 0,
              missingRate:    studentCount > 0 ? Math.min(100, (missing  / studentCount) * 100) : 0,
              avgPct,
              gradedCount:    graded.length,
              ungradedCount:  subs.filter(s => s.submitted_at && s.score == null).length,
            };
          });

          // Course-level grades
          const grades    = uniqueEnrollments.map(e => e.grades?.current_score).filter(g => g != null);
          const avgGrade  = grades.length ? grades.reduce((s, g) => s + g, 0) / grades.length : 0;
          const lowGraders = grades.filter(g => g < 70).length;
          const avgMissing  = stats.length ? stats.reduce((s, a) => s + a.missingRate, 0)  / stats.length : 0;

          // ── Feedback turnaround (submitted → graded, days) ─────────────
          const turnaroundDays = allSubs
            .filter(s => s.submitted_at && s.graded_at)
            .map(s => (new Date(s.graded_at) - new Date(s.submitted_at)) / 86400000)
            .filter(d => d >= 0 && d < 365);
          const avgTurnaround = turnaroundDays.length
            ? turnaroundDays.reduce((s, d) => s + d, 0) / turnaroundDays.length : null;

          // ── Ungraded pile ──────────────────────────────────────────────
          const totalUngraded = stats.reduce((s, a) => s + a.ungradedCount, 0);

          // ── Late submission rate ───────────────────────────────────────
          const allSubmittedCount = allSubs.filter(s => s.submitted_at).length;
          const lateRate = allSubmittedCount > 0
            ? (allSubs.filter(s => s.late).length / allSubmittedCount) * 100 : 0;

          // ── Never-submitted students ───────────────────────────────────
          const enrolledIds   = new Set(uniqueEnrollments.map(e => String(e.user_id)));
          const submittedIds  = new Set(allSubs.filter(s => s.submitted_at).map(s => String(s.user_id)));
          const neverSubmitted = [...enrolledIds].filter(id => !submittedIds.has(id)).length;

          // ── Grade distribution / bimodal ───────────────────────────────
          const bands = { A: 0, B: 0, C: 0, D: 0, F: 0 };
          for (const g of grades) {
            if (g >= 90) bands.A++;
            else if (g >= 80) bands.B++;
            else if (g >= 70) bands.C++;
            else if (g >= 60) bands.D++;
            else bands.F++;
          }
          const isBimodal = grades.length >= 8 &&
            (bands.A + bands.B) > 0 && (bands.D + bands.F) > 0 &&
            bands.C < (bands.A + bands.B + bands.D + bands.F) * 0.3;

          // ── Grade std deviation ────────────────────────────────────────
          const gradeStdDev = grades.length > 1
            ? Math.sqrt(grades.reduce((s, g) => s + Math.pow(g - avgGrade, 2), 0) / grades.length)
            : 0;

          const highMissing = stats.filter(a => a.missingRate > 30).sort((a, b) => b.missingRate - a.missingRate).slice(0, 3);
          const lowScoreA = stats.filter(a => a.avgPct != null && a.avgPct < 70 && a.gradedCount >= 3).sort((a, b) => a.avgPct - b.avgPct).slice(0, 2);
          const lowComplete = stats.filter(a => a.completionRate < 65 && a.completionRate > 0).sort((a, b) => a.completionRate - b.completionRate).slice(0, 2);

          const groups = {
            students: [],
            workflow: [],
          };

          function add(group, severity, title, fact, why, action, ctaLabel, ctaAction) {
            groups[group].push({ severity, title, fact, why, action, ctaLabel, ctaAction });
          }

          if (neverSubmitted > 0) {
            add('students', 'urgent', 'Students Have Not Started', `${neverSubmitted} student${neverSubmitted !== 1 ? 's have' : ' has'} not submitted anything yet.`, 'These students may already be disconnected from the course.', 'Contact them today and consider looping in an advisor if they do not respond.', 'Open At-Risk List', () => setTab('atrisk'));
          }
          if (grades.length && lowGraders / grades.length > 0.25) {
            add('students', 'urgent', 'Several Students Are Failing', `${lowGraders} of ${grades.length} graded students are below 70%.`, 'This is the clearest sign that students need outreach before the next major due date.', 'Send a short personal check-in and point them to the next assignment they can complete.', 'Open Messages', () => document.dispatchEvent(new CustomEvent('ce-toggle-messages')));
          }
          if (avgGrade > 0 && avgGrade < 74) {
            add('students', 'warn', 'Class Average Is Low', `The current class average is ${Math.round(avgGrade)}%.`, 'The whole class may need clarification, review, or a recovery path.', 'Post a review resource or use the next class meeting to reteach the hardest concept.', 'Open Messages', () => document.dispatchEvent(new CustomEvent('ce-toggle-messages')));
          }
          for (const a of highMissing) {
            add('students', 'warn', 'Missing Work Spike', `${Math.round(a.missingRate)}% of students are missing "${a.name}."`, 'A high missing rate usually means students missed the deadline, misunderstood the task, or need a reminder.', 'Send a missing-work reminder and consider extending the due date if the assignment is essential.', 'Open Messages', () => document.dispatchEvent(new CustomEvent('ce-toggle-messages')));
          }
          for (const a of lowScoreA) {
            add('students', 'warn', 'Assignment Scores Are Low', `The class average on "${a.name}" is ${Math.round(a.avgPct)}%.`, 'Students may not have understood the skill or instructions for this assignment.', 'Add a short explanation, example, or practice item before the next related assignment.', '', null);
          }
          for (const a of lowComplete) {
            add('students', 'warn', 'Low Completion Assignment', `Only ${Math.round(a.completionRate)}% of students submitted "${a.name}."`, 'Low completion can point to unclear directions, a hidden item, or a deadline that was easy to miss.', 'Open the assignment as a student would and check the instructions, due date, and module placement.', '', null);
          }
          if (isBimodal) {
            add('students', 'warn', 'Class Is Splitting Into Two Groups', 'Grades show a strong high group and a strong low group, with fewer students in the middle.', 'Some students may have quietly stopped participating while stronger students keep moving.', 'Use the At-Risk tab to identify the lower group and reach out individually.', 'Open At-Risk List', () => setTab('atrisk'));
          }
          if (gradeStdDev > 20) {
            add('students', 'info', 'Wide Grade Spread', 'Student grades vary a lot across the course.', 'The same material may be landing very differently for different students.', 'Consider adding optional practice or peer support for the students who are behind.', '', null);
          }

          if (totalUngraded > 0) {
            add('workflow', totalUngraded >= 10 ? 'urgent' : 'warn', 'Ungraded Work Is Waiting', `${totalUngraded} submitted item${totalUngraded !== 1 ? 's are' : ' is'} not graded.`, 'Students cannot make good choices if Canvas does not show where they stand.', 'Clear the oldest submissions first, then message students once grades are updated.', '', null);
          }
          if (avgTurnaround != null && avgTurnaround > 4) {
            add('workflow', avgTurnaround > 7 ? 'urgent' : 'warn', 'Feedback Is Slow', `Average grading turnaround is ${avgTurnaround.toFixed(1)} days.`, 'Feedback loses value when students receive it after they have already moved on.', 'Try a twice-weekly grading block or shorter rubric comments for routine assignments.', '', null);
          }
          if (lateRate > 20) {
            add('workflow', 'warn', 'Late Work Is High', `${Math.round(lateRate)}% of submitted work is late.`, 'Students may be falling behind or may need more reminders before deadlines.', 'Send a reminder to students with late or missing work.', 'Open Messages', () => document.dispatchEvent(new CustomEvent('ce-toggle-messages')));
          }

          const issues = [...groups.students, ...groups.workflow];
          const urgentCount = issues.filter(i => i.severity === 'urgent').length;
          const warnCount = issues.filter(i => i.severity === 'warn').length;
          const statusLabel = urgentCount ? 'Needs Attention Today' : warnCount ? 'Needs Review' : 'Looks Good';
          const statusBg = urgentCount ? '#FEF2F2' : warnCount ? '#FFFBEB' : '#F0FDF4';
          const statusBorder = urgentCount ? '#FCA5A5' : warnCount ? '#FDE68A' : '#86EFAC';
          const statusColor = urgentCount ? '#991B1B' : warnCount ? '#92400E' : DS.green;

          const hero = el('div', `border:1px solid ${statusBorder};background:${statusBg};border-radius:4px;padding:14px;display:flex;flex-direction:column;gap:8px;`);
          const heroTop = el('div', 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;');
          const heroText = el('div', 'min-width:0;');
          const heroTitle = el('div', `font-size:18px;font-weight:800;color:${statusColor};line-height:1.2;`);
          heroTitle.textContent = statusLabel;
          const heroSub = el('div', `font-size:12px;color:${DS.text};line-height:1.5;margin-top:4px;`);
          heroSub.textContent = issues.length
            ? `${issues.length} item${issues.length !== 1 ? 's' : ''} to review. Start with the priorities below.`
            : 'No major course issues found in Canvas right now.';
          const heroBadge = el('div', `font-size:11px;font-weight:700;border-radius:999px;padding:5px 9px;background:#fff;border:1px solid ${statusBorder};color:${statusColor};white-space:nowrap;`);
          heroBadge.textContent = `${studentCount} students`;
          heroText.appendChild(heroTitle);
          heroText.appendChild(heroSub);
          heroTop.appendChild(heroText);
          heroTop.appendChild(heroBadge);
          hero.appendChild(heroTop);
          results.appendChild(hero);

          function metricTile(label, value, note, state) {
            const color = state === 'bad' ? '#991B1B' : state === 'warn' ? '#92400E' : state === 'good' ? DS.green : DS.text;
            const bg = state === 'bad' ? '#FEF2F2' : state === 'warn' ? '#FFFBEB' : state === 'good' ? '#F0FDF4' : DS.white;
            const border = state === 'bad' ? '#FCA5A5' : state === 'warn' ? '#FDE68A' : state === 'good' ? '#86EFAC' : DS.border;
            const card = el('div', `border:1px solid ${border};border-radius:4px;background:${bg};padding:10px;min-width:0;`);
            const val = el('div', `font-size:18px;font-weight:800;color:${color};line-height:1;`);
            val.textContent = value;
            const lbl = el('div', `font-size:11px;font-weight:700;color:${DS.text};margin-top:6px;`);
            lbl.textContent = label;
            const small = el('div', `font-size:10px;color:${DS.muted};line-height:1.35;margin-top:3px;`);
            small.textContent = note;
            card.appendChild(val);
            card.appendChild(lbl);
            card.appendChild(small);
            return card;
          }

          const metrics = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;');
          metrics.appendChild(metricTile('At-Risk', String(lowGraders), 'students below 70%', lowGraders ? 'bad' : 'good'));
          metrics.appendChild(metricTile('Missing Work', `${Math.round(avgMissing)}%`, 'average missing rate', avgMissing > 25 ? 'bad' : avgMissing > 10 ? 'warn' : 'good'));
          metrics.appendChild(metricTile('Ungraded', String(totalUngraded), 'submitted items', totalUngraded >= 10 ? 'bad' : totalUngraded > 0 ? 'warn' : 'good'));
          metrics.appendChild(metricTile('Late Work', `${Math.round(lateRate)}%`, 'of submitted work', lateRate > 20 ? 'warn' : 'good'));
          metrics.appendChild(metricTile('Feedback', avgTurnaround != null ? `${avgTurnaround.toFixed(1)}d` : 'N/A', 'average return time', avgTurnaround == null ? 'neutral' : avgTurnaround > 7 ? 'bad' : avgTurnaround > 4 ? 'warn' : 'good'));
          metrics.appendChild(metricTile('Class Avg', grades.length ? `${Math.round(avgGrade)}%` : 'N/A', 'current Canvas score', grades.length && avgGrade < 74 ? 'warn' : grades.length ? 'good' : 'neutral'));
          results.appendChild(metrics);

          function issueCard(item) {
            const color = item.severity === 'urgent' ? '#991B1B' : item.severity === 'warn' ? '#92400E' : DS.blue;
            const bg = item.severity === 'urgent' ? '#FEF2F2' : item.severity === 'warn' ? '#FFFBEB' : DS.blueBg;
            const border = item.severity === 'urgent' ? '#FCA5A5' : item.severity === 'warn' ? '#FDE68A' : DS.border;
            const card = el('div', `border:1px solid ${border};border-radius:4px;background:${bg};padding:10px;display:flex;flex-direction:column;gap:7px;`);
            const title = el('div', `font-size:13px;font-weight:800;color:${color};`);
            title.textContent = item.title;
            const fact = el('div', `font-size:12px;font-weight:700;color:${DS.text};line-height:1.45;`);
            fact.textContent = item.fact;
            const why = el('div', `font-size:11px;color:${DS.muted};line-height:1.45;`);
            why.textContent = item.why;
            const action = el('div', `font-size:12px;color:${DS.text};line-height:1.45;`);
            action.innerHTML = `<strong>Next step:</strong> ${item.action}`;
            card.appendChild(title);
            card.appendChild(fact);
            card.appendChild(why);
            card.appendChild(action);
            if (item.ctaLabel && item.ctaAction) {
              const cta = el('button', `align-self:flex-start;border:1px solid ${DS.blue};background:#fff;color:${DS.blue};border-radius:3px;padding:6px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:${DS.font};`, { type: 'button', textContent: item.ctaLabel });
              cta.addEventListener('click', item.ctaAction);
              card.appendChild(cta);
            }
            return card;
          }

          const priorities = issues
            .filter(i => i.severity !== 'info')
            .sort((a, b) => (a.severity === 'urgent' ? -1 : 1) - (b.severity === 'urgent' ? -1 : 1))
            .slice(0, 3);
          if (priorities.length) {
            results.appendChild(sectionHead('What to do first'));
            const priorityList = el('div', 'display:flex;flex-direction:column;gap:8px;');
            priorities.forEach(i => priorityList.appendChild(issueCard(i)));
            results.appendChild(priorityList);
          } else {
            results.appendChild(recItem('No urgent action found. Your course looks steady based on the Canvas data available.', 'ok'));
          }

          function groupSection(title, subtitle, items) {
            const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;');
            const head = el('div', '');
            const h = el('div', `font-size:13px;font-weight:800;color:${DS.text};`);
            h.textContent = title;
            const p = el('div', `font-size:11px;color:${DS.muted};line-height:1.45;margin-top:2px;`);
            p.textContent = subtitle;
            head.appendChild(h);
            head.appendChild(p);
            wrap.appendChild(head);
            if (!items.length) {
              wrap.appendChild(recItem('No major concern found in this area.', 'ok'));
            } else {
              items.forEach(i => wrap.appendChild(issueCard(i)));
            }
            results.appendChild(wrap);
          }

          groupSection('Students', 'Grades, missing work, and participation signals.', groups.students);
          groupSection('Instructor Workflow', 'Grading pace, ungraded work, and late-work patterns.', groups.workflow);

        } catch (e) {
          statusMsg(results, 'Error: ' + e.message, 'err');
        } finally {
          runBtn.disabled = false; runBtn.textContent = 'Run Course Snapshot';
        }
      });
    }

    // ── AT-RISK STUDENTS ───────────────────────────────────────────────────
    async function renderAtRiskTab() {
      const desc = el('div', `font-size:12px;color:${DS.muted};line-height:1.6;`);
      desc.textContent = 'Lists every at-risk student with all their assignments. Assignments inside the lookback window that triggered the flag are highlighted.';
      tabContent.appendChild(desc);

      // Threshold inputs
      const threshCard = el('div', `padding:14px;border:1px solid ${DS.border};border-radius:3px;background:${DS.white};display:flex;flex-direction:column;gap:8px;`);
      const threshHead = el('div', `font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${DS.muted};margin-bottom:2px;`);
      threshHead.textContent = 'Flag student if ANY threshold is met';
      threshCard.appendChild(threshHead);

      function threshRow(label, id, def, unit) {
        const r = el('div', 'display:flex;align-items:center;justify-content:space-between;');
        const lbl = el('label', `font-size:12px;color:${DS.text};`, { htmlFor: id });
        lbl.textContent = label;
        const right = el('div', 'display:flex;align-items:center;gap:5px;');
        const inp = el('input', `width:52px;padding:4px 8px;border:1px solid ${DS.border};border-radius:3px;font-size:12px;font-family:${DS.font};text-align:right;`, { type: 'number', id, value: def, min: 0 });
        inp.addEventListener('focus', () => inp.style.borderColor = DS.blue);
        inp.addEventListener('blur',  () => inp.style.borderColor = DS.border);
        const u = el('span', `font-size:11px;color:${DS.muted};`, { textContent: unit });
        right.appendChild(inp); right.appendChild(u);
        r.appendChild(lbl); r.appendChild(right);
        return { row: r, inp };
      }

      const { row: r1, inp: gradeInp    } = threshRow('Current grade below',         'ce-ar-grade',    70, '%');

      const windowHead = el('div', `
        font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
        color:${DS.muted};padding-top:8px;margin-top:2px;border-top:1px solid ${DS.border};
      `);
      windowHead.textContent = 'Within lookback window';
      threshCard.appendChild(windowHead);

      const { row: r2, inp: missingInp  } = threshRow('Missing assignments ≥',        'ce-ar-missing',   3, 'assignments');
      const { row: r3, inp: lowScoreInp } = threshRow('Any assignment score below',   'ce-ar-lowscore', 60, '%');
      const { row: r4, inp: daysInp     } = threshRow('Days to look back',            'ce-ar-days',      7, 'days');

      threshCard.appendChild(r1);
      threshCard.appendChild(r2); threshCard.appendChild(r3);
      threshCard.appendChild(divider());
      threshCard.appendChild(r4);
      tabContent.appendChild(threshCard);

      const runBtn = btn('▶  Find At-Risk Students', `background:${DS.blue};color:#fff;`);
      tabContent.appendChild(runBtn);

      const results = el('div', 'display:flex;flex-direction:column;gap:10px;');
      tabContent.appendChild(results);

      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true; runBtn.textContent = 'Loading…';
        results.innerHTML = '';

        const gradeT    = parseFloat(gradeInp.value)    || 70;
        const missingT  = parseInt(missingInp.value)    || 3;
        const lowScoreT = parseFloat(lowScoreInp.value) || 60;
        const days      = parseInt(daysInp.value)        || 7;
        const cutoff    = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        function fmtDate(iso) {
          if (!iso) return '—';
          return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        function fmtScore(sub) {
          if (sub.missing) return 'Missing';
          if (sub.score == null) return 'Not graded';
          const pp = sub.assignment?.points_possible;
          const pct = pp ? Math.round((sub.score / pp) * 100) : null;
          return pp ? `${sub.score}/${pp} (${pct}%)` : `${sub.score} pts`;
        }
        function inWindow(sub) {
          const due = sub.assignment?.due_at ? new Date(sub.assignment.due_at) : null;
          return due && due >= cutoff;
        }
        function isFlagged(sub) {
          if (!inWindow(sub)) return false;
          if (sub.missing) return true;
          const pp = sub.assignment?.points_possible;
          return pp && sub.score != null && (sub.score / pp) * 100 < lowScoreT;
        }

        try {
          const [enrollments, allSubs] = await Promise.all([
            api(`/api/v1/courses/${selectedCourseId}/enrollments?type[]=StudentEnrollment&per_page=100&include[]=grades`),
            api(`/api/v1/courses/${selectedCourseId}/students/submissions?student_ids[]=all&per_page=200&include[]=assignment`),
          ]);

          // Group submissions by student
          const subsByStu = {};
          for (const s of (allSubs || [])) {
            if (!subsByStu[s.user_id]) subsByStu[s.user_id] = [];
            subsByStu[s.user_id].push(s);
          }

          const atRisk = [];
          for (const en of (enrollments || [])) {
            const uid   = en.user_id;
            const name  = en.user?.name || `Student ${uid}`;
            const grade = en.grades?.current_score;
            const subs  = (subsByStu[uid] || [])
              .filter(s => s.assignment?.due_at && s.assignment?.points_possible > 0)
              .sort((a, b) => new Date(b.assignment.due_at) - new Date(a.assignment.due_at));

            const windowSubs  = subs.filter(inWindow);
            const missCount   = windowSubs.filter(s => s.missing).length;
            const flaggedSubs = subs.filter(isFlagged);

            // For letters: all missing (any time) + in-window low scores
            const letterSubs = subs.filter(sub => {
              if (sub.missing) return true;
              const pp = sub.assignment?.points_possible;
              return inWindow(sub) && pp && sub.score != null && (sub.score / pp) * 100 < lowScoreT;
            });

            const isAtRisk =
              (grade != null && grade < gradeT) ||
              missCount >= missingT ||
              flaggedSubs.some(s => !s.missing); // has low score in window

            if (!isAtRisk) continue;

            const flags = [];
            if (grade != null && grade < gradeT)
              flags.push(`Grade: ${Math.round(grade)}%`);
            if (missCount >= missingT)
              flags.push(`${missCount} missing in last ${days} days`);
            const lowCount = flaggedSubs.filter(s => !s.missing).length;
            if (lowCount)
              flags.push(`${lowCount} low score${lowCount !== 1 ? 's' : ''} in last ${days} days`);

            atRisk.push({ name, grade, subs, flaggedSubs, letterSubs, days, flags });
          }

          atRisk.sort((a, b) => (a.grade ?? 999) - (b.grade ?? 999));

          if (!atRisk.length) {
            results.appendChild(recItem('No at-risk students found with current thresholds.', 'ok'));
            return;
          }

          results.appendChild(sectionHead(`${atRisk.length} at-risk student${atRisk.length !== 1 ? 's' : ''} found — flagged rows are within the ${days}-day window`));

          const list = el('div', 'display:flex;flex-direction:column;gap:10px;');
          for (const s of atRisk) {
            const card = el('div', `border:1px solid #FDE68A;border-radius:3px;overflow:hidden;`);

            // Header
            const hdr = el('div', `
              display:flex;align-items:center;justify-content:space-between;
              padding:8px 12px;background:#FEF3C7;border-bottom:1px solid #FDE68A;
            `);
            const nameEl  = el('div', `font-size:13px;font-weight:700;color:${DS.text};`);
            nameEl.textContent = s.name;
            const gradeEl = el('div', `font-size:13px;font-weight:700;color:${s.grade != null && s.grade < gradeT ? '#DC2626' : DS.text};`);
            gradeEl.textContent = s.grade != null ? `Avg: ${Math.round(s.grade)}%` : '';
            hdr.appendChild(nameEl); hdr.appendChild(gradeEl);
            card.appendChild(hdr);

            // Flag badges
            if (s.flags.length) {
              const badges = el('div', 'display:flex;flex-wrap:wrap;gap:4px;padding:6px 12px;background:#FFFBEB;border-bottom:1px solid #FDE68A;');
              for (const f of s.flags) {
                const b = el('span', `font-size:11px;padding:2px 8px;border-radius:20px;background:#FEF3C7;color:#92400E;font-weight:600;`);
                b.textContent = f;
                badges.appendChild(b);
              }
              card.appendChild(badges);
            }

            // Assignment table
            const tbl = el('div', 'background:#fff;');
            const colHdr = el('div', `
              display:grid;grid-template-columns:1fr 72px 90px;
              padding:5px 12px;background:${DS.gray};
              border-bottom:1px solid ${DS.border};
              font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${DS.muted};
            `);
            ['Assignment', 'Due', 'Score'].forEach(h => {
              const c = el('div', ''); c.textContent = h; colHdr.appendChild(c);
            });
            tbl.appendChild(colHdr);

            for (const sub of s.subs) {
              const flagged = isFlagged(sub);
              const row = el('div', `
                display:grid;grid-template-columns:1fr 72px 90px;
                padding:5px 12px;
                border-bottom:1px solid ${DS.border};
                background:${flagged ? '#FFF7ED' : '#fff'};
                font-size:11px;color:${DS.text};
              `);

              const aName = el('div', `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:6px;`);
              aName.title = sub.assignment.name;
              if (flagged) {
                aName.innerHTML = `<span style="color:#D97706;font-weight:700;margin-right:4px;">⚠</span>${sub.assignment.name}`;
              } else {
                aName.textContent = sub.assignment.name;
              }

              const dueEl  = el('div', `color:${DS.muted};`);
              dueEl.textContent = fmtDate(sub.assignment.due_at);

              const scoreEl = el('div', `font-weight:${flagged ? '700' : '400'};color:${sub.missing ? '#DC2626' : flagged ? '#D97706' : DS.text};`);
              scoreEl.textContent = fmtScore(sub);

              row.appendChild(aName); row.appendChild(dueEl); row.appendChild(scoreEl);
              tbl.appendChild(row);
            }
            card.appendChild(tbl);
            list.appendChild(card);
          }
          results.appendChild(list);

          // Print buttons
          const printRow = el('div', 'display:flex;gap:8px;');
          const printListBtn = btn('🖨  Print Teacher Report', `background:${DS.white};color:${DS.text};border:1px solid ${DS.border};`);
          printListBtn.style.width = '50%';
          printListBtn.addEventListener('click', () => printAtRisk(atRisk, false));
          const printLetterBtn = btn('🖨  Student Letters', `background:${DS.white};color:${DS.text};border:1px solid ${DS.border};`);
          printLetterBtn.style.width = '50%';
          printLetterBtn.addEventListener('click', () => printAtRisk(atRisk, true));
          printRow.appendChild(printListBtn); printRow.appendChild(printLetterBtn);
          results.appendChild(printRow);

        } catch (e) {
          statusMsg(results, 'Error: ' + e.message, 'err');
        } finally {
          runBtn.disabled = false; runBtn.textContent = '▶  Find At-Risk Students';
        }
      });
    }

    // ── PRINT ──────────────────────────────────────────────────────────────
    function printAtRisk(students, perPage) {
      const course = document.querySelector('.course-title span, h1.course-title, .context_title')?.textContent?.trim() || 'Course';
      const date   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const days   = students[0]?.days ?? 7;

      function fmtDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      let body = `<style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 16px; }
        h1 { font-size: 16pt; margin: 0 0 4px; }
        .meta { font-size: 9pt; color: #555; margin-bottom: 20px; }
        .student { margin-bottom: 28px; page-break-inside: avoid; }
        .stu-hdr { background: #394B58; color: #fff; padding: 7px 10px; display: flex; justify-content: space-between; }
        .stu-hdr span { font-size: 12pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th { background: #f0f0f0; padding: 5px 8px; text-align: left; border-bottom: 2px solid #ccc; font-size: 9pt; }
        td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
        .flagged td { background: #FFF7ED; }
        .flagged .score { color: #D97706; font-weight: bold; }
        .flagged .aname::before { content: "⚠ "; color: #D97706; }
        .missing { color: #DC2626; font-weight: bold; }
        .page-break { page-break-after: always; }
        .letter { padding: 24px 0; }
        .letter h2 { font-size: 14pt; border-bottom: 2px solid #394B58; padding-bottom: 6px; }
        .letter table th { background: #394B58; color: #fff; }
        .letter table .flagged td { background: #FFF7ED; }
        .sig { margin-top: 36px; }
      </style>`;

      if (!perPage) {
        body += `<h1>At-Risk Student Report</h1>
          <div class="meta">${course} · Generated ${date} · ${students.length} student${students.length !== 1 ? 's' : ''} · Lookback: ${days} days (⚠ = within window)</div>`;

        students.forEach(s => {
          body += `<div class="student">
            <div class="stu-hdr">
              <span>${s.name}</span>
              <span>${s.grade != null ? `Avg Grade: ${Math.round(s.grade)}%` : ''}</span>
            </div>
            <table><thead><tr><th>Assignment</th><th>Due Date</th><th>Score</th></tr></thead><tbody>`;

          s.subs.forEach(sub => {
            const due = fmtDate(sub.assignment?.due_at);
            const pp  = sub.assignment?.points_possible;
            const pct = pp && sub.score != null ? Math.round((sub.score / pp) * 100) : null;
            const scoreStr = sub.missing
              ? `<span class="missing">Missing</span>`
              : sub.score == null ? 'Not graded'
              : `${sub.score}/${pp} (${pct}%)`;
            const flagged = s.flaggedSubs.includes(sub);
            body += `<tr class="${flagged ? 'flagged' : ''}">
              <td class="aname">${sub.assignment?.name || ''}</td>
              <td>${due}</td>
              <td class="score">${scoreStr}</td>
            </tr>`;
          });

          body += `</tbody></table></div>`;
        });

      } else {
        students.forEach((s, i) => {
          const letterSubs = s.letterSubs || s.flaggedSubs || [];
          body += `<div class="letter${i < students.length - 1 ? ' page-break' : ''}">
            <h2>Academic Progress Notice</h2>
            <p><strong>${course}</strong> &nbsp;·&nbsp; ${date}</p>
            <p>Dear <strong>${s.name}</strong>,</p>
            <p>This notice is to inform you of your current academic standing in this course.
               ${s.grade != null ? `Your current average grade is <strong>${Math.round(s.grade)}%</strong>.` : ''}
               The following assignments require your immediate attention:</p>`;
          if (letterSubs.length) {
            body += `<table><thead><tr><th>Assignment</th><th>Due Date</th><th>Score / Status</th></tr></thead><tbody>`;
            letterSubs.forEach(sub => {
              const pp  = sub.assignment?.points_possible;
              const pct = pp && sub.score != null ? Math.round((sub.score / pp) * 100) : null;
              const scoreStr = sub.missing ? 'Missing' : sub.score == null ? 'Not graded' : `${sub.score}/${pp} (${pct}%)`;
              body += `<tr class="flagged">
                <td>${sub.assignment?.name || ''}</td>
                <td>${fmtDate(sub.assignment?.due_at)}</td>
                <td class="${sub.missing ? 'missing' : 'score'}">${scoreStr}</td>
              </tr>`;
            });
            body += `</tbody></table>`;
          } else {
            body += `<p><em>Please review all recent assignments and speak with your instructor about your current standing.</em></p>`;
          }
          body += `<p style="margin-top:14px;">Please reach out to discuss how we can support your success in this course.</p>
            <div class="sig"><p>Sincerely,</p><p><em>____________________________</em><br>Instructor, ${course}</p></div>
          </div>`;
        });
      }

      const w = window.open('', '_blank', 'width=860,height=680');
      w.document.write(`<!DOCTYPE html><html><body>${body}</body></html>`);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 600);
    }

    // ── RENDER INITIAL TAB ─────────────────────────────────────────────────
    async function renderTab() {
      tabContent.innerHTML = '';
      if (!selectedCourseId) {
        const msg = el('div', `text-align:center;padding:36px 16px;font-size:13px;color:${DS.muted};line-height:1.6;`);
        msg.textContent = 'Select a course above to run this report.';
        tabContent.appendChild(msg);
        return;
      }
      if (activeTab === 'health') await renderHealthTab();
      else await renderAtRiskTab();
    }

    setTab('health'); // renders "select a course" placeholder until dropdown loads

    // ── LOAD COURSES INTO PICKER ───────────────────────────────────────────
    (async () => {
      try {
        const [allCourses, dashCards] = await Promise.all([
          api(`/api/v1/courses?enrollment_type=teacher&per_page=100`),
          api(`/api/v1/dashboard/dashboard_cards`),
        ]);

        const dashIds = new Set((dashCards || []).map(c => String(c.id)));

        function visibleCourses() {
          let list = allCourses || [];
          if (pubChk.checked)  list = list.filter(c => c.workflow_state === 'available');
          if (dashChk.checked) list = list.filter(c => dashIds.has(String(c.id)));
          return list;
        }

        function rebuildDropdown() {
          courseSelect.innerHTML = '';
          const list = visibleCourses();

          if (!list.length) {
            const opt = el('option', '');
            opt.textContent = '— No courses match filters —';
            courseSelect.appendChild(opt);
            courseSelect.disabled = true;
            return;
          }

          courseSelect.disabled = false;

          // Keep selected course if still in list; otherwise fall back to URL course or first
          const listIds = list.map(c => String(c.id));
          if (!listIds.includes(selectedCourseId)) {
            selectedCourseId = listIds.includes(urlCourseId) ? urlCourseId : listIds[0];
          }

          for (const course of list) {
            const opt = document.createElement('option');
            opt.value       = String(course.id);
            opt.textContent = course.course_code
              ? `${course.course_code} — ${course.name}`
              : course.name;
            if (String(course.id) === String(selectedCourseId)) opt.selected = true;
            courseSelect.appendChild(opt);
          }

          savePrefs({ selectedId: selectedCourseId, publishedOnly: pubChk.checked, dashOnly: dashChk.checked });
        }

        courseSelect.addEventListener('change', () => {
          selectedCourseId = courseSelect.value;
          savePrefs({ selectedId: selectedCourseId });
          renderTab();
        });

        pubChk.addEventListener('change',  () => { savePrefs({ publishedOnly: pubChk.checked  }); rebuildDropdown(); renderTab(); });
        dashChk.addEventListener('change', () => { savePrefs({ dashOnly:      dashChk.checked }); rebuildDropdown(); renderTab(); });

        rebuildDropdown();
        renderTab();
      } catch(e) {
        courseSelect.innerHTML = '';
        const opt = el('option', '');
        opt.textContent = 'Could not load courses';
        courseSelect.appendChild(opt);
      }
    })();
  }

  // ── AI GRADER ──────────────────────────────────────────────────────────────
  async function renderAIGrader() {
    panelBody.innerHTML = '';

    if (!/speed_grader/.test(window.location.href)) {
      const wrap = el('div', `text-align:center;padding:52px 16px;`);
      const icon = el('div', `font-size:36px;margin-bottom:14px;opacity:.3;`);
      icon.textContent = '🎓';
      const msg = el('div', `font-size:13px;color:${DS.muted};line-height:1.7;`);
      msg.textContent = 'AI Grader only works in SpeedGrader. Open an assignment in SpeedGrader to activate.';
      wrap.appendChild(icon); wrap.appendChild(msg);
      panelBody.appendChild(wrap);
      return;
    }

    const stored = await new Promise(r =>
      chrome.storage.local.get(['ce_claude_context', 'ce_criteria'], r)
    );
    let ctx         = stored.ce_claude_context || null;
    let allCriteria = stored.ce_criteria       || {};
    let criteriaEditing = false;

    function speedGraderUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const courseId = window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
      const assignmentId = params.get('assignment_id') || '';
      return { courseId, assignmentId };
    }

    function criteriaKey() {
      const current = SPEEDGRADER ? speedGraderUrlParts() : { courseId: '', assignmentId: '' };
      const courseId = current.courseId || ctx?.courseId || '';
      const assignmentId = current.assignmentId || ctx?.assignmentId || '';
      return courseId && assignmentId ? `${courseId}_${assignmentId}` : null;
    }
    function savedCriteria() { const k = criteriaKey(); return k ? (allCriteria[k] || '') : ''; }

    // ── HINT ──────────────────────────────────────────────────────────────────
    const hint = el('div', `font-size:12px;color:${DS.muted};text-align:center;flex-shrink:0;padding:2px 0 6px;`);
    hint.textContent = 'Set grading criteria below. Use the ✦ AI Grade button in SpeedGrader.';

    // ── CRITERIA CONTENT ──────────────────────────────────────────────────────
    const content = el('div', `flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;overflow:hidden;`);

    // ── CRITERIA SECTION ──────────────────────────────────────────────────────
    function buildCriteriaSection() {
      content.innerHTML = '';
      const saved = savedCriteria();
      if (saved && !criteriaEditing) {
        buildCriteriaView(saved);
      } else {
        buildCriteriaBuilder();
      }
    }

    function buildCriteriaView(saved) {
      const tot    = saved.match(/TOTAL POINTS:\s*(\d+)/i)?.[1]  || '?';
      const style  = saved.match(/GRADING STYLE:\s*(\w+)/i)?.[1] || '';
      const tone   = saved.match(/FEEDBACK TONE:\s*(\w+)/i)?.[1] || '';
      const rubric = saved.match(/RUBRIC:\n([\s\S]*?)(?=\nANSWER KEY:|\nINSTRUCTIONS:|---END)/i)?.[1]?.trim() || '';
      const key    = saved.match(/ANSWER KEY:\n([\s\S]*?)(?=\nINSTRUCTIONS:|---END)/i)?.[1]?.trim() || '';

      const hdr = el('div', `display:flex;align-items:center;justify-content:space-between;flex-shrink:0;`);
      const title = el('div', `font-size:12px;font-weight:600;color:${DS.text};`);
      title.textContent = 'Grading Criteria';
      const editBtn = el('button', `
        padding:5px 12px;border:1px solid ${DS.border};border-radius:3px;
        background:transparent;color:${DS.text};font-size:12px;font-weight:600;
        cursor:pointer;font-family:${DS.font};
      `, { type: 'button', textContent: '✏ Edit' });
      editBtn.addEventListener('click', () => { criteriaEditing = true; buildCriteriaSection(); });
      hdr.appendChild(title); hdr.appendChild(editBtn);

      const meta = el('div', `display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;flex-shrink:0;`);
      function chip(text, color) {
        const c = el('div', `padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${color}20;color:${color};`);
        c.textContent = text; return c;
      }
      meta.appendChild(chip(`${tot} pts`, DS.blue));
      if (style) meta.appendChild(chip(style.charAt(0).toUpperCase()+style.slice(1), DS.muted));
      if (tone)  meta.appendChild(chip(tone.charAt(0).toUpperCase()+tone.slice(1), DS.green));

      const body = el('div', `flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:10px;`);
      function section(label, text) {
        if (!text || /^none$/i.test(text)) return;
        const wrap = el('div', '');
        const lbl = el('div', `font-size:11px;font-weight:700;color:${DS.muted};text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;`);
        lbl.textContent = label;
        const val = el('div', `font-size:12px;color:${DS.text};line-height:1.7;white-space:pre-wrap;word-break:break-word;background:${DS.gray};border:1px solid ${DS.border};border-radius:3px;padding:8px 10px;`);
        val.textContent = text;
        wrap.appendChild(lbl); wrap.appendChild(val); body.appendChild(wrap);
      }
      section('Rubric', rubric);
      section('Answer Key', key);

      const delBtn = btn('Delete Criteria', `background:transparent;color:#C0392B;border:1px solid #FECACA;font-size:12px;flex-shrink:0;`);
      delBtn.addEventListener('click', () => {
        const k = criteriaKey(); if (!k) return;
        const u = {...allCriteria}; delete u[k]; allCriteria = u;
        chrome.storage.local.set({ ce_criteria: u });
        criteriaEditing = true; buildCriteriaSection();
      });

      content.appendChild(hdr);
      content.appendChild(meta);
      content.appendChild(body);
      content.appendChild(delBtn);
    }

    function buildCriteriaBuilder() {
      const existing = savedCriteria();
      const exTot   = existing.match(/TOTAL POINTS:\s*(\d+)/i)?.[1]  || '100';
      const exStyle = existing.match(/GRADING STYLE:\s*(\w+)/i)?.[1]?.toLowerCase() || 'balanced';
      const exTone  = existing.match(/FEEDBACK TONE:\s*(\w+)/i)?.[1]?.toLowerCase() || 'encouraging';
      const exRubric = existing.match(/RUBRIC:\n([\s\S]*?)(?=\nANSWER KEY:|\nINSTRUCTIONS:|---END)/i)?.[1]?.trim().replace(/^none$/i,'') || '';
      const exKey    = existing.match(/ANSWER KEY:\n([\s\S]*?)(?=\nINSTRUCTIONS:|---END)/i)?.[1]?.trim().replace(/^none$/i,'') || '';
      const exInstr  = existing.match(/INSTRUCTIONS:\n([\s\S]*?)(?=---END)/i)?.[1]?.trim().replace(/^none$/i,'') || '';

      const hdrText = el('div', `font-size:12px;font-weight:600;color:${DS.text};flex-shrink:0;`);
      hdrText.textContent = criteriaEditing ? 'Edit Grading Criteria' : 'Set Up Grading Criteria';

      const form = el('div', `display:flex;flex-direction:column;gap:14px;flex:1;min-height:0;overflow-y:auto;padding:4px 2px;`);

      const pointsIn = input('ce-crit-points', 'number', '100', exTot);
      pointsIn.min = '1'; pointsIn.max = '9999';
      form.appendChild(row('Total Points', pointsIn));

      const strictSel = el('select', `width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid ${DS.border};border-radius:3px;font-size:13px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
      for (const [v, l] of [['lenient','Lenient — be generous with partial credit'],['balanced','Balanced — grade fairly against the rubric'],['strict','Strict — hold students to high standards']]) {
        const o = document.createElement('option'); o.value = v; o.textContent = l; if (v === exStyle) o.selected = true; strictSel.appendChild(o);
      }
      form.appendChild(row('How Harsh to Grade', strictSel));

      const toneSel = el('select', `width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid ${DS.border};border-radius:3px;font-size:13px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
      for (const [v, l] of [['encouraging','Encouraging — warm and supportive'],['neutral','Neutral — objective and professional'],['direct','Direct — concise, focus on improvements']]) {
        const o = document.createElement('option'); o.value = v; o.textContent = l; if (v === exTone) o.selected = true; toneSel.appendChild(o);
      }
      form.appendChild(row('Type of Comments', toneSel));

      const rubricTa = el('textarea', `width:100%;box-sizing:border-box;padding:8px 10px;height:80px;border:1px solid ${DS.border};border-radius:3px;font-size:12px;font-family:${DS.font};color:${DS.text};resize:vertical;outline:none;background:${DS.white};`);
      rubricTa.placeholder = 'e.g. Thesis 20pts, Evidence 30pts, Writing 25pts, Analysis 25pts';
      rubricTa.value = exRubric;
      rubricTa.addEventListener('focus', () => rubricTa.style.borderColor = DS.blue);
      rubricTa.addEventListener('blur',  () => rubricTa.style.borderColor = DS.border);
      form.appendChild(row('Rubric', rubricTa, 'How will points be divided?'));

      const keyTa = el('textarea', `width:100%;box-sizing:border-box;padding:8px 10px;height:60px;border:1px solid ${DS.border};border-radius:3px;font-size:12px;font-family:${DS.font};color:${DS.text};resize:vertical;outline:none;background:${DS.white};`);
      keyTa.placeholder = 'Optional — correct answers or model response';
      keyTa.value = exKey;
      keyTa.addEventListener('focus', () => keyTa.style.borderColor = DS.blue);
      keyTa.addEventListener('blur',  () => keyTa.style.borderColor = DS.border);
      form.appendChild(row('Answer Key', keyTa, 'Optional'));

      const instrTa = el('textarea', `width:100%;box-sizing:border-box;padding:8px 10px;height:50px;border:1px solid ${DS.border};border-radius:3px;font-size:12px;font-family:${DS.font};color:${DS.text};resize:vertical;outline:none;background:${DS.white};`);
      instrTa.placeholder = 'Optional — any special grading notes';
      instrTa.value = exInstr;
      instrTa.addEventListener('focus', () => instrTa.style.borderColor = DS.blue);
      instrTa.addEventListener('blur',  () => instrTa.style.borderColor = DS.border);
      form.appendChild(row('Special Instructions', instrTa, 'Optional'));

      const saveMsgEl = el('div', `font-size:11px;min-height:14px;flex-shrink:0;`);

      const saveBtn = btn('Save Criteria', `background:${DS.blue};color:#fff;flex-shrink:0;`);
      saveBtn.addEventListener('click', () => {
        const k = criteriaKey();
        if (!k) { saveMsgEl.style.color = '#C0392B'; saveMsgEl.textContent = 'Open SpeedGrader first'; return; }
        const pts    = document.getElementById('ce-crit-points')?.value?.trim() || '100';
        const rubric = rubricTa.value.trim() || 'none';
        const key    = keyTa.value.trim()    || 'none';
        const instr  = instrTa.value.trim()  || 'none';
        const criteria = ['---GRADING CRITERIA---',`TOTAL POINTS: ${pts}`,`GRADING STYLE: ${strictSel.value}`,`FEEDBACK TONE: ${toneSel.value}`,`RUBRIC:\n${rubric}`,`ANSWER KEY:\n${key}`,`INSTRUCTIONS:\n${instr}`,'---END CRITERIA---'].join('\n');
        allCriteria = { ...allCriteria, [k]: criteria };
        chrome.storage.local.set({ ce_criteria: allCriteria });
        saveMsgEl.style.color = DS.green; saveMsgEl.textContent = '✓ Saved';
        criteriaEditing = false;
        setTimeout(() => buildCriteriaSection(), 600);
      });

      content.appendChild(hdrText);
      content.appendChild(form);
      content.appendChild(saveMsgEl);
      content.appendChild(saveBtn);
    }

    // ── STORAGE LISTENER ──────────────────────────────────────────────────────
    const listener = changes => {
      const prevKey = criteriaKey();
      if (changes.ce_claude_context) {
        ctx = changes.ce_claude_context.newValue;
        // Rebuild criteria when assignment changes (criteria is keyed per assignment)
        if (criteriaKey() !== prevKey) { criteriaEditing = false; buildCriteriaSection(); }
      }
      if (changes.ce_criteria) {
        allCriteria = changes.ce_criteria.newValue || {};
        buildCriteriaSection();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    _panelCleanup = () => chrome.storage.onChanged.removeListener(listener);

    // ── LAYOUT ────────────────────────────────────────────────────────────────
    panelBody.appendChild(hint);
    panelBody.appendChild(content);
    buildCriteriaSection();
  }

  // ── TOOL CLICK ─────────────────────────────────────────────────────────────
  async function renderAudit() {
    panelBody.innerHTML = '';

    const params = new URLSearchParams(window.location.search);
    const courseId = window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
    const assignmentId = params.get('assignment_id') || '';
    if (!SPEEDGRADER || !courseId || !assignmentId) {
      const wrap = el('div', 'height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:20px;');
      const icon = el('div', 'font-size:32px;');
      icon.textContent = '🔍';
      const msg = el('div', `font-size:13px;color:${DS.muted};line-height:1.7;`);
      msg.textContent = 'Audit only works in SpeedGrader. Open an assignment in SpeedGrader to run Canvas audit checks.';
      wrap.appendChild(icon);
      wrap.appendChild(msg);
      panelBody.appendChild(wrap);
      return;
    }
    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token'], r));
    const token = stored.ce_canvas_token || '';
    let lastReport = null;

    const stack = el('div', 'display:flex;flex-direction:column;gap:14px;min-height:100%;');
    const head = el('div', '');
    const sub = el('div', `font-size:12px;color:${DS.muted};line-height:1.55;`);
    sub.textContent = 'Runs Canvas-based audit checks for instructor review. This tool does not decide whether a student cheated or violated course rules.';
    head.appendChild(sub);

    const badge = el('button', `
      border:1px solid ${DS.border};border-radius:4px;background:${DS.gray};
      color:${DS.text};font-size:13px;font-weight:700;padding:10px 12px;
      text-align:left;cursor:pointer;font-family:${DS.font};
    `, { type: 'button', textContent: 'Not checked yet' });
    const disclaimer = el('div', `
      font-size:11px;line-height:1.5;color:#7C2D12;background:#FFF7ED;
      border:1px solid #FDBA74;border-radius:4px;padding:8px 10px;
    `);
    disclaimer.textContent = 'Review flag only: this app does not determine cheating or misconduct. It flags Canvas conditions a teacher should review with course policy.';
    const status = el('div', `font-size:12px;color:${DS.muted};line-height:1.55;min-height:34px;`);
    const runBtn = btn('Run Audit', `background:${DS.blue};color:#fff;`);
    const checksBox = el('div', `display:flex;flex-direction:column;gap:6px;border:1px solid ${DS.border};border-radius:4px;padding:10px;background:#fff;`);
    const results = el('div', `display:flex;flex-direction:column;gap:8px;overflow-y:auto;min-height:0;flex:1;`);
    const checkState = {
      read: { label: 'Canvas Submission Reading', status: 'pending', detail: 'Waiting to read Canvas submissions.' },
      similarity: { label: 'Canvas Submission Similarity', status: 'pending', detail: 'Waiting to compare students in this assignment.' },
      timing: { label: 'Canvas Timing Signals', status: 'pending', detail: 'Waiting to review Canvas submission timestamps and files.' },
      quizBlur: { label: 'Canvas Quiz Tab Switching', status: 'pending', detail: 'Waiting to see if this assignment has quiz event data.' },
      quizSpeed: { label: 'Canvas Quiz Speed', status: 'pending', detail: 'Waiting to see if this assignment has timed quiz data.' },
      quizAnswers: { label: 'Canvas Quiz Answer Patterns', status: 'pending', detail: 'Waiting to see if this assignment has answer-level quiz data.' },
    };

    function escapeReportHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function setBadge(flagCount) {
      const ok = flagCount === 0;
      badge.textContent = ok ? 'Green: no review flags found' : `Red: ${flagCount} review flag${flagCount === 1 ? '' : 's'}`;
      badge.style.background = ok ? '#ECFDF3' : '#FEF2F2';
      badge.style.borderColor = ok ? '#86EFAC' : '#FCA5A5';
      badge.style.color = ok ? '#166534' : '#991B1B';
    }

    function updateCheck(id, statusValue, detail) {
      if (!checkState[id]) return;
      checkState[id].status = statusValue;
      if (detail) checkState[id].detail = detail;
      renderChecks();
    }

    function checkColors(statusValue) {
      if (statusValue === 'flagged') return { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B', label: 'Flagged' };
      if (statusValue === 'complete') return { bg: '#ECFDF3', border: '#86EFAC', color: '#166534', label: 'Checked' };
      if (statusValue === 'running') return { bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8', label: 'Running' };
      if (statusValue === 'unavailable') return { bg: '#F9FAFB', border: '#D1D5DB', color: '#6B7280', label: 'Not available' };
      if (statusValue === 'skipped') return { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', label: 'Skipped' };
      return { bg: '#F9FAFB', border: '#D1D5DB', color: '#6B7280', label: 'Pending' };
    }

    function renderChecks() {
      checksBox.innerHTML = '';
      const heading = el('div', `font-size:12px;font-weight:700;color:${DS.text};`);
      heading.textContent = 'Checks Run';
      checksBox.appendChild(heading);
      for (const [id, item] of Object.entries(checkState)) {
        const colors = checkColors(item.status);
        const canOpen = Boolean(lastReport) && item.status !== 'pending' && item.status !== 'running';
        const rowEl = el('button', `
          width:100%;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;
          border:none;border-top:1px solid #EEF2F7;padding:7px 0 0;background:transparent;
          text-align:left;font-family:${DS.font};cursor:${canOpen ? 'pointer' : 'default'};
        `, { type: 'button', title: canOpen ? 'Open check details' : '' });
        const left = el('div', '');
        const name = el('div', `font-size:12px;font-weight:600;color:${DS.text};`);
        name.textContent = item.label;
        const detail = el('div', `font-size:11px;color:${DS.muted};line-height:1.45;margin-top:2px;`);
        detail.textContent = item.detail;
        const pill = el('div', `font-size:10px;font-weight:700;border-radius:999px;padding:3px 8px;white-space:nowrap;background:${colors.bg};border:1px solid ${colors.border};color:${colors.color};`);
        pill.textContent = colors.label;
        left.appendChild(name);
        left.appendChild(detail);
        rowEl.appendChild(left);
        rowEl.appendChild(pill);
        if (canOpen) rowEl.addEventListener('click', () => openCheckReport(id));
        checksBox.appendChild(rowEl);
      }
    }

    function htmlToText(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return (tmp.textContent || tmp.innerText || '').trim();
    }

    function normalizeText(text) {
      return String(text || '')
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^a-z0-9\s']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function tokensFor(text) {
      const stop = new Set(['the','and','that','with','this','from','have','were','been','they','their','there','what','when','where','which','would','could','should','about','because']);
      return normalizeText(text).split(' ').filter(w => w.length > 3 && !stop.has(w));
    }

    function shingles(tokens, size = 5) {
      const out = new Set();
      for (let i = 0; i <= tokens.length - size; i++) out.add(tokens.slice(i, i + size).join(' '));
      return out;
    }

    function compareDocs(a, b) {
      const shared = [];
      for (const item of a.shingles) if (b.shingles.has(item)) shared.push(item);
      const unionSize = a.shingles.size + b.shingles.size - shared.length || 1;
      return { similarity: shared.length / unionSize, sharedCount: shared.length, samples: shared.slice(0, 8) };
    }

    async function runQuizBlurCheck(cId, qId, quizSubs) {
      const flags = [];
      for (const sub of quizSubs) {
        const events = await canvasFetchQuizEvents(cId, qId, sub.id);
        if (events === null) return { flags: [], unavailable: true };
        const blurCount = events.filter(e => e.event_type === 'page_blurred').length;
        if (blurCount >= 3) flags.push({ name: sub._name, blurCount });
      }
      return { flags, unavailable: false };
    }

    function runQuizSpeedCheck(quizSubs, timeLimitMinutes) {
      if (!timeLimitMinutes) return [];
      const limitSec = timeLimitMinutes * 60;
      return quizSubs
        .filter(sub => {
          if (!sub.time_spent || !sub.finished_at || !sub.quiz_points_possible) return false;
          const ratio = sub.time_spent / limitSec;
          const scoreRatio = sub.score / sub.quiz_points_possible;
          return ratio < 0.25 && scoreRatio > 0.65;
        })
        .map(sub => ({
          name: sub._name,
          timeSpent: sub.time_spent,
          pct: Math.round((sub.time_spent / limitSec) * 100),
          score: sub.score,
          possible: sub.quiz_points_possible,
          scorePct: Math.round((sub.score / sub.quiz_points_possible) * 100),
        }));
    }

    function runQuizAnswerCheck(quizSubs) {
      const pairs = [];
      for (let i = 0; i < quizSubs.length; i++) {
        const aData = quizSubs[i].submission_data;
        if (!Array.isArray(aData) || !aData.length) continue;
        const aWrong = {};
        for (const q of aData) {
          if (q.correct === false && q.answer != null) aWrong[q.question_id] = String(q.answer);
        }
        if (!Object.keys(aWrong).length) continue;
        for (let j = i + 1; j < quizSubs.length; j++) {
          const bData = quizSubs[j].submission_data;
          if (!Array.isArray(bData) || !bData.length) continue;
          const shared = [];
          for (const q of bData) {
            if (q.correct === false && q.answer != null && aWrong[q.question_id] === String(q.answer)) {
              shared.push(q.question_id);
            }
          }
          if (shared.length >= 2) pairs.push({ aName: quizSubs[i]._name, bName: quizSubs[j]._name, matchCount: shared.length });
        }
      }
      return pairs.sort((a, b) => b.matchCount - a.matchCount);
    }

    function runSubmissionTimingCheck(submissions) {
      const flags = [];
      const byWindow = new Map();
      const byFilename = new Map();

      for (const sub of submissions) {
        const name = sub.user?.sortable_name || sub.user?.name || `Student ${sub.user_id}`;
        if (sub.submitted_at) {
          const submittedMs = Date.parse(sub.submitted_at);
          if (!Number.isNaN(submittedMs)) {
            const windowKey = Math.floor(submittedMs / 120000);
            if (!byWindow.has(windowKey)) byWindow.set(windowKey, []);
            byWindow.get(windowKey).push({ name, submittedAt: sub.submitted_at });
          }
        }

        for (const att of (sub.attachments || [])) {
          const filename = String(att.filename || att.display_name || '').trim().toLowerCase();
          if (!filename) continue;
          if (!byFilename.has(filename)) byFilename.set(filename, []);
          byFilename.get(filename).push({ name, filename: att.filename || att.display_name || filename });
        }
      }

      for (const group of byWindow.values()) {
        if (group.length < 3) continue;
        const first = group[0];
        flags.push({
          type: 'timeCluster',
          names: group.map(item => item.name),
          submittedAt: first.submittedAt,
          detail: `${group.length} students submitted within the same two-minute Canvas window.`,
        });
      }

      for (const [filename, group] of byFilename.entries()) {
        const uniqueNames = [...new Set(group.map(item => item.name))];
        if (uniqueNames.length < 2) continue;
        if (/^(submission|assignment|document|homework|essay|paper)\.(docx?|pdf|xlsx?)$/i.test(filename)) continue;
        flags.push({
          type: 'sameFilename',
          filename: group[0].filename,
          names: uniqueNames,
          detail: `${uniqueNames.length} students uploaded a file with the same name.`,
        });
      }

      return flags;
    }

    async function canvasFetch(path) {
      const res = await fetch(`${location.origin}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas ${res.status}`);
      return { data, link: res.headers.get('link') || '' };
    }

    function nextLink(link) {
      return (link.match(/<([^>]+)>;\s*rel="next"/) || [])[1] || '';
    }

    async function canvasFetchAll(path) {
      const rows = [];
      let url = `${location.origin}${path}`;
      while (url) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas ${res.status}`);
        rows.push(...(Array.isArray(data) ? data : []));
        url = nextLink(res.headers.get('link') || '');
      }
      return rows;
    }

    async function canvasFetchQuizSubmissions(cId, qId) {
      const url = `${location.origin}/api/v1/courses/${cId}/quizzes/${qId}/submissions?include[]=submission_data&include[]=user&per_page=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas ${res.status}`);
      const usersById = {};
      for (const u of (data.users || [])) usersById[u.id] = u;
      return (data.quiz_submissions || []).map(qs => ({
        ...qs,
        _name: usersById[qs.user_id]?.sortable_name || usersById[qs.user_id]?.name || `Student ${qs.user_id}`,
      }));
    }

    async function canvasFetchQuizEvents(cId, qId, submissionId) {
      const url = `${location.origin}/api/v1/courses/${cId}/quizzes/${qId}/submissions/${submissionId}/events`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.quiz_submission_events || null;
    }

    async function parseAttachment(att) {
      let url = att.url || att.preview_url || '';
      if (att.id) {
        try {
          const info = await canvasFetch(`/api/v1/files/${att.id}`);
          if (info.data?.url) url = info.data.url;
        } catch (_) {}
      }
      const parsed = await new Promise(r => chrome.runtime.sendMessage({
        type: 'PARSE_FILE',
        payload: {
          fileUrl: url,
          token,
          filename: att.filename || att.display_name || 'file',
          mimeType: att['content-type'] || att.content_type || '',
        },
      }, r));
      if (parsed?.error) throw new Error(parsed.error);
      return parsed?.text || '';
    }

    async function submissionText(submission) {
      if (submission.submission_type === 'online_text_entry' && submission.body) return htmlToText(submission.body);
      if (submission.submission_type === 'online_url' && submission.url) return `URL submission: ${submission.url}`;
      if (submission.attachments?.length) {
        const pieces = [];
        for (const att of submission.attachments.slice(0, 3)) {
          try {
            const text = await parseAttachment(att);
            if (text.trim()) pieces.push(text.trim());
          } catch (e) {
            // Ignore unreadable files for comparison; report totals show how many were readable.
          }
        }
        return pieces.join('\n\n');
      }
      return '';
    }

    function renderSummary(report) {
      results.innerHTML = '';
      const prompt = el('div', `font-size:12px;color:${DS.muted};line-height:1.6;background:${DS.gray};border:1px solid ${DS.border};border-radius:4px;padding:10px;`);
      prompt.textContent = 'Audit complete. Click a check above to open a focused report with who and what to review.';
      results.appendChild(prompt);
    }

    function tableOrEmpty(rows, cols, message) {
      return rows || `<tr><td colspan="${cols}">${escapeReportHtml(message)}</td></tr>`;
    }

    function checkReportRows(checkId, report) {
      if (checkId === 'read') {
        return {
          title: 'Canvas Submission Reading',
          help: 'Shows which Canvas submissions were readable enough to include in the audit.',
          head: '<tr><th>Student</th><th>Readable Words</th><th>What to Check</th></tr>',
          body: tableOrEmpty((report.docs || []).map(doc => `
            <tr><td>${escapeReportHtml(doc.name)}</td><td>${doc.tokens}</td><td>Submission text was readable and included in the audit.</td></tr>
          `).join(''), 3, 'No readable submissions were available.'),
        };
      }
      if (checkId === 'similarity') {
        return {
          title: 'Canvas Submission Similarity',
          help: 'Review the listed student pairs and shared phrase examples. This does not determine misconduct.',
          head: '<tr><th>Student A</th><th>Student B</th><th>Similarity</th><th>What to Check</th><th>Shared Phrase Examples</th></tr>',
          body: tableOrEmpty(report.flags.map(flag => `
            <tr>
              <td>${escapeReportHtml(flag.aName)}</td>
              <td>${escapeReportHtml(flag.bName)}</td>
              <td>${Math.round(flag.similarity * 100)}%</td>
              <td>Compare the submissions side-by-side and decide whether the shared wording is expected, cited, collaborative, template-based, or concerning.</td>
              <td>${flag.samples.map(escapeReportHtml).join('<br>')}</td>
            </tr>
          `).join(''), 5, 'No student-to-student similarity flags were found.'),
        };
      }
      if (checkId === 'timing') {
        return {
          title: 'Canvas Timing Signals',
          help: 'Review Canvas timestamp clusters and repeated uploaded filenames. These can be normal, but they are useful places to look first.',
          head: '<tr><th>Signal</th><th>Students</th><th>What Canvas Showed</th><th>What to Check</th></tr>',
          body: tableOrEmpty((report.timingFlags || []).map(item => `
            <tr>
              <td>${escapeReportHtml(item.type === 'sameFilename' ? 'Repeated file name' : 'Submission time cluster')}</td>
              <td>${escapeReportHtml(item.names.join(', '))}</td>
              <td>${escapeReportHtml(item.filename || item.submittedAt || '')}<br>${escapeReportHtml(item.detail)}</td>
              <td>Open the listed Canvas submissions, compare the uploaded files or timestamps, and decide whether the pattern is expected, template-based, collaborative, or concerning.</td>
            </tr>
          `).join(''), 4, 'No Canvas timing or filename flags were found.'),
        };
      }
      if (checkId === 'quizBlur') {
        return {
          title: 'Quiz Tab-Switching',
          help: 'Students who left the quiz tab/window 3 or more times during their attempt. A small number of focus events can be accidental; frequent switching is a stronger signal.',
          head: '<tr><th>Student</th><th>Tab Switches</th><th>What to Check</th></tr>',
          body: tableOrEmpty((report.quizBlurFlags || []).map(item => `
            <tr>
              <td>${escapeReportHtml(item.name)}</td>
              <td style="font-weight:700">${escapeReportHtml(String(item.blurCount))}</td>
              <td>Ask the student what they were doing during the exam. Check if technical issues (screen reader, accessibility tools, notifications) could explain the switching. Apply course policy.</td>
            </tr>
          `).join(''), 3, 'No tab-switching flags found, or session logging was unavailable.'),
        };
      }
      if (checkId === 'quizSpeed') {
        return {
          title: 'Quiz Completion Speed',
          help: 'Students who completed the quiz in less than 25% of the allotted time and still scored above 65%. Indicates they may have had answers available before starting.',
          head: '<tr><th>Student</th><th>Time Used</th><th>% of Limit</th><th>Score</th><th>What to Check</th></tr>',
          body: tableOrEmpty((report.quizSpeedFlags || []).map(item => {
            const mins = Math.floor(item.timeSpent / 60);
            const secs = item.timeSpent % 60;
            return `<tr>
              <td>${escapeReportHtml(item.name)}</td>
              <td>${escapeReportHtml(`${mins}m ${secs}s`)}</td>
              <td style="font-weight:700">${escapeReportHtml(String(item.pct))}%</td>
              <td>${escapeReportHtml(String(item.score))} / ${escapeReportHtml(String(item.possible))} (${escapeReportHtml(String(item.scorePct))}%)</td>
              <td>Compare with other attempts, check if the student previously had access to the questions, and review whether the quiz allows retakes that could explain fast completion.</td>
            </tr>`;
          }).join(''), 5, 'No unusually fast high-scoring submissions found, or quiz has no time limit.'),
        };
      }
      if (checkId === 'quizAnswers') {
        return {
          title: 'Quiz Answer Matching',
          help: 'Student pairs who chose the same wrong answer on 2 or more questions. Matching wrong answers (not correct ones) is statistically unlikely by chance and a strong collusion signal.',
          head: '<tr><th>Student A</th><th>Student B</th><th>Matching Wrong Answers</th><th>What to Check</th></tr>',
          body: tableOrEmpty((report.quizAnswerPairs || []).map(item => `
            <tr>
              <td>${escapeReportHtml(item.aName)}</td>
              <td>${escapeReportHtml(item.bName)}</td>
              <td style="font-weight:700">${escapeReportHtml(String(item.matchCount))}</td>
              <td>Compare the full submissions side-by-side. Ask each student separately to explain their reasoning on the flagged questions. Apply course policy on collaboration.</td>
            </tr>
          `).join(''), 4, 'No matching wrong-answer patterns found, or answer data was unavailable.'),
        };
      }
      return {
        title: 'Audit Check',
        help: 'No details are available for this check.',
        head: '<tr><th>Status</th></tr>',
        body: '<tr><td>No details available.</td></tr>',
      };
    }

    function openCheckReport(checkId) {
      if (!lastReport) return;
      const report = lastReport;
      const item = (report.checks || checkState)[checkId] || checkState[checkId];
      const colors = checkColors(item?.status || 'pending');
      const detail = checkReportRows(checkId, report);
      const html = `<!doctype html><html><head><title>Audit - ${escapeReportHtml(detail.title)}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#1f2937;margin:32px;line-height:1.45}
          h1{font-size:22px;margin:0 0 6px}.muted{color:#6b7280;font-size:12px}
          .badge{display:inline-block;margin:18px 0;padding:8px 12px;border-radius:4px;font-weight:700;background:${colors.bg};color:${colors.color};border:1px solid ${colors.border}}
          table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
          th,td{border:1px solid #d1d5db;padding:8px;vertical-align:top;text-align:left}th{background:#f3f4f6}
          @media print{button{display:none}}
        </style></head><body>
        <button onclick="window.print()">Print / Save as PDF</button>
        <h1>Audit: ${escapeReportHtml(detail.title)}</h1>
        <div class="muted">${escapeReportHtml(report.assignmentName)} - ${new Date(report.createdAt).toLocaleString()}</div>
        <div class="badge">${escapeReportHtml(colors.label)}: ${escapeReportHtml(item?.detail || '')}</div>
        <p class="muted"><strong>Instructor review required:</strong> Canvas Enhancer does not decide whether a student cheated or violated a course policy. This check only flags Canvas conditions a teacher may choose to review with professional judgment.</p>
        <p>${escapeReportHtml(detail.help)}</p>
        <table><thead>${detail.head}</thead><tbody>${detail.body}</tbody></table>
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    }

    async function runCheck() {
      if (!token) throw new Error('Add a Canvas API token in Settings first.');
      if (!courseId || !assignmentId) throw new Error('Open SpeedGrader for an assignment first.');

      runBtn.disabled = true;
      runBtn.textContent = 'Checking...';
      status.textContent = 'Loading assignment and submissions...';
      results.innerHTML = '';
      updateCheck('read', 'running', 'Loading Canvas submissions and reading available text.');
      updateCheck('similarity', 'pending', 'Waiting for readable Canvas submissions.');
      updateCheck('timing', 'pending', 'Waiting for Canvas submission timestamps and uploaded files.');
      updateCheck('quizBlur', 'pending', 'Waiting to see if this assignment has quiz event data.');
      updateCheck('quizSpeed', 'pending', 'Waiting to see if this assignment has timed quiz data.');
      updateCheck('quizAnswers', 'pending', 'Waiting to see if this assignment has answer-level quiz data.');

      const assignment = await canvasFetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
      const quizId = assignment.data?.quiz_id;
      const submissions = await canvasFetchAll(`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions?include[]=user&include[]=attachments&per_page=100`);
      const submittedSubmissions = submissions.filter(s => s.workflow_state !== 'unsubmitted');
      const candidates = submittedSubmissions.filter(s => s.body || s.url || s.attachments?.length);
      const docs = [];

      for (let i = 0; i < candidates.length; i++) {
        const subm = candidates[i];
        const name = subm.user?.sortable_name || subm.user?.name || `Student ${subm.user_id}`;
        status.textContent = `Reading ${i + 1} of ${candidates.length}: ${name}`;
        const text = await submissionText(subm);
        const toks = tokensFor(text);
        if (toks.length >= 40) docs.push({ id: subm.user_id, name, text, shingles: shingles(toks), tokens: toks.length });
      }

      updateCheck('read', docs.length ? 'complete' : 'skipped', `Read ${docs.length} usable submissions from ${submittedSubmissions.length} Canvas submissions.`);
      updateCheck('similarity', docs.length >= 2 ? 'running' : 'skipped', docs.length >= 2 ? `Comparing ${docs.length} readable submissions.` : 'At least two readable submissions are needed for comparison.');
      status.textContent = `Comparing ${docs.length} readable submissions...`;
      const flags = [];
      for (let i = 0; i < docs.length; i++) {
        for (let j = i + 1; j < docs.length; j++) {
          const cmp = compareDocs(docs[i], docs[j]);
          if (cmp.similarity >= 0.22 || cmp.sharedCount >= 18) flags.push({ aName: docs[i].name, bName: docs[j].name, ...cmp });
        }
      }
      flags.sort((a, b) => b.similarity - a.similarity || b.sharedCount - a.sharedCount);
      updateCheck('similarity', flags.length ? 'flagged' : 'complete', flags.length ? `${flags.length} pair${flags.length === 1 ? '' : 's'} flagged for instructor review.` : 'No strong student-to-student similarity matches found.');

      updateCheck('timing', submittedSubmissions.length ? 'running' : 'skipped', submittedSubmissions.length ? 'Reviewing Canvas submission times and uploaded filenames.' : 'No Canvas submissions were available.');
      const timingFlags = runSubmissionTimingCheck(submittedSubmissions);
      updateCheck('timing', timingFlags.length ? 'flagged' : 'complete', timingFlags.length ? `${timingFlags.length} Canvas timing/file signal${timingFlags.length === 1 ? '' : 's'} flagged for review.` : 'No Canvas timing or filename flags found.');

      let quizBlurFlags = [], quizSpeedFlags = [], quizAnswerPairs = [];
      if (quizId) {
        try {
          updateCheck('quizBlur',    'running', 'Fetching session events for each quiz submission...');
          updateCheck('quizSpeed',   'running', 'Checking completion times against the time limit...');
          updateCheck('quizAnswers', 'running', 'Comparing wrong answers across all students...');
          status.textContent = 'Running quiz integrity checks...';

          const [quizInfo, quizSubs] = await Promise.all([
            canvasFetch(`/api/v1/courses/${courseId}/quizzes/${quizId}`),
            canvasFetchQuizSubmissions(courseId, quizId),
          ]);
          const timeLimitMinutes = quizInfo.data?.time_limit || 0;

          // Speed check
          quizSpeedFlags = runQuizSpeedCheck(quizSubs, timeLimitMinutes);
          updateCheck('quizSpeed',
            !timeLimitMinutes ? 'skipped' : quizSpeedFlags.length ? 'flagged' : 'complete',
            !timeLimitMinutes ? 'Quiz has no time limit — speed check skipped.' :
            quizSpeedFlags.length ? `${quizSpeedFlags.length} submission${quizSpeedFlags.length === 1 ? '' : 's'} completed unusually fast with a high score.` :
            'No unusually fast high-scoring submissions found.'
          );

          // Answer matching check
          const hasAnswerData = quizSubs.some(s => Array.isArray(s.submission_data) && s.submission_data.length);
          if (hasAnswerData) {
            quizAnswerPairs = runQuizAnswerCheck(quizSubs);
            updateCheck('quizAnswers',
              quizAnswerPairs.length ? 'flagged' : 'complete',
              quizAnswerPairs.length ? `${quizAnswerPairs.length} student pair${quizAnswerPairs.length === 1 ? '' : 's'} shared 2 or more identical wrong answers.` :
              'No matching wrong-answer patterns found.'
            );
          } else {
            updateCheck('quizAnswers', 'unavailable', 'Answer-level data is not available for this quiz type.');
          }

          // Tab-switching check (one API call per submission — runs last)
          const blurResult = await runQuizBlurCheck(courseId, quizId, quizSubs);
          if (blurResult.unavailable) {
            updateCheck('quizBlur', 'unavailable', 'Session event logging is not available for this quiz. It may need to be enabled in quiz settings.');
          } else {
            quizBlurFlags = blurResult.flags;
            updateCheck('quizBlur',
              quizBlurFlags.length ? 'flagged' : 'complete',
              quizBlurFlags.length ? `${quizBlurFlags.length} student${quizBlurFlags.length === 1 ? '' : 's'} left the quiz tab 3 or more times.` :
              'No students left the quiz tab 3 or more times.'
            );
          }
        } catch (e) {
          updateCheck('quizBlur',    'unavailable', `Quiz check error: ${e.message}`);
          updateCheck('quizSpeed',   'unavailable', `Quiz check error: ${e.message}`);
          updateCheck('quizAnswers', 'unavailable', `Quiz check error: ${e.message}`);
        }
      } else {
        updateCheck('quizBlur', 'skipped', 'This Canvas assignment is not linked to a quiz.');
        updateCheck('quizSpeed', 'skipped', 'This Canvas assignment is not linked to a timed quiz.');
        updateCheck('quizAnswers', 'skipped', 'This Canvas assignment is not linked to answer-level quiz data.');
      }

      const totalFlags = flags.length + timingFlags.length + quizBlurFlags.length + quizSpeedFlags.length + quizAnswerPairs.length;
      lastReport = {
        assignmentName: assignment.data?.name || `Assignment ${assignmentId}`,
        createdAt: Date.now(),
        checked: docs.length,
        total: submittedSubmissions.length,
        docs: docs.map(doc => ({ name: doc.name, tokens: doc.tokens })),
        flags,
        timingFlags,
        quizBlurFlags,
        quizSpeedFlags,
        quizAnswerPairs,
        checks: JSON.parse(JSON.stringify(checkState)),
      };
      setBadge(totalFlags);
      status.textContent = `Checked ${docs.length} readable submissions from ${submittedSubmissions.length} Canvas submissions.`;
      renderSummary(lastReport);
      renderChecks();
    }

    runBtn.addEventListener('click', async () => {
      try {
        await runCheck();
      } catch (e) {
        status.textContent = e.message;
        badge.textContent = 'Unable to complete check';
        badge.style.background = '#FEF2F2';
        badge.style.borderColor = '#FCA5A5';
        badge.style.color = '#991B1B';
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Run Audit';
      }
    });

    stack.appendChild(head);
    stack.appendChild(badge);
    stack.appendChild(disclaimer);
    renderChecks();
    stack.appendChild(checksBox);
    stack.appendChild(runBtn);
    stack.appendChild(status);
    stack.appendChild(results);
    panelBody.appendChild(stack);
  }

  async function renderNotes() {
    panelBody.innerHTML = '';
    const stored = await new Promise(r => chrome.storage.local.get(['ce_teacher_notes'], r));
    let notes = Array.isArray(stored.ce_teacher_notes) ? stored.ce_teacher_notes : [];
    let editingId = null;

    const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;min-height:100%;');

    const titleIn = input('ce-note-title', 'text', 'Note title', '');
    const bodyIn = el('textarea', `
      width:100%;box-sizing:border-box;min-height:100px;padding:8px 10px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;resize:vertical;
    `, { id: 'ce-note-body', placeholder: 'Write a note...' });
    titleIn.addEventListener('focus', () => titleIn.style.borderColor = DS.blue);
    titleIn.addEventListener('blur',  () => titleIn.style.borderColor = DS.border);
    bodyIn.addEventListener('focus', () => bodyIn.style.borderColor = DS.blue);
    bodyIn.addEventListener('blur',  () => bodyIn.style.borderColor = DS.border);

    const saveBtn = btn('Save Note', `background:${DS.blue};color:#fff;`);
    const cancelBtn = btn('Cancel Edit', `background:transparent;color:${DS.muted};border:1px solid ${DS.border};display:none;`);
    const msg = el('div', `font-size:12px;color:${DS.green};min-height:16px;text-align:center;`);
    const list = el('div', `display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:0;flex:1;`);

    function persist() {
      chrome.storage.local.set({ ce_teacher_notes: notes });
    }

    function resetForm() {
      editingId = null;
      titleIn.value = '';
      bodyIn.value = '';
      saveBtn.textContent = 'Save Note';
      cancelBtn.style.display = 'none';
    }

    function formatDate(ts) {
      try { return new Date(ts).toLocaleString(); } catch (_) { return ''; }
    }

    function renderList() {
      list.innerHTML = '';
      if (!notes.length) {
        const empty = el('div', `font-size:12px;color:${DS.muted};line-height:1.6;background:${DS.gray};border:1px solid ${DS.border};border-radius:4px;padding:10px;`);
        empty.textContent = 'No notes saved yet.';
        list.appendChild(empty);
        return;
      }
      const sorted = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      for (const note of sorted) {
        const card = el('div', `border:1px solid ${DS.border};border-radius:4px;background:${DS.white};padding:8px;display:flex;flex-direction:column;gap:6px;`);
        const top = el('div', `display:flex;align-items:flex-start;gap:8px;`);
        const text = el('div', 'flex:1;min-width:0;');
        const noteTitle = el('div', `font-size:13px;font-weight:700;color:${DS.text};word-break:break-word;`);
        noteTitle.textContent = note.title || 'Untitled note';
        const date = el('div', `font-size:10px;color:${DS.muted};margin-top:2px;`);
        date.textContent = `Updated ${formatDate(note.updatedAt)}`;
        const noteBody = el('div', `font-size:12px;color:${DS.text};line-height:1.55;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow:auto;background:${DS.gray};border:1px solid ${DS.border};border-radius:3px;padding:8px;`);
        noteBody.textContent = note.body || '';
        const actions = el('div', `display:flex;gap:6px;flex-shrink:0;`);
        const editBtn = el('button', `border:1px solid ${DS.blue};background:transparent;color:${DS.blue};border-radius:3px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:${DS.font};`, { type: 'button', textContent: 'Edit' });
        const delBtn = el('button', `border:1px solid #FCA5A5;background:#FEF2F2;color:#991B1B;border-radius:3px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:${DS.font};`, { type: 'button', textContent: 'Delete' });
        editBtn.addEventListener('click', () => {
          editingId = note.id;
          titleIn.value = note.title || '';
          bodyIn.value = note.body || '';
          saveBtn.textContent = 'Update Note';
          cancelBtn.style.display = 'block';
          msg.textContent = '';
          titleIn.focus();
        });
        delBtn.addEventListener('click', () => {
          if (!confirm('Delete this note?')) return;
          notes = notes.filter(n => n.id !== note.id);
          persist();
          if (editingId === note.id) resetForm();
          renderList();
        });
        text.appendChild(noteTitle);
        text.appendChild(date);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        top.appendChild(text);
        top.appendChild(actions);
        card.appendChild(top);
        if (note.body) card.appendChild(noteBody);
        list.appendChild(card);
      }
    }

    saveBtn.addEventListener('click', () => {
      const titleVal = titleIn.value.trim();
      const bodyVal = bodyIn.value.trim();
      if (!titleVal && !bodyVal) {
        msg.style.color = '#C0392B';
        msg.textContent = 'Write a title or note first.';
        return;
      }
      const now = Date.now();
      if (editingId) {
        notes = notes.map(n => n.id === editingId ? { ...n, title: titleVal, body: bodyVal, updatedAt: now } : n);
        msg.textContent = 'Note updated.';
      } else {
        notes = [{ id: `note_${now}_${Math.random().toString(16).slice(2)}`, title: titleVal, body: bodyVal, createdAt: now, updatedAt: now }, ...notes];
        msg.textContent = 'Note saved.';
      }
      msg.style.color = DS.green;
      persist();
      resetForm();
      renderList();
      setTimeout(() => { msg.textContent = ''; }, 2200);
    });

    cancelBtn.addEventListener('click', () => {
      resetForm();
      msg.textContent = '';
    });

    wrap.appendChild(row('Title', titleIn));
    wrap.appendChild(row('Note', bodyIn));
    wrap.appendChild(saveBtn);
    wrap.appendChild(cancelBtn);
    wrap.appendChild(msg);
    wrap.appendChild(divider());
    wrap.appendChild(list);
    panelBody.appendChild(wrap);
    renderList();
  }

  async function renderSnippets() {
    panelBody.innerHTML = '';
    const stored = await new Promise(r => chrome.storage.local.get(['ces_quick_messages'], r));
    let snippets = parseStoredSnippets(stored.ces_quick_messages);
    let editingId = null;
    let lastCanvasTextTarget = null;

    const wrap = el('div', 'display:flex;flex-direction:column;gap:8px;min-height:100%;');
    const intro = el('div', `font-size:12px;color:${DS.muted};line-height:1.45;`);
    intro.textContent = 'Save reusable text for Canvas messages, comments, and common replies. Message snippets can insert both the subject and body.';

    const titleIn = input('ce-snippet-title', 'text', 'Snippet name', '');
    const typeIn = el('select', `
      width:100%;box-sizing:border-box;padding:8px 10px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;
    `, { id: 'ce-snippet-type' });
    [
      ['message', 'Message'],
      ['comment', 'Comment'],
      ['other', 'Other'],
    ].forEach(([value, label]) => typeIn.appendChild(el('option', '', { value, textContent: label })));
    const subjectIn = input('ce-snippet-subject', 'text', 'Subject line', '');
    const bodyIn = el('textarea', `
      width:100%;box-sizing:border-box;min-height:120px;padding:8px 10px;
      border:1px solid ${DS.border};border-radius:3px;
      font-size:13px;font-family:${DS.font};color:${DS.text};
      background:${DS.white};outline:none;resize:vertical;
    `, { id: 'ce-snippet-body', placeholder: 'Write the message or comment text...' });

    [titleIn, typeIn, subjectIn, bodyIn].forEach(field => {
      field.addEventListener('focus', () => field.style.borderColor = DS.blue);
      field.addEventListener('blur',  () => field.style.borderColor = DS.border);
    });

    const formActions = el('div', 'display:flex;gap:8px;');
    const saveBtn = btn('Save Text', `background:${DS.blue};color:#fff;`);
    const cancelBtn = btn('Cancel Edit', `background:transparent;color:${DS.muted};border:1px solid ${DS.border};display:none;`);
    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    const msg = el('div', `font-size:12px;color:${DS.green};min-height:16px;text-align:center;`);
    const list = el('div', `display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:0;flex:1;`);

    function defaultSnippets() {
      const now = Date.now();
      return [
        {
          id: 'quick_missing_work_plan',
          title: 'Missing Work Check-In',
          category: 'message',
          subject: 'Missing work check-in',
          body: 'Hi {{studentName}},\n\nI noticed you have missing work in {{courseName}}. Please review Canvas and submit anything you can this week.\n\nIf something is getting in the way, reply here and let me know what is going on. We can make a plan.',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'quick_resubmit',
          title: 'Please Resubmit',
          category: 'message',
          subject: 'Please resubmit your assignment',
          body: 'Hi {{studentName}},\n\nThanks for turning in your work. I need you to resubmit this assignment because the file, link, or response was not complete.\n\nPlease open the assignment in Canvas, make the update, and submit it again.',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'quick_meet',
          title: 'Set Up a Quick Meeting',
          category: 'message',
          subject: 'Quick check-in',
          body: 'Hi {{studentName}},\n\nI would like to check in with you about your progress in {{courseName}}. Please reply with a time that works for you, or stop by during office hours.',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comment_strong_start',
          title: 'Strong Start',
          category: 'comment',
          subject: '',
          body: 'Strong start here. Your main idea is clear, and your next step is to add more specific evidence from the assignment directions.',
          createdAt: now,
          updatedAt: now,
        },
      ];
    }

    function parseStoredSnippets(value) {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.trim()) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
      return defaultSnippets();
    }

    function persist() {
      chrome.storage.local.set({
        ces_quick_messages: JSON.stringify(snippets),
        ces_quick_messages_version: '3',
      });
    }

    function resetForm() {
      editingId = null;
      titleIn.value = '';
      typeIn.value = 'message';
      subjectIn.value = '';
      bodyIn.value = '';
      saveBtn.textContent = 'Save Text';
      cancelBtn.style.display = 'none';
    }

    function setNativeValue(target, value) {
      const proto = target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(target, value);
      else target.value = value;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function composeSubjectInput() {
      return document.querySelector('input[name="subject"], input[aria-label*="Subject" i], input[placeholder*="Subject" i], .compose-message input[type="text"]');
    }

    function composeBodyInput() {
      return document.querySelector('textarea[name="body"], textarea[aria-label*="Message" i], textarea[placeholder*="Message" i], [contenteditable="true"][role="textbox"], [contenteditable="true"]');
    }

    function insertText(target, text) {
      if (!target || !text) return false;
      target.focus();
      if (target.isContentEditable) {
        const existing = target.innerText.trim();
        target.innerText = existing ? `${existing}\n\n${text}` : text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const existing = target.value.trim();
        setNativeValue(target, existing ? `${existing}\n\n${text}` : text);
      }
      return true;
    }

    function isReusableTextTarget(target) {
      return Boolean(
        target
        && !target.closest?.('#ce-hub, #ce-hub-panel')
        && target.matches?.('textarea, input[type="text"], input:not([type]), [contenteditable="true"], [role="textbox"]')
      );
    }

    function activeTextTarget() {
      const active = document.activeElement;
      if (isReusableTextTarget(active)) return active;
      if (isReusableTextTarget(lastCanvasTextTarget)) return lastCanvasTextTarget;
      const candidates = Array.from(document.querySelectorAll('textarea[placeholder*="comment" i], textarea[aria-label*="comment" i], [contenteditable="true"][role="textbox"], textarea, [contenteditable="true"]'));
      return candidates.find(isReusableTextTarget) || null;
    }

    function insertSnippet(snippet) {
      const category = snippet.category || snippet.type || 'message';
      let inserted = false;
      if (category === 'message') {
        const subject = composeSubjectInput();
        const body = composeBodyInput();
        if (subject && snippet.subject) {
          setNativeValue(subject, snippet.subject);
          inserted = true;
        }
        inserted = insertText(body, snippet.body || '') || inserted;
      } else {
        inserted = insertText(activeTextTarget(), snippet.body || '');
      }
      msg.style.color = inserted ? DS.green : '#C0392B';
      msg.textContent = inserted
        ? 'Inserted into Canvas.'
        : 'Click inside a Canvas compose box or comment box first.';
      setTimeout(() => { msg.textContent = ''; }, 2400);
    }

    function renderList() {
      list.innerHTML = '';
      if (!snippets.length) {
        const empty = el('div', `font-size:12px;color:${DS.muted};line-height:1.6;background:${DS.gray};border:1px solid ${DS.border};border-radius:4px;padding:10px;`);
        empty.textContent = 'No saved text yet.';
        list.appendChild(empty);
        return;
      }
      const sorted = [...snippets].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      for (const snippet of sorted) {
        const card = el('div', `border:1px solid ${DS.border};border-radius:4px;background:${DS.white};padding:8px;display:flex;flex-direction:column;gap:6px;`);
        const top = el('div', 'display:flex;align-items:flex-start;gap:8px;');
        const text = el('div', 'flex:1;min-width:0;');
        const title = el('div', `font-size:13px;font-weight:700;color:${DS.text};word-break:break-word;`);
        title.textContent = snippet.title || snippet.name || 'Untitled text';
        const meta = el('div', `font-size:10px;color:${DS.muted};margin-top:2px;text-transform:uppercase;letter-spacing:.02em;`);
        meta.textContent = snippet.category || snippet.type || 'message';
        const preview = el('div', `font-size:12px;color:${DS.text};line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:92px;overflow:auto;background:${DS.gray};border:1px solid ${DS.border};border-radius:3px;padding:7px;`);
        preview.textContent = snippet.body || '';
        const actions = el('div', 'display:flex;gap:6px;flex-shrink:0;');
        const insertBtn = el('button', `border:1px solid ${DS.blue};background:${DS.blue};color:#fff;border-radius:3px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:${DS.font};`, { type: 'button', textContent: 'Insert' });
        const editBtn = el('button', `border:1px solid ${DS.blue};background:transparent;color:${DS.blue};border-radius:3px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:${DS.font};`, { type: 'button', textContent: 'Edit' });
        const delBtn = el('button', `border:1px solid #FCA5A5;background:#FEF2F2;color:#991B1B;border-radius:3px;padding:5px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:${DS.font};`, { type: 'button', textContent: 'Delete' });
        insertBtn.addEventListener('click', () => insertSnippet(snippet));
        editBtn.addEventListener('click', () => {
          editingId = snippet.id;
          titleIn.value = snippet.title || snippet.name || '';
          typeIn.value = snippet.category || snippet.type || 'message';
          subjectIn.value = snippet.subject || '';
          bodyIn.value = snippet.body || '';
          saveBtn.textContent = 'Update Text';
          cancelBtn.style.display = 'block';
          msg.textContent = '';
          titleIn.focus();
        });
        delBtn.addEventListener('click', () => {
          if (!confirm('Delete this saved text?')) return;
          snippets = snippets.filter(s => s.id !== snippet.id);
          persist();
          if (editingId === snippet.id) resetForm();
          renderList();
        });
        text.appendChild(title);
        text.appendChild(meta);
        actions.appendChild(insertBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        top.appendChild(text);
        top.appendChild(actions);
        card.appendChild(top);
        if (snippet.subject) {
          const subject = el('div', `font-size:11px;color:${DS.muted};`);
          subject.textContent = `Subject: ${snippet.subject}`;
          card.appendChild(subject);
        }
        if (snippet.body) card.appendChild(preview);
        list.appendChild(card);
      }
    }

    saveBtn.addEventListener('click', () => {
      const titleVal = titleIn.value.trim();
      const categoryVal = typeIn.value || 'message';
      const subjectVal = subjectIn.value.trim();
      const bodyVal = bodyIn.value.trim();
      if (!titleVal && !bodyVal) {
        msg.style.color = '#C0392B';
        msg.textContent = 'Write a name or message first.';
        return;
      }
      const now = Date.now();
      const next = {
        id: editingId || `snippet_${now}_${Math.random().toString(16).slice(2)}`,
        title: titleVal || 'Untitled text',
        name: titleVal || 'Untitled text',
        category: categoryVal,
        subject: subjectVal,
        body: bodyVal,
        updatedAt: now,
      };
      if (editingId) {
        snippets = snippets.map(s => s.id === editingId ? { ...s, ...next } : s);
        msg.textContent = 'Text updated.';
      } else {
        snippets = [{ ...next, createdAt: now }, ...snippets];
        msg.textContent = 'Text saved.';
      }
      msg.style.color = DS.green;
      persist();
      resetForm();
      renderList();
      setTimeout(() => { msg.textContent = ''; }, 2200);
    });

    cancelBtn.addEventListener('click', () => {
      resetForm();
      msg.textContent = '';
    });

    const rememberTarget = event => {
      if (isReusableTextTarget(event.target)) lastCanvasTextTarget = event.target;
    };
    document.addEventListener('focusin', rememberTarget, true);
    _panelCleanup = () => document.removeEventListener('focusin', rememberTarget, true);

    wrap.appendChild(intro);
    wrap.appendChild(row('Name', titleIn));
    wrap.appendChild(row('Type', typeIn));
    wrap.appendChild(row('Subject', subjectIn, 'Used when inserting into a Canvas message compose window.'));
    wrap.appendChild(row('Body', bodyIn));
    wrap.appendChild(formActions);
    wrap.appendChild(msg);
    wrap.appendChild(divider());
    wrap.appendChild(list);
    panelBody.appendChild(wrap);
    resetForm();
    persist();
    renderList();
  }

  function onToolClick(tool) {
    if (tool.id === 'message') {
      document.dispatchEvent(new CustomEvent('ce-toggle-messages'));
      return;
    }
    if (tool.id === 'quiz') {
      document.dispatchEvent(new CustomEvent('ce-toggle-quiz'));
      return;
    }
    if (tool.noPanel) { openQuickAI(); return; }
    if (tool.id === 'scheduler') {
      document.dispatchEvent(new CustomEvent('ce-toggle-scheduler'));
      return;
    }
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
    if (_panelCleanup) { _panelCleanup(); _panelCleanup = null; }
    setActive(tool.id);
    panelTitle.textContent = tool.label;
    panelBody.innerHTML = '';

    switch (tool.id) {
      case 'ai-grader':  await renderAIGrader();                                                     break;
      case 'cheater':    await renderAudit();                                                         break;
      case 'reports':    await renderReports();                                                    break;
      case 'snippets':   await renderSnippets();                                                     break;
      case 'notes':      await renderNotes();                                                         break;
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
  function setBodyPadding(active) {
    const s = document.getElementById('ce-body-space');
    if (!s) return;
    if (!active) { s.textContent = ''; return; }
    s.textContent = SPEEDGRADER
      ? `#full_width_container { padding-right: ${TOOLBAR_W}px !important; box-sizing: border-box !important; }`
      : `body { padding-right: ${TOOLBAR_W}px !important; box-sizing: border-box !important; }`;
  }

  function applyToolbarState() {
    toolbar.style.transform = _expanded ? 'none' : `translateX(${TOOLBAR_W}px)`;
    tab.style.display = _expanded ? 'none' : 'flex';
    if (!_expanded) {
      closePanel();
      panel.style.right = '0';
    } else {
      panel.style.right = `${TOOLBAR_W}px`;
    }
    collapseBtn.textContent = _expanded ? '◀' : '▶';
    setBodyPadding(_expanded);
  }

  function toggleToolbar() {
    _expanded = !_expanded;
    applyToolbarState();
  }

  // ── FEATURES ───────────────────────────────────────────────────────────────
  function applyFeatures(features) {
    for (const tool of TOOLS) {
      if (tool.id === 'settings') continue;
      const b = btnMap[tool.id];
      if (!b) continue;
      const on = features[tool.id] !== false;
      b.style.display = on ? '' : 'none';
      if (!on && _active === tool.id) closePanel();
    }
  }

  // ── MOUNT ──────────────────────────────────────────────────────────────────
  function mount() {
    // Reserve 52 px on the right so Canvas content doesn't flow under the toolbar.
    // SpeedGrader renders its layout inside #full_width_container — padding-right
    // on that element shrinks available space for its children regardless of their
    // position value, while leaving #main / body untouched (avoids compounding).
    // Other Canvas pages are normal flow — body padding-right works.
    const ceStyle = document.createElement('style');
    ceStyle.id = 'ce-body-space';
    ceStyle.textContent = '';
    (document.head || document.documentElement).appendChild(ceStyle);

    document.body.appendChild(toolbar);
    document.body.appendChild(panel);
    document.body.appendChild(tab);
    applyToolbarState();
    updateQuizToolVisibility();
    chrome.storage.local.get('ce_features', ({ ce_features }) => {
      if (ce_features) applyFeatures(ce_features);
    });
  }

  document.addEventListener('ce-open-ai-grader', () => openPanel({ id: 'ai-grader', label: 'AI Grader' }));
  document.addEventListener('ce-page-changed', updateQuizToolVisibility);
  window.addEventListener('popstate', updateQuizToolVisibility);
  const origPushState = history.pushState;
  history.pushState = function () {
    const result = origPushState.apply(this, arguments);
    setTimeout(updateQuizToolVisibility, 100);
    return result;
  };

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
