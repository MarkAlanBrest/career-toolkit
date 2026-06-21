(function () {
  'use strict';

  if (document.getElementById('ce-mp-toolbar')) return;

  const font = '-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif';

  function getCourseId() {
    const m = window.location.pathname.match(/\/courses\/(\d+)/);
    return m ? m[1] : null;
  }

  function getCsrf() {
    const m = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
  }

  async function apiFetch(method, path, body) {
    const url = path.startsWith('http') ? path : window.location.origin + path;
    const opts = {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': getCsrf(),
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const resp = await fetch(url, opts);
    if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 200)}`);
    if (resp.status === 204) return null;
    return resp.json();
  }

  async function apiList(path) {
    let url = window.location.origin + path + (path.includes('?') ? '&' : '?') + 'per_page=100';
    const all = [];
    while (url) {
      const resp = await fetch(url, { credentials: 'same-origin' });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      if (Array.isArray(data)) all.push(...data);
      const next = (resp.headers.get('Link') || '').match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
    return all;
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const ITEM_ICONS = {
    Assignment: '📝', Quiz: '✅', Discussion: '💬',
    Page: '📋', File: '📁', ExternalUrl: '🔗', ExternalTool: '🔧',
  };

  const GRADABLE = new Set(['Assignment', 'Quiz', 'Discussion']);

  /* =========================================================
     STYLES
  ========================================================= */
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    body.ce-mp-mode #ce-hub { display:none!important; }
    body.ce-mp-mode #ce-hub-panel { display:none!important; }

    #ce-mp-toolbar {
      position: fixed; top: 0; left: 72px; right: 0; height: 56px;
      z-index: 9990;
      background: #394B58; border-bottom: 1px solid #1B303D;
      box-shadow: 0 2px 8px rgba(0,0,0,.22);
      display: none; align-items: center;
      padding: 0 16px 0 16px; gap: 8px;
      box-sizing: border-box;
      font-family: ${font};
    }
    body.ce-mp-mode #main,
    body.ce-mp-mode .ic-Layout-contentMain,
    body.ce-mp-mode #content { margin-top: 56px !important; }

    .ce-mp-tbtn {
      height: 34px; padding: 0 14px; border-radius: 4px;
      font-size: 12px; font-weight: 700; cursor: pointer;
      font-family: ${font}; white-space: nowrap;
      transition: background .12s, color .12s; border: none;
    }
    .ce-mp-tbtn-primary { background: #0770B8; color: #fff; }
    .ce-mp-tbtn-primary:hover { background: #0860A8; }
    .ce-mp-tbtn-ghost {
      background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .ce-mp-tbtn-ghost:hover { background: rgba(255,255,255,0.18); color:#fff; }

    /* Modal */
    #ce-mp-modal {
      display: none; position: fixed; inset: 0;
      z-index: 2147483640; background: rgba(0,0,0,.38);
      backdrop-filter: blur(1px);
      font-family: ${font};
    }

    #ce-mp-shell {
      position: absolute; top: 8px; bottom: 8px; left: 74px; right: 8px;
      border-radius: 6px; overflow: hidden;
      display: grid; grid-template-rows: auto 1fr;
      background: #F2F4F5;
      box-shadow: 0 8px 32px rgba(45,59,69,.30);
    }

    #ce-mp-mhdr {
      background: #394B58; border-bottom: 1px solid #1B303D;
      display: flex; align-items: center;
      padding: 10px 16px; gap: 12px; flex-shrink: 0;
    }

    #ce-mp-module-select {
      flex: 1; max-width: 340px;
      height: 34px; padding: 0 10px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.25); border-radius: 4px;
      color: #fff; font-size: 13px; font-family: ${font};
      cursor: pointer; outline: none;
    }
    #ce-mp-module-select option { background: #394B58; color: #fff; }

    #ce-mp-mbody {
      display: grid; grid-template-columns: 220px 1fr;
      min-height: 0; overflow: hidden;
    }

    #ce-mp-left {
      border-right: 1px solid #C7CDD1; background: #fff;
      display: grid; grid-template-rows: auto 1fr;
      min-height: 0; overflow: hidden;
    }

    #ce-mp-items-scroll {
      overflow-y: auto; padding: 8px;
      display: flex; flex-direction: column; gap: 5px;
    }

    #ce-mp-right {
      overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 14px;
    }

    .ce-mp-tile {
      padding: 7px 10px; border-radius: 4px;
      border: 1px solid #C7CDD1; background: #fff;
      cursor: grab; display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #2D3B45;
      transition: border-color .1s, box-shadow .1s;
      user-select: none;
    }
    .ce-mp-tile:hover { border-color: #0770B8; box-shadow: 0 2px 6px rgba(7,112,184,.1); }
    .ce-mp-tile.dragging { opacity: 0.4; }
    .ce-mp-tile-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .ce-mp-tile-tag { font-size: 9px; color: #6B7280; background: #F2F4F5; padding: 2px 5px; border-radius: 3px; flex-shrink: 0; }

    .ce-mp-zone {
      min-height: 64px; border: 2px dashed #C7CDD1; border-radius: 6px;
      padding: 6px; display: flex; flex-direction: column; gap: 5px;
      transition: border-color .12s, background .12s;
    }
    .ce-mp-zone.drag-over { border-color: #0770B8; background: rgba(7,112,184,.05); }
    .ce-mp-zone-ph { font-size: 11px; color: #9CA3AF; text-align: center; padding: 14px 8px; }

    .ce-mp-section-label {
      font-size: 11px; font-weight: 700; color: #2D3B45;
      text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px;
    }

    .ce-mp-paths-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      border: 1px solid #C7CDD1; border-radius: 8px; overflow: hidden;
    }

    .ce-mp-path-col { display: flex; flex-direction: column; }
    .ce-mp-path-col:not(:last-child) { border-right: 1px solid #C7CDD1; }

    .ce-mp-path-head { padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; }

    .ce-mp-path-label {
      font-size: 12px; font-weight: 700; color: #fff; background: none;
      border: 1px solid rgba(255,255,255,0.3); border-radius: 3px;
      padding: 3px 6px; font-family: ${font}; width: 100%; box-sizing: border-box;
    }
    .ce-mp-path-label:focus { outline: none; border-color: rgba(255,255,255,0.7); }

    .ce-mp-range {
      font-size: 11px; color: rgba(255,255,255,0.85);
      display: flex; align-items: center; gap: 3px; flex-wrap: wrap;
    }

    .ce-mp-thresh {
      width: 38px; background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.35); border-radius: 3px;
      padding: 2px 4px; font-size: 11px; font-weight: 700;
      color: #fff; text-align: center; font-family: ${font};
      -moz-appearance: textfield;
    }
    .ce-mp-thresh::-webkit-inner-spin-button,
    .ce-mp-thresh::-webkit-outer-spin-button { -webkit-appearance: none; }
    .ce-mp-thresh:focus { outline: none; border-color: #fff; }

    .ce-mp-path-body {
      flex: 1; min-height: 100px; padding: 8px;
      background: #fff; display: flex; flex-direction: column; gap: 5px;
      border: 2px dashed transparent; box-sizing: border-box;
      transition: border-color .12s, background .12s;
    }
    .ce-mp-path-body.drag-over { border-color: #0770B8; background: rgba(7,112,184,.04); }
    .ce-mp-path-body-ph { font-size: 11px; color: #C7CDD1; text-align: center; padding: 18px 8px; }

    .ce-mp-status {
      padding: 9px 12px; border-radius: 4px;
      font-size: 12px; font-weight: 600; line-height: 1.4;
    }
    .ce-mp-status-info { background: #E8F1F8; color: #0770B8; border: 1px solid #b8d4f0; }
    .ce-mp-status-ok   { background: #ecfdf5; color: #127A1B; border: 1px solid #a7f3d0; }
    .ce-mp-status-err  { background: #fef2f2; color: #BC1212; border: 1px solid #fecaca; }

    .ce-mp-trigger-tile {
      border-radius: 6px; padding: 10px 12px;
      display: flex; align-items: center; gap: 10px;
      border: 1px solid; font-size: 13px; font-weight: 700;
    }

    /* Pick-module splash */
    #ce-mp-splash {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100%; gap: 10px; color: #6B7280;
      font-size: 14px;
    }
    #ce-mp-splash svg { opacity: .25; }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    courseId: null,
    modules: [],
    selectedModuleId: null,
    allItems: [],
    trigger: null,
    paths: [
      { id: 'p0', label: 'Mastery',    color: '#127A1B', lower: 85, items: [] },
      { id: 'p1', label: 'Proficient', color: '#0770B8', lower: 70, items: [] },
      { id: 'p2', label: 'Support',    color: '#B45309', lower: 0,  items: [] },
    ],
    status: '',
    statusType: 'info',
    loading: false,
    saving: false,
  };

  function getUnassigned() {
    const used = new Set([
      state.trigger?.id,
      ...state.paths.flatMap(p => p.items.map(i => i.id)),
    ].filter(Boolean));
    return state.allItems.filter(i => !used.has(i.id));
  }

  function setStatus(msg, type = 'info') {
    state.status = msg;
    state.statusType = type;
    renderRight();
  }

  /* =========================================================
     CANVAS API
  ========================================================= */
  async function loadModules(courseId) {
    try {
      const mods = await apiList(`/api/v1/courses/${courseId}/modules`);
      state.modules = mods.map(m => ({ id: String(m.id), name: m.name || `Module ${m.id}` }));
      rebuildModuleSelect();
    } catch(e) {
      console.warn('[MasteryPath] Could not load modules:', e.message);
    }
  }

  async function loadItems(courseId, moduleId) {
    state.loading = true;
    state.allItems = [];
    state.trigger = null;
    state.paths.forEach(p => { p.items = []; });
    state.status = '';
    renderLeft();
    renderRight();
    try {
      const raw = await apiList(`/api/v1/courses/${courseId}/modules/${moduleId}/items`);
      state.allItems = raw.map(item => ({
        id: String(item.id),
        contentId: String(item.content_id || item.id),
        title: item.title || 'Untitled',
        type: item.type || 'Assignment',
      }));
      state.loading = false;
      state.status = state.allItems.length
        ? 'Drag a gradable item to the Trigger zone, then fill each score band.'
        : 'No items found in this module.';
      state.statusType = 'info';
      renderLeft();
      renderRight();
    } catch(e) {
      state.loading = false;
      state.status = 'Could not load items: ' + e.message;
      state.statusType = 'err';
      renderLeft();
      renderRight();
    }
  }

  async function publish() {
    if (!state.trigger) { setStatus('Set a trigger assignment first.', 'err'); return; }
    if (!GRADABLE.has(state.trigger.type)) {
      setStatus('Trigger must be an assignment, quiz, or graded discussion.', 'err'); return;
    }

    state.saving = true;
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing…';
    setStatus('Publishing to Canvas…', 'info');

    try {
      const uppers = [1.0, ...state.paths.slice(0, -1).map(p => p.lower / 100)];
      const scoringRanges = state.paths.map((path, i) => ({
        upper_bound: uppers[i],
        lower_bound: i === state.paths.length - 1 ? 0 : path.lower / 100,
        assignment_sets: path.items.length ? [{
          assignment_set_associations: path.items.map((item, pos) => ({
            assignment_id: Number(item.contentId),
            position: pos + 1,
          })),
        }] : [],
      }));

      const rule = {
        trigger_assignment_id: Number(state.trigger.contentId),
        scoring_ranges: scoringRanges,
      };

      let existingId = null;
      try {
        const existing = await apiList(`/api/v1/courses/${state.courseId}/conditional_release/rules`);
        const match = existing.find(r => String(r.trigger_assignment_id) === String(rule.trigger_assignment_id));
        if (match) existingId = match.id;
      } catch(_) {}

      if (existingId) {
        await apiFetch('PUT', `/api/v1/courses/${state.courseId}/conditional_release/rules/${existingId}`, rule);
      } else {
        await apiFetch('POST', `/api/v1/courses/${state.courseId}/conditional_release/rules`, rule);
      }

      state.saving = false;
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish to Canvas';
      setStatus('Published! Canvas will unlock the right content per student based on their score.', 'ok');
    } catch(e) {
      state.saving = false;
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish to Canvas';
      const msg = e.message.includes('404')
        ? 'Mastery Paths is not enabled for this Canvas instance. Ask your admin to enable the Conditional Release feature.'
        : 'Failed to publish: ' + e.message;
      setStatus(msg, 'err');
    }
  }

  /* =========================================================
     TOP TOOLBAR
  ========================================================= */
  const toolbar = document.createElement('div');
  toolbar.id = 'ce-mp-toolbar';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.textContent = 'Mastery Path Builder';
  openBtn.className = 'ce-mp-tbtn ce-mp-tbtn-primary';
  openBtn.addEventListener('click', openModal);

  const hideBtn = document.createElement('button');
  hideBtn.type = 'button';
  hideBtn.textContent = 'Hide';
  hideBtn.className = 'ce-mp-tbtn ce-mp-tbtn-ghost';
  hideBtn.addEventListener('click', () => {
    document.body.classList.remove('ce-mp-mode');
    toolbar.style.display = 'none';
    colTab.style.display = 'flex';
  });

  toolbar.append(openBtn, hideBtn);

  // Collapsed tab
  const colTab = document.createElement('button');
  colTab.id = 'ce-mp-tab';
  colTab.type = 'button';
  colTab.textContent = 'MP';
  colTab.title = 'Mastery Path Builder';
  colTab.style.cssText = [
    'display:none;position:fixed;top:50%;right:0;transform:translateY(-50%);',
    'z-index:9999;width:22px;padding:28px 3px;writing-mode:vertical-rl;',
    'background:#394B58;color:rgba(255,255,255,0.7);border:none;',
    'border-radius:4px 0 0 4px;font-size:10px;font-weight:700;',
    'letter-spacing:.05em;cursor:pointer;font-family:' + font + ';',
    'box-shadow:-2px 0 8px rgba(0,0,0,.18);',
  ].join('');
  colTab.addEventListener('click', () => {
    document.body.classList.add('ce-mp-mode');
    toolbar.style.display = 'flex';
    colTab.style.display = 'none';
  });
  document.body.appendChild(colTab);

  /* =========================================================
     MODAL
  ========================================================= */
  const modal = document.createElement('div');
  modal.id = 'ce-mp-modal';

  const shell = document.createElement('div');
  shell.id = 'ce-mp-shell';

  // Modal header
  const mhdr = document.createElement('div');
  mhdr.id = 'ce-mp-mhdr';

  const mhdrLabel = document.createElement('div');
  mhdrLabel.style.cssText = 'font-size:13px;font-weight:700;color:#fff;white-space:nowrap;';
  mhdrLabel.textContent = 'Mastery Path Builder';

  const moduleSelect = document.createElement('select');
  moduleSelect.id = 'ce-mp-module-select';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Select a module…';
  moduleSelect.appendChild(defaultOpt);
  moduleSelect.addEventListener('change', () => {
    const val = moduleSelect.value;
    if (val && state.courseId) {
      state.selectedModuleId = val;
      loadItems(state.courseId, val);
    } else {
      state.selectedModuleId = null;
      state.allItems = [];
      state.trigger = null;
      state.paths.forEach(p => { p.items = []; });
      state.status = '';
      renderLeft();
      renderRight();
    }
  });

  const publishBtn = document.createElement('button');
  publishBtn.type = 'button';
  publishBtn.textContent = 'Publish to Canvas';
  publishBtn.className = 'ce-mp-tbtn ce-mp-tbtn-primary';
  publishBtn.addEventListener('click', publish);

  const closeModalBtn = document.createElement('button');
  closeModalBtn.type = 'button';
  closeModalBtn.textContent = '✕';
  closeModalBtn.className = 'ce-mp-tbtn ce-mp-tbtn-ghost';
  closeModalBtn.style.width = '34px';
  closeModalBtn.style.padding = '0';
  closeModalBtn.addEventListener('click', closeModal);

  mhdr.append(mhdrLabel, moduleSelect, publishBtn, closeModalBtn);

  // Modal body
  const mbody = document.createElement('div');
  mbody.id = 'ce-mp-mbody';

  // Left panel
  const leftPanel = document.createElement('div');
  leftPanel.id = 'ce-mp-left';

  const leftHead = document.createElement('div');
  leftHead.style.cssText = 'padding:10px 12px;border-bottom:1px solid #C7CDD1;font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;justify-content:space-between;';
  leftHead.innerHTML = '<span>Module Items</span>';
  const leftCount = document.createElement('span');
  leftCount.id = 'ce-mp-count';
  leftCount.style.cssText = 'font-size:10px;color:#9CA3AF;';
  leftHead.appendChild(leftCount);

  const leftScroll = document.createElement('div');
  leftScroll.id = 'ce-mp-items-scroll';

  leftPanel.append(leftHead, leftScroll);

  // Right panel
  const rightPanel = document.createElement('div');
  rightPanel.id = 'ce-mp-right';

  mbody.append(leftPanel, rightPanel);
  shell.append(mhdr, mbody);
  modal.appendChild(shell);
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  /* =========================================================
     DRAG
  ========================================================= */
  let _dragging = null;

  function makeTile(item, variant) {
    const tile = document.createElement('div');
    tile.className = 'ce-mp-tile';
    tile.draggable = true;
    tile.dataset.itemId = item.id;

    const icon = document.createElement('span');
    icon.style.fontSize = '13px';
    icon.textContent = ITEM_ICONS[item.type] || '📄';

    const titleEl = document.createElement('span');
    titleEl.className = 'ce-mp-tile-title';
    titleEl.textContent = item.title;

    tile.append(icon, titleEl);

    if (variant === 'left' && GRADABLE.has(item.type)) {
      const tag = document.createElement('span');
      tag.className = 'ce-mp-tile-tag';
      tag.textContent = 'TRIGGER?';
      tile.appendChild(tag);
    }

    tile.addEventListener('dragstart', e => {
      _dragging = item;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
      requestAnimationFrame(() => tile.classList.add('dragging'));
    });
    tile.addEventListener('dragend', () => {
      _dragging = null;
      tile.classList.remove('dragging');
    });

    return tile;
  }

  function wireZone(el, onDrop) {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over'); });
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (_dragging) onDrop(_dragging);
    });
  }

  function dropItem(item, target) {
    if (state.trigger?.id === item.id) state.trigger = null;
    state.paths.forEach(p => { p.items = p.items.filter(i => i.id !== item.id); });

    if (target === 'trigger') {
      if (!GRADABLE.has(item.type)) {
        setStatus('Only assignments, quizzes, and graded discussions can trigger a path.', 'err');
        renderLeft();
        renderRight();
        return;
      }
      state.trigger = item;
    } else if (target !== 'unassigned') {
      const path = state.paths.find(p => p.id === target);
      if (path) path.items.push(item);
    }
    renderLeft();
    renderRight();
  }

  /* =========================================================
     RENDER
  ========================================================= */
  function rebuildModuleSelect() {
    while (moduleSelect.options.length > 1) moduleSelect.remove(1);
    state.modules.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === state.selectedModuleId) opt.selected = true;
      moduleSelect.appendChild(opt);
    });
  }

  function renderLeft() {
    leftScroll.innerHTML = '';
    const unassigned = getUnassigned();
    leftCount.textContent = unassigned.length ? `${unassigned.length} left` : '';

    if (!state.selectedModuleId) {
      const ph = document.createElement('div');
      ph.style.cssText = 'font-size:12px;color:#9CA3AF;text-align:center;padding:24px 12px;line-height:1.5;';
      ph.textContent = 'Select a module above to load its items.';
      leftScroll.appendChild(ph);
      return;
    }

    if (state.loading) {
      const ph = document.createElement('div');
      ph.style.cssText = 'font-size:12px;color:#9CA3AF;text-align:center;padding:16px;';
      ph.textContent = 'Loading items…';
      leftScroll.appendChild(ph);
      return;
    }

    if (!unassigned.length && !state.allItems.length) {
      const ph = document.createElement('div');
      ph.style.cssText = 'font-size:12px;color:#9CA3AF;text-align:center;padding:16px;';
      ph.textContent = 'No items in this module.';
      leftScroll.appendChild(ph);
    } else {
      unassigned.forEach(item => leftScroll.appendChild(makeTile(item, 'left')));
    }

    const returnZone = document.createElement('div');
    returnZone.className = 'ce-mp-zone';
    returnZone.style.cssText += 'margin-top:4px;border-style:dotted;';
    returnZone.innerHTML = '<div class="ce-mp-zone-ph">↩ Drop here to remove from path</div>';
    wireZone(returnZone, item => dropItem(item, 'unassigned'));
    leftScroll.appendChild(returnZone);
  }

  function renderRight() {
    publishBtn.disabled = state.saving || !state.trigger;
    rightPanel.innerHTML = '';

    if (!state.selectedModuleId) {
      const splash = document.createElement('div');
      splash.id = 'ce-mp-splash';
      splash.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#394B58" stroke-width="1.5">
          <path d="M4 6h16M4 10h16M4 14h10M4 18h6"/>
        </svg>
        <div>Select a module to start building mastery paths</div>
      `;
      rightPanel.appendChild(splash);
      return;
    }

    if (state.status) {
      const s = document.createElement('div');
      s.className = `ce-mp-status ce-mp-status-${state.statusType}`;
      s.textContent = state.status;
      rightPanel.appendChild(s);
    }

    // Trigger
    const trigSec = document.createElement('div');
    const trigLabel = document.createElement('div');
    trigLabel.className = 'ce-mp-section-label';
    trigLabel.textContent = 'Trigger Assignment';
    trigSec.appendChild(trigLabel);

    if (state.trigger) {
      const tw = document.createElement('div');
      tw.className = 'ce-mp-trigger-tile';
      tw.style.cssText += 'color:#127A1B;border-color:#a7f3d0;background:#ecfdf5;';

      const icon = document.createElement('span');
      icon.style.fontSize = '18px';
      icon.textContent = ITEM_ICONS[state.trigger.type] || '📄';

      const name = document.createElement('span');
      name.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      name.textContent = state.trigger.title;

      const clr = document.createElement('button');
      clr.type = 'button';
      clr.textContent = '✕';
      clr.style.cssText = 'border:none;background:none;color:#6B7280;cursor:pointer;font-size:14px;padding:0;line-height:1;';
      clr.addEventListener('click', () => { state.trigger = null; renderLeft(); renderRight(); });

      tw.append(icon, name, clr);
      trigSec.appendChild(tw);
    } else {
      const trigZone = document.createElement('div');
      trigZone.className = 'ce-mp-zone';
      trigZone.innerHTML = '<div class="ce-mp-zone-ph">Drag a gradable assignment, quiz, or discussion here</div>';
      wireZone(trigZone, item => dropItem(item, 'trigger'));
      trigSec.appendChild(trigZone);
    }
    rightPanel.appendChild(trigSec);

    // Paths
    const pathSec = document.createElement('div');
    const pathLabel = document.createElement('div');
    pathLabel.className = 'ce-mp-section-label';
    pathLabel.innerHTML = 'Score Paths <span style="font-weight:400;color:#9CA3AF;text-transform:none;letter-spacing:0;font-size:11px;">— drag items from the left into each band</span>';
    pathSec.appendChild(pathLabel);

    const grid = document.createElement('div');
    grid.className = 'ce-mp-paths-grid';

    state.paths.forEach((path, i) => {
      const col = document.createElement('div');
      col.className = 'ce-mp-path-col';

      const colHead = document.createElement('div');
      colHead.className = 'ce-mp-path-head';
      colHead.style.background = path.color;

      const labelInp = document.createElement('input');
      labelInp.type = 'text';
      labelInp.value = path.label;
      labelInp.className = 'ce-mp-path-label';
      labelInp.addEventListener('change', e => { path.label = e.target.value; });
      colHead.appendChild(labelInp);

      const rangeRow = document.createElement('div');
      rangeRow.className = 'ce-mp-range';

      function txt(s) { const sp = document.createElement('span'); sp.textContent = s; return sp; }

      if (i === 0) {
        rangeRow.append(makeThreshInput(path), txt('% – 100%'));
      } else if (i === state.paths.length - 1) {
        rangeRow.append(txt(`0% – ${state.paths[i - 1].lower - 1}%`));
      } else {
        rangeRow.append(makeThreshInput(path), txt(`% – ${state.paths[i - 1].lower - 1}%`));
      }

      colHead.appendChild(rangeRow);

      const colBody = document.createElement('div');
      colBody.className = 'ce-mp-path-body';

      if (path.items.length) {
        path.items.forEach(item => colBody.appendChild(makeTile(item, 'path')));
      } else {
        const ph = document.createElement('div');
        ph.className = 'ce-mp-path-body-ph';
        ph.textContent = 'Drop items here';
        colBody.appendChild(ph);
      }

      wireZone(colBody, item => dropItem(item, path.id));
      col.append(colHead, colBody);
      grid.appendChild(col);
    });

    pathSec.appendChild(grid);
    rightPanel.appendChild(pathSec);
  }

  function makeThreshInput(path) {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min = '1'; inp.max = '99';
    inp.value = String(path.lower);
    inp.className = 'ce-mp-thresh';
    inp.addEventListener('change', e => {
      const v = Math.max(1, Math.min(99, Number(e.target.value) || 1));
      path.lower = v;
      inp.value = v;
      renderRight();
    });
    return inp;
  }

  /* =========================================================
     OPEN / CLOSE
  ========================================================= */
  function openModal() {
    modal.style.display = 'block';
    renderLeft();
    renderRight();
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  /* =========================================================
     TOOLBAR INSTALL (same pattern as quiz/inbox toolbars)
  ========================================================= */
  let _onPage = false;

  function updateBar() {
    const courseId = getCourseId();
    const onPage = !!courseId && /\/courses\/\d+(\/modules)?\/?$/.test(window.location.pathname);

    if (onPage) {
      // Re-insert toolbar every cycle — Canvas's React re-renders remove it
      if (!document.body.contains(toolbar)) {
        document.body.appendChild(toolbar);
      }
      document.body.classList.add('ce-mp-mode');
      toolbar.style.display = 'flex';
      colTab.style.display = 'none';

      if (!_onPage || state.courseId !== courseId) {
        state.courseId = courseId;
        if (!state.modules.length) {
          state.modules = [];
          state.selectedModuleId = null;
          state.allItems = [];
          state.trigger = null;
          state.paths.forEach(p => { p.items = []; });
          state.status = '';
          moduleSelect.value = '';
          rebuildModuleSelect();
          loadModules(courseId);
        }
      }
    } else if (_onPage) {
      document.body.classList.remove('ce-mp-mode');
      toolbar.style.display = 'none';
      colTab.style.display = 'none';
      closeModal();
    }

    _onPage = onPage;
  }

  document.body.appendChild(toolbar);
  updateBar();
  new MutationObserver(() => setTimeout(updateBar, 150)).observe(document.body, { childList: true, subtree: false });
  setInterval(updateBar, 800);
})();
