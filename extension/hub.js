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

  // ── AI GRADER ──────────────────────────────────────────────────────────────
  async function renderAIGrader() {
    const stored = await new Promise(r =>
      chrome.storage.local.get(['ce_claude_context', 'ce_criteria'], r)
    );
    let ctx        = stored.ce_claude_context || null;
    let allCriteria = stored.ce_criteria      || {};

    let activeTab = 'grade';

    // ── helpers ──
    function criteriaKey() { return ctx ? `${ctx.courseId}_${ctx.assignmentId}` : null; }
    function savedCriteria() { const k = criteriaKey(); return k ? (allCriteria[k] || '') : ''; }

    function openAIWindow(mode) {
      if (ctx) {
        const criteria = savedCriteria();
        chrome.storage.local.set({
          ce_claude_context: {
            ...ctx,
            mode,
            settings: { ...(ctx.settings || {}), rubricText: criteria },
          },
        });
      }
      const sw = window.screen.width;
      const sh = window.screen.availHeight;
      const w  = Math.min(580, Math.max(460, Math.round(sw * 0.30)));
      chrome.storage.local.get('ce_ai_provider', ({ ce_ai_provider }) => {
        const p = AI_PROVIDERS.find(x => x.id === ce_ai_provider) || AI_PROVIDERS[0];
        chrome.runtime.sendMessage({
          type: 'OPEN_CLAUDE_SPLIT',
          payload: {
            url: p.url,
            left: (window.screen.availLeft || 0) + sw - w - TOOLBAR_W,
            top:  window.screen.availTop || 0,
            width: w, height: sh,
          },
        });
      });
    }

    // ── tab bar ──
    const tabBar = el('div', `
      display:flex;margin:-20px -16px 16px;
      border-bottom:1px solid ${DS.border};
    `);

    function mkTab(id, label) {
      const t = el('button', `
        flex:1;padding:11px 8px;border:none;background:transparent;
        font-size:12px;font-weight:600;cursor:pointer;font-family:${DS.font};
        border-bottom:2px solid ${activeTab === id ? DS.blue : 'transparent'};
        color:${activeTab === id ? DS.blue : DS.muted};
        transition:all .12s;
      `, { type: 'button', textContent: label });
      t.addEventListener('click', () => { activeTab = id; rebuild(); });
      return t;
    }

    // ── content area ──
    const content = el('div', 'display:flex;flex-direction:column;gap:14px;');

    function rebuild() {
      tabBar.innerHTML = '';
      tabBar.appendChild(mkTab('grade',    '🎓  Grade'));
      tabBar.appendChild(mkTab('criteria', '📋  Criteria'));
      content.innerHTML = '';
      activeTab === 'grade' ? buildGradeTab() : buildCriteriaTab();
    }

    // ── GRADE TAB ──────────────────────────────────────────────────────────
    function buildGradeTab() {
      // Student card
      const card = el('div', `
        background:${DS.gray};border-radius:3px;padding:12px 14px;
        display:flex;flex-direction:column;gap:4px;
      `);
      if (ctx?.studentName) {
        const nameEl = el('div', `font-size:15px;font-weight:700;color:${DS.text};`);
        nameEl.textContent = ctx.studentName;
        card.appendChild(nameEl);
        if (ctx.assignmentName) {
          const aEl = el('div', `font-size:12px;color:${DS.muted};`);
          aEl.textContent = ctx.assignmentName;
          card.appendChild(aEl);
        }
        if (ctx.attachments?.length) {
          const fEl = el('div', `font-size:11px;color:${DS.muted};margin-top:2px;`);
          fEl.textContent = '📎 ' + ctx.attachments.map(a => a.filename).join(', ');
          card.appendChild(fEl);
        }
      } else {
        const empty = el('div', `font-size:12px;color:${DS.muted};text-align:center;padding:6px 0;`);
        empty.textContent = 'Open SpeedGrader to load a student';
        card.appendChild(empty);
      }
      content.appendChild(card);

      // Open AI window
      const openBtn = btn('✦  Open AI Grader Window', `background:${DS.blue};color:#fff;`);
      openBtn.addEventListener('click', () => openAIWindow('grade'));
      content.appendChild(openBtn);

      // Divider
      const sep = el('div', `display:flex;align-items:center;gap:8px;color:${DS.muted};font-size:11px;`);
      sep.appendChild(el('div', `flex:1;height:1px;background:${DS.border};`));
      const st = el('span', ''); st.textContent = 'paste AI response below';
      sep.appendChild(st);
      sep.appendChild(el('div', `flex:1;height:1px;background:${DS.border};`));
      content.appendChild(sep);

      // Grade input
      const gradeIn = el('input', `
        width:100%;box-sizing:border-box;padding:8px 10px;
        border:1px solid ${DS.border};border-radius:3px;
        font-size:13px;font-family:${DS.font};color:${DS.text};
        background:${DS.white};outline:none;transition:border-color .15s;
      `, { id: 'ce-g-grade', type: 'text', placeholder: 'e.g. 92 or A-' });
      gradeIn.addEventListener('focus', () => gradeIn.style.borderColor = DS.blue);
      gradeIn.addEventListener('blur',  () => gradeIn.style.borderColor = DS.border);
      content.appendChild(row('Grade', gradeIn));

      // Comments textarea
      const commentsWrap = el('div', 'display:flex;flex-direction:column;gap:5px;');
      const commentsLab  = el('label', `font-size:12px;font-weight:600;color:${DS.text};`);
      commentsLab.textContent = 'Comments';
      const commentsArea = el('textarea', `
        width:100%;box-sizing:border-box;padding:8px 10px;height:160px;
        border:1px solid ${DS.border};border-radius:3px;
        font-size:13px;font-family:${DS.font};color:${DS.text};
        resize:vertical;outline:none;line-height:1.5;
        transition:border-color .15s;
      `);
      commentsArea.id = 'ce-g-comments';
      commentsArea.placeholder = 'Paste AI comments here…';
      commentsArea.addEventListener('focus', () => commentsArea.style.borderColor = DS.blue);
      commentsArea.addEventListener('blur',  () => commentsArea.style.borderColor = DS.border);
      commentsWrap.appendChild(commentsLab);
      commentsWrap.appendChild(commentsArea);
      content.appendChild(commentsWrap);

      // Save to Canvas
      const saveBtn = btn('💾  Save to Canvas', `background:${DS.green};color:#fff;`);
      const saveMsg = el('div', `font-size:12px;text-align:center;min-height:16px;`);

      saveBtn.addEventListener('click', async () => {
        if (!ctx?.courseId) {
          saveMsg.style.color = '#C0392B';
          saveMsg.textContent = 'No student loaded — open SpeedGrader first';
          return;
        }
        const grade   = document.getElementById('ce-g-grade')?.value.trim()    || '';
        const comment = document.getElementById('ce-g-comments')?.value.trim() || '';
        if (!grade && !comment) {
          saveMsg.style.color = '#C0392B';
          saveMsg.textContent = 'Enter a grade or comments first';
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        const body = {};
        if (grade)   body.submission = { posted_grade: grade };
        if (comment) body.comment    = { text_comment: comment };

        const res = await new Promise(resolve => chrome.runtime.sendMessage({
          type: 'CANVAS_API',
          payload: {
            url:    `${location.origin}/api/v1/courses/${ctx.courseId}/assignments/${ctx.assignmentId}/submissions/${ctx.studentId}`,
            token:  ctx.token,
            method: 'PUT',
            body,
          },
        }, resolve));

        saveBtn.disabled = false;
        saveBtn.textContent = '💾  Save to Canvas';

        if (res?.error) {
          saveMsg.style.color = '#C0392B';
          saveMsg.textContent = 'Error: ' + res.error;
        } else {
          saveMsg.style.color = DS.green;
          saveMsg.textContent = '✓ Saved to Canvas';
          setTimeout(() => { saveMsg.textContent = ''; }, 3000);
        }
      });

      content.appendChild(saveBtn);
      content.appendChild(saveMsg);
    }

    // ── CRITERIA TAB ───────────────────────────────────────────────────────
    function buildCriteriaTab() {
      const saved = savedCriteria();

      // Criteria prompt textarea
      const promptWrap = el('div', 'display:flex;flex-direction:column;gap:5px;');
      const promptLab  = el('label', `font-size:12px;font-weight:600;color:${DS.text};`);
      promptLab.textContent = 'Grading Criteria Prompt';
      const promptArea = el('textarea', `
        width:100%;box-sizing:border-box;padding:8px 10px;height:200px;
        border:1px solid ${DS.border};border-radius:3px;
        font-size:12px;font-family:${DS.font};color:${DS.text};
        resize:vertical;outline:none;line-height:1.5;
        transition:border-color .15s;
      `);
      promptArea.id = 'ce-c-prompt';
      promptArea.placeholder = 'No criteria saved yet.\nClick "Build with AI" — it will ask you questions and build a professional grading prompt.\nCopy and paste the result back here to save.';
      promptArea.value = saved;
      promptArea.addEventListener('focus', () => promptArea.style.borderColor = DS.blue);
      promptArea.addEventListener('blur',  () => promptArea.style.borderColor = DS.border);
      promptWrap.appendChild(promptLab);
      promptWrap.appendChild(promptArea);
      content.appendChild(promptWrap);

      // Build + Delete row
      const btnRow = el('div', 'display:flex;gap:8px;');
      const buildBtn = el('button', `
        flex:1;padding:9px 16px;border:none;border-radius:3px;
        font-size:13px;font-weight:600;cursor:pointer;font-family:${DS.font};
        background:${DS.blue};color:#fff;transition:opacity .15s;
      `, { type: 'button', textContent: '✦  Build with AI' });
      buildBtn.addEventListener('click', () => openAIWindow('criteria'));

      const criteriaMsg = el('div', `font-size:12px;text-align:center;min-height:16px;`);

      const deleteBtn = el('button', `
        flex:0 0 auto;width:40px;padding:9px;
        border:1px solid ${DS.border};border-radius:3px;
        font-size:14px;cursor:pointer;font-family:${DS.font};
        background:${DS.gray};color:#C0392B;transition:opacity .15s;
      `, { type: 'button', textContent: '🗑', title: 'Delete criteria' });
      deleteBtn.addEventListener('click', () => {
        const k = criteriaKey();
        if (!k) return;
        const updated = { ...allCriteria };
        delete updated[k];
        allCriteria = updated;
        chrome.storage.local.set({ ce_criteria: updated });
        promptArea.value = '';
        criteriaMsg.style.color = DS.muted;
        criteriaMsg.textContent = 'Criteria deleted';
        setTimeout(() => { criteriaMsg.textContent = ''; }, 2000);
      });

      btnRow.appendChild(buildBtn);
      btnRow.appendChild(deleteBtn);
      content.appendChild(btnRow);

      // Save
      const saveBtn = btn('💾  Save Criteria', `background:${DS.green};color:#fff;`);
      saveBtn.addEventListener('click', () => {
        const k    = criteriaKey();
        const text = document.getElementById('ce-c-prompt')?.value.trim() || '';
        if (!k) {
          criteriaMsg.style.color = '#C0392B';
          criteriaMsg.textContent = 'Open SpeedGrader to select an assignment first';
          return;
        }
        const updated = { ...allCriteria, [k]: text };
        allCriteria = updated;
        chrome.storage.local.set({ ce_criteria: updated });
        criteriaMsg.style.color = DS.green;
        criteriaMsg.textContent = '✓ Criteria saved';
        setTimeout(() => { criteriaMsg.textContent = ''; }, 2500);
      });

      content.appendChild(saveBtn);
      content.appendChild(criteriaMsg);

      if (!saved) {
        const hint = el('div', `
          font-size:11px;color:${DS.muted};line-height:1.6;
          background:${DS.gray};border-radius:3px;padding:10px 12px;
        `);
        hint.textContent = 'Tip: The AI will walk you through everything — point value, grading style, rubric, answer key, and tone. Once it builds the prompt, copy and paste it above, then Save.';
        content.appendChild(hint);
      }
    }

    // ── storage listener — update student card on navigation ──
    const listener = changes => {
      if (!changes.ce_claude_context) return;
      ctx = changes.ce_claude_context.newValue;
      if (activeTab === 'grade') { content.innerHTML = ''; buildGradeTab(); }
    };
    chrome.storage.onChanged.addListener(listener);
    _panelCleanup = () => chrome.storage.onChanged.removeListener(listener);

    // ── mount ──
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
    const sw = window.screen.width;
    const sh = window.screen.availHeight;
    const st = window.screen.availTop  || 0;
    const sl = window.screen.availLeft || 0;
    const w  = Math.min(580, Math.max(460, Math.round(sw * 0.30)));
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
