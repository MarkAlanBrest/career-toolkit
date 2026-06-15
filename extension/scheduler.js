(async function () {
  'use strict';

  if (document.getElementById('csch-app')) return;

  const STORAGE_KEY = 'canvas_scheduler_settings_v1';
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TYPE_COLORS = {
    Assignment: '#2563eb',
    Discussion: '#c2410c',
    Test: '#0f766e'
  };

  const _store = await new Promise(resolve =>
    chrome.storage.local.get([STORAGE_KEY], resolve)
  );

  function GM_getValue(key, def) { return _store[key] ?? def; }
  function GM_setValue(key, val) {
    _store[key] = val;
    chrome.storage.local.set({ [key]: val });
  }

  function normalizeInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function normalizeWeekdays(value) {
    if (!Array.isArray(value)) return [1, 3];
    const normalized = value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6);
    const unique = [...new Set(normalized)];
    return unique.length ? unique : [1, 3];
  }

  function todayKey() { return toDateKey(new Date()); }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function fromDateKey(dateKey) {
    const [year, month, day] = String(dateKey).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  }

  function addDays(dateKey, delta) {
    const date = fromDateKey(dateKey);
    date.setDate(date.getDate() + delta);
    return toDateKey(date);
  }

  function combineLocalDateAndTime(dateKey, timeValue) {
    const [hours, minutes] = String(timeValue || '23:59').split(':').map(Number);
    const date = fromDateKey(dateKey);
    date.setHours(Number.isFinite(hours) ? hours : 23, Number.isFinite(minutes) ? minutes : 59, 0, 0);
    return date.toISOString();
  }

  function formatDateLabel(dateKey) {
    return fromDateKey(dateKey).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  function formatFullDateLabel(dateKey) {
    return fromDateKey(dateKey).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function formatCompactCanvasDate(isoValue) {
    if (!isoValue) return 'No due date';
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return 'No due date';
    return date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  function getCourseId() {
    const match = window.location.pathname.match(/\/courses\/(\d+)/);
    return match ? match[1] : null;
  }

  function getCSRF() {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
    if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function escHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const savedSettings = GM_getValue(STORAGE_KEY, {});

  const state = {
    open: false,
    loading: false,
    saving: false,
    notice: '',
    noticeType: 'info',
    courseId: null,
    draggedItemId: null,
    slotCount: Math.max(12, Number(savedSettings.slotCount) || 12),
    settings: {
      startDate: savedSettings.startDate || todayKey(),
      weekdays: normalizeWeekdays(savedSettings.weekdays),
      dueTime: savedSettings.dueTime || '23:59',
      openDaysBefore: normalizeInt(savedSettings.openDaysBefore, 2),
      closeDaysAfter: normalizeInt(savedSettings.closeDaysAfter, 2),
      answersDaysAfter: normalizeInt(savedSettings.answersDaysAfter, 1)
    },
    modules: [],
    items: [],
    generatedDateKeys: [],
    schedule: {}
  };

  function setNotice(message, type) {
    state.notice = message;
    state.noticeType = type || 'info';
    render();
  }

  function persistSettings() {
    GM_setValue(STORAGE_KEY, {
      startDate: state.settings.startDate,
      weekdays: state.settings.weekdays,
      dueTime: state.settings.dueTime,
      openDaysBefore: state.settings.openDaysBefore,
      closeDaysAfter: state.settings.closeDaysAfter,
      answersDaysAfter: state.settings.answersDaysAfter,
      slotCount: state.slotCount
    });
  }

  function getGeneratedDates() {
    const selected = [...state.settings.weekdays].sort((a, b) => a - b);
    if (!selected.length) return [];
    const dates = [];
    const seen = new Set();
    const cursor = fromDateKey(state.settings.startDate);
    let attempts = 0;
    const target = Math.max(4, state.slotCount);
    while (dates.length < target && attempts < 500) {
      const key = toDateKey(cursor);
      if (selected.includes(cursor.getDay()) && !seen.has(key)) {
        seen.add(key);
        dates.push(key);
      }
      cursor.setDate(cursor.getDate() + 1);
      attempts += 1;
    }
    return dates;
  }

  function syncGeneratedDates() {
    const generated = getGeneratedDates();
    const assignedDates = Object.values(state.schedule).filter(Boolean);
    const merged = [...generated];
    assignedDates.forEach((dateKey) => {
      if (!merged.includes(dateKey)) merged.push(dateKey);
    });
    merged.sort();
    state.generatedDateKeys = merged;
  }

  function isScheduled(itemId) { return Boolean(state.schedule[itemId]); }

  function getUnscheduledItems() {
    return state.items.filter((item) => !isScheduled(item.id));
  }

  function getItemsForDate(dateKey) {
    return state.items.filter((item) => state.schedule[item.id] === dateKey);
  }

  function getPrimaryModuleLabel(item) {
    if (!item.primaryModuleName) return 'No module';
    if (item.moduleNames.length <= 1) return item.primaryModuleName;
    return `${item.primaryModuleName} +${item.moduleNames.length - 1}`;
  }

  function inferItemType(assignment, quiz) {
    if (quiz || assignment.is_quiz_assignment) return 'Test';
    if (Array.isArray(assignment.submission_types) && assignment.submission_types.includes('discussion_topic')) return 'Discussion';
    return 'Assignment';
  }

  function buildItems(modules, assignments, quizzes) {
    const quizByAssignmentId = new Map();
    const quizById = new Map();
    quizzes.forEach((quiz) => {
      quizById.set(Number(quiz.id), quiz);
      if (quiz.assignment_id) quizByAssignmentId.set(Number(quiz.assignment_id), quiz);
    });

    const moduleLookup = new Map();
    const discussionAssignmentsByName = new Map();

    assignments.forEach((assignment) => {
      if (Array.isArray(assignment.submission_types) && assignment.submission_types.includes('discussion_topic')) {
        const list = discussionAssignmentsByName.get(assignment.name) || [];
        list.push(assignment);
        discussionAssignmentsByName.set(assignment.name, list);
      }
    });

    modules.forEach((module) => {
      (module.items || []).forEach((moduleItem) => {
        let assignmentId = null;
        if (moduleItem.type === 'Assignment') {
          assignmentId = Number(moduleItem.content_id);
        } else if (moduleItem.type === 'Quiz') {
          const quiz = quizById.get(Number(moduleItem.content_id));
          assignmentId = quiz ? Number(quiz.assignment_id) : null;
        } else if (moduleItem.type === 'Discussion') {
          const match = (discussionAssignmentsByName.get(moduleItem.title) || []).find(
            (a) => !moduleLookup.has(Number(a.id))
          );
          assignmentId = match ? Number(match.id) : null;
        }
        if (!assignmentId) return;
        const list = moduleLookup.get(assignmentId) || [];
        list.push({
          moduleId: module.id,
          moduleName: module.name,
          modulePosition: Number(module.position) || 9999,
          itemPosition: Number(moduleItem.position) || 9999
        });
        moduleLookup.set(assignmentId, list);
      });
    });

    const items = assignments.flatMap((assignment) => {
      const modulesForItem = (moduleLookup.get(Number(assignment.id)) || []).sort((a, b) => {
        if (a.modulePosition !== b.modulePosition) return a.modulePosition - b.modulePosition;
        return a.itemPosition - b.itemPosition;
      });
      if (!modulesForItem.length) return [];
      const quiz = quizByAssignmentId.get(Number(assignment.id)) || null;
      const moduleNames = modulesForItem.map((e) => e.moduleName);
      const type = inferItemType(assignment, quiz);
      return [{
        id: `assignment-${assignment.id}`,
        assignmentId: Number(assignment.id),
        quizId: quiz ? Number(quiz.id) : null,
        title: assignment.name || 'Untitled item',
        type,
        color: TYPE_COLORS[type] || '#2563eb',
        moduleNames,
        primaryModuleName: moduleNames[0] || '',
        currentDueAt: assignment.due_at || '',
        currentUnlockAt: assignment.unlock_at || '',
        currentLockAt: assignment.lock_at || '',
        currentAnswersAt: quiz ? (quiz.show_correct_answers_at || '') : '',
        published: assignment.published !== false,
        htmlUrl: assignment.html_url || '',
        orderKey: [
          String(modulesForItem[0]?.modulePosition || 9999).padStart(4, '0'),
          String(modulesForItem[0]?.itemPosition || 9999).padStart(4, '0'),
          (assignment.name || '').toLowerCase()
        ].join('-')
      }];
    });

    items.sort((a, b) => a.orderKey.localeCompare(b.orderKey));
    return items;
  }

  async function canvasRequest(url, options) {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCSRF()
      },
      credentials: 'same-origin',
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Canvas API ${response.status}: ${text.slice(0, 200)}`);
    }
    if (response.status === 204) return { data: null, response };
    return { data: await response.json(), response };
  }

  function getNextLink(linkHeader) {
    if (!linkHeader) return null;
    for (const part of linkHeader.split(',')) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match && match[2] === 'next') return match[1];
    }
    return null;
  }

  async function canvasList(path) {
    let nextUrl = path.startsWith('http') ? path : `${window.location.origin}${path}`;
    const all = [];
    while (nextUrl) {
      const { data, response } = await canvasRequest(nextUrl, { method: 'GET' });
      if (Array.isArray(data)) all.push(...data);
      nextUrl = getNextLink(response.headers.get('Link'));
    }
    return all;
  }

  async function canvasAPI(method, path, body) {
    const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
    const { data } = await canvasRequest(url, { method, body });
    return data;
  }

  async function loadModules(courseId) {
    const modules = await canvasList(`/api/v1/courses/${courseId}/modules?per_page=100`);
    return Promise.all(
      modules.map(async (module) => ({
        ...module,
        items: await canvasList(`/api/v1/courses/${courseId}/modules/${module.id}/items?per_page=100`)
      }))
    );
  }

  function hydrateExistingSchedule() {
    const nextSchedule = {};
    state.items.forEach((item) => {
      if (!item.currentDueAt) return;
      const dueDate = new Date(item.currentDueAt);
      if (Number.isNaN(dueDate.getTime())) return;
      nextSchedule[item.id] = toDateKey(dueDate);
    });
    state.schedule = nextSchedule;
  }

  async function loadCourseData() {
    const courseId = getCourseId();
    if (!courseId) { setNotice('Open a Canvas course first.', 'err'); return; }
    state.loading = true;
    state.courseId = courseId;
    setNotice('Loading course items from Canvas...', 'info');
    try {
      const [modules, assignments, quizzes] = await Promise.all([
        loadModules(courseId),
        canvasList(`/api/v1/courses/${courseId}/assignments?per_page=100`),
        canvasList(`/api/v1/courses/${courseId}/quizzes?per_page=100`)
      ]);
      state.modules = modules;
      state.items = buildItems(modules, assignments, quizzes);
      hydrateExistingSchedule();
      syncGeneratedDates();
      setNotice(`Loaded ${state.items.length} module items from this course.`, 'ok');
    } catch (error) {
      setNotice(`Could not load Canvas data: ${error.message}`, 'err');
    } finally {
      state.loading = false;
      render();
    }
  }

  function updateSetting(name, value) {
    state.settings[name] = value;
    persistSettings();
    syncGeneratedDates();
    render();
  }

  function toggleWeekday(dayIndex) {
    const selected = [...state.settings.weekdays];
    const existingIndex = selected.indexOf(dayIndex);
    if (existingIndex >= 0) {
      selected.splice(existingIndex, 1);
    } else {
      selected.push(dayIndex);
    }
    selected.sort((a, b) => a - b);
    state.settings.weekdays = selected;
    persistSettings();
    syncGeneratedDates();
    render();
  }

  function updateSchedule(itemId, dateKey) {
    if (dateKey) {
      state.schedule[itemId] = dateKey;
    } else {
      delete state.schedule[itemId];
    }
    syncGeneratedDates();
    render();
  }

  function buildTileMarkup(item) {
    const dueLabel = formatCompactCanvasDate(item.currentDueAt);
    const statusLabel = item.published ? dueLabel : `Draft | ${dueLabel}`;
    return `
      <div class="csch-item-top">
        <span class="csch-type-pill" style="background:${item.color}">${escHtml(item.type)}</span>
      </div>
      <div class="csch-item-title">${escHtml(item.title)}</div>
      <div class="csch-item-module">${escHtml(getPrimaryModuleLabel(item))}</div>
      <div class="csch-item-meta-row">
        <span class="csch-item-meta">${escHtml(statusLabel)}</span>
        ${item.htmlUrl ? `<a class="csch-item-link" href="${escHtml(item.htmlUrl)}" target="_blank" rel="noopener noreferrer">Open</a>` : ''}
      </div>
    `;
  }

  function groupItemsByModule(items) {
    const grouped = new Map();
    items.forEach((item) => {
      const key = item.primaryModuleName || 'No module';
      const list = grouped.get(key) || [];
      list.push(item);
      grouped.set(key, list);
    });
    return [...grouped.entries()];
  }

  async function publishSchedule() {
    const scheduledItems = state.items.filter((item) => Boolean(state.schedule[item.id]));
    if (!scheduledItems.length) { setNotice('Drag at least one item onto a date before publishing.', 'err'); return; }
    if (!state.courseId) { setNotice('Open a Canvas course first.', 'err'); return; }

    const confirmed = window.confirm(
      `Publish ${scheduledItems.length} item${scheduledItems.length === 1 ? '' : 's'} to Canvas?\n\nThis will overwrite existing due dates.`
    );
    if (!confirmed) return;

    state.saving = true;
    setNotice(`Publishing ${scheduledItems.length} item${scheduledItems.length === 1 ? '' : 's'} to Canvas...`, 'info');
    render();

    try {
      for (const item of scheduledItems) {
        const dueDateKey = state.schedule[item.id];
        const dueAt = combineLocalDateAndTime(dueDateKey, state.settings.dueTime);
        const unlockAt = combineLocalDateAndTime(addDays(dueDateKey, -state.settings.openDaysBefore), '00:00');
        const lockAt = combineLocalDateAndTime(addDays(dueDateKey, state.settings.closeDaysAfter), '23:59');

        await canvasAPI('PUT', `/api/v1/courses/${state.courseId}/assignments/${item.assignmentId}`, {
          assignment: { due_at: dueAt, unlock_at: unlockAt, lock_at: lockAt }
        });

        if (item.quizId) {
          const answersAt = combineLocalDateAndTime(addDays(dueDateKey, state.settings.answersDaysAfter), state.settings.dueTime);
          await canvasAPI('PUT', `/api/v1/courses/${state.courseId}/quizzes/${item.quizId}`, {
            quiz: { show_correct_answers: true, show_correct_answers_at: answersAt }
          });
        }
      }

      state.items = state.items.map((item) => {
        const dueDateKey = state.schedule[item.id];
        if (!dueDateKey) return item;
        return {
          ...item,
          currentDueAt: combineLocalDateAndTime(dueDateKey, state.settings.dueTime),
          currentUnlockAt: combineLocalDateAndTime(addDays(dueDateKey, -state.settings.openDaysBefore), '00:00'),
          currentLockAt: combineLocalDateAndTime(addDays(dueDateKey, state.settings.closeDaysAfter), '23:59'),
          currentAnswersAt: item.quizId
            ? combineLocalDateAndTime(addDays(dueDateKey, state.settings.answersDaysAfter), state.settings.dueTime)
            : item.currentAnswersAt
        };
      });

      setNotice(`Canvas updated ${scheduledItems.length} item${scheduledItems.length === 1 ? '' : 's'}.`, 'ok');
    } catch (error) {
      setNotice(`Canvas could not save the schedule: ${error.message}`, 'err');
    } finally {
      state.saving = false;
      render();
    }
  }

  function handleTileDragStart(itemId, event) {
    state.draggedItemId = itemId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
  }

  function wireDragAndDrop() {
    document.querySelectorAll('[data-csch-item-id]').forEach((element) => {
      element.addEventListener('dragstart', (event) =>
        handleTileDragStart(element.getAttribute('data-csch-item-id'), event)
      );
    });

    document.querySelectorAll('[data-csch-drop-date]').forEach((zone) => {
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('csch-drop-active');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('csch-drop-active'));
      zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('csch-drop-active');
        const itemId = event.dataTransfer.getData('text/plain') || state.draggedItemId;
        if (!itemId) return;
        updateSchedule(itemId, zone.getAttribute('data-csch-drop-date') || '');
      });
    });
  }

  function render() {
    const status = document.getElementById('csch-toolbar-status');
    const leftBody = document.getElementById('csch-left-body');
    const rightBody = document.getElementById('csch-board');
    if (!status || !leftBody || !rightBody) return;

    status.className = `csch-toolbar-status csch-toolbar-status-${state.noticeType}`;
    status.textContent = state.notice || (state.items.length
      ? `${Object.keys(state.schedule).length} scheduled of ${state.items.length} items`
      : 'Open a course to load items');

    const unscheduledItems = getUnscheduledItems();
    const grouped = groupItemsByModule(unscheduledItems);

    leftBody.innerHTML = `
      <div class="csch-dropzone csch-unscheduled" data-csch-drop-date="">
        <div class="csch-dropzone-head">
          <strong>Unscheduled</strong>
          <span>${unscheduledItems.length}</span>
        </div>
        <div class="csch-dropzone-help">Drag any tile back here to clear its due date slot.</div>
      </div>
      ${grouped.length ? grouped.map(([moduleName, items]) => `
        <section class="csch-module-group">
          <div class="csch-module-head">${escHtml(moduleName)}</div>
          <div class="csch-tile-stack">
            ${items.map((item) => `
              <article class="csch-item" draggable="true" data-csch-item-id="${item.id}">
                ${buildTileMarkup(item)}
              </article>
            `).join('')}
          </div>
        </section>
      `).join('') : `
        <div class="csch-empty-state">
          ${state.items.length ? 'No items to display.' : 'Load a Canvas course to see module items here.'}
        </div>
      `}
    `;

    rightBody.innerHTML = state.generatedDateKeys.length ? state.generatedDateKeys.map((dateKey) => {
      const items = getItemsForDate(dateKey);
      return `
        <section class="csch-date-col">
          <div class="csch-date-head">
            <div class="csch-date-head-main">
              <div class="csch-date-title">${escHtml(formatDateLabel(dateKey))}</div>
              <div class="csch-date-count">${items.length}</div>
            </div>
            <div class="csch-date-sub">${escHtml(formatFullDateLabel(dateKey))}</div>
          </div>
          <div class="csch-dropzone csch-date-drop" data-csch-drop-date="${dateKey}">
            ${items.length ? items.map((item) => `
              <article class="csch-item csch-item-scheduled" draggable="true" data-csch-item-id="${item.id}">
                ${buildTileMarkup(item)}
              </article>
            `).join('') : `
              <div class="csch-empty-slot">Drop items here</div>
            `}
          </div>
        </section>
      `;
    }).join('') : `
      <div class="csch-empty-board">Pick one or more weekdays to generate due-date columns.</div>
    `;

    document.getElementById('csch-load-btn').disabled = state.loading;
    document.getElementById('csch-publish-btn').disabled = state.loading || state.saving || !state.items.length;
    document.getElementById('csch-publish-btn').textContent = state.saving ? 'Publishing...' : 'Publish';

    document.querySelectorAll('[data-weekday]').forEach((button) => {
      const dayIndex = Number(button.getAttribute('data-weekday'));
      button.classList.toggle('active', state.settings.weekdays.includes(dayIndex));
    });

    document.getElementById('csch-start-date').value = state.settings.startDate;
    document.getElementById('csch-due-time').value = state.settings.dueTime;
    document.getElementById('csch-open-offset').value = String(state.settings.openDaysBefore);
    document.getElementById('csch-close-offset').value = String(state.settings.closeDaysAfter);
    document.getElementById('csch-answer-offset').value = String(state.settings.answersDaysAfter);

    wireDragAndDrop();
  }

  function openApp() {
    app.classList.add('open');
    state.open = true;
    if (!state.items.length && !state.loading) loadCourseData();
    render();
  }

  function closeApp() {
    app.classList.remove('open');
    state.open = false;
  }

  /* ── DOM ─────────────────────────────────────────────────────────────── */

  const app = document.createElement('div');
  app.id = 'csch-app';
  app.innerHTML = `
    <div id="csch-shell">
      <div id="csch-topbar">
        <div id="csch-tb-controls">
          <span id="csch-toolbar-status" class="csch-toolbar-status csch-toolbar-status-info">Open a course to load items</span>

          <div class="csch-tb-divider"></div>

          <div class="csch-tb-group">
            <div class="csch-tb-label">Start date</div>
            <input id="csch-start-date" type="date">
          </div>

          <div class="csch-tb-group">
            <div class="csch-tb-label">Due days</div>
            <div class="csch-weekdays">
              ${DAY_NAMES.map((day, index) => `<button type="button" class="csch-day-btn" data-weekday="${index}">${day}</button>`).join('')}
            </div>
          </div>

          <div class="csch-tb-group">
            <div class="csch-tb-label">Due time</div>
            <input id="csch-due-time" type="time">
          </div>

          <div class="csch-tb-divider"></div>

          <div class="csch-tb-group">
            <div class="csch-tb-label">Availability window</div>
            <div class="csch-tb-window">
              Opens <input id="csch-open-offset" type="number" min="0" step="1" class="csch-num-input"> days before
              <span class="csch-tb-dot">·</span>
              Locks <input id="csch-close-offset" type="number" min="0" step="1" class="csch-num-input"> days after
              <span class="csch-tb-dot">·</span>
              Answers <input id="csch-answer-offset" type="number" min="0" step="1" class="csch-num-input"> days after
            </div>
          </div>
        </div>

        <div id="csch-tb-actions">
          <button type="button" class="csch-btn" id="csch-more-dates-btn">+ Dates</button>
          <button type="button" class="csch-btn" id="csch-load-btn">Reload</button>
          <button type="button" class="csch-btn csch-btn-primary" id="csch-publish-btn">Publish</button>
          <button type="button" class="csch-btn csch-btn-ghost" id="csch-close-btn">✕</button>
        </div>
      </div>

      <div id="csch-layout">
        <aside id="csch-left">
          <div class="csch-pane-head">
            <h2>Course Items</h2>
          </div>
          <div id="csch-left-body"></div>
        </aside>
        <main id="csch-right">
          <div class="csch-pane-head">
            <h2>Schedule Board</h2>
            <span class="csch-pane-note">Any weekdays</span>
          </div>
          <div id="csch-board"></div>
        </main>
      </div>
    </div>
  `;
  document.body.appendChild(app);

  /* ── Canvas Enhancer hub integration ────────────────────────────────── */

  document.addEventListener('ce-toggle-scheduler', () => {
    if (app.classList.contains('open')) closeApp(); else openApp();
  });

  /* ── Event listeners ─────────────────────────────────────────────────── */

  document.getElementById('csch-close-btn').addEventListener('click', closeApp);
  document.getElementById('csch-load-btn').addEventListener('click', loadCourseData);
  document.getElementById('csch-publish-btn').addEventListener('click', publishSchedule);
  document.getElementById('csch-more-dates-btn').addEventListener('click', () => {
    state.slotCount += 6;
    persistSettings();
    syncGeneratedDates();
    render();
  });
  document.getElementById('csch-start-date').addEventListener('change', (e) =>
    updateSetting('startDate', e.target.value || todayKey())
  );
  document.getElementById('csch-due-time').addEventListener('change', (e) =>
    updateSetting('dueTime', e.target.value || '23:59')
  );
  document.getElementById('csch-open-offset').addEventListener('change', (e) =>
    updateSetting('openDaysBefore', normalizeInt(e.target.value, 0))
  );
  document.getElementById('csch-close-offset').addEventListener('change', (e) =>
    updateSetting('closeDaysAfter', normalizeInt(e.target.value, 0))
  );
  document.getElementById('csch-answer-offset').addEventListener('change', (e) =>
    updateSetting('answersDaysAfter', normalizeInt(e.target.value, 0))
  );
  document.querySelectorAll('[data-weekday]').forEach((button) => {
    button.addEventListener('click', () => toggleWeekday(Number(button.getAttribute('data-weekday'))));
  });

  /* ── Styles ──────────────────────────────────────────────────────────── */

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #csch-app {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 2147483640;
      background: transparent;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Lato", "Segoe UI", Arial, sans-serif;
      color: #2D3B45;
    }

    #csch-app.open { display: block; }

    #csch-app * { box-sizing: border-box; }

    #csch-shell {
      position: absolute;
      top: 8px;
      bottom: 8px;
      left: 74px;   /* 66px Canvas global nav + 8px gap */
      right: 60px;  /* 52px CE hub toolbar + 8px gap */
      border-radius: 6px;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
      background: #F2F4F5;
      box-shadow: 0 8px 32px rgba(45, 59, 69, 0.28);
      pointer-events: auto;
    }

    #csch-topbar {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      background: #394B58;
      color: #fff;
      border-bottom: 1px solid #2D3B45;
    }

    .csch-pane-head h2, .csch-pane-head p { margin: 0; }

    #csch-tb-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;
    }

    #csch-tb-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .csch-tb-divider {
      width: 1px;
      height: 28px;
      background: rgba(255,255,255,0.2);
      flex-shrink: 0;
    }

    .csch-tb-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .csch-tb-label {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.65);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1;
    }

    .csch-tb-window {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #fff;
      font-weight: 500;
      flex-wrap: wrap;
    }

    .csch-tb-dot {
      color: rgba(255,255,255,0.35);
      font-weight: 400;
    }

    .csch-num-input {
      width: 42px;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 3px;
      background: rgba(255,255,255,0.12);
      color: #fff;
      font: 700 13px -apple-system,BlinkMacSystemFont,Lato,sans-serif;
      text-align: center;
      padding: 3px 4px;
    }

    .csch-num-input:focus {
      outline: none;
      background: rgba(255,255,255,0.22);
      border-color: rgba(255,255,255,0.55);
    }

    .csch-toolbar-status {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      background: rgba(255,255,255,0.12);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.18);
    }

    .csch-toolbar-status-info { background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.18); }
    .csch-toolbar-status-ok   { background: rgba(18,122,27,0.35);  color: #d1fae5; border: 1px solid rgba(18,122,27,0.5); }
    .csch-toolbar-status-err  { background: rgba(188,18,18,0.35);  color: #fee2e2; border: 1px solid rgba(188,18,18,0.5); }

    .csch-weekdays { display: flex; gap: 3px; flex-wrap: wrap; }

    .csch-day-btn, .csch-btn {
      border: 1px solid #C7CDD1;
      border-radius: 3px;
      background: #fff;
      color: #2D3B45;
      padding: 5px 8px;
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.1;
      cursor: pointer;
      transition: background 0.1s ease;
    }

    .csch-day-btn:hover { background: #E8F1F8; border-color: #0770B8; color: #0770B8; }
    .csch-btn:hover     { background: #E8F1F8; }

    .csch-day-btn.active {
      background: #0770B8;
      border-color: #0770B8;
      color: #fff;
    }

    .csch-btn-primary {
      background: #0770B8;
      border-color: #0770B8;
      color: #fff;
      font-weight: 700;
    }

    .csch-btn-primary:hover { background: #0860A8; }

    .csch-btn-ghost {
      background: rgba(255,255,255,0.12);
      border-color: rgba(255,255,255,0.25);
      color: #fff;
    }

    .csch-btn-ghost:hover { background: rgba(255,255,255,0.22); }

    .csch-btn:disabled { opacity: 0.5; cursor: default; }

    #csch-tb-controls input[type="date"],
    #csch-tb-controls input[type="time"] {
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 3px;
      padding: 4px 6px;
      font: 600 12px -apple-system,BlinkMacSystemFont,Lato,sans-serif;
      color: #fff;
      background: rgba(255,255,255,0.12);
      color-scheme: dark;
    }

    #csch-tb-controls input[type="date"]:focus,
    #csch-tb-controls input[type="time"]:focus {
      outline: none;
      background: rgba(255,255,255,0.22);
      border-color: rgba(255,255,255,0.55);
    }

    #csch-layout {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(240px, 280px) 1fr;
    }

    #csch-left, #csch-right {
      min-height: 0;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    #csch-left  { border-right: 1px solid #C7CDD1; background: #fff; }
    #csch-right { background: #F2F4F5; }

    .csch-pane-head {
      padding: 10px 12px 8px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      border-bottom: 1px solid #C7CDD1;
      background: #fff;
    }

    .csch-pane-head h2 { font-size: 13px; font-weight: 700; line-height: 1.1; color: #2D3B45; }

    .csch-pane-note {
      font-size: 10px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    #csch-left-body {
      overflow: auto;
      padding: 10px;
      display: grid;
      gap: 10px;
      align-content: start;
    }

    #csch-board {
      overflow: auto;
      padding: 10px;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(176px, 200px);
      gap: 10px;
      align-content: start;
    }

    .csch-module-group { display: grid; gap: 6px; }

    .csch-module-head {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6B7280;
    }

    .csch-tile-stack { display: grid; gap: 6px; }

    .csch-item {
      padding: 8px 9px;
      border-radius: 3px;
      border: 1px solid #C7CDD1;
      background: #fff;
      box-shadow: 0 1px 3px rgba(45,59,69,0.08);
      cursor: grab;
      display: grid;
      gap: 5px;
    }

    .csch-item:hover { border-color: #0770B8; box-shadow: 0 2px 6px rgba(7,112,184,0.12); }
    .csch-item:active { cursor: grabbing; }

    .csch-item-top { display: flex; flex-wrap: wrap; gap: 4px; }

    .csch-type-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      line-height: 1.15;
    }

    .csch-item-title { font-size: 12px; font-weight: 700; color: #2D3B45; line-height: 1.25; }

    .csch-item-module {
      font-size: 10px;
      font-weight: 700;
      color: #0770B8;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .csch-item-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

    .csch-item-meta {
      font-size: 10px;
      color: #6B7280;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .csch-item-link { font-size: 10px; font-weight: 700; color: #0770B8; text-decoration: none; flex: 0 0 auto; }
    .csch-item-link:hover { text-decoration: underline; }

    .csch-date-col { min-height: 0; display: grid; grid-template-rows: auto 1fr; gap: 6px; }

    .csch-date-head {
      padding: 8px 9px;
      border-radius: 3px;
      background: #fff;
      border: 1px solid #C7CDD1;
      box-shadow: 0 1px 3px rgba(45,59,69,0.06);
    }

    .csch-date-head-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .csch-date-title { font-size: 13px; font-weight: 700; color: #2D3B45; line-height: 1.15; }
    .csch-date-sub { margin-top: 2px; font-size: 10px; color: #6B7280; line-height: 1.2; }

    .csch-date-count {
      padding: 2px 7px;
      border-radius: 999px;
      background: #E8F1F8;
      color: #0770B8;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      flex: 0 0 auto;
    }

    .csch-dropzone {
      min-height: 84px;
      border: 1px dashed #C7CDD1;
      border-radius: 3px;
      padding: 8px;
      background: #fff;
      transition: border-color 0.1s ease, background 0.1s ease;
    }

    .csch-drop-active { border-color: #0770B8; background: #E8F1F8; }

    .csch-dropzone-head { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 600; color: #2D3B45; margin-bottom: 6px; }

    .csch-dropzone-help, .csch-empty-slot, .csch-empty-board, .csch-empty-state {
      font-size: 10px;
      color: #6B7280;
      line-height: 1.35;
    }

    .csch-date-drop { display: grid; gap: 6px; align-content: start; min-height: 160px; }

    .csch-unscheduled { background: #FFFBEB; border: 1px dashed #C7CDD1; }

    @media (max-width: 1100px) {
      #csch-shell { top: 6px; bottom: 6px; left: 74px; right: 60px; }
      #csch-topbar { align-items: flex-start; }
      #csch-tb-controls { width: 100%; }
      .csch-toolbar-status { max-width: 100%; }
      .csch-tb-window { font-size: 11px; }
      #csch-layout { grid-template-columns: 1fr; grid-template-rows: minmax(220px, 34%) 1fr; }
      #csch-left { border-right: none; border-bottom: 1px solid #C7CDD1; }
    }
  `;
  document.head.appendChild(styleEl);

  syncGeneratedDates();
  render();
})();
