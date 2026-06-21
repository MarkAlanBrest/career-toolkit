(async function () {
  'use strict';

  const STORAGE_KEY = 'ce_announcements';
  const _store = await new Promise(resolve => chrome.storage.local.get([STORAGE_KEY, 'ce_remote_config', 'ce_features'], resolve));
  if (_store.ce_features?.['announce-bar'] === false) return;
  const _cfg = _store.ce_remote_config || {};

  const font = '-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif';

  /* =========================================================
     DEFAULT TEMPLATES
  ========================================================= */
  const DEFAULT_ANNOUNCEMENTS = [
    {
      id: 'ann_welcome_week',
      name: 'Welcome to the Week',
      title: 'Welcome — Week Overview',
      body: `Hello everyone,\n\nHere is a quick overview of what we are covering this week. Please review the current module in Canvas, check upcoming due dates, and reach out if anything is unclear.\n\nHave a great week!`,
    },
    {
      id: 'ann_missing_work',
      name: 'Missing Work Reminder',
      title: 'Reminder: Missing Work',
      body: `Hello everyone,\n\nA reminder that some assignments may be showing as missing in Canvas. Please log in, review your grades, and submit any outstanding work as soon as possible.\n\nIf you have questions or need help, please reach out before the due date.\n\nThank you!`,
    },
    {
      id: 'ann_upcoming_due',
      name: 'Upcoming Due Dates',
      title: 'Heads Up — Upcoming Due Dates',
      body: `Hello everyone,\n\nSeveral assignments are coming due soon. Please check the Canvas calendar and your assignment list to make sure you are on track.\n\nPlan ahead, and reach out early if you need help before the deadline.\n\nGood luck!`,
    },
    {
      id: 'ann_office_hours',
      name: 'Office Hours Reminder',
      title: 'Office Hours This Week',
      body: `Hello everyone,\n\nA reminder that office hours are available this week. Come with questions, get help on assignments, or check in on your progress in the course.\n\nPlease see Canvas for office hours details or reply to this announcement to schedule a time.`,
    },
    {
      id: 'ann_test_reminder',
      name: 'Test / Quiz Reminder',
      title: 'Reminder: Upcoming Test or Quiz',
      body: `Hello everyone,\n\nA test or quiz is coming up soon. Please review your notes, revisit module materials, and practice any areas where you feel less confident.\n\nIf you have questions before the test, please reach out during office hours or message me directly.\n\nGood luck!`,
    },
    {
      id: 'ann_feedback_posted',
      name: 'Feedback Posted',
      title: 'Feedback Has Been Posted',
      body: `Hello everyone,\n\nFeedback has been posted for a recent assignment. Please log in to Canvas, open your submission, and review your feedback carefully.\n\nUse this feedback to strengthen your next submission. If you have questions about a specific comment, please reach out.\n\nThank you for your hard work!`,
    },
    {
      id: 'ann_no_class',
      name: 'Class Cancelled',
      title: 'Class Cancelled',
      body: `Hello everyone,\n\nClass will not meet as scheduled. Please use this time to review the current module and stay on top of upcoming assignments.\n\nAll due dates remain the same unless otherwise noted. I will follow up with any updates.\n\nThank you for your understanding!`,
    },
    {
      id: 'ann_general',
      name: 'General Update',
      title: 'Quick Update',
      body: `Hello everyone,\n\nI wanted to share a quick update with the class. Please read this carefully and reach out if you have any questions.\n\nThank you!`,
    },
  ];

  /* =========================================================
     STORAGE
  ========================================================= */
  function getAnnouncements() {
    const raw = _store[STORAGE_KEY];
    if (raw) {
      try { return JSON.parse(raw); } catch(e) {}
    }
    return DEFAULT_ANNOUNCEMENTS.map(a => ({ ...a }));
  }

  function saveAnnouncements(list) {
    const json = JSON.stringify(list);
    _store[STORAGE_KEY] = json;
    chrome.storage.local.set({ [STORAGE_KEY]: json });
  }

  function makeId() {
    return 'ann_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  /* =========================================================
     UTILITY
  ========================================================= */
  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Finds the Canvas announcement compose title input.
  // Canvas uses several selectors depending on version / React migration.
  function findTitleInput() {
    const sel = _cfg.selectors?.announcementTitle || [
      'input#discussion_topic_title',
      'input[name="title"][id*="discussion"]',
      'input[data-testid="discussion-title-input"]',
      'input[placeholder*="opic Title"]',
      'input[aria-label*="opic Title"]',
      '.discussion-title input[type="text"]',
    ];
    return document.querySelector(sel.join(', '));
  }

  // True when we're somewhere in the announcement compose flow.
  function isAnnouncementContext() {
    const p = window.location.pathname;
    const q = window.location.search;
    if (/\/courses\/\d+\/announcements(\/new|\/\d+\/edit)?/.test(p)) return true;
    if (/\/discussion_topics(\/new|\/\d+\/edit)?/.test(p) && q.includes('is_announcement')) return true;
    // DOM fallback: title input + RCE editor present = compose form regardless of URL
    if (findTitleInput() && document.querySelector('.tox-edit-area__iframe, [contenteditable="true"][role="textbox"], textarea#discussion_topic_message')) return true;
    return false;
  }

  /* =========================================================
     INSERT INTO CANVAS FORM
  ========================================================= */
  function insertIntoForm(ann) {
    // ── TITLE ──────────────────────────────────────────────
    const titleEl = findTitleInput();
    if (titleEl) {
      titleEl.focus();
      // React controlled-input shim — plain .value= is ignored by React
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(titleEl, ann.title);
      titleEl.dispatchEvent(new Event('input',  { bubbles: true }));
      titleEl.dispatchEvent(new Event('change', { bubbles: true }));
      titleEl.blur();
    }

    // ── BODY ───────────────────────────────────────────────
    const htmlBody = '<p>' + ann.body
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>') + '</p>';

    let bodySet = false;

    // 1. window.tinymce — covers legacy Canvas RCE
    const tmce = window.tinymce || window.tinyMCE;
    if (tmce && !bodySet) {
      const editor = tmce.activeEditor
        || (Array.isArray(tmce.editors) ? tmce.editors[0] : null)
        || (tmce.editors ? Object.values(tmce.editors)[0] : null);
      if (editor?.setContent) {
        try { editor.setContent(htmlBody); editor.fire('change'); bodySet = true; } catch(e) {}
      }
    }

    // 2. Direct TinyMCE iframe body write — covers Canvas's new RCE
    if (!bodySet) {
      const tinyIframe = document.querySelector((_cfg.selectors?.rceIframe || ['.tox-edit-area__iframe']).join(', '));
      if (tinyIframe) {
        try {
          const iDoc = tinyIframe.contentDocument || tinyIframe.contentWindow?.document;
          if (iDoc?.body) {
            iDoc.body.innerHTML = htmlBody;
            // Tell TinyMCE that content changed if it's accessible from the iframe
            const iWin = tinyIframe.contentWindow;
            const iEditor = iWin?.tinymce?.activeEditor || (iWin?.tinymce?.editors && Object.values(iWin.tinymce.editors)[0]);
            iEditor?.fire?.('change');
            bodySet = true;
          }
        } catch(e) {}
      }
    }

    // 3. contenteditable div — some Canvas RCE versions skip TinyMCE entirely
    if (!bodySet) {
      const ce = document.querySelector((_cfg.selectors?.rceContentEditable || [
        '.tox-edit-area [contenteditable="true"]',
        '[data-testid="rce-content-editable"]',
        'div[contenteditable="true"][role="textbox"]',
        '.RceHtmlEditor [contenteditable]',
      ]).join(', '));
      if (ce) {
        ce.focus();
        ce.innerHTML = htmlBody;
        ce.dispatchEvent(new Event('input',  { bubbles: true }));
        ce.dispatchEvent(new Event('change', { bubbles: true }));
        ce.blur();
        bodySet = true;
      }
    }

    // 4. Hidden textarea fallback (TinyMCE keeps one in sync)
    if (!bodySet) {
      const ta = document.querySelector((_cfg.selectors?.announcementBodyTextarea || [
        'textarea#discussion_topic_message',
        'textarea[name="message"]',
        'textarea[id*="discussion_topic"]',
      ]).join(', '));
      if (ta) {
        ta.value = htmlBody;
        ta.dispatchEvent(new Event('input',  { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    closeModal();
  }

  /* =========================================================
     STYLES
  ========================================================= */
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #ce-ann-modal {
      position: fixed; inset: 0; z-index: 2147483640;
      background: rgba(0,0,0,.45); backdrop-filter: blur(2px);
      display: none; align-items: center; justify-content: center;
      font-family: ${font};
    }
    #ce-ann-modal.open { display: flex; }

    #ce-ann-box {
      background: #fff;
      width: min(660px, calc(100vw - 48px));
      max-height: min(700px, calc(100vh - 80px));
      border-radius: 10px;
      box-shadow: 0 8px 40px rgba(0,0,0,.28);
      display: flex; flex-direction: column; overflow: hidden;
    }

    #ce-ann-body { flex: 1; overflow-y: auto; padding: 16px; }

    .ce-ann-card {
      border: 1px solid #C7CDD1; border-radius: 6px;
      padding: 12px; background: #fff; transition: border-color .12s;
    }
    .ce-ann-card:hover { border-color: #0770B8; }

    .ce-ann-close-btn {
      width: 32px; height: 32px; background: none; border: none;
      color: rgba(255,255,255,0.65); font-size: 22px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; transition: background .12s, color .12s;
    }
    .ce-ann-close-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

    .ce-ann-btn {
      height: 28px; padding: 0 11px; border-radius: 3px;
      font-size: 11px; font-weight: 700; cursor: pointer;
      font-family: ${font}; transition: background .12s, color .12s;
    }
    .ce-ann-btn-primary   { border: none; background: #0770B8; color: #fff; }
    .ce-ann-btn-primary:hover   { background: #0860A8; }
    .ce-ann-btn-secondary { border: 1px solid #C7CDD1; background: #F5F5F5; color: #2D3B45; }
    .ce-ann-btn-secondary:hover { background: #E8F1F8; border-color: #0770B8; color: #0770B8; }
    .ce-ann-btn-danger    { border: 1px solid #C7CDD1; background: #fff; color: #BC1212; }
    .ce-ann-btn-danger:hover    { background: #fef2f2; border-color: #BC1212; }

    .ce-ann-input, .ce-ann-textarea {
      width: 100%; padding: 7px 10px;
      border: 1px solid #C7CDD1; border-radius: 3px;
      font-size: 13px; color: #2D3B45; font-family: ${font};
      box-sizing: border-box; background: #fff;
    }
    .ce-ann-input:focus, .ce-ann-textarea:focus {
      outline: none; border-color: #0770B8;
      box-shadow: 0 0 0 2px rgba(7,112,184,.12);
    }
    .ce-ann-input.err, .ce-ann-textarea.err { border-color: #BC1212; }
    .ce-ann-textarea { min-height: 110px; resize: vertical; }

    .ce-ann-label {
      display: block; font-size: 11px; font-weight: 600;
      color: #2D3B45; margin-bottom: 3px; margin-top: 10px;
    }
    .ce-ann-label:first-child { margin-top: 0; }

    .ce-ann-status {
      padding: 8px 10px; border-radius: 3px; margin-bottom: 12px;
      font-size: 12px; font-weight: 600;
    }
    .ce-ann-status-ok  { background: #ecfdf5; color: #127A1B; border: 1px solid #a7f3d0; }
    .ce-ann-status-err { background: #fef2f2; color: #BC1212; border: 1px solid #fecaca; }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  /* =========================================================
     MODAL
  ========================================================= */
  const modal = document.createElement('div');
  modal.id = 'ce-ann-modal';

  const box = document.createElement('div');
  box.id = 'ce-ann-box';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'height:52px;flex-shrink:0;background:#1B303D;display:flex;align-items:center;padding:0 16px;gap:10px;';

  const hdrTitle = document.createElement('h2');
  hdrTitle.style.cssText = 'flex:1;margin:0;font-size:15px;font-weight:700;color:#fff;font-family:' + font + ';';
  hdrTitle.textContent = 'Quick Announcements';

  const xBtn = document.createElement('button');
  xBtn.type = 'button';
  xBtn.className = 'ce-ann-close-btn';
  xBtn.textContent = '×';
  xBtn.addEventListener('click', closeModal);

  hdr.append(hdrTitle, xBtn);

  const annBody = document.createElement('div');
  annBody.id = 'ce-ann-body';

  box.append(hdr, annBody);
  modal.appendChild(box);
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  box.addEventListener('click', e => e.stopPropagation());

  function openModal() {
    modal.classList.add('open');
    renderPanel();
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  document.addEventListener('ce-open-quick-announcements', openModal);

  /* =========================================================
     PANEL
  ========================================================= */
  function renderPanel(editId, statusMsg, statusType) {
    const list = getAnnouncements();
    const editing = editId ? list.find(a => a.id === editId) : null;

    annBody.innerHTML = `
      ${statusMsg ? `<div class="ce-ann-status ce-ann-status-${statusType || 'ok'}">${escHtml(statusMsg)}</div>` : ''}

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
        ${list.length ? list.map(ann => `
          <div class="ce-ann-card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;">
              <div style="min-width:0;">
                <div style="font-weight:700;font-size:13px;color:#2D3B45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(ann.name)}</div>
                <div style="font-size:12px;color:#0770B8;margin-top:2px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(ann.title)}</div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0;">
                <button class="ce-ann-btn ce-ann-btn-primary ce-ann-insert" data-id="${escHtml(ann.id)}">Insert</button>
                <button class="ce-ann-btn ce-ann-btn-secondary ce-ann-edit" data-id="${escHtml(ann.id)}">Edit</button>
                <button class="ce-ann-btn ce-ann-btn-danger ce-ann-del" data-id="${escHtml(ann.id)}">Delete</button>
              </div>
            </div>
            <div style="font-size:12px;color:#6B7280;white-space:pre-line;max-height:52px;overflow:hidden;background:#F8FAFC;padding:6px 8px;border-radius:3px;">${escHtml((ann.body || '').slice(0, 160))}${(ann.body || '').length > 160 ? '…' : ''}</div>
          </div>
        `).join('') : `<div style="font-size:13px;color:#6B7280;padding:8px 0;">No saved announcements yet. Add one below.</div>`}
      </div>

      <div style="border-top:2px solid #E5E9EC;padding-top:16px;">
        <div style="font-size:11px;font-weight:700;color:#2D3B45;margin-bottom:12px;letter-spacing:.2px;text-transform:uppercase;">${editing ? 'Edit Announcement' : 'New Announcement'}</div>
        <label class="ce-ann-label">Name <span style="font-weight:400;color:#6B7280;">(internal label)</span></label>
        <input id="ce-ann-name" class="ce-ann-input" type="text" value="${escHtml(editing?.name || '')}" placeholder="e.g. Office Hours Reminder">
        <label class="ce-ann-label">Canvas Title</label>
        <input id="ce-ann-title" class="ce-ann-input" type="text" value="${escHtml(editing?.title || '')}" placeholder="e.g. Reminder: Office Hours This Week">
        <label class="ce-ann-label">Body</label>
        <textarea id="ce-ann-body-input" class="ce-ann-textarea" placeholder="Announcement body...">${escHtml(editing?.body || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button id="ce-ann-save" class="ce-ann-btn ce-ann-btn-primary" style="height:32px;padding:0 16px;">${editing ? 'Update' : 'Save'}</button>
          ${editing ? `<button id="ce-ann-cancel" class="ce-ann-btn ce-ann-btn-secondary" style="height:32px;padding:0 14px;">Cancel</button>` : ''}
        </div>
      </div>
    `;

    annBody.querySelectorAll('.ce-ann-insert').forEach(btn => {
      btn.addEventListener('click', () => {
        const ann = getAnnouncements().find(a => a.id === btn.dataset.id);
        if (ann) insertIntoForm(ann);
      });
    });

    annBody.querySelectorAll('.ce-ann-edit').forEach(btn => {
      btn.addEventListener('click', () => renderPanel(btn.dataset.id));
    });

    annBody.querySelectorAll('.ce-ann-del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this announcement template?')) return;
        saveAnnouncements(getAnnouncements().filter(a => a.id !== btn.dataset.id));
        renderPanel();
      });
    });

    annBody.querySelector('#ce-ann-save')?.addEventListener('click', () => {
      const nameEl  = annBody.querySelector('#ce-ann-name');
      const titleEl = annBody.querySelector('#ce-ann-title');
      const bodyEl  = annBody.querySelector('#ce-ann-body-input');
      const name  = nameEl.value.trim();
      const title = titleEl.value.trim();
      const body  = bodyEl.value.trim();
      nameEl.classList.toggle('err', !name);
      titleEl.classList.toggle('err', !title);
      bodyEl.classList.toggle('err', !body);
      if (!name || !title || !body) return;

      const current = getAnnouncements();
      if (editId) {
        const idx = current.findIndex(a => a.id === editId);
        if (idx >= 0) current[idx] = { ...current[idx], name, title, body };
      } else {
        current.push({ id: makeId(), name, title, body });
      }
      saveAnnouncements(current);
      renderPanel(null, editId ? 'Announcement updated.' : 'Announcement saved!', 'ok');
    });

    annBody.querySelector('#ce-ann-cancel')?.addEventListener('click', () => renderPanel());
  }

  /* =========================================================
     COMPOSE BAR INJECTION
     Watches the DOM for the Canvas title input to appear
     (works whether Canvas navigates to a new page or renders
     the form inline without a URL change).
  ========================================================= */
  const BAR_ID = 'ce-ann-compose-bar';

  function injectComposeBar() {
    // Primary signal: the announcement compose title input exists
    const titleInput = findTitleInput();

    if (!titleInput) {
      document.getElementById(BAR_ID)?.remove();
      return false;
    }

    // Verify we're in an announcement context (not a discussion)
    if (!isAnnouncementContext()) {
      document.getElementById(BAR_ID)?.remove();
      return false;
    }

    // Already injected and connected
    if (document.getElementById(BAR_ID)?.isConnected) return true;
    document.getElementById(BAR_ID)?.remove();

    // Build bar
    const bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.style.cssText = [
      'width:100%',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'padding:0 14px',
      'height:44px',
      'background:#394B58',
      'border-bottom:1px solid #1B303D',
      'box-shadow:0 2px 6px rgba(0,0,0,.18)',
      'box-sizing:border-box',
      'flex-shrink:0',
      'font-family:' + font,
    ].join(';');

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;';
    lbl.textContent = 'Announcement';

    const quickBtn = document.createElement('button');
    quickBtn.type = 'button';
    quickBtn.textContent = 'Quick Post';
    quickBtn.style.cssText = 'height:32px;padding:0 16px;border:none;border-radius:4px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;cursor:pointer;font-family:' + font + ';white-space:nowrap;transition:background .12s,color .12s;letter-spacing:.2px;';
    quickBtn.addEventListener('mouseenter', () => { quickBtn.style.background = 'rgba(255,255,255,0.22)'; quickBtn.style.color = '#fff'; });
    quickBtn.addEventListener('mouseleave', () => { quickBtn.style.background = 'rgba(255,255,255,0.12)'; quickBtn.style.color = 'rgba(255,255,255,0.85)'; });
    quickBtn.addEventListener('click', openModal);

    const helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.textContent = '?';
    helpBtn.title = 'Help';
    helpBtn.style.cssText = 'height:32px;padding:0 12px;border:none;border-radius:4px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;cursor:pointer;font-family:' + font + ';letter-spacing:.2px;white-space:nowrap;transition:background .12s,color .12s;';
    helpBtn.addEventListener('mouseenter', () => { helpBtn.style.background = 'rgba(255,255,255,0.22)'; helpBtn.style.color = '#fff'; });
    helpBtn.addEventListener('mouseleave', () => { helpBtn.style.background = 'rgba(255,255,255,0.12)'; helpBtn.style.color = 'rgba(255,255,255,0.85)'; });
    helpBtn.addEventListener('click', () => document.dispatchEvent(new CustomEvent('ce-open-help', { detail: 'announcements' })));

    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.textContent = 'Settings';
    settingsBtn.title = 'Canvas Enhancer settings';
    settingsBtn.style.cssText = helpBtn.style.cssText;
    globalThis.CECanvasToken?.bindIndicator(settingsBtn);
    settingsBtn.addEventListener('click', () => document.dispatchEvent(new CustomEvent('ce-open-settings')));

    bar.append(lbl, quickBtn, settingsBtn, helpBtn);

    titleInput.insertAdjacentElement('beforebegin', bar);

    return true;
  }

  // Auto-inject the Quick Post bar whenever the Canvas announcement compose form appears.
  let _annObserver = null;
  function startAnnObserver() {
    if (_annObserver) return;
    injectComposeBar();
    _annObserver = new MutationObserver(() => injectComposeBar());
    _annObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAnnObserver);
  } else {
    startAnnObserver();
  }
})();
