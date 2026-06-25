(function () {
  'use strict';
  if (document.getElementById('ce-hub') || document.getElementById('ce-settings-modal')) return;

  // Only activate on Canvas pages (always run on SpeedGrader so audit events work)
  if (!document.querySelector('#global_nav_logo, meta[name="canvas-csrf-token"], .ic-app') &&
      !/speed_grader/.test(window.location.href)) return;

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
    // ── Dashboard Toolbar ─────────────────────────────────────────────────────
    { _section: 'db', label: 'Dashboard' },
    { id: 'vitals-db',    group: 'db', icon: '📊', label: 'Vitals' },
    { id: 'needs-graded', group: 'db', icon: '✏️', label: 'Needs Graded' },
    { id: 'at-risk',      group: 'db', icon: '⚠️', label: 'At Risk' },
    { id: 'settings-tg',  group: 'db', icon: '⚙️', label: 'Settings' },
  ];

  const GROUP_BG = {};

  // ── CONTEXT GUARD ──────────────────────────────────────────────────────────
  function ceContextAlive() {
    try { return !!chrome.runtime?.id; } catch(_) { return false; }
  }
  function ceSendMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!ceContextAlive()) { reject(new Error('reload-needed')); return; }
      try {
        chrome.runtime.sendMessage(payload, response => {
          if (chrome.runtime.lastError) { reject(new Error('reload-needed')); }
          else { resolve(response); }
        });
      } catch(_) { reject(new Error('reload-needed')); }
    });
  }
  function ceShowReloadBanner() {
    if (document.getElementById('ce-reload-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'ce-reload-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#B45309;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;font-weight:600;padding:10px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.25);';
    const msg = document.createElement('span');
    msg.style.flex = '1';
    msg.textContent = '⚠ Canvas Enhancer was updated or reloaded. Refresh the page to continue.';
    const btn = document.createElement('button');
    btn.textContent = 'Reload Page';
    btn.style.cssText = 'padding:5px 14px;background:#fff;color:#B45309;border:none;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;';
    btn.addEventListener('click', () => location.reload());
    banner.append(msg, btn);
    document.body.prepend(banner);
  }

  // ── HELP CONTENT ───────────────────────────────────────────────────────────
  const HELP_CONTENT = {
    dashboard: {
      title: 'Canvas Enhancer — Overview',
      html: `
        <p class="ce-help-desc">Canvas Enhancer adds a suite of teaching tools to Canvas. Tools appear where they are useful — a floating AI button on every page, course toolbars on course home pages, and messaging tools in the Canvas Inbox.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">🤖 AI Assistant</div>
          <ol>
            <li>A floating <strong>AI</strong> button appears in the bottom-right corner of every Canvas page.</li>
            <li>Click it to open your preferred AI (Claude, ChatGPT, Gemini, Copilot, or Perplexity) in a side window.</li>
            <li>Click the button again to switch between Claude, ChatGPT, Gemini, Copilot, and Perplexity.</li>
          </ol>
        </div>
        <div class="ce-help-section">
          <div class="ce-help-sh">📊 Course Reports (Course Home)</div>
          <ol>
            <li>A toolbar appears at the top of each Course Home page.</li>
            <li><strong>Vitals</strong> — see ungraded work, upcoming due dates, and a course summary at a glance.</li>
            <li><strong>Needs Graded</strong> — jump straight to a list of ungraded student submissions.</li>
            <li><strong>At Risk</strong> — identify students with missing work, low grades, or inactivity across all your courses.</li>
          </ol>
        </div>
        <div class="ce-help-section">
          <div class="ce-help-sh">⚙️ Settings</div>
          <ol>
            <li><strong>Canvas API Token</strong> — required for AI Grader, Vitals, At Risk, and bulk messaging. Get it from Canvas → Account → Settings → + New Access Token.</li>
            <li><strong>AI Provider</strong> — choose which assistant opens when you click the AI button.</li>
            <li><strong>License Key</strong> — enter your Canvas Enhancer license to unlock all features.</li>
          </ol>
        </div>
      `,
    },
    inbox: {
      title: 'Inbox Toolbar',
      html: `
        <p class="ce-help-desc">Two tools added to your Canvas Inbox: send personalized messages to multiple students at once, and save templates for messages you write repeatedly.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">📨 Bulk Message</div>
          <ol>
            <li>Click <strong>Bulk Message</strong> to open the batch sender.</li>
            <li>Select a course, then choose which students to message — all students, specific groups, or individuals.</li>
            <li>Write your subject and message. Use <code>{{studentName}}</code> and <code>{{courseName}}</code> as placeholders.</li>
            <li>Click <strong>Send</strong> — every student receives a separate, individual message (not a group thread).</li>
          </ol>
          <div class="ce-help-tip">💡 Placeholders work in both the subject and body. Example: <em>"Hi {{studentName}}, your grade for {{courseName}} has been updated."</em></div>
        </div>
        <div class="ce-help-section">
          <div class="ce-help-sh">📋 Templates</div>
          <ol>
            <li>Click <strong>Templates</strong> to open your saved message library.</li>
            <li>Click <strong>Insert</strong> next to any template to paste it into the current Compose window.</li>
            <li>Click <strong>New Template</strong> to save a message you write often.</li>
            <li>Use the ✎ icon to edit a template, or ✕ to delete it.</li>
          </ol>
          <div class="ce-help-tip">💡 Default templates are pre-loaded (Missing Work, Office Hours, etc.). Edit them to match your voice.</div>
        </div>
      `,
    },
    quiz: {
      title: 'Quiz Builder',
      html: `
        <p class="ce-help-desc">Generates complete Canvas quizzes with AI — questions, answer choices, correct answers, and point values — published directly to your course.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">How to use</div>
          <ol>
            <li>Navigate to any course's <strong>Quizzes</strong> page. The Quiz Builder toolbar appears automatically.</li>
            <li>Click <strong>Quiz Builder</strong> to open the generator.</li>
            <li>Describe what you want: topic, difficulty level, number of questions, and question type.</li>
            <li>Click <strong>Generate</strong> — the AI creates a full quiz draft.</li>
            <li>Review each question in the panel and edit anything that needs adjusting.</li>
            <li>Click <strong>Publish</strong> to create the quiz in Canvas with all questions loaded.</li>
          </ol>
          <div class="ce-help-tip">💡 Be specific for better results. Example: <em>"10 multiple-choice questions on the American Civil War, high school level, focusing on causes and key battles."</em></div>
        </div>
        <div class="ce-help-note">⚠ Requires a Canvas API Token in Settings.</div>
      `,
    },
    announcements: {
      title: 'Announcement Composer',
      html: `
        <p class="ce-help-desc">Adds a Quick Post button to the Canvas announcement compose form so you can insert saved templates directly into the title and body fields.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">Inserting a template</div>
          <ol>
            <li>Click <strong>Add Announcement</strong> in Canvas as you normally would.</li>
            <li>The Announcement bar appears at the top of the compose form.</li>
            <li>Click <strong>Quick Post</strong> to open your saved announcement library.</li>
            <li>Click <strong>Insert</strong> — the title and body fields fill automatically.</li>
            <li>Edit as needed, then post normally through Canvas.</li>
          </ol>
        </div>
        <div class="ce-help-section">
          <div class="ce-help-sh">Managing templates</div>
          <ol>
            <li>In the Quick Post panel, click <strong>+ New</strong> at the bottom to create a template.</li>
            <li>Click the ✎ icon to edit any template.</li>
            <li>Click ✕ to delete a template.</li>
            <li>Templates are saved in your browser and persist between sessions.</li>
          </ol>
          <div class="ce-help-tip">💡 Default templates are included: Welcome to the Week, Missing Work Reminder, Office Hours, and more. Edit them to match your style.</div>
        </div>
      `,
    },
    content: {
      title: 'Content Studio',
      html: `
        <p class="ce-help-desc">Adds reusable, accessible content blocks and an AI drafting assistant directly below the Canvas Rich Content Editor.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">Insert and edit content</div>
          <ol>
            <li>Open a Canvas page, assignment, or discussion and select <strong>Edit</strong>.</li>
            <li>Use <strong>Insert</strong>, <strong>Layouts</strong>, or <strong>Icons</strong> to add a component at the editor cursor.</li>
            <li>Configure color and style <em>before</em> inserting — use the props bar that appears after clicking a component in the menu.</li>
            <li>Use Canvas Preview or Student View before publishing to check links, readability, and mobile layout.</li>
          </ol>
        </div>
        <div class="ce-help-section">
          <div class="ce-help-sh">AI Assist</div>
          <ol>
            <li>Select <strong>AI Assist</strong>, describe the content, and choose the Canvas content type, theme, and length.</li>
            <li>Optionally read the current editor or attach source material so the draft follows your existing content.</li>
            <li>Generate, review, and edit the result. Choose <strong>Replace</strong> only when you intend to overwrite the editor; otherwise append it.</li>
          </ol>
          <div class="ce-help-tip">💡 Canvas does not automatically save Content Studio changes. Use Canvas's Save or Save &amp; Publish button when finished.</div>
        </div>
      `,
    },
    grader: {
      title: 'AI Grader',
      html: `
        <p class="ce-help-desc">An AI-assisted grading panel inside SpeedGrader. It reads each student's submission, applies your rubric, and drafts scores and feedback for you to review before applying.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">Setup</div>
          <ol>
            <li>Enter your <strong>Canvas API Token</strong> and <strong>License Key</strong> in Settings.</li>
            <li>Open <strong>SpeedGrader</strong> for a written assignment.</li>
            <li>Click <strong>AI Grader</strong> in the toolbar.</li>
          </ol>
        </div>
        <div class="ce-help-section">
          <div class="ce-help-sh">Grading a submission</div>
          <ol>
            <li>Load or create a rubric in the AI Grader panel.</li>
            <li>Click <strong>Grade This Submission</strong> — the AI reads the student's work and drafts scores for each rubric criterion.</li>
            <li>Review each row. Adjust scores or edit feedback text as needed.</li>
            <li>Click <strong>Apply to Canvas</strong> to submit the grades.</li>
            <li>Navigate to the next student and repeat.</li>
          </ol>
          <div class="ce-help-tip">💡 Always review AI suggestions before applying. Treat it as a first draft — your professional judgment is the final word.</div>
        </div>
      `,
    },
    scheduler: {
      title: 'Assignment Scheduler',
      html: `
        <p class="ce-help-desc">A drag-and-drop planning board on a course Assignments page that updates due, availability, and answer-showing dates in batches.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">How to use</div>
          <ol>
            <li>Open a course and select <strong>Assignments</strong>.</li>
            <li>Click <strong>Scheduler</strong> in the toolbar.</li>
            <li>Select the course and load its assignments, discussions, and quizzes.</li>
            <li>Set a start date, meeting weekdays, due time, and optional open/close offsets.</li>
            <li>Drag items between schedule slots, then review the generated dates.</li>
            <li>Apply the schedule to send the changes to Canvas. Review the completion summary for any item that failed.</li>
          </ol>
          <div class="ce-help-tip">💡 Changes are not sent to Canvas until you apply the schedule. Back up your scheduler data before a large course-wide change.</div>
        </div>
        <div class="ce-help-note">⚠ Requires a Canvas API Token in Settings.</div>
      `,
    },
    audit: {
      title: 'Grade Audit',
      html: `
        <p class="ce-help-desc">Runs a comprehensive audit of student submissions — checking for missing work, late submissions, grade discrepancies, and tab-switching events during quizzes.</p>
        <div class="ce-help-section">
          <div class="ce-help-sh">How to use</div>
          <ol>
            <li>Open <strong>SpeedGrader</strong> for any assignment.</li>
            <li>Click <strong>Audit</strong> in the toolbar.</li>
            <li>Select which checks to run: missing submissions, late work, grade gaps, quiz focus events.</li>
            <li>Click <strong>Run Audit</strong> — the tool fetches data from Canvas.</li>
            <li>Review the results. Each check shows a table with student names and details.</li>
            <li>Use the findings to follow up with students or adjust grades.</li>
          </ol>
          <div class="ce-help-tip">💡 The quiz tab-switching check requires session event logging to be enabled on the quiz. If it shows "unavailable," check the quiz's settings page.</div>
        </div>
        <div class="ce-help-note">⚠ Requires a Canvas API Token in Settings.</div>
      `,
    },
  };

  let _active      = null;          // tool id with open panel
  let _expanded    = !SPEEDGRADER;  // SpeedGrader starts minimized
  let _panelCleanup = null;  // storage listener teardown for active panel
  let _onDashboard = false; // legacy toolbar remains disabled

  // ── HELPERS ────────────────────────────────────────────────────────────────
  function el(tag, css, attrs) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  function makeHelpDescPanel(text) {
    const p = el('div', `display:none;padding:10px 16px 12px;background:#EBF4FF;border-bottom:2px solid #B3D4F5;font-size:12px;color:#1a407a;line-height:1.6;flex-shrink:0;`);
    p.textContent = text;
    return p;
  }

  function makeHelpQBtn(descPanel) {
    const q = el('button', `width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.45);background:none;color:rgba(255,255,255,0.8);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:${DS.font};transition:background .12s,color .12s;`, { type:'button', textContent:'?' });
    q.addEventListener('click', () => {
      const open = descPanel.style.display !== 'none';
      descPanel.style.display = open ? 'none' : 'block';
      q.style.background = open ? '' : 'rgba(255,255,255,0.2)';
      q.style.color = open ? 'rgba(255,255,255,0.8)' : '#fff';
    });
    q.addEventListener('mouseenter', () => { if (descPanel.style.display === 'none') q.style.background = 'rgba(255,255,255,0.12)'; });
    q.addEventListener('mouseleave', () => { if (descPanel.style.display === 'none') q.style.background = ''; });
    return q;
  }

  function makeModalCloseBtn(onClose) {
    const x = el('button', `width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:rgba(255,255,255,0.65);font-size:22px;cursor:pointer;border-radius:4px;line-height:1;padding:0;font-family:${DS.font};transition:background .12s,color .12s;`, { type:'button', textContent:'×' });
    x.addEventListener('mouseenter', () => { x.style.background = 'rgba(255,255,255,0.15)'; x.style.color = '#fff'; });
    x.addEventListener('mouseleave', () => { x.style.background = ''; x.style.color = 'rgba(255,255,255,0.65)'; });
    x.addEventListener('click', onClose);
    return x;
  }

  // Shared stat tile used by Vitals and At Risk
  function makeStatTile(icon, value, label, sublabel, valColor) {
    const card = el('div', `flex:1;padding:16px 8px 14px;background:#fff;display:flex;flex-direction:column;align-items:center;gap:0;`);
    const icoEl = el('div', `font-size:20px;line-height:1;margin-bottom:5px;`); icoEl.textContent = icon;
    const valEl = el('div', `font-size:28px;font-weight:700;color:${valColor};line-height:1;`); valEl.textContent = String(value);
    const lblEl = el('div', `font-size:10px;font-weight:700;color:${DS.text};text-transform:uppercase;letter-spacing:.5px;text-align:center;margin-top:5px;`); lblEl.textContent = label;
    const subEl = el('div', `font-size:9px;color:${DS.muted};text-align:center;margin-top:2px;`); subEl.textContent = sublabel || '';
    card.append(icoEl, valEl, lblEl, subEl);
    return card;
  }

  // Shared section divider label used inside modal bodies
  function makeSecHdr(text, extraStyle) {
    const h = el('div', `padding:10px 16px 8px;font-size:10px;font-weight:700;color:${DS.muted};text-transform:uppercase;letter-spacing:.5px;${extraStyle || ''}`);
    h.textContent = text;
    return h;
  }

  // Shared clickable row link used inside modal bodies
  function makeRowLink(href) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.cssText = `display:flex;align-items:center;gap:12px;padding:11px 16px;text-decoration:none;border-bottom:1px solid ${DS.border};transition:background .12s;`;
    a.addEventListener('mouseenter', () => { a.style.background = DS.gray; });
    a.addEventListener('mouseleave', () => { a.style.background = ''; });
    return a;
  }

  // Shared pill badge
  function makeBadge(text, bg, color) {
    const b = el('div', `background:${bg};color:${color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;`);
    b.textContent = text;
    return b;
  }

  // ── TOOLBAR ────────────────────────────────────────────────────────────────
  const toolbar = el('div', `
    position:relative;width:100%;height:${TOOLBAR_H}px;
    z-index:10;
    background:${DS.blue};
    border-bottom:1px solid #055b9a;
    box-shadow:0 2px 8px rgba(0,0,0,.18);
    display:flex;flex-direction:row;align-items:stretch;
    font-family:${DS.font};
    transition:transform .2s ease;
  `);
  toolbar.id = 'ce-hub';


  // Nav
  const nav = el('div', `
    flex:1;height:100%;min-width:0;
    display:flex;flex-direction:row;align-items:center;
    padding:0 8px 0 88px;gap:4px;overflow-x:auto;overflow-y:hidden;
  `);

  const btnMap     = {};
  const btnGroupBg = {};
  let _currentSectionWrap = nav;

  for (const tool of TOOLS) {
    // Section header — creates a collapsible group
    if (tool._section) {
      const sectionOpen = { value: true };
      const sectionWrap = el('div', `height:100%;display:flex;flex-direction:row;align-items:center;gap:4px;`);

      const hdr = el('button', `
        flex-shrink:0;height:100%;
        border:none;border-right:1px solid rgba(255,255,255,0.15);
        background:transparent;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:6px;
        padding:0 12px;box-sizing:border-box;
        font-family:${DS.font};
      `, { type: 'button' });
      const hdrLabel = el('span', `font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:rgba(255,255,255,0.4);font-weight:700;white-space:nowrap;`);
      hdrLabel.textContent = tool.label;
      const hdrArrow = el('span', `font-size:9px;color:rgba(255,255,255,0.4);transition:transform .2s;`);
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
      height:32px;padding:0 16px;flex-shrink:0;
      border:1px solid ${DS.blue};border-radius:4px;
      background:${DS.blue};
      color:#fff;
      cursor:pointer;
      font-size:12px;font-weight:700;font-family:${DS.font};
      letter-spacing:.2px;white-space:nowrap;
      transition:background .12s,color .12s,border-color .12s;
    `, { type: 'button', title: tool.label, textContent: tool.label });

    btn.addEventListener('mouseenter', () => {
      if (_active !== tool.id) { btn.style.background = '#055f9e'; btn.style.borderColor = '#055f9e'; btn.style.color = '#fff'; }
    });
    btn.addEventListener('mouseleave', () => {
      if (_active !== tool.id) { btn.style.background = DS.blue; btn.style.borderColor = DS.blue; btn.style.color = '#fff'; }
    });
    btn.addEventListener('click', () => onToolClick(tool));

    btnMap[tool.id] = btn;
    _currentSectionWrap.appendChild(btn);
  }
  toolbar.appendChild(nav);

  // ── CENTERED GREETING ─────────────────────────────────────────────────────
  const greetingWrap = el('div', `
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    pointer-events:none;user-select:none;line-height:1.25;
  `);

  const welcomeLine = el('span', `
    font-size:14px;font-style:italic;
    font-family:Georgia,"Times New Roman",serif;
    color:rgba(255,255,255,0.82);letter-spacing:.3px;
    white-space:nowrap;
  `);
  welcomeLine.textContent = 'Welcome';

  const subtitleLine = el('span', `
    font-size:9px;font-weight:700;text-transform:uppercase;
    letter-spacing:1.2px;color:rgba(255,255,255,0.35);
    font-family:${DS.font};white-space:nowrap;margin-top:1px;
  `);
  subtitleLine.textContent = 'Canvas Enhancer — Reports Toolbar';

  greetingWrap.append(welcomeLine, subtitleLine);
  toolbar.appendChild(greetingWrap);

  // Load teacher name: stored value → Canvas API → Canvas DOM
  (async () => {
    const s = await new Promise(r => chrome.storage.local.get('ces_teacher_name', r));
    if (s.ces_teacher_name) {
      welcomeLine.textContent = `Welcome, ${s.ces_teacher_name}`;
      return;
    }
    try {
      const resp = await fetch(window.location.origin + '/api/v1/users/self/profile', {
        credentials: 'same-origin',
      });
      if (resp.ok) {
        const profile = await resp.json();
        const name = profile.short_name || profile.name || '';
        if (name) {
          welcomeLine.textContent = `Welcome, ${name}`;
          chrome.storage.local.set({ ces_teacher_name: name });
          return;
        }
      }
    } catch(_) {}
    // Last resort: Canvas global nav display name
    const navName = document.querySelector('#global_nav_profile_link .ic-avatar + *, [data-testid="user-name"]')?.textContent?.trim()
      || document.querySelector('#global_nav_profile_link')?.getAttribute('aria-label')?.replace(/^.*profile/i, '').trim();
    if (navName) welcomeLine.textContent = `Welcome, ${navName}`;
  })();

  // Collapse button — pill style matching inbox "Hide", pushed to the right edge
  const collapseBtn = el('button', `
    height:32px;padding:0 16px;flex-shrink:0;margin-left:auto;margin-right:8px;
    border:none;border-radius:4px;
    background:rgba(255,255,255,0.12);
    color:rgba(255,255,255,0.85);
    cursor:pointer;
    font-size:12px;font-weight:700;font-family:${DS.font};
    letter-spacing:.2px;white-space:nowrap;
    align-self:center;
    transition:background .12s,color .12s;
  `, { type: 'button', title: 'Collapse toolbar', textContent: 'Hide' });
  collapseBtn.addEventListener('mouseenter', () => { collapseBtn.style.background = 'rgba(255,255,255,0.22)'; collapseBtn.style.color = '#fff'; });
  collapseBtn.addEventListener('mouseleave', () => { collapseBtn.style.background = 'rgba(255,255,255,0.12)'; collapseBtn.style.color = 'rgba(255,255,255,0.85)'; });
  collapseBtn.addEventListener('click', toggleToolbar);

  const helpNavBtn = el('button', `height:32px;padding:0 12px;flex-shrink:0;margin-right:4px;border:none;border-radius:4px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;cursor:pointer;align-self:center;letter-spacing:.2px;transition:background .12s,color .12s;`, { type: 'button', title: 'Help', textContent: 'Help' });
  helpNavBtn.addEventListener('mouseenter', () => { helpNavBtn.style.background = 'rgba(255,255,255,0.22)'; helpNavBtn.style.color = '#fff'; });
  helpNavBtn.addEventListener('mouseleave', () => { helpNavBtn.style.background = 'rgba(255,255,255,0.12)'; helpNavBtn.style.color = 'rgba(255,255,255,0.85)'; });
  helpNavBtn.addEventListener('click', () => openHelp('dashboard'));
  nav.appendChild(helpNavBtn);
  nav.appendChild(collapseBtn);

  // ── COLLAPSED TAB ──────────────────────────────────────────────────────────
  const tab = el('button', `
    position:relative;margin-left:auto;
    z-index:10;
    width:118px;height:26px;
    border:1px solid #055b9a;border-top:none;
    border-radius:0 0 4px 4px;
    background:${DS.blue};
    box-shadow:0 2px 8px rgba(0,0,0,.18);
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

  // ── NEEDS GRADED MODAL ─────────────────────────────────────────────────────
  const ngModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  ngModal.id = 'ce-ng-modal';
  const ngBox = el('div', `background:#F8FAFC;width:min(1100px,calc(100vw - 48px));max-height:min(900px,calc(100vh - 60px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  ngModal.appendChild(ngBox);
  ngModal.addEventListener('click', e => { if (e.target === ngModal) closeNgModal(); });

  // ── VITALS MODAL ───────────────────────────────────────────────────────────
  const vitalsModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  vitalsModal.id = 'ce-hub-vitals-modal';
  const vitalsBox = el('div', `background:#fff;width:min(680px,calc(100vw - 48px));max-height:min(720px,calc(100vh - 64px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  vitalsModal.appendChild(vitalsBox);
  vitalsModal.addEventListener('click', e => { if (e.target === vitalsModal) { vitalsModal.style.display = 'none'; setActive(null); } });

  // ── AT RISK MODAL ──────────────────────────────────────────────────────────
  const atRiskModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  atRiskModal.id = 'ce-atrisk-modal';
  const atRiskBox = el('div', `background:#F8FAFC;width:min(1100px,calc(100vw - 48px));max-height:min(900px,calc(100vh - 60px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  atRiskModal.appendChild(atRiskBox);
  atRiskModal.addEventListener('click', e => { if (e.target === atRiskModal) { atRiskModal.style.display = 'none'; setActive(null); } });

  // ── SETTINGS MODAL ─────────────────────────────────────────────────────────
  const settingsModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  settingsModal.id = 'ce-settings-modal';
  const settingsBox = el('div', `background:#fff;width:min(620px,calc(100vw - 48px));max-height:min(700px,calc(100vh - 80px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  const settingsMHdr = el('div', `height:52px;flex-shrink:0;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;`);
  const settingsMTitle = el('h2', `flex:1;margin:0;font-size:15px;font-weight:700;color:#fff;font-family:${DS.font};`);
  settingsMTitle.textContent = 'Settings';
  const settingsMClose = el('button', `width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:rgba(255,255,255,0.65);font-size:22px;cursor:pointer;border-radius:4px;transition:background .12s,color .12s;font-family:${DS.font};padding:0;`, { type: 'button', textContent: '×' });
  settingsMClose.addEventListener('mouseenter', () => { settingsMClose.style.background = 'rgba(255,255,255,0.15)'; settingsMClose.style.color = '#fff'; });
  settingsMClose.addEventListener('mouseleave', () => { settingsMClose.style.background = ''; settingsMClose.style.color = 'rgba(255,255,255,0.65)'; });
  settingsMClose.addEventListener('click', () => { settingsModal.style.display = 'none'; setActive(null); });
  settingsMHdr.append(settingsMTitle, settingsMClose);
  const settingsMBody = el('div', `flex:1;min-height:0;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:0;`);
  settingsMBody.id = 'ce-settings-mbody';
  settingsBox.append(settingsMHdr, settingsMBody);
  settingsModal.appendChild(settingsBox);
  settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });
  settingsBox.addEventListener('click', e => e.stopPropagation());

  const creditsModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  creditsModal.id = 'ce-ai-credits-modal';
  const creditsBox = el('div', `background:#fff;width:min(560px,calc(100vw - 48px));max-height:min(680px,calc(100vh - 80px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  const creditsMHdr = el('div', `height:52px;flex-shrink:0;background:${DS.blue};display:flex;align-items:center;padding:0 16px;gap:10px;`);
  const creditsMTitle = el('h2', `flex:1;margin:0;font-size:15px;font-weight:700;color:#fff;font-family:${DS.font};`);
  creditsMTitle.textContent = 'AI Credits';
  const creditsMClose = el('button', `width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:rgba(255,255,255,0.75);font-size:22px;cursor:pointer;border-radius:4px;transition:background .12s,color .12s;font-family:${DS.font};padding:0;`, { type: 'button', textContent: 'x' });
  creditsMClose.addEventListener('mouseenter', () => { creditsMClose.style.background = 'rgba(255,255,255,0.15)'; creditsMClose.style.color = '#fff'; });
  creditsMClose.addEventListener('mouseleave', () => { creditsMClose.style.background = ''; creditsMClose.style.color = 'rgba(255,255,255,0.75)'; });
  creditsMClose.addEventListener('click', () => { creditsModal.style.display = 'none'; });
  creditsMHdr.append(creditsMTitle, creditsMClose);
  const creditsMBody = el('div', `flex:1;min-height:0;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;`);
  creditsMBody.id = 'ce-ai-credits-mbody';
  creditsBox.append(creditsMHdr, creditsMBody);
  creditsModal.appendChild(creditsBox);
  creditsModal.addEventListener('click', e => { if (e.target === creditsModal) creditsModal.style.display = 'none'; });
  creditsBox.addEventListener('click', e => e.stopPropagation());

  // ── NOTES MODAL ────────────────────────────────────────────────────────────
  const notesModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  notesModal.id = 'ce-notes-modal';
  const notesBox = el('div', `background:#fff;width:min(680px,calc(100vw - 48px));max-height:min(720px,calc(100vh - 80px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  const notesMHdr = el('div', `height:52px;flex-shrink:0;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;`);
  const notesMTitle = el('h2', `flex:1;margin:0;font-size:15px;font-weight:700;color:#fff;font-family:${DS.font};`);
  notesMTitle.textContent = 'Notes';
  const notesMClose = el('button', `width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:rgba(255,255,255,0.65);font-size:22px;cursor:pointer;border-radius:4px;transition:background .12s,color .12s;font-family:${DS.font};padding:0;`, { type: 'button', textContent: '×' });
  notesMClose.addEventListener('mouseenter', () => { notesMClose.style.background = 'rgba(255,255,255,0.15)'; notesMClose.style.color = '#fff'; });
  notesMClose.addEventListener('mouseleave', () => { notesMClose.style.background = ''; notesMClose.style.color = 'rgba(255,255,255,0.65)'; });
  notesMClose.addEventListener('click', () => { notesModal.style.display = 'none'; setActive(null); });
  notesMHdr.append(notesMTitle, notesMClose);
  const notesMBody = el('div', `flex:1;min-height:0;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:0;`);
  notesMBody.id = 'ce-notes-mbody';
  notesBox.append(notesMHdr, notesMBody);
  notesModal.appendChild(notesBox);
  notesModal.addEventListener('click', e => { if (e.target === notesModal) notesModal.style.display = 'none'; });
  notesBox.addEventListener('click', e => e.stopPropagation());

  // ── HELP MODAL ─────────────────────────────────────────────────────────────
  const helpModal = el('div', `position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:${DS.font};`);
  helpModal.id = 'ce-help-modal';
  const helpBox = el('div', `background:#fff;width:min(620px,calc(100vw - 48px));max-height:min(680px,calc(100vh - 80px));border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;`);
  const helpMHdr = el('div', `height:52px;flex-shrink:0;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;`);
  const helpMTitle = el('h2', `flex:1;margin:0;font-size:15px;font-weight:700;color:#fff;font-family:${DS.font};`);
  const helpMClose = el('button', `width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:rgba(255,255,255,0.65);font-size:22px;cursor:pointer;border-radius:4px;transition:background .12s,color .12s;font-family:${DS.font};padding:0;`, { type: 'button', textContent: '×' });
  helpMClose.addEventListener('mouseenter', () => { helpMClose.style.background = 'rgba(255,255,255,0.15)'; helpMClose.style.color = '#fff'; });
  helpMClose.addEventListener('mouseleave', () => { helpMClose.style.background = ''; helpMClose.style.color = 'rgba(255,255,255,0.65)'; });
  helpMClose.addEventListener('click', () => { helpModal.style.display = 'none'; setActive(null); });
  helpMHdr.append(helpMTitle, helpMClose);
  const helpMBody = el('div', `flex:1;min-height:0;overflow-y:auto;padding:24px;`);
  helpBox.append(helpMHdr, helpMBody);
  helpModal.appendChild(helpBox);
  helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.style.display = 'none'; });
  helpBox.addEventListener('click', e => e.stopPropagation());

  function openHelp(key) {
    const entry = HELP_CONTENT[key] || HELP_CONTENT['dashboard'];
    helpMTitle.textContent = entry.title;
    helpMBody.innerHTML = `<style>
      .ce-help-desc{margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;}
      .ce-help-section{margin-bottom:20px;}
      .ce-help-sh{font-size:11px;font-weight:700;color:#1B303D;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em;}
      .ce-help-section ol{margin:0;padding-left:20px;}
      .ce-help-section ol li{font-size:13.5px;color:#374151;line-height:1.6;margin-bottom:6px;}
      .ce-help-section p{font-size:13.5px;color:#374151;line-height:1.6;margin:0 0 8px;}
      .ce-help-tip{background:#EFF6FF;border-left:3px solid #3B82F6;border-radius:4px;padding:10px 14px;font-size:13px;color:#1D4ED8;line-height:1.5;margin-top:8px;}
      .ce-help-note{background:#FEF2F2;border-left:3px solid #EF4444;border-radius:4px;padding:10px 14px;font-size:13px;color:#B91C1C;line-height:1.5;margin-top:8px;}
      code{background:#F3F4F6;padding:1px 5px;border-radius:3px;font-size:12px;}
    </style>` + entry.html;
    helpModal.style.display = 'flex';
  }

  function openNotesModal() {
    notesMBody.innerHTML = '';
    notesModal.style.display = 'flex';
    renderNotes(notesMBody);
  }

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

  function openAICredits() {
    creditsMBody.innerHTML = '';
    creditsModal.style.display = 'flex';

    const sendRuntime = message => new Promise(resolve => chrome.runtime.sendMessage(message, resolve));
    const balanceText = el('div', `font-size:28px;font-weight:800;color:${DS.text};line-height:1;`, { textContent: 'Loading...' });
    const statusText = el('div', `font-size:12px;color:${DS.muted};margin-top:6px;`, { textContent: 'Checking your AI credit balance.' });
    const buyMsg = el('div', `font-size:12px;min-height:16px;color:${DS.muted};`);

    const balanceCard = el('div', `padding:16px;border:1px solid ${DS.border};border-radius:8px;background:#F8FAFC;`);
    balanceCard.append(
      el('div', `font-size:12px;font-weight:700;color:${DS.muted};text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;`, { textContent: 'Current balance' }),
      balanceText,
      statusText
    );

    const pricingCard = el('div', `padding:14px;border:1px solid ${DS.border};border-radius:8px;background:#fff;display:flex;flex-direction:column;gap:8px;`);
    pricingCard.append(
      el('div', `font-size:14px;font-weight:800;color:${DS.text};`, { textContent: '$20 = 250 AI credits' }),
      el('div', `font-size:12px;color:${DS.muted};line-height:1.5;`, { textContent: 'Buy AI credits. Use them for grading, pages, or quizzes. Different AI actions use different credit amounts.' }),
      el('div', `font-size:12px;color:${DS.muted};`, { textContent: 'Grading: 1 credit' }),
      el('div', `font-size:12px;color:${DS.muted};`, { textContent: 'Page creation: 5 credits' }),
      el('div', `font-size:12px;color:${DS.muted};`, { textContent: 'Quiz creation: 5 credits' })
    );

    const buyCreditsBtn = btn('Buy AI Credits', `background:${DS.blue};color:#fff;border-radius:999px;width:auto;align-self:flex-start;padding:9px 18px;`);
    buyCreditsBtn.addEventListener('click', async () => {
      buyCreditsBtn.disabled = true;
      buyCreditsBtn.textContent = 'Opening checkout...';
      buyMsg.style.color = DS.muted;
      buyMsg.textContent = '';
      const result = await sendRuntime({ type: 'CREATE_CREDIT_CHECKOUT', payload: { quantity: 1 } });
      if (result?.error) {
        buyMsg.style.color = '#DC2626';
        buyMsg.textContent = result.error;
      }
      buyCreditsBtn.disabled = false;
      buyCreditsBtn.textContent = 'Buy AI Credits';
    });

    creditsMBody.append(balanceCard, pricingCard, buyCreditsBtn, buyMsg);

    sendRuntime({ type: 'AI_CREDIT_STATUS' }).then(status => {
      if (status?.error) throw new Error(status.error);
      balanceText.textContent = String(Number(status?.balance || 0));
      statusText.textContent = Number(status?.used || 0) > 0 ? `${Number(status.used)} credits used.` : 'No AI credits used yet.';
    }).catch(err => {
      balanceText.textContent = '0';
      statusText.textContent = err?.message || 'Could not load balance.';
    });
  }

  let settingsRenderVersion = 0;
  async function renderSettings(target) {
    const renderVersion = ++settingsRenderVersion;
    const dest = target || panelBody;
    try {
    const stored = await new Promise(r =>
      chrome.storage.local.get(['ce_canvas_token','ce_teacher_name','ces_teacher_name'], r)
    );
    if (renderVersion !== settingsRenderVersion) return;
    dest.innerHTML = '';

    const stack = el('div', 'display:flex;flex-direction:column;gap:18px;');

    // Heading
    const head = el('div', '');
    const ht = el('div', `font-size:15px;font-weight:700;color:${DS.text};margin-bottom:3px;`);
    ht.textContent = 'Global Settings';
    const hs = el('div', `font-size:12px;color:${DS.muted};`);
    hs.textContent = 'Applies to all Canvas Enhancer tools.';
    head.appendChild(ht); head.appendChild(hs);
    stack.appendChild(head);

    const nameIn    = input('ce-s-name',    'text',     'Your display name',      stored.ce_teacher_name || stored.ces_teacher_name || '');

    // Focus ring on text inputs
    for (const inp of [nameIn]) {
      inp.addEventListener('focus', () => inp.style.borderColor = DS.blue);
      inp.addEventListener('blur',  () => inp.style.borderColor = DS.border);
    }

    stack.appendChild(row('Teacher Name', nameIn));
    if (globalThis.CECanvasToken) stack.appendChild(globalThis.CECanvasToken.createControl());

    const saveBtn = btn('Save Settings', `background:${DS.blue};color:#fff;`, 'ce-s-save');
    const saveMsg = el('div', `font-size:12px;text-align:center;color:${DS.green};min-height:16px;`);

    const accountBox = el('div', `padding:12px;border:1px solid ${DS.border};border-radius:4px;background:#F8FAFC;font-size:12px;color:${DS.muted};line-height:1.5;`);
    accountBox.textContent = '';
    stack.appendChild(accountBox);

    const sendRuntime = message => new Promise(resolve => chrome.runtime.sendMessage(message, resolve));
    accountBox.append(
      el('div', 'font-weight:700;margin-bottom:4px;', { textContent: 'AI Credits' }),
      el('div', `color:${DS.muted};margin-bottom:8px;`, { textContent: 'View your balance, pricing, and buy prepaid AI credits.' })
    );
    const buyCreditsBtn = btn('Open AI Credits', `background:#fff;color:${DS.blue};border:1px solid ${DS.blue};padding:8px;width:auto;margin-top:10px;`);
    buyCreditsBtn.addEventListener('click', openAICredits);
    accountBox.appendChild(buyCreditsBtn);
    const parseKeys = value => String(value || '').split(/[\n,]+/).map(key => key.trim()).filter(Boolean);
    async function showAccount(keys) {
      if (!keys.length) {
        accountBox.textContent = 'Enter a license key to see your packages and AI usage.';
        return { valid: false };
      }
      accountBox.textContent = 'Checking your packages…';
      const status = await sendRuntime({ type: 'LICENSE_STATUS', payload: { licenseKeys: keys, force: true } });
      accountBox.innerHTML = '';
      if (!status?.valid) {
        accountBox.style.borderColor = '#DC2626';
        accountBox.style.background = '#FEF2F2';
        accountBox.style.color = '#991B1B';
        accountBox.textContent = status?.errors?.join(' ') || 'No active package license was found.';
        return status || { valid: false };
      }
      accountBox.style.borderColor = DS.border;
      accountBox.style.background = '#F8FAFC';
      accountBox.style.color = DS.text;
      const packageConfig = [
        ['teaching', 'Teaching Tools', 'AI gradings', 'teaching100', 100],
        ['creation', 'Creation Tools', 'AI generations', 'creation50', 50],
      ];
      for (const [id, label, unit, pack, refill] of packageConfig) {
        const entitlement = status.packages?.[id];
        const card = el('div', `padding:${accountBox.childNodes.length ? '10px 0 0' : '0'};margin-top:${accountBox.childNodes.length ? '10px' : '0'};border-top:${accountBox.childNodes.length ? `1px solid ${DS.border}` : 'none'};`);
        if (!entitlement?.valid) {
          card.appendChild(el('div', `color:${DS.muted};`, { textContent: `${label} — Not purchased` }));
          accountBox.appendChild(card);
          continue;
        }
        const usage = entitlement.usage || {};
        card.append(
          el('div', 'font-weight:700;margin-bottom:3px;', { textContent: `${label} — Active` }),
          el('div', `color:${DS.muted};`, { textContent: usage.limit === null ? `Unlimited ${unit}` : `${usage.used || 0} of ${usage.limit || 0} monthly ${unit} used` }),
          el('div', `color:${DS.muted};`, { textContent: `${usage.bonus || 0} purchased credits available` })
        );
        if (usage.limit !== null) {
          const buy = btn(`Buy ${refill} more`, `background:#fff;color:${DS.blue};border:1px solid ${DS.blue};padding:7px;width:auto;margin-top:8px;`);
          buy.addEventListener('click', async () => {
            buy.disabled = true; buy.textContent = 'Opening checkout…';
            const result = await sendRuntime({ type: 'CREATE_CREDIT_CHECKOUT', payload: { pack, licenseKeys: keys } });
            if (result?.error) { saveMsg.style.color = '#DC2626'; saveMsg.textContent = result.error; }
            buy.disabled = false; buy.textContent = `Buy ${refill} more`;
          });
          card.appendChild(buy);
        }
        accountBox.appendChild(card);
      }
      if (status.errors?.length) accountBox.appendChild(el('div', 'color:#991B1B;margin-top:8px;', { textContent: status.errors.join(' ') }));
      return status;
    }

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveMsg.style.color = DS.muted;
      try {
        const keys = [];
        saveMsg.textContent = keys.length ? 'Validating licenses…' : 'Saving…';
        const status = keys.length ? await showAccount(keys) : { valid: false, errors: [] };
        if (keys.length && (!status?.valid || status.errors?.length)) {
          saveBtn.disabled = false;
          saveMsg.style.color = '#DC2626';
          saveMsg.textContent = status?.errors?.join(' ') || 'License key validation failed — check that the key is correct and try again.';
          return;
        }
        chrome.storage.local.set({
          ce_teacher_name:   nameIn.value.trim(),
          ce_license_key:    keys.join('\n'),
          ce_license_keys:   keys,
        }, () => {
          chrome.storage.local.remove(['ce_features','ce_quiz_toolbar_disabled','ce_scheduler_toolbar_disabled','ces_inbox_disabled']);
          saveBtn.disabled = false;
          saveMsg.style.color = DS.green;
          saveMsg.textContent = '✓ Saved — refresh Canvas to load package changes';
          setTimeout(() => { saveMsg.textContent = ''; }, 2500);
        });
      } catch(e) {
        saveBtn.disabled = false;
        saveMsg.style.color = '#DC2626';
        saveMsg.textContent = e.message || 'Could not save settings — check your connection and try again.';
      }
    });

    stack.appendChild(saveBtn);
    stack.appendChild(saveMsg);
    stack.appendChild(divider());

    if (globalThis.CEDataBackup) {
      stack.appendChild(globalThis.CEDataBackup.createSection({ accent: DS.blue }));
      stack.appendChild(divider());
    }

    if (globalThis.CEDataBackup?.createToolSection) {
      stack.appendChild(globalThis.CEDataBackup.createToolSection({ accent: DS.blue }));
      stack.appendChild(divider());
    }

    // About
    const about = el('div', `font-size:12px;color:${DS.muted};display:flex;flex-direction:column;gap:8px;`);
    const av = el('div', `font-weight:600;color:${DS.text};font-size:13px;`);
    av.textContent = `Canvas Enhancer v${chrome.runtime.getManifest().version}`;
    about.appendChild(av);

    const updateBtn = el('button', `
      padding:8px 16px;border-radius:3px;border:1px solid ${DS.border};
      background:#fff;color:${DS.text};font-size:12px;font-weight:600;
      cursor:pointer;font-family:${DS.font};width:100%;text-align:left;
    `, { type: 'button', textContent: 'Check for Updates' });
    updateBtn.addEventListener('click', async () => {
      updateBtn.disabled = true;
      updateBtn.textContent = 'Checking…';
      try {
        const { status } = await chrome.runtime.requestUpdateCheck();
        updateBtn.textContent = status === 'update_available' ? 'Update available — reload the extension to apply it' : status === 'no_update' ? '✓ Canvas Enhancer is up to date' : 'Update check unavailable';
      } catch (_) { updateBtn.textContent = 'Update check unavailable'; }
      setTimeout(() => { updateBtn.textContent = 'Check for Updates'; updateBtn.disabled = false; }, 3500);
    });
    about.appendChild(updateBtn);

    const uninstallBtn = el('button', `
      padding:8px 16px;border-radius:3px;border:1px solid #DC2626;
      background:#fff;color:#DC2626;font-size:12px;font-weight:600;
      cursor:pointer;font-family:${DS.font};width:100%;
      transition:background .12s,color .12s;text-align:left;
    `, { type: 'button', textContent: 'Uninstall Canvas Enhancer…' });
    uninstallBtn.addEventListener('mouseenter', () => { uninstallBtn.style.background = '#FEF2F2'; });
    uninstallBtn.addEventListener('mouseleave', () => { uninstallBtn.style.background = '#fff'; });
    uninstallBtn.addEventListener('click', () => {
      if (confirm('Uninstall the entire Canvas Enhancer extension? Export a backup first if you want to keep settings, templates, criteria, and schedules.')) {
        ceSendMessage({ type: 'UNINSTALL_SELF' }).catch(() => {});
      }
    });
    about.appendChild(uninstallBtn);
    stack.appendChild(about);

    dest.appendChild(stack);
    } catch(e) {
      console.error('[CE] Settings render error:', e);
      dest.innerHTML = `<div style="padding:20px;font-size:13px;color:#BC1212;">Settings failed to load.<br><code style="font-size:11px;">${e.message}</code></div>`;
    }
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
        return ceSendMessage({ type: 'CANVAS_API', payload: { url: origin + path, token: tok } })
          .catch(e => { if (e.message === 'reload-needed') ceShowReloadBanner(); return null; });
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
  let _auditCache = null;

  async function renderAudit(container = panelBody, opts = {}) {
    container.innerHTML = '';
    container.style.cssText = 'padding:0;overflow:hidden;display:flex;flex-direction:column;';

    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token'], r));
    const token = stored.ce_canvas_token || '';
    const courseId = opts.courseId || window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
    const assignmentId = opts.assignmentId || (new URLSearchParams(window.location.search)).get('assignment_id') || '';

    // ── HEADER ────────────────────────────────────────────────────────────────
    const hdrEl = el('div', `flex-shrink:0;padding:10px 14px 8px;border-bottom:1px solid ${DS.border};display:flex;align-items:center;gap:8px;`);
    const titleEl = el('div', `flex:1;font-size:13px;font-weight:700;color:${DS.text};`);
    titleEl.textContent = 'Academic Integrity Audit';
    const printBtn = el('button', `padding:3px 10px;font-size:11px;font-weight:600;color:${DS.muted};background:transparent;border:1px solid ${DS.border};border-radius:4px;cursor:pointer;font-family:${DS.font};`, { type:'button', textContent:'🖨 Print' });
    const rerunBtn = el('button', `padding:3px 10px;font-size:11px;font-weight:600;color:${DS.blue};background:transparent;border:1px solid ${DS.blue};border-radius:4px;cursor:pointer;font-family:${DS.font};`, { type:'button', textContent:'Re-run' });
    hdrEl.append(titleEl, printBtn, rerunBtn);
    container.appendChild(hdrEl);

    const subLine = el('div', `flex-shrink:0;padding:4px 14px 8px;font-size:11px;color:${DS.muted};border-bottom:1px solid ${DS.border};min-height:24px;`);
    subLine.textContent = courseId ? 'Loading…' : 'Open a Canvas assignment in SpeedGrader to run the audit.';
    container.appendChild(subLine);

    const scroll = el('div', 'flex:1;min-height:0;overflow-y:auto;');
    container.appendChild(scroll);
    const listWrap = el('div', 'display:flex;flex-direction:column;padding:8px 0;');
    scroll.appendChild(listWrap);

    // ── STATE ─────────────────────────────────────────────────────────────────
    let isRunning = false;
    let lastReport = _auditCache || null;
    let runError = null;
    const checkState = {
      read:        { label: 'Submission Reading',     status: 'pending', detail: '' },
      similarity:  { label: 'Submission Similarity',  status: 'pending', detail: '' },
      timing:      { label: 'Timing & File Patterns', status: 'pending', detail: '' },
      quizBlur:    { label: 'Quiz Tab Switching',      status: 'pending', detail: '' },
      quizSpeed:   { label: 'Quiz Completion Speed',   status: 'pending', detail: '' },
      quizAnswers: { label: 'Quiz Answer Matching',    status: 'pending', detail: '' },
    };

    printBtn.style.display = 'none';

    if (lastReport) {
      Object.entries(lastReport.checks || {}).forEach(([id, s]) => { if (checkState[id]) Object.assign(checkState[id], s); });
      subLine.textContent = `${lastReport.assignmentName} · ${lastReport.checked} of ${lastReport.total} submissions · ${new Date(lastReport.createdAt).toLocaleTimeString()}`;
      printBtn.style.display = '';
    }

    printBtn.addEventListener('click', () => {
      if (!lastReport) return;
      const activeIds = Object.entries(checkState)
        .filter(([, item]) => item.status !== 'skipped' && item.status !== 'unavailable' && item.status !== 'pending')
        .map(([id]) => id);
      if (!activeIds.length) return;
      openFullAuditReport(activeIds);
    });

    rerunBtn.addEventListener('click', () => {
      _auditCache = null;
      lastReport = null;
      runError = null;
      Object.values(checkState).forEach(c => { c.status = 'pending'; c.detail = ''; });
      runCheck();
    });

    function escapeReportHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function checkColors(s) {
      if (s === 'flagged')     return { dot:'#EF4444', label:'Flagged',        color:'#991B1B', accent:'#EF4444' };
      if (s === 'complete')    return { dot:'#22C55E', label:'Clear',           color:'#166534', accent:'#22C55E' };
      if (s === 'running')     return { dot:'#3B82F6', label:'Checking…',      color:'#1D4ED8', accent:'#93C5FD' };
      if (s === 'unavailable') return { dot:'#9CA3AF', label:'Not available',  color:'#6B7280', accent:'#D1D5DB' };
      if (s === 'skipped')     return { dot:'#D1D5DB', label:'N/A',             color:'#9CA3AF', accent:'#E5E7EB' };
      return                          { dot:'#D1D5DB', label:'Waiting',         color:'#9CA3AF', accent:'#E5E7EB' };
    }

    function updateCheck(id, statusValue, detail) {
      if (!checkState[id]) return;
      checkState[id].status = statusValue;
      if (detail !== undefined) checkState[id].detail = detail;
      if (isRunning) renderList();
    }

    function getInlineRows(checkId) {
      if (!lastReport) return [];
      if (checkId === 'similarity')
        return (lastReport.flags || []).slice(0, 8).map(f => ({
          a: `${f.aName}  ↔  ${f.bName}`,
          b: `${Math.round(f.similarity * 100)}% overlap · ${f.sharedCount} shared phrases`,
        }));
      if (checkId === 'timing')
        return (lastReport.timingFlags || []).slice(0, 8).map(f => ({
          a: f.type === 'sameFilename' ? `Same filename: "${f.filename}"` : 'Submitted in same 2-minute window',
          b: f.names.slice(0, 3).join(', ') + (f.names.length > 3 ? ` +${f.names.length - 3} more` : ''),
        }));
      if (checkId === 'quizBlur')
        return (lastReport.quizBlurFlags || []).slice(0, 8).map(f => ({
          a: f.name,
          b: `${f.blurCount} tab switch${f.blurCount === 1 ? '' : 'es'} recorded`,
        }));
      if (checkId === 'quizSpeed')
        return (lastReport.quizSpeedFlags || []).slice(0, 8).map(f => ({
          a: f.name,
          b: `${f.pct}% of time used · ${f.scorePct}% score`,
        }));
      if (checkId === 'quizAnswers')
        return (lastReport.quizAnswerPairs || []).slice(0, 8).map(p => ({
          a: `${p.aName}  ↔  ${p.bName}`,
          b: `${p.matchCount} matching wrong answer${p.matchCount === 1 ? '' : 's'}`,
        }));
      return [];
    }

    function renderList() {
      listWrap.innerHTML = '';

      if (runError) {
        const err = el('div', `margin:12px 14px;padding:10px 12px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;font-size:12px;color:#991B1B;`);
        err.textContent = runError;
        listWrap.appendChild(err);
        return;
      }

      if (isRunning) {
        const running = el('div', `padding:10px 14px;font-size:12px;color:${DS.muted};`);
        running.textContent = 'Keep this panel open while checks run…';
        listWrap.appendChild(running);
      }

      if (lastReport && !isRunning) {
        const totalFlags = (lastReport.flags?.length || 0) + (lastReport.timingFlags?.length || 0) +
          (lastReport.quizBlurFlags?.length || 0) + (lastReport.quizSpeedFlags?.length || 0) +
          (lastReport.quizAnswerPairs?.length || 0);
        const summaryRow = el('div', `display:flex;align-items:center;gap:8px;padding:10px 14px;`);
        const summaryDot = el('span', `width:9px;height:9px;border-radius:50%;background:${totalFlags ? '#EF4444' : '#22C55E'};flex-shrink:0;`);
        const summaryText = el('div', `font-size:13px;font-weight:700;color:${totalFlags ? '#991B1B' : '#166534'};`);
        summaryText.textContent = totalFlags ? `${totalFlags} item${totalFlags !== 1 ? 's' : ''} flagged for review` : '✓ All clear — nothing flagged';
        summaryRow.append(summaryDot, summaryText);
        listWrap.appendChild(summaryRow);
        listWrap.appendChild(el('div', `height:1px;background:${DS.border};margin:0 14px 6px;`));
      }

      for (const [id, item] of Object.entries(checkState)) {
        // Hide checks that don't apply to this assignment type once the run is done
        if (!isRunning && lastReport && (item.status === 'skipped' || item.status === 'unavailable')) continue;

        const c = checkColors(item.status);
        const isFlagged = item.status === 'flagged';
        const rows = (isFlagged && lastReport) ? getInlineRows(id) : [];

        const row = el('div', `display:flex;align-items:center;gap:10px;padding:7px 14px;border-left:3px solid ${c.accent};`);
        const dot = el('span', `width:7px;height:7px;border-radius:50%;background:${c.dot};flex-shrink:0;`);
        const name = el('div', `flex:1;font-size:12px;font-weight:600;color:${DS.text};`);
        name.textContent = item.label;
        const statusLbl = el('div', `font-size:11px;font-weight:600;color:${c.color};white-space:nowrap;`);
        statusLbl.textContent = c.label;
        row.append(dot, name, statusLbl);
        listWrap.appendChild(row);

        if (item.detail) {
          const detail = el('div', `font-size:11px;color:${DS.muted};padding:1px 14px 5px 34px;line-height:1.4;`);
          detail.textContent = item.detail;
          listWrap.appendChild(detail);
        }

        if (rows.length) {
          const sub = el('div', `padding:2px 14px 4px 34px;display:flex;flex-direction:column;`);
          rows.forEach((r, i) => {
            const rEl = el('div', `display:flex;gap:8px;padding:4px 0;${i > 0 ? `border-top:1px solid ${DS.border};` : ''}`);
            const a = el('div', `flex:1;font-size:11px;font-weight:600;color:${DS.text};`); a.textContent = r.a;
            const b = el('div', `font-size:11px;color:${DS.muted};white-space:nowrap;`); b.textContent = r.b;
            rEl.append(a, b); sub.appendChild(rEl);
          });
          listWrap.appendChild(sub);
          const rbtn = el('button', `margin:2px 14px 8px 34px;padding:3px 10px;font-size:11px;color:${DS.blue};border:1px solid ${DS.blue};border-radius:4px;background:transparent;cursor:pointer;font-family:${DS.font};`, { type:'button', textContent:'Open full report →' });
          rbtn.addEventListener('click', () => openCheckReport(id));
          listWrap.appendChild(rbtn);
        }

        listWrap.appendChild(el('div', `height:1px;background:${DS.border};margin:0 14px;opacity:.4;`));
      }

      if (lastReport && !isRunning) {
        const disc = el('div', `margin:10px 14px 4px;font-size:10px;color:${DS.muted};line-height:1.5;`);
        disc.textContent = 'Results are for instructor review only. Canvas Enhancer does not determine whether academic misconduct occurred. Use professional judgment before taking any action.';
        listWrap.appendChild(disc);
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
      const parsed = await ceSendMessage({
        type: 'PARSE_FILE',
        payload: {
          fileUrl: url,
          token,
          filename: att.filename || att.display_name || 'file',
          mimeType: att['content-type'] || att.content_type || '',
        },
      }).catch(e => { if (e.message === 'reload-needed') { ceShowReloadBanner(); throw e; } throw e; });
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

    function tableOrEmpty(rows, cols, message) {
      return rows || `<tr><td colspan="${cols}">${escapeReportHtml(message)}</td></tr>`;
    }

    function checkReportRows(checkId, report) {
      if (checkId === 'read') {
        return {
          title: 'Canvas Submission Reading',
          help: 'This shows which student submissions were successfully read and included in the similarity and pattern checks. Submissions with very short text (fewer than 40 meaningful words) are excluded because they are too brief for reliable comparison. If a student you expected to see is missing, check whether they submitted text, a URL, or a file — only text-based submissions can be read. Image-only or unsupported file formats are skipped.',
          head: '<tr><th>Student</th><th>Readable Words</th><th>What to Check</th></tr>',
          body: tableOrEmpty((report.docs || []).map(doc => `
            <tr><td>${escapeReportHtml(doc.name)}</td><td>${doc.tokens}</td><td>Submission was read and included in all applicable checks. If the word count seems unexpectedly low, open the submission in SpeedGrader and verify the text content.</td></tr>
          `).join(''), 3, 'No readable submissions were available. All submissions may be image files, blank, or in an unsupported format.'),
        };
      }
      if (checkId === 'similarity') {
        return {
          title: 'Canvas Submission Similarity',
          help: 'This check compares every student\'s submission text against every other student\'s submission using overlapping phrase matching (shingles). A pair is flagged when 22% or more of their phrase patterns overlap, or when they share 18 or more identical five-word sequences. High similarity does NOT mean cheating — it can result from shared templates, quoted source material, a common prompt structure, or authorized group work. Your job is to open each flagged pair in SpeedGrader, read both submissions, and decide whether the overlap is expected or warrants further inquiry under your course policy.',
          head: '<tr><th>Student A</th><th>Student B</th><th>Overlap Score</th><th>Shared Phrases Found</th><th>What to Do</th></tr>',
          body: tableOrEmpty((report.flags || []).map(flag => `
            <tr>
              <td>${escapeReportHtml(flag.aName)}</td>
              <td>${escapeReportHtml(flag.bName)}</td>
              <td style="font-weight:700">${Math.round(flag.similarity * 100)}% overlap (${flag.sharedCount} shared phrases)</td>
              <td style="font-size:11px">${flag.samples.map(escapeReportHtml).join('<br>')}</td>
              <td>Open both submissions in SpeedGrader and read them side by side. Check whether: (1) the shared phrases come from the prompt or a provided template, (2) both students cited the same source, (3) collaboration was explicitly permitted, or (4) the overlap is unexplained. If unexplained, follow your institution\'s academic integrity policy before taking any action.</td>
            </tr>
          `).join(''), 5, 'No submission pairs met the similarity threshold. All student submissions appear sufficiently distinct from one another.'),
        };
      }
      if (checkId === 'timing') {
        return {
          title: 'Canvas Timing Signals',
          help: 'This check looks for two Canvas-recorded patterns that can (but do not always) indicate shared work: (1) Three or more students submitting within the same two-minute window — possible if students coordinated submission times, though it also happens when a class deadline approaches and everyone submits at once; and (2) Two or more students uploading a file with the exact same filename — possible if students shared a file, though common generic names like "essay.docx" are excluded. Neither pattern is proof of misconduct. They are starting points for your own review.',
          head: '<tr><th>Signal Type</th><th>Students Involved</th><th>Canvas Detail</th><th>What to Do</th></tr>',
          body: tableOrEmpty((report.timingFlags || []).map(item => `
            <tr>
              <td style="font-weight:700">${escapeReportHtml(item.type === 'sameFilename' ? 'Identical filename uploaded by multiple students' : 'Multiple students submitted within the same 2-minute window')}</td>
              <td>${escapeReportHtml(item.names.join(', '))}</td>
              <td style="font-size:11px">${escapeReportHtml(item.filename ? `File: "${item.filename}"` : item.submittedAt ? `Around: ${item.submittedAt}` : '')} — ${escapeReportHtml(item.detail)}</td>
              <td>${item.type === 'sameFilename'
                ? 'Open each listed submission in SpeedGrader and compare the file contents, not just the filename. Different students sometimes name files identically without any coordination. If the file contents also match closely, that is a stronger signal — combine with the Similarity check results.'
                : 'Review the listed submissions in SpeedGrader. A shared submission window is common near deadlines and is rarely significant on its own. It becomes more meaningful if it also appears alongside a high similarity score for the same pair of students.'
              }</td>
            </tr>
          `).join(''), 4, 'No Canvas timing clusters or repeated filenames were found across submissions.'),
        };
      }
      if (checkId === 'quizBlur') {
        return {
          title: 'Quiz Tab-Switching (Focus Loss Events)',
          help: 'Canvas logs a "page_blurred" event every time a student\'s browser focus leaves the quiz tab during an attempt. This check flags students who had 3 or more focus-loss events. A few events are common and usually benign — a notification, accidentally switching windows, or using accessibility tools. A high count (10+) during a short timed quiz is more unusual. This data is only available if Canvas logged session events for the quiz, which is not guaranteed for all quiz types or institution settings.',
          head: '<tr><th>Student</th><th>Tab-Switch Events</th><th>What This Means</th><th>What to Do</th></tr>',
          body: tableOrEmpty((report.quizBlurFlags || []).map(item => `
            <tr>
              <td>${escapeReportHtml(item.name)}</td>
              <td style="font-weight:700;font-size:16px">${escapeReportHtml(String(item.blurCount))}</td>
              <td>Canvas recorded ${escapeReportHtml(String(item.blurCount))} focus-loss event${item.blurCount === 1 ? '' : 's'} during this student\'s quiz attempt. Each event means the quiz tab lost browser focus — the student switched to another window, tab, or application.</td>
              <td>Before drawing any conclusions: (1) Check whether the student uses a screen reader, accessibility overlay, or secondary display — these can trigger focus events innocently. (2) Consider the quiz length and time limit — more events over a longer quiz are less significant than the same count on a 10-minute quiz. (3) If the count is high and the student also scored well in a short time, cross-reference with the Quiz Speed check. (4) If you decide to follow up, ask the student to explain their environment during the exam before referencing this data.</td>
            </tr>
          `).join(''), 4, 'No tab-switching flags found. Either no students met the threshold, or Canvas did not log session events for this quiz type.'),
        };
      }
      if (checkId === 'quizSpeed') {
        return {
          title: 'Quiz Completion Speed',
          help: 'This check flags students who (1) completed the quiz in less than 25% of the allotted time AND (2) scored above 65%. Together these two conditions suggest the student may have had access to answers before the attempt. Either condition alone is not significant — fast completion could mean strong preparation, and a low score at fast speed is not concerning. Only the combination of very fast AND high-scoring is flagged. This check requires the quiz to have a time limit set in Canvas.',
          head: '<tr><th>Student</th><th>Time Spent</th><th>% of Time Limit Used</th><th>Score</th><th>What to Do</th></tr>',
          body: tableOrEmpty((report.quizSpeedFlags || []).map(item => {
            const mins = Math.floor(item.timeSpent / 60);
            const secs = item.timeSpent % 60;
            return `<tr>
              <td>${escapeReportHtml(item.name)}</td>
              <td>${escapeReportHtml(`${mins}m ${secs}s`)}</td>
              <td style="font-weight:700">${escapeReportHtml(String(item.pct))}% of the time limit</td>
              <td>${escapeReportHtml(String(item.score))} / ${escapeReportHtml(String(item.possible))} (${escapeReportHtml(String(item.scorePct))}%)</td>
              <td>Before drawing conclusions: (1) Check if the quiz allows multiple attempts — the student may have reviewed the questions on a prior attempt. (2) Check if the questions were previously available (practice quiz, preview, etc.). (3) A student who is very well-prepared can legitimately complete a quiz quickly. (4) If the combination is unexplained and the margin is extreme (under 10% of time, over 90% score), consider comparing their responses with the class median and reviewing any essay-style answers for signs of pre-preparation.</td>
            </tr>`;
          }).join(''), 5, 'No unusually fast high-scoring submissions found, or this quiz does not have a time limit configured in Canvas.'),
        };
      }
      if (checkId === 'quizAnswers') {
        return {
          title: 'Quiz Wrong-Answer Matching',
          help: 'This check identifies student pairs who selected the same wrong answer on 2 or more quiz questions. Correct answers are excluded — if two students both get a question right, that tells you nothing. But choosing the same specific wrong answer on multiple questions is statistically improbable by chance, especially on multiple-choice quizzes with several options per question. This is one of the strongest signals in this audit tool because it suggests the students may have coordinated their responses or shared answers during the quiz.',
          head: '<tr><th>Student A</th><th>Student B</th><th>Matching Wrong Answers</th><th>What to Do</th></tr>',
          body: tableOrEmpty((report.quizAnswerPairs || []).map(item => `
            <tr>
              <td>${escapeReportHtml(item.aName)}</td>
              <td>${escapeReportHtml(item.bName)}</td>
              <td style="font-weight:700;font-size:16px">${escapeReportHtml(String(item.matchCount))} question${item.matchCount === 1 ? '' : 's'}</td>
              <td>These two students chose the same incorrect answer on ${escapeReportHtml(String(item.matchCount))} question${item.matchCount === 1 ? '' : 's'}. Steps to take: (1) Open both Canvas quiz submissions and identify which questions have matching wrong answers. (2) Consider how many answer options each of those questions had — matching on a 5-option question is more significant than on a true/false. (3) Check whether the students sit near each other, share a study group, or have a pattern of submitting at the same time (see the Timing check). (4) If the evidence builds across multiple checks, follow your institution\'s academic integrity reporting process before speaking with the students.</td>
            </tr>
          `).join(''), 4, 'No matching wrong-answer patterns found. Either students answered differently on incorrect questions, or answer-level submission data was unavailable for this quiz type.'),
        };
      }
      return {
        title: 'Audit Check',
        help: 'No details are available for this check.',
        head: '<tr><th>Status</th></tr>',
        body: '<tr><td>No details available.</td></tr>',
      };
    }

    function openFullAuditReport(checkIds) {
      if (!lastReport) return;
      const report = lastReport;
      const generated = new Date(report.createdAt).toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const checkExplain = {
        read:        'Reads the text of each student submission to prepare for comparison.',
        similarity:  'Compares every pair of submissions for shared 5-word phrases. High overlap may indicate copied work.',
        timing:      'Checks submission timestamps and uploaded filenames for clusters or identical file names.',
        quizBlur:    'Counts how many times each student left the quiz tab (3+ times is flagged).',
        quizSpeed:   'Flags students who finished in under 20% of the time limit while scoring 80%+.',
        quizAnswers: 'Finds student pairs who chose the same incorrect answer on 2 or more questions.',
      };
      const statusColor = s => ({ flagged:'#991B1B', complete:'#166534', unavailable:'#6B7280' }[s] || '#6B7280');
      const statusBg    = s => ({ flagged:'#FEF2F2', complete:'#ECFDF3', unavailable:'#F9FAFB' }[s] || '#F9FAFB');
      const statusBorder = s => ({ flagged:'#FCA5A5', complete:'#86EFAC', unavailable:'#D1D5DB' }[s] || '#E5E7EB');
      const statusLabel  = s => ({ flagged:'Flagged', complete:'Clear', unavailable:'Not available' }[s] || s);

      const sections = checkIds.map(id => {
        const item = checkState[id];
        const detail = checkReportRows(id, report);
        const isFlagged = item.status === 'flagged';
        return `
          <div class="section">
            <div class="section-header">
              <div class="section-title">${escapeReportHtml(detail.title)}</div>
              <div class="badge" style="background:${statusBg(item.status)};color:${statusColor(item.status)};border-color:${statusBorder(item.status)}">${escapeReportHtml(statusLabel(item.status))}</div>
            </div>
            <div class="section-body">
              <div class="explain"><strong>What this check does:</strong> ${escapeReportHtml(checkExplain[id] || '')}</div>
              ${item.detail ? `<div class="finding">${escapeReportHtml(item.detail)}</div>` : ''}
              ${isFlagged ? `<table><thead>${detail.head}</thead><tbody>${detail.body}</tbody></table>` : '<div class="finding">No items flagged by this check.</div>'}
            </div>
          </div>`;
      }).join('');

      const totalFlags = (report.flags?.length || 0) + (report.timingFlags?.length || 0) +
        (report.quizBlurFlags?.length || 0) + (report.quizSpeedFlags?.length || 0) +
        (report.quizAnswerPairs?.length || 0);

      const html = `<!doctype html><html lang="en"><head>
        <meta charset="utf-8">
        <title>Academic Integrity Report — ${escapeReportHtml(report.assignmentName)}</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:Arial,sans-serif;color:#1f2937;background:#f3f4f6;line-height:1.5}
          .header{background:#1a2332;color:#fff;padding:28px 40px 24px;}
          .header-eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;}
          .header h1{font-size:22px;font-weight:800;margin-bottom:4px;}
          .header-sub{font-size:13px;color:#cbd5e1;margin-top:6px;}
          .header-meta{font-size:11px;color:#94a3b8;margin-top:10px;display:flex;gap:24px;flex-wrap:wrap;}
          .header-summary{display:inline-block;margin-top:14px;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:700;background:${totalFlags ? '#7f1d1d' : '#14532d'};color:#fff;}
          .print-btn{position:fixed;top:18px;right:18px;padding:8px 18px;background:#fff;color:#1a2332;border:2px solid #e2e8f0;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);}
          .print-btn:hover{background:#f1f5f9}
          .body{padding:28px 40px;max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:22px;}
          .disclaimer{background:#FFF7ED;border:1px solid #FED7AA;border-left:5px solid #F97316;border-radius:6px;padding:16px 20px;}
          .disclaimer h2{font-size:13px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;}
          .disclaimer p{font-size:12px;color:#7c3504;line-height:1.65;}
          .section{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;}
          .section-header{padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;}
          .section-title{font-size:14px;font-weight:700;color:#1f2937;flex:1;}
          .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid;}
          .section-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px;}
          .explain{font-size:12px;color:#4b5563;line-height:1.6;}
          .finding{font-size:12px;color:#6b7280;font-style:italic;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          th{background:#f8fafc;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;padding:9px 10px;text-align:left;border-bottom:2px solid #e5e7eb;}
          td{padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#374151;}
          tr:last-child td{border-bottom:none}
          tr:nth-child(even) td{background:#f9fafb}
          .footer{font-size:11px;color:#9ca3af;text-align:center;padding:12px;}
          @media print{.print-btn{display:none}body{background:#fff}.section{break-inside:avoid}}
        </style></head><body>
        <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
        <div class="header">
          <div class="header-eyebrow">Canvas Enhancer — Academic Integrity Report</div>
          <h1>${escapeReportHtml(report.assignmentName)}</h1>
          <div class="header-sub">Academic Integrity Audit</div>
          <div class="header-meta">
            <span>Generated: ${escapeReportHtml(generated)}</span>
            <span>Submissions analyzed: ${escapeReportHtml(String(report.checked))} of ${escapeReportHtml(String(report.total))}</span>
          </div>
          <div class="header-summary">${totalFlags ? `⚠ ${totalFlags} item${totalFlags !== 1 ? 's' : ''} flagged for review` : '✓ All clear — nothing flagged'}</div>
        </div>
        <div class="body">
          <div class="disclaimer">
            <h2>⚠ Important — Teacher Verification Required</h2>
            <p>This report identifies patterns in Canvas data that <strong>may warrant a closer look</strong>. It does <strong>not</strong> determine whether academic misconduct occurred, and it is <strong>not</strong> evidence of cheating. Every item flagged here is a signal, not a conclusion.</p>
            <p style="margin-top:8px"><strong>Only the instructor</strong> can determine whether a policy violation took place. No action should be taken against any student based on this report alone. Professional judgment, conversation with students, and review of all available context are essential before drawing any conclusions.</p>
          </div>
          ${sections}
          <div class="footer">Report generated by Canvas Enhancer · ${escapeReportHtml(generated)} · For instructor use only</div>
        </div>
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    }

    function openCheckReport(checkId) {
      if (!lastReport) return;
      const report = lastReport;
      const item = (report.checks || checkState)[checkId] || checkState[checkId];
      const statusLabel = checkColors(item?.status || 'pending').label;
      const statusColor = { flagged:'#991B1B', complete:'#166534', unavailable:'#6B7280', skipped:'#9CA3AF' }[item?.status] || '#9CA3AF';
      const statusBg    = { flagged:'#FEF2F2', complete:'#ECFDF3', unavailable:'#F9FAFB', skipped:'#FFFBEB' }[item?.status] || '#F9FAFB';
      const statusBorder = { flagged:'#FCA5A5', complete:'#86EFAC', unavailable:'#D1D5DB', skipped:'#FCD34D' }[item?.status] || '#E5E7EB';
      const detail = checkReportRows(checkId, report);
      const generated = new Date(report.createdAt).toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const isFlagged = item?.status === 'flagged';

      const checkExplain = {
        read:        'Reads the text content of each student submission to prepare for analysis.',
        similarity:  'Compares every pair of submissions using shingling — a technique that detects shared 5-word phrases. A flag means two submissions share an unusually high percentage of text or a large number of identical phrases.',
        timing:      'Checks Canvas submission timestamps and uploaded filenames. A flag means two or more students submitted within the same 2-minute window, or uploaded files with identical names.',
        quizBlur:    'Uses Canvas quiz session logs to count how many times each student navigated away from the quiz tab. A flag means a student left the tab 3 or more times.',
        quizSpeed:   'Compares each student\'s completion time to the quiz time limit. A flag means a student finished in under 20% of allowed time while scoring 80% or higher.',
        quizAnswers: 'Looks for pairs of students who selected the same incorrect answer on 2 or more questions — a pattern that may indicate coordination.',
      };

      const html = `<!doctype html><html lang="en"><head>
        <meta charset="utf-8">
        <title>Academic Integrity Report — ${escapeReportHtml(report.assignmentName)}</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:Arial,sans-serif;color:#1f2937;background:#f3f4f6;line-height:1.5}
          .header{background:#1a2332;color:#fff;padding:28px 40px 24px;}
          .header-eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;}
          .header h1{font-size:22px;font-weight:800;margin-bottom:4px;}
          .header-sub{font-size:13px;color:#cbd5e1;margin-top:6px;}
          .header-meta{font-size:11px;color:#94a3b8;margin-top:10px;display:flex;gap:24px;flex-wrap:wrap;}
          .print-btn{position:fixed;top:18px;right:18px;padding:8px 18px;background:#fff;color:#1a2332;border:2px solid #e2e8f0;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);}
          .print-btn:hover{background:#f1f5f9}
          .body{padding:28px 40px;max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:22px;}
          .disclaimer{background:#FFF7ED;border:1px solid #FED7AA;border-left:5px solid #F97316;border-radius:6px;padding:16px 20px;}
          .disclaimer h2{font-size:13px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;}
          .disclaimer p{font-size:12px;color:#7c3504;line-height:1.65;}
          .section{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;}
          .section-header{padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;}
          .section-title{font-size:14px;font-weight:700;color:#1f2937;flex:1;}
          .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${statusBg};color:${statusColor};border:1px solid ${statusBorder};}
          .section-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px;}
          .explain{font-size:12px;color:#4b5563;line-height:1.6;}
          .finding{font-size:12px;color:#6b7280;font-style:italic;line-height:1.5;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          th{background:#f8fafc;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;padding:9px 10px;text-align:left;border-bottom:2px solid #e5e7eb;}
          td{padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#374151;}
          tr:last-child td{border-bottom:none}
          tr:nth-child(even) td{background:#f9fafb}
          .footer{font-size:11px;color:#9ca3af;text-align:center;padding:12px;}
          @media print{
            .print-btn{display:none}
            body{background:#fff}
            .section{break-inside:avoid}
          }
        </style></head><body>
        <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
        <div class="header">
          <div class="header-eyebrow">Canvas Enhancer — Academic Integrity Report</div>
          <h1>${escapeReportHtml(detail.title)}</h1>
          <div class="header-sub">${escapeReportHtml(report.assignmentName)}</div>
          <div class="header-meta">
            <span>Generated: ${escapeReportHtml(generated)}</span>
            <span>Submissions analyzed: ${escapeReportHtml(String(report.checked))} of ${escapeReportHtml(String(report.total))}</span>
          </div>
        </div>
        <div class="body">
          <div class="disclaimer">
            <h2>⚠ Important — Teacher Verification Required</h2>
            <p>This report identifies patterns in Canvas data that <strong>may warrant a closer look</strong>. It does <strong>not</strong> determine whether academic misconduct occurred, and it is <strong>not</strong> evidence of cheating. Every item flagged here is a signal, not a conclusion.</p>
            <p style="margin-top:8px"><strong>Only the instructor</strong> can determine whether a policy violation took place. No action should be taken against any student based on this report alone. Professional judgment, conversation with students, and review of all available context are essential before drawing any conclusions.</p>
          </div>
          <div class="section">
            <div class="section-header">
              <div class="section-title">${escapeReportHtml(detail.title)}</div>
              <div class="badge">${escapeReportHtml(statusLabel)}</div>
            </div>
            <div class="section-body">
              <div class="explain"><strong>What this check does:</strong> ${escapeReportHtml(checkExplain[checkId] || '')}</div>
              ${item?.detail ? `<div class="finding">${escapeReportHtml(item.detail)}</div>` : ''}
              ${isFlagged ? `<table><thead>${detail.head}</thead><tbody>${detail.body}</tbody></table>` : ''}
              ${!isFlagged && item?.status !== 'pending' ? `<div class="finding">No items were flagged by this check.</div>` : ''}
            </div>
          </div>
          <div class="footer">Report generated by Canvas Enhancer · ${escapeReportHtml(generated)} · For instructor use only</div>
        </div>
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    }

    async function runCheck() {
      if (!token) { runError = 'Add a Canvas API token in Settings first.'; renderList(); return; }
      if (!courseId || !assignmentId) { runError = 'Unable to determine assignment from this page. Open this audit from a SpeedGrader assignment page.'; renderList(); return; }

      runError = null;
      checkState.read.status = 'running'; checkState.read.detail = 'Loading Canvas submissions and reading available text.';
      checkState.similarity.status = 'pending'; checkState.similarity.detail = 'Waiting for readable Canvas submissions.';
      checkState.timing.status = 'pending'; checkState.timing.detail = 'Waiting for Canvas submission timestamps and uploaded files.';
      checkState.quizBlur.status = 'pending'; checkState.quizBlur.detail = 'Waiting to see if this assignment has quiz event data.';
      checkState.quizSpeed.status = 'pending'; checkState.quizSpeed.detail = 'Waiting to see if this assignment has timed quiz data.';
      checkState.quizAnswers.status = 'pending'; checkState.quizAnswers.detail = 'Waiting to see if this assignment has answer-level quiz data.';
      isRunning = true;
      rerunBtn.disabled = true;
      rerunBtn.textContent = 'Running…';
      renderList();

      try {
        const assignment = await canvasFetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
        const quizId = assignment.data?.quiz_id;
        const submissions = await canvasFetchAll(`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions?include[]=user&include[]=attachments&per_page=100`);
        const submittedSubmissions = submissions.filter(s => s.workflow_state !== 'unsubmitted');
        const candidates = submittedSubmissions.filter(s => s.body || s.url || s.attachments?.length);
        const docs = [];

        for (let i = 0; i < candidates.length; i++) {
          const subm = candidates[i];
          const name = subm.user?.sortable_name || subm.user?.name || `Student ${subm.user_id}`;
          const text = await submissionText(subm);
          const toks = tokensFor(text);
          if (toks.length >= 40) docs.push({ id: subm.user_id, name, text, shingles: shingles(toks), tokens: toks.length });
        }

        updateCheck('read', docs.length ? 'complete' : 'skipped', `Read ${docs.length} usable submissions from ${submittedSubmissions.length} Canvas submissions.`);
        updateCheck('similarity', docs.length >= 2 ? 'running' : 'skipped', docs.length >= 2 ? `Comparing ${docs.length} readable submissions.` : 'At least two readable submissions are needed for comparison.');
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

            const [quizInfo, quizSubs] = await Promise.all([
              canvasFetch(`/api/v1/courses/${courseId}/quizzes/${quizId}`),
              canvasFetchQuizSubmissions(courseId, quizId),
            ]);
            const timeLimitMinutes = quizInfo.data?.time_limit || 0;

            quizSpeedFlags = runQuizSpeedCheck(quizSubs, timeLimitMinutes);
            updateCheck('quizSpeed',
              !timeLimitMinutes ? 'skipped' : quizSpeedFlags.length ? 'flagged' : 'complete',
              !timeLimitMinutes ? 'Quiz has no time limit — speed check skipped.' :
              quizSpeedFlags.length ? `${quizSpeedFlags.length} submission${quizSpeedFlags.length === 1 ? '' : 's'} completed unusually fast with a high score.` :
              'No unusually fast high-scoring submissions found.'
            );

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
        _auditCache = lastReport;
        isRunning = false;
        rerunBtn.disabled = false;
        rerunBtn.textContent = 'Re-run';
        printBtn.style.display = '';
        subLine.textContent = `${lastReport.assignmentName} · ${lastReport.checked} of ${lastReport.total} submissions · ${new Date(lastReport.createdAt).toLocaleTimeString()}`;
        renderList();
      } catch (e) {
        runError = e.message;
        isRunning = false;
        rerunBtn.disabled = false;
        rerunBtn.textContent = 'Re-run';
        renderList();
      }
    }

    if (_auditCache) {
      renderList();
    } else {
      runCheck();
    }

  }

  async function renderNotes(target) {
    const dest = target || panelBody;
    dest.innerHTML = '';
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
    dest.appendChild(wrap);
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
    if (vitalsModal.style.display   !== 'none') { vitalsModal.style.display   = 'none'; setActive(null); }
    if (atRiskModal.style.display   !== 'none') { atRiskModal.style.display   = 'none'; setActive(null); }
    if (ngModal.style.display       !== 'none') { closeNgModal(); }
  }

  function closeNgModal() {
    ngModal.style.display = 'none';
    if (_active === 'needs-graded') setActive(null);
  }

  async function showNgModal() {
    if (ngModal.style.display !== 'none') { closeNgModal(); return; }
    setActive('needs-graded');
    ngBox.innerHTML = '';

    const desc = makeHelpDescPanel('A complete grading queue pulled from all your active Canvas courses in one place. Canvas spreads your ungraded work across every individual course — this brings everything together so you can see it all at once. Each row shows the course name, the assignment, the due date, and how many students are still waiting to be graded. Click any row to jump directly into SpeedGrader for that assignment and start grading right away.');
    const hdr = el('div', `flex-shrink:0;height:52px;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;`);
    const ico = el('span', `font-size:18px;line-height:1;`); ico.textContent = '✏️';
    const ttl = el('span', `flex:1;font-size:14px;font-weight:700;color:#fff;letter-spacing:.2px;`); ttl.textContent = 'Grade Queue';
    hdr.append(ico, ttl, makeHelpQBtn(desc), makeModalCloseBtn(closeNgModal));
    ngBox.append(hdr, desc);

    const body = el('div', `flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;background:#F8FAFC;padding:24px;box-sizing:border-box;`);
    ngBox.appendChild(body);

    ngModal.style.display = 'flex';
    await loadNeedsGrading(body);
  }

  async function loadNeedsGrading(body) {
    function msg(text, color) {
      body.innerHTML = '';
      const m = el('div', `padding:48px 20px;text-align:center;font-size:13px;color:${color || DS.muted};line-height:1.6;`);
      m.textContent = text; body.appendChild(m);
    }
    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token'], r));
    const tok = stored.ce_canvas_token;
    const origin = window.location.origin;
    if (!tok) { msg('Add your Canvas API token in Settings first.'); return; }
    msg('Loading…');
    function apiCall(path) {
      return ceSendMessage({ type: 'CANVAS_API', payload: { url: origin + path, token: tok } })
        .catch(e => { if (e.message === 'reload-needed') ceShowReloadBanner(); return null; });
    }
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
      body.innerHTML = '';
      const totalSubmissions = pending.reduce((sum, item) => sum + (item.needs_grading_count ?? item.assignment?.needs_grading_count ?? 0), 0);
      const courseCount = new Set(pending.map(item => item.assignment?.course_id).filter(Boolean)).size;
      const hero = el('div', `background:#fff;border-radius:16px;padding:28px 32px;display:flex;align-items:center;gap:28px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:20px;`);
      const circle = el('div', `width:110px;height:110px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${totalSubmissions ? '#D97706' : DS.green};color:#fff;font-weight:800;font-size:36px;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.15);`);
      circle.innerHTML = String(totalSubmissions) + '<small style="font-size:12px;font-weight:600;opacity:.9;margin-top:2px">TO GRADE</small>';
      const heroCopy = el('div', ``);
      const heroTitle = el('div', `font-size:22px;font-weight:700;color:#1E293B;margin-bottom:6px;`);
      heroTitle.textContent = totalSubmissions ? 'Your grading queue is ready' : 'You are all caught up';
      const heroDesc = el('div', `font-size:14px;color:#64748B;line-height:1.5;`);
      heroDesc.textContent = totalSubmissions
        ? `${pending.length} assignment${pending.length === 1 ? '' : 's'} across ${courseCount} course${courseCount === 1 ? '' : 's'}. Start with the oldest due date below.`
        : 'There are no submissions waiting for a grade.';
      heroCopy.append(heroTitle, heroDesc);
      hero.append(circle, heroCopy);
      body.appendChild(hero);

      const queueCard = el('div', `background:#fff;border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);`);
      const queueTitle = el('div', `font-size:16px;font-weight:700;color:#1E293B;margin-bottom:10px;`);
      queueTitle.textContent = 'Assignments Waiting';
      queueCard.appendChild(queueTitle);
      body.appendChild(queueCard);
      if (!pending.length) {
        const clear = el('div', `padding:32px 20px;text-align:center;font-size:13px;color:${DS.green};border-top:1px solid #F1F5F9;`);
        clear.textContent = '✓ Nothing needs grading right now.';
        queueCard.appendChild(clear);
        return;
      }
      for (const item of pending) {
        const a = item.assignment;
        const cid = a.course_id;
        const sgUrl = `${origin}/courses/${cid}/gradebook/speed_grader?assignment_id=${a.id}`;
        const row = document.createElement('a');
        row.href = sgUrl;
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:13px 16px;text-decoration:none;border-bottom:1px solid ${DS.border};transition:background .12s;`;
        const left = el('div', `min-width:0;flex:1;`);
        const courseLbl = el('div', `font-size:10px;color:${DS.muted};text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
        courseLbl.textContent = courseNames[cid] || 'Course ' + cid;
        const name = el('div', `font-size:13px;font-weight:600;color:${DS.blue};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
        name.textContent = a.name;
        const due = el('div', `font-size:11px;color:${DS.muted};margin-top:3px;`);
        due.textContent = a.due_at
          ? 'Due ' + new Date(a.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'No due date';
        left.append(courseLbl, name, due);
        const badge = el('div', `flex-shrink:0;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;`);
        badge.textContent = (item.needs_grading_count ?? a.needs_grading_count ?? '?') + ' to grade';
        row.append(left, badge);
        row.addEventListener('mouseenter', () => row.style.background = DS.gray);
        row.addEventListener('mouseleave', () => row.style.background = '');
        queueCard.appendChild(row);
      }
    } catch (e) {
      msg('Error: ' + e.message, '#991B1B');
    }
  }

  // ── VITALS ─────────────────────────────────────────────────────────────────
  async function showVitalsModal() {
    if (vitalsModal.style.display !== 'none') { vitalsModal.style.display = 'none'; setActive(null); return; }
    setActive('vitals-db');
    vitalsBox.innerHTML = '';
    const desc = makeHelpDescPanel('Your morning briefing for all active Canvas courses. Vitals pulls live data from Canvas and shows you at a glance how many assignments are waiting to be graded, how many are due in the next seven days, and how many courses you are actively running. Each course row shows whether you are caught up on grading or still have submissions waiting. Click any course name to go directly to that course in Canvas.');
    const hdr = el('div', `flex-shrink:0;height:52px;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;`);
    const ico = el('span', `font-size:18px;line-height:1;`); ico.textContent = '📊';
    const ttl = el('span', `flex:1;font-size:14px;font-weight:700;color:#fff;letter-spacing:.2px;`); ttl.textContent = 'Course Vitals';
    hdr.append(ico, ttl, makeHelpQBtn(desc), makeModalCloseBtn(() => { vitalsModal.style.display = 'none'; setActive(null); }));
    const body = el('div', `flex:1;min-height:0;overflow-y:auto;`);
    vitalsBox.append(hdr, desc, body);
    vitalsModal.style.display = 'flex';
    await loadVitals(body);
  }

  async function loadVitals(body) {
    function msg(text, color) {
      body.innerHTML = '';
      const m = el('div', `padding:48px 20px;text-align:center;font-size:13px;color:${color || DS.muted};line-height:1.6;`);
      m.textContent = text; body.appendChild(m);
    }
    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token'], r));
    const tok = stored.ce_canvas_token;
    const origin = window.location.origin;
    if (!tok) { msg('Add your Canvas API token in Settings to see Course Vitals.'); return; }
    msg('Loading…');
    function apiCall(path) {
      return ceSendMessage({ type: 'CANVAS_API', payload: { url: origin + path, token: tok } })
        .catch(e => { if (e.message === 'reload-needed') ceShowReloadBanner(); return null; });
    }
    try {
      const [todoItems, courses, upcoming] = await Promise.all([
        apiCall('/api/v1/users/self/todo?per_page=100'),
        apiCall('/api/v1/courses?enrollment_type=teacher&workflow_state=available&per_page=100'),
        apiCall('/api/v1/users/self/upcoming_events?per_page=50'),
      ]);
      const courseNames = {};
      const courseUrls  = {};
      for (const c of (courses || [])) {
        courseNames[c.id] = c.course_code || c.name;
        courseUrls[c.id]  = `${origin}/courses/${c.id}`;
      }
      const pending = (todoItems || []).filter(item => item.type === 'grading' && item.assignment);
      const totalUngraded = pending.reduce((sum, item) => sum + (item.needs_grading_count ?? item.assignment?.needs_grading_count ?? 0), 0);
      const now     = new Date();
      const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueThisWeek = (upcoming || []).filter(e => {
        const d = new Date(e.assignment?.due_at || e.start_at || 0);
        return d >= now && d <= weekOut;
      });
      const courseUngraded = {};
      for (const item of pending) {
        const cid = item.assignment?.course_id;
        if (cid) courseUngraded[cid] = (courseUngraded[cid] || 0) + (item.needs_grading_count ?? item.assignment?.needs_grading_count ?? 0);
      }
      body.innerHTML = '';

      // Stat tiles
      const tilesRow = el('div', `display:flex;gap:1px;background:${DS.border};border-bottom:2px solid ${DS.border};`);
      tilesRow.append(
        makeStatTile('✏️', totalUngraded,          'Ungraded',      'waiting to be graded',  totalUngraded > 0 ? '#B45309' : DS.green),
        makeStatTile('📅', dueThisWeek.length,     'Due This Week', 'assignments closing soon', dueThisWeek.length > 3 ? '#B45309' : DS.blue),
        makeStatTile('📚', (courses || []).length, 'Courses',       'active & published',    DS.text),
      );
      body.appendChild(tilesRow);

      // Course breakdown
      body.appendChild(makeSecHdr('Active Courses'));
      if (!(courses || []).length) {
        const none = el('div', `padding:24px 16px;text-align:center;font-size:12px;color:${DS.muted};`);
        none.textContent = 'No active courses found.';
        body.appendChild(none);
      } else {
        for (const c of (courses || [])) {
          const ungraded = courseUngraded[c.id] || 0;
          const row = makeRowLink(courseUrls[c.id]);
          const left = el('div', `flex:1;min-width:0;`);
          const name = el('div', `font-size:13px;font-weight:600;color:${DS.blue};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
          name.textContent = c.name || c.course_code || `Course ${c.id}`;
          const code = el('div', `font-size:10px;color:${DS.muted};margin-top:2px;`);
          code.textContent = c.course_code || '';
          left.append(name, code);
          let right;
          if (ungraded > 0) {
            right = makeBadge(ungraded + ' to grade', '#FEF3C7', '#92400E');
          } else {
            right = el('div', `font-size:11px;color:${DS.green};font-weight:600;`);
            right.textContent = '✓ All graded';
          }
          row.append(left, right);
          body.appendChild(row);
        }
      }

      // Due this week
      if (dueThisWeek.length > 0) {
        body.appendChild(makeSecHdr('Due This Week', 'border-top:2px solid ' + DS.border + ';margin-top:4px;'));
        const tomorrow = new Date(now.getTime() + 86400000);
        for (const event of dueThisWeek.slice(0, 15)) {
          const a = event.assignment || event;
          const dueDate = new Date(a.due_at || event.start_at || 0);
          const cid = a.course_id;
          const href = cid ? `${origin}/courses/${cid}/gradebook/speed_grader?assignment_id=${a.id}` : '#';
          const row = makeRowLink(href);
          const left = el('div', `flex:1;min-width:0;`);
          const cLbl = el('div', `font-size:10px;color:${DS.muted};margin-bottom:2px;`);
          cLbl.textContent = courseNames[cid] || '';
          const aName = el('div', `font-size:13px;font-weight:600;color:${DS.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
          aName.textContent = a.name || event.title || 'Assignment';
          left.append(cLbl, aName);
          const isToday    = dueDate.toDateString() === now.toDateString();
          const isTomorrow = dueDate.toDateString() === tomorrow.toDateString();
          const dateEl = el('div', `flex-shrink:0;font-size:11px;font-weight:700;color:${isToday ? '#DC2626' : DS.blue};`);
          dateEl.textContent = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dueDate.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
          row.append(left, dateEl);
          body.appendChild(row);
        }
      }
    } catch(e) {
      msg('Error loading vitals: ' + e.message, '#991B1B');
    }
  }

  // ── AT RISK ────────────────────────────────────────────────────────────────
  async function showAtRiskModal() {
    if (atRiskModal.style.display !== 'none') { atRiskModal.style.display = 'none'; setActive(null); return; }
    setActive('at-risk');
    atRiskBox.innerHTML = '';
    const desc = makeHelpDescPanel('This report flags students who may need your attention before they fall too far behind. Canvas Enhancer checks every student in your dashboard courses for three warning signs: missing assignments (past due and never submitted), a low current grade (below 70%), and recent inactivity (no Canvas login in 14+ days). Click an active course row to include or exclude it. Students with more than one flag are sorted to the top. Click any student row to open their grade page in Canvas.');
    const hdr = el('div', `flex-shrink:0;height:52px;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;`);
    const ico = el('span', `font-size:18px;line-height:1;`); ico.textContent = '⚠️';
    const ttl = el('span', `flex:1;font-size:14px;font-weight:700;color:#fff;letter-spacing:.2px;`); ttl.textContent = 'Student Alerts';
    hdr.append(ico, ttl, makeHelpQBtn(desc), makeModalCloseBtn(() => { atRiskModal.style.display = 'none'; setActive(null); }));
    const body = el('div', `flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;background:#F8FAFC;`);
    atRiskBox.append(hdr, desc, body);
    atRiskModal.style.display = 'flex';
    await loadAtRisk(body);
  }

  async function loadAtRisk(body) {
    function msg(text, color) {
      body.innerHTML = '';
      const m = el('div', `padding:48px 20px;text-align:center;font-size:13px;color:${color || DS.muted};line-height:1.6;`);
      m.textContent = text; body.appendChild(m);
    }
    const stored = await new Promise(r => chrome.storage.local.get(['ce_canvas_token'], r));
    const tok = stored.ce_canvas_token;
    const origin = window.location.origin;
    if (!tok) { msg('Add your Canvas API token in Settings to see At Risk Students.'); return; }
    msg('Loading dashboard courses…');
    function apiCall(path) {
      return ceSendMessage({ type: 'CANVAS_API', payload: { url: origin + path, token: tok } })
        .catch(e => { if (e.message === 'reload-needed') ceShowReloadBanner(); return null; });
    }
    try {
      // Get dashboard cards (courses visible on the Canvas dashboard) + full course list
      const [dashCards, allCourses] = await Promise.all([
        apiCall('/api/v1/dashboard/dashboard_cards'),
        apiCall('/api/v1/courses?enrollment_type=teacher&workflow_state=available&per_page=100'),
      ]);
      const dashIds = new Set((dashCards || []).map(d => String(d.id)));
      // Fall back to all published courses if dashboard cards API fails or returns nothing
      const courses = (allCourses || []).filter(c => !dashIds.size || dashIds.has(String(c.id)));
      if (!courses.length) { msg('No published courses found on your Canvas dashboard.'); return; }

      msg('Scanning for missing work, low grades, and inactive students…');

      // Parallel fetch: enrollments + missing submissions per course
      const [enrollResults, missingResults] = await Promise.all([
        Promise.all(courses.map(c =>
          apiCall(`/api/v1/courses/${c.id}/enrollments?type[]=StudentEnrollment&per_page=100`)
        )),
        Promise.all(courses.map(c =>
          apiCall(`/api/v1/courses/${c.id}/students/submissions?student_ids[]=all&late_policy_status[]=missing&per_page=100`)
        )),
      ]);

      const now = new Date();
      const cutoff = new Date(now - 14 * 86400000);

      // Build flat student list: one row per (student × course)
      const rows = [];
      for (let i = 0; i < courses.length; i++) {
        const c = courses[i];
        const enrollments = enrollResults[i] || [];
        const subs        = missingResults[i] || [];
        const missingByUid = {};
        for (const s of subs) missingByUid[String(s.user_id)] = (missingByUid[String(s.user_id)] || 0) + 1;

        for (const e of enrollments) {
          const grade      = e.grades?.current_score;
          const lastActive = e.last_activity_at ? new Date(e.last_activity_at) : null;
          const missing    = missingByUid[String(e.user_id)] || 0;
          const isLowGrade = typeof grade === 'number' && grade < 70;
          const isInactive = lastActive !== null && lastActive < cutoff;
          const hasMissing = missing > 0;
          if (!hasMissing && !isLowGrade && !isInactive) continue;
          const flags = [];
          if (hasMissing) flags.push('missing');
          if (isLowGrade) flags.push('low-grade');
          if (isInactive) flags.push('inactive');
          rows.push({
            name:       e.user?.sortable_name || e.user?.name || 'Student',
            courseId:   c.id,
            courseName: c.course_code || c.name,
            userId:     e.user_id,
            grade, isLowGrade, isInactive, hasMissing, missing,
            flags, flagCount: flags.length,
            gradesUrl: `${origin}/courses/${c.id}/grades/${e.user_id}`,
          });
        }
      }

      // ── RENDER ─────────────────────────────────────────────────────────────
      body.innerHTML = '';

      // Track which courses are toggled on
      const enabled = {};
      for (const c of courses) enabled[String(c.id)] = true;

      // Vitals-style sticky control row
      const controls = el('div', `position:sticky;top:0;z-index:5;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:12px 24px;background:#fff;border-bottom:1px solid #E2E8F0;`);
      const controlsLabel = el('span', `font-size:12px;font-weight:700;color:#475569;margin-right:2px;`);
      controlsLabel.textContent = 'Courses';
      controls.appendChild(controlsLabel);
      body.appendChild(controls);

      const content = el('div', `padding:24px;display:flex;flex-direction:column;gap:20px;`);
      const heroEl = el('div', ``);
      const riskCardsEl = el('div', `display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;`);
      const listCard = el('div', `background:#fff;border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);`);
      content.append(heroEl, riskCardsEl, listCard);
      body.appendChild(content);

      function renderControls() {
        while (controls.children.length > 1) controls.lastChild.remove();
        for (const c of courses) {
          const selected = enabled[String(c.id)];
          const btn = el('button', `border:1px solid ${selected ? '#2563EB' : '#CBD5E1'};border-radius:8px;background:${selected ? '#EFF6FF' : '#fff'};color:${selected ? '#1D4ED8' : '#64748B'};font-size:12px;font-weight:600;padding:7px 12px;cursor:pointer;font-family:${DS.font};transition:background .12s,border-color .12s;`, { type:'button' });
          btn.textContent = (selected ? '✓ ' : '') + (c.course_code || c.name);
          btn.title = selected ? 'Click to exclude this course' : 'Click to include this course';
          btn.addEventListener('click', () => {
            enabled[String(c.id)] = !enabled[String(c.id)];
            renderControls();
            rerender();
          });
          controls.appendChild(btn);
        }
      }

      function makeRiskCard(icon, value, label, description, color, total) {
        const card = el('div', `background:#fff;border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);`);
        const head = el('div', `display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;`);
        const title = el('div', `font-size:14px;font-weight:700;color:#1E293B;`);
        title.textContent = icon + '  ' + label;
        const badge = el('div', `padding:4px 12px;border-radius:8px;background:${color};color:#fff;font-weight:700;font-size:15px;`);
        badge.textContent = String(value);
        head.append(title, badge);
        const bar = el('div', `height:6px;margin-bottom:12px;border-radius:4px;background:#E2E8F0;overflow:hidden;`);
        const fill = el('div', `height:100%;width:${total ? Math.min(100, Math.round(value / total * 100)) : 0}%;border-radius:4px;background:${color};`);
        bar.appendChild(fill);
        const descEl = el('div', `font-size:12px;color:#64748B;line-height:1.5;`);
        descEl.textContent = description;
        card.append(head, bar, descEl);
        return card;
      }

      function rerender() {
        const visIds = new Set(courses.filter(c => enabled[String(c.id)]).map(c => String(c.id)));
        const vis    = rows.filter(r => visIds.has(String(r.courseId)));

        const nMulti = vis.filter(r => r.flagCount >= 2).length;
        const nMissing = vis.filter(r => r.hasMissing).length;
        const nLowGrade = vis.filter(r => r.isLowGrade).length;
        const nInactive = vis.filter(r => r.isInactive).length;

        heroEl.innerHTML = '';
        const hero = el('div', `background:#fff;border-radius:16px;padding:28px 32px;display:flex;align-items:center;gap:28px;box-shadow:0 1px 3px rgba(0,0,0,.06);`);
        const circleColor = vis.length ? '#DC2626' : DS.green;
        const circle = el('div', `width:110px;height:110px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${circleColor};color:#fff;font-weight:800;font-size:36px;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.15);`);
        circle.innerHTML = String(vis.length) + '<small style="font-size:12px;font-weight:600;opacity:.9;margin-top:2px">AT RISK</small>';
        const heroText = el('div', `min-width:0;`);
        const heroTitle = el('div', `font-size:22px;font-weight:700;color:#1E293B;margin-bottom:6px;`);
        heroTitle.textContent = vis.length ? `${vis.length} student${vis.length === 1 ? '' : 's'} need attention` : 'All selected courses look clear';
        const heroDesc = el('div', `font-size:14px;color:#64748B;line-height:1.5;`);
        heroDesc.textContent = vis.length
          ? `${nMulti} high-priority student${nMulti === 1 ? '' : 's'} have two or more warning signs across ${visIds.size} selected course${visIds.size === 1 ? '' : 's'}.`
          : 'No missing-work, low-grade, or inactivity flags were found for the selected courses.';
        heroText.append(heroTitle, heroDesc);
        hero.append(circle, heroText);
        heroEl.appendChild(hero);

        riskCardsEl.innerHTML = '';
        riskCardsEl.append(
          makeRiskCard('📭', nMissing, 'Missing Work', 'Past-due assignments that were not submitted.', '#DC2626', vis.length),
          makeRiskCard('📉', nLowGrade, 'Low Grade', 'Students whose current grade is below 70%.', '#D97706', vis.length),
          makeRiskCard('💤', nInactive, 'Inactive', 'No Canvas activity recorded in the last 14 days.', '#64748B', vis.length),
        );

        listCard.innerHTML = '';
        const listTitle = el('div', `font-size:16px;font-weight:700;color:#1E293B;margin-bottom:10px;`);
        listTitle.textContent = 'Students Needing Attention';
        listCard.appendChild(listTitle);
        if (!vis.length) {
          const none = el('div', `padding:32px 20px;text-align:center;font-size:13px;color:${DS.muted};border-top:1px solid #F1F5F9;`);
          none.textContent = visIds.size === 0
            ? 'Select at least one course above to see students.'
            : '✅ No at-risk students in the selected courses.';
          listCard.appendChild(none);
          return;
        }

        // Sort: most flags first → worst grade first
        vis.sort((a, b) => {
          if (b.flagCount !== a.flagCount) return b.flagCount - a.flagCount;
          if (a.isLowGrade && b.isLowGrade) return (a.grade ?? 100) - (b.grade ?? 100);
          if (a.isLowGrade) return -1;
          if (b.isLowGrade) return  1;
          return 0;
        });

        for (const s of vis) {
          const row = makeRowLink(s.gradesUrl);
          const left = el('div', `flex:1;min-width:0;`);
          const nameEl = el('div', `font-size:13px;font-weight:600;color:${DS.blue};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
          nameEl.textContent = s.name;
          const crsEl = el('div', `font-size:10px;color:${DS.muted};margin-top:2px;text-transform:uppercase;letter-spacing:.3px;`);
          crsEl.textContent = s.courseName;
          left.append(nameEl, crsEl);
          const badges = el('div', `display:flex;gap:4px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;`);
          if (s.hasMissing) badges.appendChild(makeBadge(`${s.missing} missing`, '#FEE2E2', '#991B1B'));
          if (s.isLowGrade) badges.appendChild(makeBadge(`${Math.floor(s.grade)}%`, '#FEF3C7', '#92400E'));
          if (s.isInactive) badges.appendChild(makeBadge('inactive', '#F3F4F6', '#374151'));
          row.append(left, badges);
          listCard.appendChild(row);
        }
      }

      renderControls();
      rerender();

    } catch(e) {
      msg('Error loading at-risk data: ' + e.message, '#991B1B');
    }
  }

  function onToolClick(tool) {
    if (tool.id === 'needs-graded') {
      closePanel();
      closeAllExternal();
      showNgModal();
      return;
    }
    if (tool.id === 'vitals-db') {
      closePanel();
      closeAllExternal();
      showVitalsModal();
      return;
    }
    if (tool.id === 'at-risk') {
      closePanel();
      closeAllExternal();
      showAtRiskModal();
      return;
    }
    if (tool.id === 'settings-tg') {
      closePanel();
      closeAllExternal();
      settingsMBody.innerHTML = '';
      settingsModal.style.display = 'flex';
      renderSettings(settingsMBody);
      return;
    }
    if (tool.id === 'notes-db' || tool.id === 'notes') {
      closePanel();
      closeAllExternal();
      openNotesModal();
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

  function openAIProvider(provider) {
    if (!provider) return;
    chrome.storage.local.set({ ce_ai_provider: provider.id });
    ceSendMessage({
      type: 'OPEN_CLAUDE_SPLIT',
      payload: {
        url:         provider.url,
        screenWidth:  window.screen.availWidth,
        screenHeight: window.screen.availHeight,
        screenTop:    window.screen.availTop  || 0,
        screenLeft:   window.screen.availLeft || 0,
      },
    }).catch(e => { if (e.message === 'reload-needed') ceShowReloadBanner(); });
  }

  function openQuickAI() {
    chrome.storage.local.get('ce_ai_provider', ({ ce_ai_provider }) => {
      const provider = AI_PROVIDERS.find(p => p.id === ce_ai_provider) || AI_PROVIDERS[0];
      openAIProvider(provider);
    });
  }

  function mountAILauncher() {
    if (document.getElementById('ce-ai-launcher')) return;
    const root = el('div', `position:fixed;right:20px;bottom:20px;z-index:2147483639;font-family:${DS.font};`);
    root.id = 'ce-ai-launcher';

    const menu = el('div', `position:absolute;right:0;bottom:64px;width:260px;padding:8px;background:#fff;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.25);display:none;flex-direction:column;gap:2px;`);
    const head = el('div', `padding:10px 11px 9px;border-bottom:1px solid #F1F5F9;margin-bottom:4px;`);
    const title = el('div', `font-size:13px;font-weight:750;color:#0F172A;`); title.textContent = 'Open an AI assistant';
    const sub = el('div', `font-size:11px;color:#64748B;margin-top:3px;line-height:1.4;`); sub.textContent = 'Opens beside Canvas in a companion window.';
    head.append(title, sub);
    menu.appendChild(head);

    const providerMeta = {
      claude:     ['C', '#D97757'],
      chatgpt:    ['✦', '#10A37F'],
      gemini:     ['✦', '#4F7DF3'],
      copilot:    ['C', '#2563EB'],
      perplexity: ['P', '#20808D'],
    };
    for (const provider of AI_PROVIDERS) {
      const item = el('button', `width:100%;display:flex;align-items:center;gap:11px;padding:10px 11px;border:0;border-radius:9px;background:transparent;color:#334155;text-align:left;cursor:pointer;font-family:${DS.font};`, { type:'button' });
      const meta = providerMeta[provider.id] || ['AI', '#475569'];
      const mark = el('span', `width:30px;height:30px;border-radius:9px;background:${meta[1]};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;`); mark.textContent = meta[0];
      const copy = el('span', `display:flex;flex-direction:column;min-width:0;`);
      const name = el('span', `font-size:12px;font-weight:700;color:#1E293B;`); name.textContent = provider.label.replace(/\s*\([^)]*\)\s*$/, '');
      const domain = el('span', `font-size:10px;color:#94A3B8;margin-top:2px;`); domain.textContent = new URL(provider.url).hostname.replace(/^www\./, '');
      copy.append(name, domain);
      item.append(mark, copy);
      item.addEventListener('mouseenter', () => item.style.background = '#F1F5F9');
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
      item.addEventListener('click', () => { menu.style.display = 'none'; launch.setAttribute('aria-expanded', 'false'); openAIProvider(provider); });
      menu.appendChild(item);
    }

    const footer = el('div', `border-top:1px solid #F1F5F9;margin-top:5px;padding:7px 4px 1px;`);
    const settingsBtn = el('button', `width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#475569;text-align:left;cursor:pointer;font-size:11px;font-weight:700;font-family:${DS.font};`, { type:'button' });
    settingsBtn.innerHTML = '<span style="width:20px;text-align:center">⚙</span><span>Canvas Enhancer Settings</span>';
    settingsBtn.addEventListener('mouseenter', () => { settingsBtn.style.background = '#F1F5F9'; settingsBtn.style.color = '#0F172A'; });
    settingsBtn.addEventListener('mouseleave', () => { settingsBtn.style.background = 'transparent'; settingsBtn.style.color = '#475569'; });
    settingsBtn.addEventListener('click', () => {
      menu.style.display = 'none';
      launch.setAttribute('aria-expanded', 'false');
      document.dispatchEvent(new CustomEvent('ce-open-settings'));
    });
    globalThis.CECanvasToken?.bindIndicator(settingsBtn);
    footer.appendChild(settingsBtn);
    menu.appendChild(footer);

    const launch = el('button', `height:42px;padding:0 18px;border:1px solid #fff;border-radius:999px;background:#fff;color:${DS.blue};display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.24);font-size:13px;font-weight:800;font-family:${DS.font};transition:transform .14s,box-shadow .14s,background .14s,color .14s;`, { type:'button', title:'Open AI assistant', textContent:'✦ AI' });
    launch.setAttribute('aria-label', 'Open AI assistant menu');
    launch.setAttribute('aria-expanded', 'false');
    launch.addEventListener('mouseenter', () => { launch.style.transform = 'translateY(-2px)'; launch.style.boxShadow = '0 12px 30px rgba(15,23,42,.32)'; });
    launch.addEventListener('mouseleave', () => { launch.style.transform = ''; launch.style.boxShadow = '0 8px 24px rgba(15,23,42,.28)'; });
    launch.addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.style.display === 'flex';
      menu.style.display = open ? 'none' : 'flex';
      launch.setAttribute('aria-expanded', String(!open));
    });
    menu.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => { menu.style.display = 'none'; launch.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { menu.style.display = 'none'; launch.setAttribute('aria-expanded', 'false'); } });
    root.append(menu, launch);
    document.body.appendChild(root);
  }

  function setActive(id) {
    if (_active && btnMap[_active]) {
      btnMap[_active].style.background = DS.blue;
      btnMap[_active].style.borderColor = DS.blue;
      btnMap[_active].style.color = '#fff';
    }
    _active = id;
    if (id && btnMap[id]) {
      btnMap[id].style.background = '#055f9e';
      btnMap[id].style.borderColor = '#055f9e';
      btnMap[id].style.color = '#fff';
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
    toolbar.style.display = (_expanded && _onDashboard) ? 'flex' : 'none';
    tab.style.display = (_onDashboard && !_expanded) ? 'flex' : 'none';
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

  // ── GRADER BADGE ───────────────────────────────────────────────────────────
  async function updateGraderBadge() {
    const s = await new Promise(r => chrome.storage.local.get('ce_canvas_token', r));
    const tok = s.ce_canvas_token;
    if (!tok) return;
    try {
      const data = await ceSendMessage({
        type: 'CANVAS_API',
        payload: { url: window.location.origin + '/api/v1/users/self/todo_item_count', token: tok },
      }).catch(e => { if (e.message === 'reload-needed') ceShowReloadBanner(); return null; });
      const count = data?.needs_grading_count || 0;
      const btn = btnMap['needs-graded'];
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
    // Modals must be in the DOM on every page so cross-toolbar events work
    document.body.appendChild(settingsModal);
    document.body.appendChild(creditsModal);
    document.body.appendChild(notesModal);
    document.body.appendChild(helpModal);
    mountAILauncher();
    return;

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
  }

  // Legacy dashboard toolbar remains disabled.
  function updateDashboardMode() { /* toolbar hidden; hub.js runs for modals/events only */ }

  document.addEventListener('ce-open-chat',    () => openQuickAI());
  document.addEventListener('ce-open-notes',   () => openNotesModal());
  document.addEventListener('ce-open-help',    e => openHelp(e.detail));
  document.addEventListener('ce-open-ai-credits', () => openAICredits());
  document.addEventListener('ce-open-settings', () => {
    settingsMBody.innerHTML = '';
    settingsModal.style.display = 'flex';
    renderSettings(settingsMBody);
  });
  document.addEventListener('ce-open-vitals',  () => showVitalsModal());
  document.addEventListener('ce-open-at-risk', () => showAtRiskModal());
  document.addEventListener('ce-render-audit', e => {
    const c = e.detail?.container;
    if (!c) return;
    renderAudit(c, { courseId: e.detail?.courseId, assignmentId: e.detail?.assignmentId, assignmentName: e.detail?.assignmentName })
      .catch(err => {
        c.innerHTML = `<div style="padding:24px;color:#B91C1C;font-size:13px;">Audit failed to load: ${err?.message || err}</div>`;
      });
  });

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  // Fetch grader badge count after a short delay so the page token is ready
  setTimeout(updateGraderBadge, 2000);
})();
