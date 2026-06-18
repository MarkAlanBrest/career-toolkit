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

  const TOOLBAR_W  = 68;
  const TOOLBAR_H  = 56;
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
    // ── Course Design Toolbar ────────────────────────────────────────────────
    { _section: 'cd', label: 'Course Design' },
    { id: 'quick-ai',  group: 'cd', icon: '⚡', label: 'AI Chat',   noPanel: true, desc: 'Opens a floating AI window alongside Canvas. Ask questions, draft responses, or brainstorm — without leaving your course.' },
    { id: 'notes',     group: 'cd', icon: '📝', label: 'Notes',                   desc: 'Private teacher notes. Save, edit, and delete quick notes while working in Canvas.' },
    { id: 'designer',  group: 'cd', icon: '🎨', label: 'Designer',                desc: 'Build beautiful Canvas pages and assignments with a drag-and-drop editor. No HTML required.' },
    { id: 'quiz',      group: 'cd', icon: '✅', label: 'Quiz',      noPanel: true, desc: 'AI quiz builder. Generate multiple-choice, true/false, and short-answer questions from any topic or pasted content.' },
    { id: 'settings',  group: 'cd', icon: '⚙️', label: 'Settings' },
    // ── Teaching & Grading Toolbar ───────────────────────────────────────────
    { _section: 'tg', label: 'Teaching' },
    { id: 'ai-grader',    group: 'tg', icon: '🎓', label: 'Grader',        desc: 'AI-powered grading in SpeedGrader. Reads the rubric and student submission, then suggests a score and written feedback.' },
    { id: 'scheduler',    group: 'tg', icon: '📅', label: 'Scheduler',     desc: 'Drag-and-drop assignment scheduler. Set due dates and availability windows, then push them to Canvas in bulk.' },
    { id: 'message',      group: 'tg', icon: '✉️',  label: 'Message',      noPanel: true, desc: 'Automated student messaging. Send reminders, missing-work alerts, and progress updates directly via the Canvas inbox.' },
    { id: 'cheater',      group: 'tg', icon: '🔍', label: 'Audit',         desc: 'Canvas-based audit. Flags submission, quiz, timing, and answer-pattern conditions for teacher review.' },
    { id: 'eval',         group: 'tg', icon: '🩺', label: 'Vitals',        desc: 'Data-driven course health dashboard. Scores the course across 6 categories: assignment structure, student engagement, grading efficiency, communication, course quality, and student performance.' },
    { id: 'settings-tg',  group: 'tg', icon: '⚙️', label: 'Settings' },
  ];

  const GROUP_BG = {
    cd: 'rgba(100,160,230,0.11)',
    tg: 'rgba(60,190,120,0.11)',
  };

  let _active      = null;          // tool id with open panel
  let _expanded    = !SPEEDGRADER;  // SpeedGrader starts minimized
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
    position:relative;width:100%;height:${TOOLBAR_H}px;
    z-index:10;
    background:${DS.navBg};
    border-bottom:1px solid ${DS.navActive};
    box-shadow:0 2px 8px rgba(0,0,0,.22);
    display:flex;flex-direction:row;align-items:stretch;
    font-family:${DS.font};
    transition:transform .2s ease;
  `);
  toolbar.id = 'ce-hub';


  // Nav
  const nav = el('div', `
    flex:1;height:100%;min-width:0;
    display:flex;flex-direction:row;align-items:stretch;
    padding:0 8px;gap:0;overflow-x:auto;overflow-y:hidden;
    justify-content:center;
  `);

  const btnMap     = {};
  const btnGroupBg = {};
  let _currentSectionWrap = nav;

  for (const tool of TOOLS) {
    // Section header — creates a collapsible group
    if (tool._section) {
      const sectionOpen = { value: true };
      const sectionWrap = el('div', `height:100%;display:flex;flex-direction:row;align-items:stretch;`);

      const hdr = el('button', `
        width:auto;min-width:84px;height:100%;flex-shrink:0;
        border:none;border-right:1px solid rgba(255,255,255,0.15);
        background:transparent;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:6px;
        padding:0 10px;box-sizing:border-box;
        font-family:${DS.font};
      `, { type: 'button' });
      const hdrLabel = el('span', `font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:rgba(255,255,255,0.45);font-weight:700;`);
      hdrLabel.textContent = tool.label;
      const hdrArrow = el('span', `font-size:10px;color:rgba(255,255,255,0.45);transition:transform .2s;`);
      hdrArrow.textContent = '▾';
      hdr.appendChild(hdrLabel);
      hdr.appendChild(hdrArrow);

      hdr.addEventListener('click', () => {
        sectionOpen.value = !sectionOpen.value;
        sectionWrap.style.display = sectionOpen.value ? '' : 'none';
        hdrArrow.textContent = sectionOpen.value ? '▾' : '▸';
      });

      nav.appendChild(hdr);
      nav.appendChild(sectionWrap);
      _currentSectionWrap = sectionWrap;
      continue;
    }

    const groupBg = GROUP_BG[tool.group] || 'transparent';
    btnGroupBg[tool.id] = groupBg;

    const btn = el('button', `
      height:100%;padding:0 18px;flex-shrink:0;
      border:none;border-bottom:3px solid transparent;
      background:transparent;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      font-family:${DS.font};transition:background .12s;
      box-sizing:border-box;position:relative;
    `, { type: 'button', title: tool.label });

    const label = el('span', `display:block;text-align:center;font-size:11px;color:rgba(255,255,255,0.8);letter-spacing:.3px;text-transform:uppercase;font-weight:700;pointer-events:none;`);
    label.textContent = tool.label;
    btn.appendChild(label);

    btn.addEventListener('mouseenter', () => {
      if (_active !== tool.id) btn.style.background = 'rgba(255,255,255,0.12)';
    });
    btn.addEventListener('mouseleave', () => {
      if (_active !== tool.id) btn.style.background = 'transparent';
    });
    btn.addEventListener('click', () => onToolClick(tool));

    btnMap[tool.id] = btn;
    _currentSectionWrap.appendChild(btn);
  }
  toolbar.appendChild(nav);

  // Collapse button
  const collapseBtn = el('button', `
    width:54px;height:100%;flex-shrink:0;
    border:none;border-left:1px solid rgba(255,255,255,0.15);
    background:transparent;cursor:pointer;
    font-size:14px;color:rgba(255,255,255,0.65);
    font-family:${DS.font};
    display:flex;align-items:center;justify-content:center;
    transition:background .12s,color .12s;
  `, { type: 'button', title: 'Collapse toolbar', textContent: '◀' });
  collapseBtn.addEventListener('mouseenter', () => { collapseBtn.style.background = 'rgba(255,255,255,0.12)'; collapseBtn.style.color = '#fff'; });
  collapseBtn.addEventListener('mouseleave', () => { collapseBtn.style.background = 'transparent'; collapseBtn.style.color = 'rgba(255,255,255,0.65)'; });
  collapseBtn.addEventListener('click', toggleToolbar);
  toolbar.appendChild(collapseBtn);

  // ── COLLAPSED TAB ──────────────────────────────────────────────────────────
  const tab = el('button', `
    position:relative;margin-left:auto;
    z-index:10;
    width:118px;height:26px;
    border:1px solid ${DS.navActive};border-top:none;
    border-radius:0 0 4px 4px;
    background:${DS.navBg};
    box-shadow:0 2px 8px rgba(0,0,0,.22);
    cursor:pointer;display:none;
    align-items:center;justify-content:center;
    font-size:11px;color:#fff;font-weight:700;
    font-family:${DS.font};
  `, { type: 'button', title: 'Open Canvas Enhancer', textContent: 'Canvas Enhancer' });
  tab.addEventListener('click', toggleToolbar);

  // ── PANEL ──────────────────────────────────────────────────────────────────
  const panel = el('div', `
    position:fixed;top:${TOOLBAR_H}px;bottom:0;right:0;
    width:32vw;min-width:460px;max-width:600px;
    z-index:2147483639;
    background:${DS.white};
    border-left:1px solid ${DS.border};border-top:1px solid ${DS.border};border-radius:0;
    box-shadow:-4px 4px 16px rgba(0,0,0,.10);
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

  function renderComingSoon(icon, title, desc) {
    panelBody.innerHTML = '';
    const wrap = el('div', 'text-align:center;padding:48px 20px;display:flex;flex-direction:column;align-items:center;gap:12px;');
    const iEl = el('div', 'font-size:44px;');
    iEl.textContent = icon;
    const tEl = el('div', `font-size:15px;font-weight:700;color:${DS.text};`);
    tEl.textContent = title;
    const badge = el('div', `display:inline-block;background:${DS.blueBg};color:${DS.blue};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:3px 10px;border-radius:20px;`);
    badge.textContent = 'Coming Soon';
    const dEl = el('div', `font-size:12px;color:${DS.muted};line-height:1.6;max-width:240px;`);
    dEl.textContent = desc;
    wrap.appendChild(iEl); wrap.appendChild(tEl); wrap.appendChild(badge); wrap.appendChild(dEl);
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

  // ── AI GRADER ──────────────────────────────────────────────────────────────
  async function renderAIGrader() {
    panelBody.innerHTML = '';

    const stored = await new Promise(r =>
      chrome.storage.local.get(['ce_canvas_token', 'ce_claude_context', 'ce_criteria'], r)
    );
    let ctx         = stored.ce_claude_context || null;
    let allCriteria = stored.ce_criteria       || {};
    let criteriaEditing = false;
    const tok = stored.ce_canvas_token;
    let content;
    let _critCourseId     = String(ctx?.courseId     || '');
    let _critAssignmentId = String(ctx?.assignmentId || '');

    if (!/speed_grader/.test(window.location.href)) {
      panelBody.style.padding = '0';
      panelBody.style.overflow = 'hidden';

      const origin = window.location.origin;
      function apiCall(path) {
        if (!tok) return Promise.resolve(null);
        return new Promise(r => chrome.runtime.sendMessage({
          type: 'CANVAS_API', payload: { url: origin + path, token: tok },
        }, r));
      }

      const outer = el('div', `display:flex;flex-direction:column;height:100%;`);
      panelBody.appendChild(outer);

      // ── TAB BAR ──────────────────────────────────────────────────────────────
      const tabBar = el('div', `display:flex;flex-shrink:0;border-bottom:1px solid ${DS.border};background:${DS.white};`);
      outer.appendChild(tabBar);

      // ── PANES ─────────────────────────────────────────────────────────────────
      const needsGradingPane = el('div', `flex:1;overflow-y:auto;display:flex;flex-direction:column;`);
      const criteriaPane = el('div', `flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:8px;padding:16px;`);
      criteriaPane.style.display = 'none';

      const tabContent = el('div', `flex:1;min-height:0;overflow:hidden;`);
      tabContent.appendChild(needsGradingPane);
      tabContent.appendChild(criteriaPane);
      outer.appendChild(tabContent);

      const tabBtns = {};

      function switchTab(id) {
        needsGradingPane.style.display = id === 'needs-grading' ? 'flex' : 'none';
        criteriaPane.style.display     = id === 'criteria'      ? 'flex' : 'none';
        for (const [tid, tb] of Object.entries(tabBtns)) {
          const on = tid === id;
          tb.style.color             = on ? DS.blue : DS.muted;
          tb.style.borderBottomColor = on ? DS.blue : 'transparent';
          tb.style.fontWeight        = on ? '700'   : '500';
        }
        if (id === 'criteria' && !criteriaPane._built) {
          criteriaPane._built = true;

          // ── ASSIGNMENT SELECTOR HEADER ──────────────────────────────────
          const selHdr = el('div', `flex-shrink:0;padding-bottom:12px;border-bottom:1px solid ${DS.border};display:flex;flex-direction:column;gap:8px;`);
          criteriaPane.appendChild(selHdr);

          const selLabel = el('div', `font-size:10px;font-weight:700;color:${DS.muted};text-transform:uppercase;letter-spacing:.5px;`);
          selLabel.textContent = 'Viewing criteria for';
          selHdr.appendChild(selLabel);

          const checkRow = el('div', `display:flex;gap:14px;flex-wrap:wrap;`);
          selHdr.appendChild(checkRow);
          function mkCb(labelText) {
            const lbl = el('label', `display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:${DS.muted};user-select:none;`);
            const box = document.createElement('input');
            box.type = 'checkbox'; box.checked = true;
            box.style.cssText = 'margin:0;cursor:pointer;';
            const txt = document.createElement('span');
            txt.textContent = labelText;
            lbl.appendChild(box); lbl.appendChild(txt);
            checkRow.appendChild(lbl);
            return box;
          }
          const cbPublished = mkCb('Published only');
          const cbDashboard = mkCb('Dashboard only');

          const selRow = el('div', `display:flex;gap:6px;`);
          selHdr.appendChild(selRow);

          const courseSel = el('select', `flex:1;min-width:0;padding:6px 8px;border:1px solid ${DS.border};border-radius:3px;font-size:11px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
          const assignSel = el('select', `flex:1;min-width:0;padding:6px 8px;border:1px solid ${DS.border};border-radius:3px;font-size:11px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);

          const cpOpt = document.createElement('option');
          cpOpt.value = ''; cpOpt.textContent = 'Loading courses…'; cpOpt.disabled = true; cpOpt.selected = true;
          courseSel.appendChild(cpOpt);
          const apOpt = document.createElement('option');
          apOpt.value = ''; apOpt.textContent = '— pick assignment —';
          assignSel.appendChild(apOpt);
          selRow.appendChild(courseSel);
          selRow.appendChild(assignSel);

          const statusEl = el('div', `font-size:11px;min-height:14px;font-style:italic;`);
          selHdr.appendChild(statusEl);

          // ── SCROLLABLE CRITERIA AREA ────────────────────────────────────
          const criteriaContent = el('div', `flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:8px;padding-top:12px;`);
          criteriaPane.appendChild(criteriaContent);
          content = criteriaContent;

          const _courseNames = {};
          const _assignNames = {};
          let _allCourses   = [];
          let _dashboardIds = new Set();

          function renderCourseOptions() {
            const prev = courseSel.value || _critCourseId;
            courseSel.innerHTML = '';
            const ph = document.createElement('option');
            ph.value = ''; ph.textContent = '— select course —';
            courseSel.appendChild(ph);
            for (const c of _allCourses) {
              if (cbPublished.checked && c.workflow_state !== 'available') continue;
              if (cbDashboard.checked && !_dashboardIds.has(String(c.id))) continue;
              const o = document.createElement('option');
              o.value = String(c.id); o.textContent = _courseNames[String(c.id)];
              if (String(c.id) === prev) o.selected = true;
              courseSel.appendChild(o);
            }
            if (courseSel.value !== prev) {
              _critCourseId = '';
              _critAssignmentId = '';
              assignSel.innerHTML = '';
              const aph = document.createElement('option');
              aph.value = ''; aph.textContent = '— pick assignment —';
              assignSel.appendChild(aph);
              criteriaContent.innerHTML = '';
              updateStatus();
            }
          }

          cbPublished.addEventListener('change', renderCourseOptions);
          cbDashboard.addEventListener('change', renderCourseOptions);

          function updateStatus() {
            if (_critCourseId && _critAssignmentId) {
              statusEl.textContent = (_assignNames[_critAssignmentId] || 'Unknown assignment') + ' — ' + (_courseNames[_critCourseId] || 'Unknown course');
              statusEl.style.color = DS.text;
            } else if (_critCourseId) {
              statusEl.textContent = 'Select an assignment above';
              statusEl.style.color = DS.muted;
            } else {
              statusEl.textContent = 'Select a course and assignment above';
              statusEl.style.color = DS.muted;
            }
          }

          async function loadAssignments(courseId) {
            assignSel.innerHTML = '';
            const loadOpt = document.createElement('option');
            loadOpt.value = ''; loadOpt.textContent = 'Loading…'; loadOpt.disabled = true; loadOpt.selected = true;
            assignSel.appendChild(loadOpt);

            const data = await apiCall(`/api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`);
            assignSel.innerHTML = '';
            const ph = document.createElement('option');
            ph.value = ''; ph.textContent = '— pick assignment —';
            assignSel.appendChild(ph);
            for (const a of (data || [])) {
              _assignNames[String(a.id)] = a.name;
              const o = document.createElement('option');
              o.value = String(a.id); o.textContent = a.name;
              if (String(a.id) === _critAssignmentId) o.selected = true;
              assignSel.appendChild(o);
            }
            criteriaContent.innerHTML = '';
            if (_critAssignmentId && assignSel.value === _critAssignmentId) {
              criteriaEditing = false;
              updateStatus();
              buildCriteriaSection();
            } else {
              updateStatus();
            }
          }

          courseSel.addEventListener('change', () => {
            _critCourseId = courseSel.value;
            _critAssignmentId = '';
            criteriaContent.innerHTML = '';
            updateStatus();
            loadAssignments(_critCourseId);
          });

          assignSel.addEventListener('change', () => {
            _critAssignmentId = assignSel.value;
            criteriaEditing = false;
            criteriaContent.innerHTML = '';
            updateStatus();
            if (_critAssignmentId) buildCriteriaSection();
          });

          // ── INITIAL LOAD ────────────────────────────────────────────────
          (async () => {
            const [courses, dashCards] = await Promise.all([
              apiCall('/api/v1/courses?enrollment_type=teacher&per_page=100'),
              apiCall('/api/v1/dashboard/dashboard_cards'),
            ]);
            _allCourses   = courses || [];
            _dashboardIds = new Set((dashCards || []).map(d => String(d.id)));
            for (const c of _allCourses) _courseNames[String(c.id)] = c.course_code || c.name;
            renderCourseOptions();
            if (_critCourseId && courseSel.value === _critCourseId) {
              await loadAssignments(_critCourseId);
            } else {
              updateStatus();
            }
          })();
        }
      }

      for (const [id, label] of [['needs-grading', 'Needs Grading'], ['criteria', 'Criteria']]) {
        const tb = el('button', `
          flex:1;padding:10px 6px;font-size:12px;border:none;
          border-bottom:2px solid transparent;margin-bottom:-1px;
          background:transparent;cursor:pointer;color:${DS.muted};font-weight:500;
          font-family:${DS.font};transition:all .15s;
        `, { type: 'button' });
        tb.textContent = label;
        tb.addEventListener('click', () => switchTab(id));
        tabBtns[id] = tb;
        tabBar.appendChild(tb);
      }

      // ── NEEDS GRADING ─────────────────────────────────────────────────────────
      const hdr = el('div', `padding:12px 16px;border-bottom:1px solid ${DS.border};flex-shrink:0;`);
      const hdrTitle = el('div', `font-size:13px;font-weight:700;color:${DS.text};`);
      hdrTitle.textContent = 'Needs Grading';
      const hdrSub = el('div', `font-size:11px;color:${DS.muted};margin-top:2px;`);
      hdrSub.textContent = 'All submitted, ungraded work across your courses.';
      hdr.appendChild(hdrTitle); hdr.appendChild(hdrSub);
      needsGradingPane.appendChild(hdr);

      const list = el('div', `flex:1;overflow-y:auto;`);
      needsGradingPane.appendChild(list);

      function listMsg(text, color) {
        list.innerHTML = '';
        const m = el('div', `padding:40px 16px;text-align:center;font-size:12px;color:${color || DS.muted};line-height:1.6;`);
        m.textContent = text;
        list.appendChild(m);
      }

      listMsg('Loading…');

      if (!tok) {
        listMsg('Add your Canvas API token in Settings first.');
      } else {
        try {
          const [todoItems, courses] = await Promise.all([
            apiCall('/api/v1/users/self/todo?per_page=100'),
            apiCall('/api/v1/courses?enrollment_type=teacher&workflow_state=available&per_page=100'),
          ]);

          const courseNames = {};
          for (const c of (courses || [])) courseNames[c.id] = c.course_code || c.name;

          const pending = (todoItems || [])
            .filter(item => item.type === 'grading' && item.assignment)
            .sort((a, b) => {
              const da = a.assignment.due_at ? new Date(a.assignment.due_at) : new Date('9999-01-01');
              const db = b.assignment.due_at ? new Date(b.assignment.due_at) : new Date('9999-01-01');
              return da - db;
            });

          list.innerHTML = '';

          if (!pending.length) {
            listMsg('✅  All caught up — nothing left to grade.');
          } else {
            const countBadge = el('span', `
              display:inline-block;margin-left:8px;
              background:#FEF3C7;color:#92400E;
              font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;vertical-align:middle;
            `);
            countBadge.textContent = pending.length + ' assignment' + (pending.length !== 1 ? 's' : '');
            hdrTitle.appendChild(countBadge);

            for (const item of pending) {
              const a = item.assignment;
              const cid = a.course_id;
              const sgUrl = `${origin}/courses/${cid}/gradebook/speed_grader?assignment_id=${a.id}`;

              const row = document.createElement('a');
              row.href = sgUrl;
              row.style.cssText = `
                display:flex;align-items:center;justify-content:space-between;gap:10px;
                padding:10px 16px;text-decoration:none;
                border-bottom:1px solid ${DS.border};transition:background .12s;
              `;

              const left = el('div', `min-width:0;flex:1;`);

              const courseLbl = el('div', `font-size:10px;color:${DS.muted};text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
              courseLbl.textContent = courseNames[cid] || 'Course ' + cid;

              const name = el('div', `font-size:12px;font-weight:600;color:${DS.blue};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
              name.textContent = a.name;

              const due = el('div', `font-size:11px;color:${DS.muted};margin-top:2px;`);
              due.textContent = a.due_at
                ? 'Due ' + new Date(a.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'No due date';

              left.appendChild(courseLbl); left.appendChild(name); left.appendChild(due);

              const badge = el('div', `
                flex-shrink:0;background:#FEF3C7;color:#92400E;
                font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;
              `);
              const count = item.needs_grading_count ?? a.needs_grading_count ?? '?';
              badge.textContent = count + ' to grade';

              row.appendChild(left); row.appendChild(badge);
              row.addEventListener('mouseenter', () => row.style.background = DS.gray);
              row.addEventListener('mouseleave', () => row.style.background = '');
              list.appendChild(row);
            }
          }
        } catch (e) {
          listMsg('Error: ' + e.message, '#991B1B');
        }
      }

      // ── CRITERIA STORAGE LISTENER (keeps criteria tab fresh if saved in SG) ──
      const ngListener = changes => {
        if (changes.ce_criteria) {
          allCriteria = changes.ce_criteria.newValue || {};
          if (criteriaPane._built && _critAssignmentId) buildCriteriaSection();
        }
      };
      chrome.storage.onChanged.addListener(ngListener);
      _panelCleanup = () => {
        panelBody.style.padding = '';
        panelBody.style.overflow = '';
        chrome.storage.onChanged.removeListener(ngListener);
      };

      switchTab('needs-grading');
      return;
    }

    function speedGraderUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const courseId = window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
      const assignmentId = params.get('assignment_id') || '';
      return { courseId, assignmentId };
    }

    function criteriaKey() {
      if (SPEEDGRADER) {
        const { courseId, assignmentId } = speedGraderUrlParts();
        return courseId && assignmentId ? `${courseId}_${assignmentId}` : null;
      }
      return _critCourseId && _critAssignmentId
        ? `${_critCourseId}_${_critAssignmentId}` : null;
    }
    function savedCriteria() { const k = criteriaKey(); return k ? (allCriteria[k] || '') : ''; }

    // ── HINT ──────────────────────────────────────────────────────────────────
    const hint = el('div', `font-size:12px;color:${DS.muted};text-align:center;flex-shrink:0;padding:2px 0 6px;`);
    hint.textContent = 'Set grading criteria below. Use the ✦ AI Grade button in SpeedGrader.';

    // ── CRITERIA CONTENT ──────────────────────────────────────────────────────
    content = el('div', `flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;overflow:hidden;`);

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
      const rPts = row('Total Points', pointsIn); rPts.style.flex = '0 0 84px';

      const strictSel = el('select', `width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid ${DS.border};border-radius:3px;font-size:13px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
      for (const [v, l] of [['lenient','Lenient — be generous with partial credit'],['balanced','Balanced — grade fairly against the rubric'],['strict','Strict — hold students to high standards']]) {
        const o = document.createElement('option'); o.value = v; o.textContent = l; if (v === exStyle) o.selected = true; strictSel.appendChild(o);
      }
      const rHarsh = row('How Harsh to Grade', strictSel); rHarsh.style.flex = '1'; rHarsh.style.minWidth = '0';

      const toneSel = el('select', `width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid ${DS.border};border-radius:3px;font-size:13px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
      for (const [v, l] of [['encouraging','Encouraging — warm and supportive'],['neutral','Neutral — objective and professional'],['direct','Direct — concise, focus on improvements']]) {
        const o = document.createElement('option'); o.value = v; o.textContent = l; if (v === exTone) o.selected = true; toneSel.appendChild(o);
      }
      const rTone = row('Type of Comments', toneSel); rTone.style.flex = '1'; rTone.style.minWidth = '0';

      const topRow = el('div', 'display:flex;gap:8px;align-items:flex-start;');
      topRow.appendChild(rPts); topRow.appendChild(rHarsh); topRow.appendChild(rTone);
      form.appendChild(topRow);

      const rubricTa = el('textarea', `width:100%;box-sizing:border-box;padding:8px 10px;height:100px;border:none;border-radius:0;font-size:12px;font-family:${DS.font};color:${DS.text};resize:vertical;outline:none;background:${DS.white};`);
      rubricTa.placeholder = 'e.g. Thesis 20pts, Evidence 30pts, Writing 25pts, Analysis 25pts';
      rubricTa.value = exRubric;

      const keyTa = el('textarea', `width:100%;box-sizing:border-box;padding:8px 10px;height:100px;border:none;border-radius:0;font-size:12px;font-family:${DS.font};color:${DS.text};resize:vertical;outline:none;background:${DS.white};`);
      keyTa.placeholder = 'Optional — correct answers or model response';
      keyTa.value = exKey;

      const instrTa = el('textarea', `width:100%;box-sizing:border-box;padding:8px 10px;height:100px;border:none;border-radius:0;font-size:12px;font-family:${DS.font};color:${DS.text};resize:vertical;outline:none;background:${DS.white};`);
      instrTa.placeholder = 'Optional — any special grading notes';
      instrTa.value = exInstr;

      const tabFolder = el('div', `border:1px solid ${DS.border};border-radius:3px;overflow:hidden;flex-shrink:0;`);
      const tabBar2 = el('div', `display:flex;background:${DS.gray};border-bottom:1px solid ${DS.border};`);
      const tabPanes = { rubric: rubricTa, key: keyTa, instr: instrTa };
      const tabDefs = [['rubric','Rubric'],['key','Answer Key'],['instr','Instructions']];
      const tabBtns2 = {};
      let activeTab2 = 'rubric';

      function switchTab2(id) {
        activeTab2 = id;
        for (const [tid, tb] of Object.entries(tabBtns2)) {
          const on = tid === id;
          tb.style.background    = on ? DS.white : 'transparent';
          tb.style.color         = on ? DS.blue  : DS.muted;
          tb.style.fontWeight    = on ? '700'    : '500';
          tb.style.borderBottom  = on ? `2px solid ${DS.blue}` : '2px solid transparent';
        }
        for (const [tid, pane] of Object.entries(tabPanes)) {
          pane.style.display = tid === id ? 'block' : 'none';
        }
      }

      for (const [id, label] of tabDefs) {
        const tb = el('button', `
          flex:1;padding:7px 4px;font-size:11px;border:none;border-bottom:2px solid transparent;
          background:transparent;cursor:pointer;color:${DS.muted};font-weight:500;
          font-family:${DS.font};transition:all .12s;
        `, { type: 'button', textContent: label });
        tb.addEventListener('click', () => switchTab2(id));
        tabBtns2[id] = tb;
        tabBar2.appendChild(tb);
      }

      tabFolder.appendChild(tabBar2);
      for (const pane of Object.values(tabPanes)) {
        pane.style.display = 'none';
        tabFolder.appendChild(pane);
      }
      switchTab2('rubric');
      form.appendChild(tabFolder);

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
  async function renderAudit(container = panelBody) {
    container.innerHTML = '';

    container.style.padding = '0';
    container.style.overflow = 'hidden';

    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token', 'ce_audit_prefs'], r));
    const token = stored.ce_canvas_token || '';
    const savedAuditPrefs = stored.ce_audit_prefs || {};

    const urlCourseId = window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
    const urlAssignmentId = SPEEDGRADER ? (new URLSearchParams(window.location.search).get('assignment_id') || '') : '';
    let courseId = urlCourseId || savedAuditPrefs.courseId || '';
    let assignmentId = urlAssignmentId || savedAuditPrefs.assignmentId || '';
    let lastReport = null;

    const outer = el('div', 'display:flex;flex-direction:column;height:100%;');
    container.appendChild(outer);

    // ── PICKER HEADER ───────────────────────────────────────────────────────
    const pickerHdr = el('div', `flex-shrink:0;padding:8px 10px;background:${DS.gray};border-bottom:1px solid ${DS.border};display:flex;flex-direction:column;gap:6px;`);
    outer.appendChild(pickerHdr);

    const auditFilterRow = el('div', `display:flex;align-items:center;gap:14px;`);
    const auditFilterLabel = el('div', `font-size:10px;font-weight:700;color:${DS.muted};text-transform:uppercase;letter-spacing:.04em;flex:1;`);
    auditFilterLabel.textContent = 'Assignment';
    auditFilterRow.appendChild(auditFilterLabel);
    function mkAuditCb(labelText, defaultVal) {
      const lbl = el('label', `display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:${DS.muted};user-select:none;`);
      const box = document.createElement('input');
      box.type = 'checkbox'; box.checked = defaultVal;
      box.style.cssText = 'margin:0;cursor:pointer;';
      const txt = document.createElement('span'); txt.textContent = labelText;
      lbl.appendChild(box); lbl.appendChild(txt);
      auditFilterRow.appendChild(lbl);
      return box;
    }
    const cbPublishedAudit = mkAuditCb('Published only', savedAuditPrefs.publishedOnly !== false);
    const cbDashboardAudit = mkAuditCb('Dashboard only', savedAuditPrefs.dashOnly !== false);
    pickerHdr.appendChild(auditFilterRow);

    const auditSelRow = el('div', `display:flex;gap:6px;`);
    const auditCourseSel = el('select', `flex:1;min-width:0;padding:6px 8px;border:1px solid ${DS.border};border-radius:3px;font-size:11px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
    const auditAssignSel = el('select', `flex:1;min-width:0;padding:6px 8px;border:1px solid ${DS.border};border-radius:3px;font-size:11px;font-family:${DS.font};color:${DS.text};background:${DS.white};outline:none;cursor:pointer;`);
    const auditCourseLoadOpt = document.createElement('option');
    auditCourseLoadOpt.value = ''; auditCourseLoadOpt.textContent = 'Loading courses…'; auditCourseLoadOpt.disabled = true; auditCourseLoadOpt.selected = true;
    auditCourseSel.appendChild(auditCourseLoadOpt);
    const auditAssignPlaceholderOpt = document.createElement('option');
    auditAssignPlaceholderOpt.value = ''; auditAssignPlaceholderOpt.textContent = '— pick assignment —';
    auditAssignSel.appendChild(auditAssignPlaceholderOpt);
    auditAssignSel.disabled = true;
    auditSelRow.appendChild(auditCourseSel);
    auditSelRow.appendChild(auditAssignSel);
    pickerHdr.appendChild(auditSelRow);

    const auditPickerStatus = el('div', `font-size:11px;min-height:14px;font-style:italic;color:${DS.muted};`);
    pickerHdr.appendChild(auditPickerStatus);

    function updateAuditPickerStatus() {
      if (courseId && assignmentId) {
        const aText = auditAssignSel.options[auditAssignSel.selectedIndex]?.text || '';
        const cText = auditCourseSel.options[auditCourseSel.selectedIndex]?.text || '';
        auditPickerStatus.textContent = (aText && cText) ? `${aText} — ${cText}` : 'Assignment selected.';
        auditPickerStatus.style.color = DS.text;
      } else if (courseId) {
        auditPickerStatus.textContent = 'Select an assignment above.';
        auditPickerStatus.style.color = DS.muted;
      } else {
        auditPickerStatus.textContent = 'Select a course and assignment above.';
        auditPickerStatus.style.color = DS.muted;
      }
    }

    // ── SCROLL AREA ─────────────────────────────────────────────────────────
    const auditScrollArea = el('div', 'flex:1;min-height:0;overflow-y:auto;padding:16px;');
    outer.appendChild(auditScrollArea);

    const stack = el('div', 'display:flex;flex-direction:column;gap:14px;min-height:100%;');
    auditScrollArea.appendChild(stack);
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
      if (!courseId || !assignmentId) throw new Error('Select a course and assignment above first.');

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

    // ── COURSE LOADER IIFE ──────────────────────────────────────────────────
    (async () => {
      let allAuditCourses = [];

      function visibleAuditCourses() {
        return allAuditCourses.filter(c => {
          if (cbPublishedAudit.checked && !['available', 'published'].includes(c.workflow_state)) return false;
          if (cbDashboardAudit.checked && !c.enrollments?.some(e => e.enrollment_state === 'active')) return false;
          return c.course_code || c.name;
        });
      }

      function renderAuditCourseOptions() {
        const list = visibleAuditCourses();
        auditCourseSel.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = ''; ph.textContent = list.length ? '— pick a course —' : 'No courses found'; ph.disabled = true;
        auditCourseSel.appendChild(ph);
        list.forEach(c => {
          const opt = document.createElement('option');
          opt.value = String(c.id);
          opt.textContent = c.course_code ? `${c.course_code} — ${c.name}` : c.name;
          auditCourseSel.appendChild(opt);
        });
        if (courseId && list.some(c => String(c.id) === courseId)) auditCourseSel.value = courseId;
        else auditCourseSel.value = '';
      }

      async function loadAuditAssignments(cId) {
        auditAssignSel.disabled = true;
        auditAssignSel.innerHTML = '<option value="" disabled selected>Loading…</option>';
        try {
          const resp = await fetch(`${location.origin}/api/v1/courses/${cId}/assignments?per_page=100&order_by=name`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          });
          const data = await resp.json().catch(() => []);
          auditAssignSel.innerHTML = '';
          const ph = document.createElement('option');
          ph.value = ''; ph.textContent = '— pick an assignment —'; ph.disabled = true; ph.selected = true;
          auditAssignSel.appendChild(ph);
          (Array.isArray(data) ? data : []).forEach(a => {
            const opt = document.createElement('option');
            opt.value = String(a.id);
            opt.textContent = a.name;
            auditAssignSel.appendChild(opt);
          });
          if (assignmentId && Array.isArray(data) && data.some(a => String(a.id) === assignmentId)) {
            auditAssignSel.value = assignmentId;
          }
          auditAssignSel.disabled = false;
          updateAuditPickerStatus();
        } catch (e) {
          auditAssignSel.innerHTML = '<option value="" disabled selected>Failed to load</option>';
          auditPickerStatus.textContent = `Could not load assignments: ${e.message}`;
        }
      }

      auditCourseSel.addEventListener('change', async () => {
        courseId = auditCourseSel.value;
        assignmentId = '';
        chrome.storage.local.set({ ce_audit_prefs: { courseId, assignmentId, publishedOnly: cbPublishedAudit.checked, dashOnly: cbDashboardAudit.checked } });
        updateAuditPickerStatus();
        if (courseId) await loadAuditAssignments(courseId);
      });

      auditAssignSel.addEventListener('change', () => {
        assignmentId = auditAssignSel.value;
        chrome.storage.local.set({ ce_audit_prefs: { courseId, assignmentId, publishedOnly: cbPublishedAudit.checked, dashOnly: cbDashboardAudit.checked } });
        updateAuditPickerStatus();
      });

      [cbPublishedAudit, cbDashboardAudit].forEach(cb => {
        cb.addEventListener('change', () => {
          chrome.storage.local.set({ ce_audit_prefs: { courseId, assignmentId, publishedOnly: cbPublishedAudit.checked, dashOnly: cbDashboardAudit.checked } });
          renderAuditCourseOptions();
        });
      });

      try {
        auditPickerStatus.textContent = 'Loading your courses…';
        const resp = await fetch(`${location.origin}/api/v1/courses?per_page=100&include[]=enrollments`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const data = await resp.json().catch(() => []);
        allAuditCourses = Array.isArray(data) ? data : [];
        renderAuditCourseOptions();
        if (courseId) {
          await loadAuditAssignments(courseId);
        } else {
          updateAuditPickerStatus();
        }
      } catch (e) {
        auditPickerStatus.textContent = `Failed to load courses: ${e.message}`;
        auditCourseSel.innerHTML = '<option value="" disabled selected>Failed to load</option>';
      }
    })();
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

  function closeAllExternal() {
    document.dispatchEvent(new CustomEvent('ce-close-scheduler'));
  }

  function onToolClick(tool) {
    if (tool.id === 'message') {
      closePanel();
      closeAllExternal();
      document.dispatchEvent(new CustomEvent('ce-toggle-messages'));
      return;
    }
    if (tool.id === 'quiz') {
      closePanel();
      closeAllExternal();
      document.dispatchEvent(new CustomEvent('ce-toggle-quiz'));
      return;
    }
    if (tool.noPanel) { openQuickAI(); return; }
    if (tool.id === 'scheduler') {
      closePanel();
      closeAllExternal();
      document.dispatchEvent(new CustomEvent('ce-toggle-scheduler'));
      return;
    }
    if (_active === tool.id) { closePanel(); return; }
    closeAllExternal();
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
      btnMap[_active].style.borderBottomColor = 'transparent';
      const lbl = btnMap[_active].querySelector('span');
      if (lbl) lbl.style.color = 'rgba(255,255,255,0.8)';
    }
    _active = id;
    if (id && btnMap[id]) {
      btnMap[id].style.background = 'rgba(255,255,255,0.18)';
      btnMap[id].style.borderBottomColor = '#fff';
      const lbl = btnMap[id].querySelector('span');
      if (lbl) lbl.style.color = '#fff';
    }
  }

  async function openPanel(tool) {
    if (_panelCleanup) { _panelCleanup(); _panelCleanup = null; }
    setActive(tool.id);
    panelTitle.textContent = tool.label;
    panelBody.innerHTML = '';

    switch (tool.id) {
      case 'ai-grader':  await renderAIGrader();                                                     break;
      case 'designer':   renderComingSoon('🎨', 'Page Designer', 'A drag-and-drop editor for building beautiful Canvas pages and assignments. Coming soon.'); break;
      case 'cheater':    await renderAudit();                                                         break;
      case 'snippets':   await renderSnippets();                                                     break;
      case 'notes':        await renderNotes();                                                       break;
      case 'settings':
      case 'settings-tg': await renderSettings();                                                    break;
      case 'eval':
        _panelCleanup = () => { panelBody.style.padding = ''; panelBody.style.overflow = ''; };
        document.dispatchEvent(new CustomEvent('ce-render-eval', { detail: { container: panelBody } }));
        break;
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
    s.textContent = '';
  }

  function applyToolbarState() {
    toolbar.style.transform = 'none';
    toolbar.style.display = _expanded ? 'flex' : 'none';
    tab.style.display = _expanded ? 'none' : 'flex';
    if (!_expanded) {
      closePanel();
      panel.style.right = '0';
    } else {
      panel.style.right = '0';
    }
    collapseBtn.textContent = _expanded ? 'Hide' : 'Show';
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

  // ── GRADER BADGE ───────────────────────────────────────────────────────────
  async function updateGraderBadge() {
    const s = await new Promise(r => chrome.storage.local.get('ce_canvas_token', r));
    const tok = s.ce_canvas_token;
    if (!tok) return;
    try {
      const data = await new Promise(r => chrome.runtime.sendMessage({
        type: 'CANVAS_API',
        payload: { url: window.location.origin + '/api/v1/users/self/todo_item_count', token: tok },
      }, r));
      const count = data?.needs_grading_count || 0;
      const btn = btnMap['ai-grader'];
      if (!btn) return;
      let badge = btn.querySelector('.ce-hub-badge');
      if (!badge) {
        btn.style.position = 'relative';
        badge = el('div', `
          position:absolute;top:5px;right:5px;
          min-width:16px;height:16px;border-radius:8px;
          background:#EF4444;color:#fff;
          font-size:9px;font-weight:700;font-family:${DS.font};
          display:flex;align-items:center;justify-content:center;
          padding:0 3px;box-sizing:border-box;pointer-events:none;
          line-height:1;
        `);
        badge.className = 'ce-hub-badge';
        btn.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    } catch (_) {}
  }

  // ── MOUNT ──────────────────────────────────────────────────────────────────
  function mount() {
    if (SPEEDGRADER) return;
    // Reserve 52 px on the right so Canvas content doesn't flow under the toolbar.
    // SpeedGrader renders its layout inside #full_width_container — padding-right
    // on that element shrinks available space for its children regardless of their
    // position value, while leaving #main / body untouched (avoids compounding).
    // Other Canvas pages are normal flow — body padding-right works.
    const ceStyle = document.createElement('style');
    ceStyle.id = 'ce-body-space';
    ceStyle.textContent = '';
    (document.head || document.documentElement).appendChild(ceStyle);

    document.body.insertBefore(tab, document.body.firstChild);
    document.body.insertBefore(toolbar, tab);
    document.body.appendChild(panel);
    applyToolbarState();
    chrome.storage.local.get('ce_features', ({ ce_features }) => {
      if (ce_features) applyFeatures(ce_features);
    });
  }

  document.addEventListener('ce-open-ai-grader', () => openPanel({ id: 'ai-grader', label: 'AI Grader' }));
  document.addEventListener('ce-render-audit', e => {
    const c = e.detail?.container;
    if (!c) return;
    renderAudit(c);
  });

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  // Fetch grader badge count after a short delay so the page token is ready
  setTimeout(updateGraderBadge, 1500);
})();
