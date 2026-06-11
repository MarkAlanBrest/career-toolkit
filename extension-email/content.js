(async function () {
  'use strict';

  // Prevent double-init if reloaded
  if (window.__cesLoaded) return;
  window.__cesLoaded = true;

  // Storage shim — pre-load all keys used by the email system
  const EMAIL_KEYS = ['ces_templates', 'ces_teacher_name', 'ces_days_forward', 'ces_days_back', 'ces_last_course', 'ces_compose_pending'];
  const _store = await new Promise(resolve => chrome.storage.local.get(EMAIL_KEYS, resolve));
  function GM_getValue(key, def) { return _store[key] ?? def; }
  function GM_setValue(key, val) {
    _store[key] = val;
    chrome.storage.local.set({ [key]: val });
  }

  // Inject styles
  const _style = document.createElement('style');
  _style.textContent = `
    #ces-overlay {
      position: fixed; inset: 0; z-index: 100000;
      background: rgba(0,0,0,.45);
      display: none; align-items: center; justify-content: center;
    }
    #ces-overlay.ces-open { display: flex; }
    #ces-panel {
      width: 96vw; max-width: 900px;
      height: 92vh; max-height: 800px;
      background: #fff; border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,.3);
      display: flex; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827; overflow: hidden;
    }
    #ces-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; background: #059669; color: #fff; flex-shrink: 0;
    }
    #ces-header h2 { margin: 0; font-size: 18px; font-weight: 700; }
    .ces-close-btn {
      background: rgba(255,255,255,.2); border: none; color: #fff;
      width: 32px; height: 32px; border-radius: 50%;
      font-size: 18px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
    }
    .ces-close-btn:hover { background: rgba(255,255,255,.35); }
    #ces-tabs {
      display: flex; border-bottom: 2px solid #e5e7eb;
      flex-shrink: 0; background: #f9fafb;
    }
    .ces-tab {
      padding: 10px 20px; cursor: pointer; border: none;
      background: none; font-size: 14px; font-weight: 500;
      color: #6b7280; border-bottom: 2px solid transparent;
      margin-bottom: -2px; transition: all .15s;
    }
    .ces-tab:hover { color: #059669; }
    .ces-tab.active { color: #059669; border-bottom-color: #059669; font-weight: 600; }
    #ces-body { flex: 1; overflow-y: auto; padding: 20px; }
    .ces-label {
      display: block; font-size: 13px; font-weight: 600;
      color: #374151; margin-bottom: 4px; margin-top: 12px;
    }
    .ces-select, .ces-input, .ces-textarea {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 14px; color: #111827;
      background: #fff; box-sizing: border-box;
    }
    .ces-select:focus, .ces-input:focus, .ces-textarea:focus {
      outline: none; border-color: #059669;
      box-shadow: 0 0 0 2px rgba(5,150,105,.15);
    }
    .ces-textarea { min-height: 120px; resize: vertical; font-family: inherit; }
    .ces-btn {
      padding: 8px 16px; border: none; border-radius: 6px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background .15s, transform .1s;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .ces-btn:active { transform: scale(.97); }
    .ces-btn-primary { background: #059669; color: #fff; }
    .ces-btn-primary:hover { background: #047857; }
    .ces-btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .ces-btn-secondary { background: #e5e7eb; color: #374151; }
    .ces-btn-secondary:hover { background: #d1d5db; }
    .ces-btn-danger { background: #ef4444; color: #fff; }
    .ces-btn-danger:hover { background: #dc2626; }
    .ces-btn-sm { padding: 5px 10px; font-size: 12px; }
    .ces-card {
      border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 14px; margin-bottom: 10px; background: #fff;
      transition: border-color .15s;
    }
    .ces-card:hover { border-color: #059669; }
    .ces-card.selected { border-color: #059669; background: #ecfdf5; }
    .ces-msg-row {
      border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 12px; margin-bottom: 8px; background: #fff;
    }
    .ces-msg-row .ces-msg-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
    }
    .ces-msg-row .ces-msg-name { font-weight: 600; font-size: 14px; }
    .ces-msg-row .ces-msg-subject { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
    .ces-msg-row .ces-msg-body {
      font-size: 13px; color: #374151; white-space: pre-wrap;
      max-height: 100px; overflow-y: auto; background: #f9fafb;
      padding: 8px; border-radius: 4px;
    }
    .ces-msg-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .ces-status {
      padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;
      font-size: 13px; font-weight: 500;
    }
    .ces-status-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .ces-status-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .ces-status-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .ces-progress {
      width: 100%; height: 6px; background: #e5e7eb;
      border-radius: 3px; overflow: hidden; margin: 8px 0;
    }
    .ces-progress-bar {
      height: 100%; background: #059669; transition: width .3s; border-radius: 3px;
    }
    .ces-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ces-flex-between { display: flex; justify-content: space-between; align-items: center; }
    .ces-mt { margin-top: 16px; }
    .ces-mb { margin-bottom: 16px; }
    .ces-checkbox-row {
      display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 14px; color: #374151;
    }
    .ces-checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #059669; }
    .ces-spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid #fff; border-top-color: transparent;
      border-radius: 50%; animation: ces-spin .6s linear infinite;
    }
    @keyframes ces-spin { to { transform: rotate(360deg); } }

    #ces-floating-btn {
      position: fixed;
      top: 72px;
      right: 18px;
      z-index: 99998;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 13px;
      border: none;
      border-radius: 8px;
      background: #059669;
      color: #fff;
      font: 600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,.22);
      cursor: pointer;
    }
    #ces-floating-btn:hover { background: #047857; }
    #ces-floating-btn .ces-nav-icon { font-size: 16px; line-height: 1; }
  `;
  document.head.appendChild(_style);

  /* =========================================================
     CONSTANTS
  ========================================================= */
  const CANVAS_BASE = window.location.origin;
  const API = CANVAS_BASE + '/api/v1';

  const STORAGE_KEYS = {
    TEMPLATES:    'ces_templates',
    TEACHER_NAME: 'ces_teacher_name',
    DAYS_FORWARD: 'ces_days_forward',
    DAYS_BACK:    'ces_days_back',
    LAST_COURSE:  'ces_last_course',
  };

  const DEFAULT_TEMPLATES = {
    upcoming: {
      name: 'Upcoming Assignments',
      subject: 'Upcoming Assignments - {{courseName}}',
      body: `Dear {{studentName}},\n\nThis is a reminder from {{teacherName}} about upcoming assignments in {{courseName}} within the next {{daysForward}} days:\n\n{{assignmentList}}\n\nPlease make sure to complete and submit these assignments before their due dates.\n\nBest regards,\n{{teacherName}}`,
    },
    missing: {
      name: 'Missing Work Reminder',
      subject: 'Missing Assignments - {{courseName}}',
      body: `Dear {{studentName}},\n\nThis is {{teacherName}} reaching out about some missing work in {{courseName}}.\n\nAccording to my records, the following assignments from the past {{daysBack}} days have not been submitted:\n\n{{missingAssignmentList}}\n\nI encourage you to complete and submit these assignments as soon as possible. Late submissions are still better than missing work. Please reach out if you need any assistance.\n\nSincerely,\n{{teacherName}}`,
    },
    welcome: {
      name: 'Welcome to Class',
      subject: 'Welcome to {{courseName}}!',
      body: `Dear {{studentName}},\n\nWelcome to {{courseName}}! I'm {{teacherName}}, and I'm excited to have you in class this term.\n\nHere are a few things to get started:\n- Check Canvas regularly for announcements and assignment updates\n- Review the course syllabus and schedule\n- Reach out early if you need help or accommodations\n\nI look forward to a great semester together!\n\nWarm regards,\n{{teacherName}}`,
    },
    evaluation: {
      name: 'Student Evaluation',
      subject: 'Your Progress in {{courseName}}',
      body: `Dear {{studentName}},\n\nThis is {{teacherName}} with an update on your progress in {{courseName}}.\n\nCurrent Grade: {{currentGrade}} ({{currentScore}}%)\n\n{{missingSection}}\n\n{{upcomingSection}}\n\nPlease don't hesitate to reach out if you have questions about your progress or need additional support.\n\nBest regards,\n{{teacherName}}`,
    },
  };

  /* =========================================================
     CANVAS API HELPERS
  ========================================================= */
  async function canvasGet(endpoint) {
    let results = [];
    let url = API + endpoint + (endpoint.includes('?') ? '&' : '?') + 'per_page=100';
    while (url) {
      const resp = await fetch(url, { credentials: 'same-origin' });
      if (!resp.ok) throw new Error(`Canvas API error: ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      results = results.concat(data);
      const link = resp.headers.get('Link') || '';
      const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    }
    return results;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    return '';
  }

  async function canvasPost(endpoint, body) {
    const csrfToken = getCsrfToken();
    const formData = new URLSearchParams();
    function flattenToForm(obj, prefix) {
      for (const [key, val] of Object.entries(obj)) {
        const formKey = prefix ? `${prefix}[${key}]` : key;
        if (Array.isArray(val)) {
          val.forEach(item => formData.append(formKey + '[]', String(item)));
        } else if (typeof val === 'boolean') {
          formData.append(formKey, val ? '1' : '0');
        } else if (typeof val === 'object' && val !== null) {
          flattenToForm(val, formKey);
        } else {
          formData.append(formKey, String(val));
        }
      }
    }
    flattenToForm(body, '');
    const resp = await fetch(API + endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData.toString(),
    });
    const responseText = await resp.text();
    if (!resp.ok) throw new Error(`Canvas API error: ${resp.status} - ${responseText}`);
    try { return JSON.parse(responseText); } catch(e) { return responseText; }
  }

  /* =========================================================
     DATA FETCHERS
  ========================================================= */
  async function getCourses() {
    return canvasGet('/courses?enrollment_type=teacher&state[]=available&include[]=term');
  }
  async function getCourse(courseId) {
    return canvasGet(`/courses/${courseId}?include[]=term`);
  }
  async function getStudents(courseId) {
    return canvasGet(`/courses/${courseId}/users?enrollment_type[]=student&include[]=email&include[]=enrollments`);
  }
  async function getAssignments(courseId) {
    return canvasGet(`/courses/${courseId}/assignments?order_by=due_at`);
  }
  async function getSubmissions(courseId, studentId) {
    return canvasGet(`/courses/${courseId}/students/submissions?student_ids[]=${studentId}&include[]=assignment`);
  }
  async function getEnrollments(courseId) {
    return canvasGet(`/courses/${courseId}/enrollments?type[]=StudentEnrollment&state[]=active&include[]=grades`);
  }

  function getUpcomingAssignments(assignments, daysForward) {
    const now = new Date();
    const future = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000);
    return assignments.filter(a => {
      if (!a.due_at) return false;
      const due = new Date(a.due_at);
      return due >= now && due <= future;
    });
  }

  function getMissingAssignments(submissions, daysBack) {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    return submissions.filter(s => {
      if (!s.assignment) return false;
      const due = s.assignment.due_at ? new Date(s.assignment.due_at) : null;
      if (!due || due < cutoff) return false;
      if (due > new Date()) return false;
      return s.workflow_state === 'unsubmitted' || s.missing;
    });
  }

  function formatAssignmentList(assignments) {
    if (!assignments.length) return '(none)';
    return assignments.map(a => {
      const due = a.due_at ? new Date(a.due_at).toLocaleDateString() : 'No due date';
      const name = a.name || a.assignment?.name || 'Unnamed';
      return `  - ${name} (Due: ${due})`;
    }).join('\n');
  }

  /* =========================================================
     TEMPLATE ENGINE
  ========================================================= */
  function getTemplates() {
    const stored = GM_getValue(STORAGE_KEYS.TEMPLATES, null);
    if (stored) {
      try { return JSON.parse(stored); } catch(e) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  }

  function saveTemplates(templates) {
    GM_setValue(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }

  function renderTemplate(template, vars) {
    let text = template;
    for (const [key, val] of Object.entries(vars)) {
      text = text.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), val || '');
    }
    return text;
  }

  /* =========================================================
     MESSAGE GENERATION
  ========================================================= */
  async function generateMessages(courseId, courseName, emailType, daysForward, daysBack, teacherName) {
    const templates = getTemplates();
    const template = templates[emailType];
    if (!template) throw new Error('Unknown email type: ' + emailType);

    const students = await getStudents(courseId);
    if (!students.length) throw new Error('No students found in this course.');
    const messages = [];

    if (emailType === 'upcoming') {
      const upcoming = getUpcomingAssignments(await getAssignments(courseId), daysForward);
      const assignmentList = formatAssignmentList(upcoming);
      for (const student of students) {
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysForward: String(daysForward), assignmentList };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else if (emailType === 'missing') {
      for (const student of students) {
        const missing = getMissingAssignments(await getSubmissions(courseId, student.id), daysBack);
        if (!missing.length) continue;
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysBack: String(daysBack), missingAssignmentList: formatAssignmentList(missing.map(s => s.assignment || s)) };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else if (emailType === 'welcome') {
      for (const student of students) {
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else if (emailType === 'evaluation') {
      const enrollments = await getEnrollments(courseId);
      const allAssignments = await getAssignments(courseId);
      const upcoming = getUpcomingAssignments(allAssignments, daysForward);
      for (const student of students) {
        const enrollment = enrollments.find(e => e.user_id === student.id && e.grades);
        const grade = enrollment?.grades?.current_grade || 'N/A';
        const score = enrollment?.grades?.current_score || 'N/A';
        const missing = getMissingAssignments(await getSubmissions(courseId, student.id), daysBack);
        const missingSection = missing.length > 0 ? `Missing Assignments (past ${daysBack} days):\n${formatAssignmentList(missing.map(s => s.assignment || s))}` : 'You have no missing assignments. Great work!';
        const upcomingSection = upcoming.length > 0 ? `Upcoming Assignments (next ${daysForward} days):\n${formatAssignmentList(upcoming)}` : 'No upcoming assignments in the next ' + daysForward + ' days.';
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, currentGrade: grade, currentScore: String(score), daysForward: String(daysForward), daysBack: String(daysBack), missingSection, upcomingSection };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    }
    return messages;
  }

  /* =========================================================
     CANVAS ACTIONS
  ========================================================= */
  async function sendCanvasMessage(courseId, recipientId, subject, body) {
    return canvasPost('/conversations', { recipients: [String(recipientId)], subject, body, force_new: true, group_conversation: false, context_code: 'course_' + courseId, mode: 'sync' });
  }

  async function postAnnouncement(courseId, title, message) {
    return canvasPost(`/courses/${courseId}/discussion_topics`, { title, message: '<p>' + message.replace(/\n/g, '<br>') + '</p>', is_announcement: true, published: true });
  }

  /* =========================================================
     UTILITY
  ========================================================= */
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* =========================================================
     UI CONSTRUCTION
  ========================================================= */
  let cachedCourses = null;
  let generatedMessages = [];
  let currentCourseId = null;
  let _overlay = null;

  function getCurrentCourseId() {
    return window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || '';
  }

  function openEmailSystem() {
    if (!_overlay) buildUI();
    if (_overlay) { _overlay.classList.add('ces-open'); showTab('send'); }
  }

  function buildUI() {
    if (document.getElementById('ces-overlay')) {
      _overlay = document.getElementById('ces-overlay');
      showTab('send');
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'ces-overlay';
    overlay.innerHTML = `
      <div id="ces-panel">
        <div id="ces-header">
          <h2>&#9993; Canvas Message System</h2>
          <button class="ces-close-btn" id="ces-close">&times;</button>
        </div>
        <div id="ces-tabs">
          <button class="ces-tab active" data-tab="send">Send Messages</button>
          <button class="ces-tab" data-tab="templates">Email Templates</button>
          <button class="ces-tab" data-tab="settings">Settings</button>
        </div>
        <div id="ces-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    _overlay = overlay;

    overlay.querySelector('#ces-close').addEventListener('click', () => overlay.classList.remove('ces-open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('ces-open'); });
    overlay.querySelectorAll('.ces-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.ces-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showTab(tab.dataset.tab);
      });
    });
    showTab('send');
  }

  /* =========================================================
     TAB: SEND MESSAGES
  ========================================================= */
  function renderTabError(body, err) {
    if (!body) return;
    body.innerHTML = `
      <div class="ces-status ces-status-error">
        Message System could not load this view: ${escapeHtml(err?.message || String(err))}
      </div>
      <button class="ces-btn ces-btn-secondary" id="ces-retry-tab">Retry</button>
    `;
    body.querySelector('#ces-retry-tab')?.addEventListener('click', () => showTab('send'));
  }

  function showTab(tabName) {
    const body = document.getElementById('ces-body');
    if (!body) return;
    try {
      if (tabName === 'send') renderSendTab(body);
      else if (tabName === 'templates') renderTemplatesTab(body);
      else if (tabName === 'settings') renderSettingsTab(body);
    } catch (err) {
      renderTabError(body, err);
    }
  }

  function renderSendTab(container) {
    if (!container) return;
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    const daysForward = GM_getValue(STORAGE_KEYS.DAYS_FORWARD, 7);
    const daysBack    = GM_getValue(STORAGE_KEYS.DAYS_BACK, 14);
    const courseId    = getCurrentCourseId();

    container.innerHTML = `
      <div id="ces-status-area"></div>
      ${!teacherName ? '<div class="ces-status ces-status-error">Please set your Teacher Name in the Settings tab first.</div>' : ''}
      <label class="ces-label">Current Course</label>
      <div class="ces-card" id="ces-current-course" data-course-id="${escapeAttr(courseId)}" data-course-name="">
        <strong>${courseId ? 'Detecting course...' : 'Open Message System from inside a Canvas course.'}</strong>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">${courseId ? `Course ID: ${escapeHtml(courseId)}` : 'No /courses/{id} was found in the current page URL.'}</div>
      </div>
      <label class="ces-label">Email Type</label>
      <div class="ces-grid-2" id="ces-type-cards">
        <div class="ces-card selected" data-type="upcoming"><strong>&#128197; Upcoming Assignments</strong><div style="font-size:12px;color:#6b7280;margin-top:4px;">Remind students of upcoming due dates</div></div>
        <div class="ces-card" data-type="missing"><strong>&#9888; Missing Work Reminder</strong><div style="font-size:12px;color:#6b7280;margin-top:4px;">Alert students about unsubmitted work</div></div>
        <div class="ces-card" data-type="welcome"><strong>&#128075; Welcome to Class</strong><div style="font-size:12px;color:#6b7280;margin-top:4px;">Send a warm welcome message</div></div>
        <div class="ces-card" data-type="evaluation"><strong>&#128202; Student Evaluation</strong><div style="font-size:12px;color:#6b7280;margin-top:4px;">Share grade status and progress</div></div>
      </div>
      <div id="ces-options-area">
        <div class="ces-grid-2">
          <div id="ces-days-forward-wrap"><label class="ces-label">Days Forward</label><input type="number" class="ces-input" id="ces-days-forward" value="${daysForward}" min="1" max="90"></div>
          <div id="ces-days-back-wrap" style="display:none;"><label class="ces-label">Days Back</label><input type="number" class="ces-input" id="ces-days-back" value="${daysBack}" min="1" max="365"></div>
        </div>
      </div>
      <div class="ces-checkbox-row"><input type="checkbox" id="ces-announce-check"><label for="ces-announce-check">Also post as Canvas Announcement</label></div>
      <div class="ces-mt"><button class="ces-btn ces-btn-primary" id="ces-generate-btn">&#128269; Generate Messages</button></div>
      <div id="ces-progress-area" style="display:none;" class="ces-mt">
        <div class="ces-status ces-status-info" id="ces-progress-text">Fetching data...</div>
        <div class="ces-progress"><div class="ces-progress-bar" id="ces-progress-bar" style="width:0%"></div></div>
      </div>
      <div id="ces-messages-area" class="ces-mt"></div>
    `;

    loadCurrentCourse(courseId);

    let selectedType = 'upcoming';
    container.querySelectorAll('#ces-type-cards .ces-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('#ces-type-cards .ces-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedType = card.dataset.type;
        updateOptionsVisibility(selectedType);
      });
    });

    container.querySelector('#ces-generate-btn').addEventListener('click', async () => {
      const courseBox = container.querySelector('#ces-current-course');
      const courseId = courseBox?.dataset.courseId || getCurrentCourseId();
      const courseName = courseBox?.dataset.courseName || `Course ${courseId}`;
      if (!courseId) { showStatus('Open Message System from inside a Canvas course first.', 'error'); return; }
      if (!teacherName) { showStatus('Please set your Teacher Name in Settings first.', 'error'); return; }

      currentCourseId = courseId;
      GM_setValue(STORAGE_KEYS.LAST_COURSE, courseId);

      const df = parseInt(container.querySelector('#ces-days-forward').value) || 7;
      const db = parseInt(container.querySelector('#ces-days-back').value) || 14;
      const btn = container.querySelector('#ces-generate-btn');
      btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span> Generating...';

      const progressArea = container.querySelector('#ces-progress-area');
      progressArea.style.display = 'block';
      setProgress('Fetching student data from Canvas...', 10);

      try {
        generatedMessages = await generateMessages(courseId, courseName, selectedType, df, db, teacherName);
        setProgress('Done!', 100);
        if (!generatedMessages.length) {
          showStatus('No messages to send. No students matched the criteria for ' + selectedType + '.', 'info');
          container.querySelector('#ces-messages-area').innerHTML = '';
        } else {
          showStatus(`Generated ${generatedMessages.length} message(s). Review below and send.`, 'success');
          renderMessagesList(container.querySelector('#ces-messages-area'), courseId, courseName, selectedType);
        }
      } catch(err) {
        showStatus('Error: ' + err.message, 'error');
        setProgress('Error occurred.', 0);
      }

      btn.disabled = false; btn.innerHTML = '&#128269; Generate Messages';
      setTimeout(() => { progressArea.style.display = 'none'; }, 2000);
    });

    updateOptionsVisibility('upcoming');
  }

  function updateOptionsVisibility(type) {
    const fwWrap = document.getElementById('ces-days-forward-wrap');
    const bkWrap = document.getElementById('ces-days-back-wrap');
    if (!fwWrap || !bkWrap) return;
    fwWrap.style.display = (type === 'upcoming' || type === 'evaluation') ? 'block' : 'none';
    bkWrap.style.display = (type === 'missing'  || type === 'evaluation') ? 'block' : 'none';
  }

  async function loadCourses(lastCourse) {
    const select = document.getElementById('ces-course-select');
    if (!select) return;
    try {
      if (!cachedCourses) cachedCourses = await getCourses();
      select.innerHTML = '<option value="">-- Select a course --</option>';
      cachedCourses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.term ? ` (${c.term.name})` : '');
        if (String(c.id) === String(lastCourse)) opt.selected = true;
        select.appendChild(opt);
      });
    } catch(err) {
      select.innerHTML = '<option value="">Error loading courses</option>';
      showStatus(err?.message || 'Could not load Canvas courses.', 'error');
    }
  }

  async function loadCurrentCourse(courseId) {
    const box = document.getElementById('ces-current-course');
    if (!box || !courseId) return;
    try {
      const course = await getCourse(courseId);
      const name = course.name || `Course ${courseId}`;
      const term = course.term?.name ? ` (${course.term.name})` : '';
      box.dataset.courseName = name + term;
      box.innerHTML = `
        <strong>${escapeHtml(name)}</strong>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Course ID: ${escapeHtml(courseId)}${escapeHtml(term)}</div>
      `;
    } catch (err) {
      box.dataset.courseName = `Course ${courseId}`;
      box.innerHTML = `
        <strong>Course ${escapeHtml(courseId)}</strong>
        <div style="font-size:12px;color:#b91c1c;margin-top:4px;">Could not load course name: ${escapeHtml(err?.message || 'Canvas API error')}</div>
      `;
    }
  }

  function showStatus(msg, type) {
    const area = document.getElementById('ces-status-area');
    if (!area) return;
    area.innerHTML = `<div class="ces-status ces-status-${type}">${msg}</div>`;
    setTimeout(() => { if (area) area.innerHTML = ''; }, 8000);
  }

  function setProgress(text, pct) {
    const textEl = document.getElementById('ces-progress-text');
    const barEl  = document.getElementById('ces-progress-bar');
    if (textEl) textEl.textContent = text;
    if (barEl)  barEl.style.width = pct + '%';
  }

  function renderMessagesList(container, courseId, courseName, emailType) {
    const announceCheck = document.getElementById('ces-announce-check');
    const includeAnnouncement = announceCheck && announceCheck.checked;

    let html = `<div class="ces-flex-between ces-mb"><strong>${generatedMessages.length} message(s) ready</strong><button class="ces-btn ces-btn-primary" id="ces-send-all-btn">&#9993; Send All via Canvas Message</button></div>`;
    generatedMessages.forEach((msg, i) => {
      html += `
        <div class="ces-msg-row" id="ces-msg-${i}">
          <div class="ces-msg-header">
            <span class="ces-msg-name">${escapeHtml(msg.studentName)}</span>
            <div class="ces-msg-actions">
              <button class="ces-btn ces-btn-primary ces-btn-sm ces-send-one" data-idx="${i}">&#9993; Send</button>
              <button class="ces-btn ces-btn-secondary ces-btn-sm ces-compose-one" data-idx="${i}">&#128221; Open in Compose</button>
            </div>
          </div>
          <div class="ces-msg-subject"><strong>Subject:</strong> ${escapeHtml(msg.subject)}</div>
          <div class="ces-msg-body">${escapeHtml(msg.body)}</div>
        </div>
      `;
    });
    container.innerHTML = html;

    container.querySelector('#ces-send-all-btn').addEventListener('click', async () => {
      if (!confirm(`Send ${generatedMessages.length} message(s) via Canvas to all listed students?`)) return;
      const btn = container.querySelector('#ces-send-all-btn');
      btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span> Sending...';
      let sent = 0, failed = 0;
      for (let i = 0; i < generatedMessages.length; i++) {
        const msg = generatedMessages[i];
        const row = container.querySelector(`#ces-msg-${i}`);
        try {
          await sendCanvasMessage(courseId, msg.studentId, msg.subject, msg.body);
          sent++; if (row) row.style.background = '#ecfdf5';
        } catch(err) {
          failed++; if (row) row.style.background = '#fef2f2';
        }
      }
      if (includeAnnouncement) {
        try {
          const templates = getTemplates(); const tpl = templates[emailType];
          await postAnnouncement(courseId,
            tpl.subject.replace(/\{\{courseName\}\}/g, courseName),
            tpl.body.replace(/\{\{teacherName\}\}/g, GM_getValue(STORAGE_KEYS.TEACHER_NAME, ''))
                    .replace(/\{\{courseName\}\}/g, courseName).replace(/\{\{studentName\}\}/g, 'Students')
                    .replace(/\{\{assignmentList\}\}/g, '(see your individual message)').replace(/\{\{missingAssignmentList\}\}/g, '(see your individual message)')
                    .replace(/\{\{currentGrade\}\}/g, '(see your individual message)').replace(/\{\{currentScore\}\}/g, '(see your individual message)')
                    .replace(/\{\{daysForward\}\}/g, String(document.getElementById('ces-days-forward')?.value || 7))
                    .replace(/\{\{daysBack\}\}/g, String(document.getElementById('ces-days-back')?.value || 14))
                    .replace(/\{\{missingSection\}\}/g, '').replace(/\{\{upcomingSection\}\}/g, '')
          );
          showStatus(`Sent ${sent} message(s)${failed ? `, ${failed} failed` : ''}. Announcement posted!`, 'success');
        } catch(err) {
          showStatus(`Sent ${sent} message(s)${failed ? `, ${failed} failed` : ''}. Announcement failed: ${err.message}`, 'error');
        }
      } else {
        showStatus(`Sent ${sent} message(s)${failed ? `, ${failed} failed` : ''}.`, sent > 0 ? 'success' : 'error');
      }
      btn.disabled = false; btn.innerHTML = '&#9993; Send All via Canvas Message';
    });

    container.querySelectorAll('.ces-send-one').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const msg = generatedMessages[idx];
        btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span>';
        try {
          await sendCanvasMessage(courseId, msg.studentId, msg.subject, msg.body);
          btn.innerHTML = '&#10003; Sent'; btn.classList.remove('ces-btn-primary'); btn.style.background = '#059669';
          const row = document.querySelector(`#ces-msg-${idx}`); if (row) row.style.background = '#ecfdf5';
        } catch(err) {
          btn.innerHTML = '&#10007; Failed'; btn.classList.add('ces-btn-danger');
          showStatus('Failed to send to ' + msg.studentName + ': ' + err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.ces-compose-one').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const msg = generatedMessages[idx];
        window.open(`${CANVAS_BASE}/conversations#filter=type=inbox&user_name=${encodeURIComponent(msg.studentName)}&user_id=${msg.studentId}`, '_blank');
        GM_setValue('ces_compose_pending', JSON.stringify({ recipientId: msg.studentId, recipientName: msg.studentName, subject: msg.subject, body: msg.body, courseId }));
        showStatus(`Compose window opened for ${msg.studentName}. Click "Insert Message" on the compose page.`, 'info');
      });
    });
  }

  /* =========================================================
     TAB: TEMPLATES
  ========================================================= */
  function renderTemplatesTab(container) {
    const templates = getTemplates();

    function renderList() {
      let html = `<p style="font-size:13px;color:#6b7280;margin-bottom:16px;">Customize email templates. Use placeholders like <code>{{studentName}}</code>, <code>{{teacherName}}</code>, <code>{{courseName}}</code>, and more.</p>`;
      for (const [type, tpl] of Object.entries(templates)) {
        html += `<div class="ces-card"><div class="ces-flex-between"><div><strong>${escapeHtml(tpl.name)}</strong><div style="font-size:12px;color:#6b7280;margin-top:2px;">Subject: ${escapeHtml(tpl.subject)}</div></div><button class="ces-btn ces-btn-secondary ces-btn-sm ces-edit-tpl" data-type="${type}">Edit</button></div></div>`;
      }
      html += `<div class="ces-mt"><button class="ces-btn ces-btn-secondary" id="ces-reset-tpl">Reset All to Defaults</button></div>`;
      container.innerHTML = html;
      container.querySelectorAll('.ces-edit-tpl').forEach(btn => btn.addEventListener('click', () => renderEditor(btn.dataset.type)));
      container.querySelector('#ces-reset-tpl').addEventListener('click', () => {
        if (confirm('Reset all templates to defaults? Your custom templates will be lost.')) {
          const defaults = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
          saveTemplates(defaults); Object.assign(templates, defaults); renderList();
        }
      });
    }

    function renderEditor(type) {
      const tpl = templates[type];
      container.innerHTML = `
        <div class="ces-flex-between ces-mb"><h3 style="margin:0;">Editing: ${escapeHtml(tpl.name)}</h3><button class="ces-btn ces-btn-secondary" id="ces-tpl-cancel">Cancel</button></div>
        <label class="ces-label">Subject Line</label>
        <input type="text" class="ces-input" id="ces-tpl-subject" value="${escapeAttr(tpl.subject)}">
        <label class="ces-label">Email Body</label>
        <textarea class="ces-textarea" id="ces-tpl-body" style="min-height:200px;">${escapeHtml(tpl.body)}</textarea>
        <div style="font-size:12px;color:#6b7280;margin-top:8px;"><strong>Placeholders:</strong> {{studentName}} {{teacherName}} {{courseName}} {{assignmentList}} {{missingAssignmentList}} {{currentGrade}} {{currentScore}} {{daysForward}} {{daysBack}} {{missingSection}} {{upcomingSection}}</div>
        <div class="ces-mt" style="display:flex;gap:8px;">
          <button class="ces-btn ces-btn-primary" id="ces-tpl-save">Save Template</button>
          <button class="ces-btn ces-btn-secondary" id="ces-tpl-preview">Preview</button>
        </div>
        <div id="ces-tpl-preview-area" class="ces-mt"></div>
      `;
      container.querySelector('#ces-tpl-cancel').addEventListener('click', renderList);
      container.querySelector('#ces-tpl-save').addEventListener('click', () => {
        templates[type].subject = container.querySelector('#ces-tpl-subject').value;
        templates[type].body    = container.querySelector('#ces-tpl-body').value;
        saveTemplates(templates); renderList();
      });
      container.querySelector('#ces-tpl-preview').addEventListener('click', () => {
        const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, 'Professor Smith');
        const sampleVars = { studentName: 'Alex', teacherName, courseName: 'Sample Course', assignmentList: '  - Essay 1 (Due: 4/15/2026)\n  - Quiz 3 (Due: 4/18/2026)', missingAssignmentList: '  - Homework 5 (Due: 4/1/2026)', currentGrade: 'B+', currentScore: '87.5', daysForward: '7', daysBack: '14', missingSection: 'Missing (past 14 days):\n  - Homework 5', upcomingSection: 'Upcoming (next 7 days):\n  - Essay 1' };
        const subject = container.querySelector('#ces-tpl-subject').value;
        const body    = container.querySelector('#ces-tpl-body').value;
        container.querySelector('#ces-tpl-preview-area').innerHTML = `<div class="ces-card" style="background:#f9fafb;"><strong>Subject:</strong> ${escapeHtml(renderTemplate(subject, sampleVars))}<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;"><div style="white-space:pre-wrap;font-size:13px;">${escapeHtml(renderTemplate(body, sampleVars))}</div></div>`;
      });
    }

    renderList();
  }

  /* =========================================================
     TAB: SETTINGS
  ========================================================= */
  function renderSettingsTab(container) {
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    const daysForward = GM_getValue(STORAGE_KEYS.DAYS_FORWARD, 7);
    const daysBack    = GM_getValue(STORAGE_KEYS.DAYS_BACK, 14);

    container.innerHTML = `
      <div id="ces-settings-status"></div>
      <div class="ces-card">
        <h3 style="margin:0 0 12px;">Teacher Information</h3>
        <label class="ces-label">Teacher Name</label>
        <input type="text" class="ces-input" id="ces-set-teacher" value="${escapeAttr(teacherName)}" placeholder="Professor Smith">
        <p style="font-size:12px;color:#6b7280;margin-top:4px;">Used in all email templates as {{teacherName}}.</p>
      </div>
      <div class="ces-card">
        <h3 style="margin:0 0 12px;">Default Time Ranges</h3>
        <div class="ces-grid-2">
          <div><label class="ces-label">Days Forward (Upcoming)</label><input type="number" class="ces-input" id="ces-set-forward" value="${daysForward}" min="1" max="90"></div>
          <div><label class="ces-label">Days Back (Missing Work)</label><input type="number" class="ces-input" id="ces-set-back" value="${daysBack}" min="1" max="365"></div>
        </div>
      </div>
      <div class="ces-card" style="background:#f9fafb;">
        <h3 style="margin:0 0 8px;">How It Works</h3>
        <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.7;">
          <li>Uses your existing Canvas login — no API token needed.</li>
          <li>Messages sent through Canvas's built-in Inbox system.</li>
          <li>Announcements posted directly to the selected course.</li>
          <li>All templates and settings saved in browser storage.</li>
        </ul>
      </div>
      <div class="ces-mt"><button class="ces-btn ces-btn-primary" id="ces-save-settings">Save Settings</button></div>
    `;

    container.querySelector('#ces-save-settings').addEventListener('click', () => {
      GM_setValue(STORAGE_KEYS.TEACHER_NAME, container.querySelector('#ces-set-teacher').value.trim());
      GM_setValue(STORAGE_KEYS.DAYS_FORWARD, parseInt(container.querySelector('#ces-set-forward').value) || 7);
      GM_setValue(STORAGE_KEYS.DAYS_BACK,    parseInt(container.querySelector('#ces-set-back').value) || 14);
      const statusArea = document.getElementById('ces-settings-status');
      if (statusArea) {
        statusArea.innerHTML = '<div class="ces-status ces-status-success">Settings saved!</div>';
        setTimeout(() => { statusArea.innerHTML = ''; }, 5000);
      }
    });
  }

  /* =========================================================
     COMPOSE PAGE HELPER
  ========================================================= */
  function checkComposePageHelper() {
    if (!window.location.pathname.includes('/conversations')) return;
    const pending = GM_getValue('ces_compose_pending', null);
    if (!pending) return;
    let data;
    try { data = JSON.parse(pending); } catch(e) { return; }

    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#059669;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,sans-serif;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,.2);';
    bar.innerHTML = `
      <span>&#9993; Message ready for <strong>${escapeHtml(data.recipientName)}</strong>: "${escapeHtml(data.subject)}"</span>
      <div style="display:flex;gap:8px;">
        <button id="ces-insert-compose" style="padding:6px 14px;background:#fff;color:#059669;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:13px;">Insert into Compose</button>
        <button id="ces-dismiss-compose" style="padding:6px 14px;background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Dismiss</button>
      </div>
    `;
    document.body.appendChild(bar);

    bar.querySelector('#ces-dismiss-compose').addEventListener('click', () => { GM_setValue('ces_compose_pending', ''); bar.remove(); });
    bar.querySelector('#ces-insert-compose').addEventListener('click', () => {
      const composeBtn = document.querySelector('[data-testid="compose"], button[aria-label="Compose"]');
      if (composeBtn) composeBtn.click();
      setTimeout(() => {
        const subjectInput = document.querySelector('input[name="subject"], input[placeholder*="Subject"]');
        if (subjectInput) { subjectInput.value = data.subject; subjectInput.dispatchEvent(new Event('input', { bubbles: true })); }
        const bodyInput = document.querySelector('textarea[name="body"], textarea[data-testid="message-body"], [role="textbox"]');
        if (bodyInput) {
          if (bodyInput.tagName === 'TEXTAREA') { bodyInput.value = data.body; }
          else { bodyInput.innerHTML = data.body.replace(/\n/g, '<br>'); }
          bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        GM_setValue('ces_compose_pending', '');
        bar.innerHTML = `<span>&#10003; Message inserted! Review and click Send when ready.</span><button id="ces-dismiss2" style="padding:6px 14px;background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Dismiss</button>`;
        bar.querySelector('#ces-dismiss2').addEventListener('click', () => bar.remove());
      }, 1500);
    });
  }

  /* =========================================================
     FLOATING BUTTON
     Keeps Message System out of Canvas navigation and toolbars.
  ========================================================= */
  function addFloatingButton() {
    if (document.getElementById('ces-floating-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'ces-floating-btn';
    btn.type = 'button';
    btn.title = 'Canvas Message System';
    btn.innerHTML = '<span class="ces-nav-icon">✉</span><span>Messages</span>';
    btn.addEventListener('click', openEmailSystem);
    document.body.appendChild(btn);
  }
  addFloatingButton();

  /* =========================================================
     POPUP MESSAGE LISTENER
     Receives "open" command from popup.js
  ========================================================= */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'CES_OPEN') {
      openEmailSystem();
      sendResponse({ ok: true });
    }
  });

  /* =========================================================
     INIT
  ========================================================= */
  buildUI();
  checkComposePageHelper();
})();
