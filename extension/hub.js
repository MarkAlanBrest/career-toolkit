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

  let _active   = null;  // tool id with open panel
  let _expanded = true;  // toolbar visible

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
    width:25vw;min-width:320px;max-width:480px;
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
    flex:1;overflow-y:auto;padding:20px 16px;
    color:${DS.text};font-size:13px;line-height:1.5;
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

  // ── TOOL CLICK ─────────────────────────────────────────────────────────────
  function onToolClick(tool) {
    if (tool.noPanel) { openQuickAI(); return; }
    if (_active === tool.id) { closePanel(); return; }
    openPanel(tool);
  }

  function openQuickAI() {
    const sw = window.screen.width;
    const sh = window.screen.availHeight;
    const st = window.screen.availTop  || 0;
    const sl = window.screen.availLeft || 0;
    const w  = Math.min(480, Math.max(320, Math.round(sw * 0.25)));
    chrome.storage.local.get('ce_ai_provider', ({ ce_ai_provider }) => {
      const provider = AI_PROVIDERS.find(p => p.id === ce_ai_provider) || AI_PROVIDERS[0];
      chrome.runtime.sendMessage({
        type: 'OPEN_CLAUDE_SPLIT',
        payload: { url: provider.url, left: sl + sw - w - TOOLBAR_W, top: st, width: w, height: sh },
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
      case 'ai-grader':  placeholder('🎓', 'AI Grader',         'Open SpeedGrader to activate.');  break;
      case 'cheater':    placeholder('🔍', 'Cheater Detector',  'Coming soon.');                    break;
      case 'reports':    placeholder('📊', 'Reports',           'Coming soon.');                    break;
      case 'scheduler':  placeholder('📅', 'Scheduler',         'Coming soon.');                    break;
      case 'settings':   await renderSettings();                                                     break;
    }

    panel.style.display = 'flex';
  }

  function closePanel() {
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
