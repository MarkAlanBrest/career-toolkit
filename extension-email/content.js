(async function () {
  'use strict';

  // Prevent double-init if reloaded
  if (window.__cesLoaded) return;
  window.__cesLoaded = true;

  // Storage shim — pre-load all keys used by the email system
  const EMAIL_KEYS = ['ces_templates', 'ces_teacher_name', 'ces_canvas_api_token', 'ces_days_forward', 'ces_days_back', 'ces_last_course', 'ces_compose_pending'];
  const hasChromeStorage = !!(globalThis.chrome && chrome.storage && chrome.storage.local);
  const _store = hasChromeStorage
    ? await new Promise(resolve => chrome.storage.local.get(EMAIL_KEYS, resolve))
    : EMAIL_KEYS.reduce((acc, key) => {
        try {
          const value = localStorage.getItem(key);
          if (value !== null) acc[key] = value;
        } catch (_err) {}
        return acc;
      }, {});
  function GM_getValue(key, def) { return _store[key] ?? def; }
  function GM_setValue(key, val) {
    _store[key] = val;
    if (hasChromeStorage) {
      chrome.storage.local.set({ [key]: val });
      return;
    }
    try {
      localStorage.setItem(key, String(val));
    } catch (_err) {}
  }

  function isSpeedGraderPage() {
    return /\/gradebook\/speed_grader\b/.test(window.location.pathname)
      || /[?&]assignment_id=/.test(window.location.search) && /speed_grader/.test(window.location.href);
  }

  if (isSpeedGraderPage()) {
    window.__cesLoaded = false;
    return;
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
      width: 96vw; max-width: 980px;
      height: 90vh; max-height: 820px;
      background: #fff; border-radius: 4px;
      border: 1px solid #c7cdd1;
      box-shadow: 0 12px 32px rgba(45,59,69,.24);
      display: flex; flex-direction: column;
      font-family: Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #111827; overflow: hidden;
    }
    #ces-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 18px; background: #fff; color: #2d3b45; flex-shrink: 0;
      border-top: 4px solid #2d3b45;
      border-bottom: 1px solid #c7cdd1;
      gap: 12px;
    }
    #ces-header h2 { margin: 0; font-size: 18px; font-weight: 700; color:#2d3b45; }
    #ces-course-control {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 260px;
      max-width: 430px;
    }
    #ces-course-control label {
      font-size: 12px;
      font-weight: 600;
      color: #394b58;
      white-space: nowrap;
    }
    #ces-course-select {
      min-width: 0;
      flex: 1;
      background: #fff;
      border: 1px solid #c7cdd1;
      border-radius: 3px;
      color: #2d3b45;
      padding: 6px 28px 6px 9px;
      font-size: 12px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #ces-course-select option { color: #111827; background: #fff; }
    .ces-close-btn {
      background: #f5f5f5; border: 1px solid #c7cdd1; color: #2d3b45;
      width: 32px; height: 32px; border-radius: 3px;
      font-size: 18px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
    }
    .ces-close-btn:hover { background: #e8eaec; }
    #ces-tabs {
      display: flex; border-bottom: 1px solid #c7cdd1;
      flex-shrink: 0; background: #f5f5f5;
    }
    .ces-tab {
      padding: 10px 20px; cursor: pointer; border: none;
      background: none; font-size: 14px; font-weight: 500;
      color: #394b58; border-bottom: 3px solid transparent;
      margin-bottom: -1px; transition: all .15s;
    }
    .ces-tab:hover { color: #0374b5; background:#fff; }
    .ces-tab.active { color: #2d3b45; border-bottom-color: #0374b5; font-weight: 700; background:#fff; }
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
      outline: none; border-color: #0374b5;
      box-shadow: 0 0 0 2px rgba(3,116,181,.14);
    }
    .ces-textarea { min-height: 120px; resize: vertical; font-family: inherit; }
    .ces-btn {
      padding: 8px 16px; border: none; border-radius: 6px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background .15s, transform .1s;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .ces-btn:active { transform: scale(.97); }
    .ces-btn-primary { background: #0374b5; color: #fff; }
    .ces-btn-primary:hover { background: #005a8b; }
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
    .ces-card:hover { border-color: #8aa9bf; }
    .ces-card.selected { border-color: #0374b5; background: #eef7fc; }
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
      max-height: 460px; overflow-y: auto; background: #f9fafb;
      padding: 8px; border-radius: 4px;
    }
    .ces-msg-row .ces-msg-body img { max-width: 100%; }
    .ces-msg-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .ces-status {
      padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;
      font-size: 13px; font-weight: 500;
    }
    .ces-status-success { background: #eef7fc; color: #0b4f71; border: 1px solid #b7d7eb; }
    .ces-status-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .ces-status-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .ces-progress {
      width: 100%; height: 6px; background: #e5e7eb;
      border-radius: 3px; overflow: hidden; margin: 8px 0;
    }
    .ces-progress-bar {
      height: 100%; background: #0374b5; transition: width .3s; border-radius: 3px;
    }
    .ces-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ces-send-grid {
      display:grid;
      grid-template-columns: repeat(2, minmax(110px, 150px));
      gap:10px 12px;
      align-items:start;
    }
    .ces-send-message-field { grid-column: 1 / -1; }
    .ces-send-range-field { max-width: 150px; }
    .ces-send-panel {
      border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; background:#f9fafb; margin-top:12px;
    }
    .ces-send-panel-head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .ces-send-panel-title { font-size:13px; font-weight:700; color:#111827; }
    .ces-send-panel-sub { font-size:12px; color:#6b7280; margin-top:2px; }
    .ces-generate-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:12px; }
    .ces-generate-row #ces-generate-btn { min-width:170px; justify-content:center; }
    .ces-flex-between { display: flex; justify-content: space-between; align-items: center; }
    .ces-mt { margin-top: 16px; }
    .ces-mb { margin-bottom: 16px; }
    .ces-checkbox-row {
      display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 14px; color: #374151;
    }
    .ces-checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #0374b5; }
    .ces-spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid #fff; border-top-color: transparent;
      border-radius: 50%; animation: ces-spin .6s linear infinite;
    }
    @keyframes ces-spin { to { transform: rotate(360deg); } }

    #ces-launcher-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    #ces-launcher-group.ces-launcher-fixed {
      position: fixed;
      top: 10px;
      right: 78px;
      z-index: 99998;
      box-shadow: 0 2px 8px rgba(45,59,69,.18);
      background: #fff;
      border-radius: 3px;
    }
    #ces-launcher-group.ces-launcher-inline { margin-left: auto; margin-right: 10px; flex: 0 0 auto; }
    .ces-launcher-btn, .ces-ai-select {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      border: 1px solid #c7cdd1;
      border-radius: 3px;
      background: #fff;
      color: #2d3b45;
      font: 600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
    }
    .ces-launcher-btn { gap: 7px; padding: 0 12px; }
    .ces-ai-select { width: 126px; padding: 0 7px; justify-content: flex-start; }
    .ces-launcher-btn:hover, .ces-ai-select:hover { background: #f5f5f5; border-color:#8aa9bf; }
    .ces-launcher-btn .ces-nav-icon { font-size: 16px; line-height: 1; color:#0374b5; }
    @media (max-width: 720px) {
      #ces-body { padding: 14px; }
      .ces-send-grid { grid-template-columns: 1fr 1fr; }
      .ces-send-message-field { grid-column: 1 / -1; }
      .ces-send-range-field { max-width: none; }
      .ces-checkbox-row { align-self:center; margin: 0; }
      .ces-generate-row { flex-direction: column; align-items: stretch; }
      .ces-generate-row #ces-generate-btn { width: 100%; }
      .ces-send-panel-head { align-items:flex-start; }
      #ces-header { flex-wrap: wrap; }
      #ces-course-control { order: 3; width: 100%; max-width: none; }
    }
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
    API_TOKEN:    'ces_canvas_api_token',
    DAYS_FORWARD: 'ces_days_forward',
    DAYS_BACK:    'ces_days_back',
    LAST_COURSE:  'ces_last_course',
  };

  const CANVAS_STUDENT_IOS_URL = 'https://apps.apple.com/us/app/canvas-student/id480883488';
  const CANVAS_STUDENT_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.instructure.candroid';
  const CANVAS_APP_PROMO_URL = 'https://career-toolkit-ruby.vercel.app/canvas-app';

  function qrCodeUrl(url, size = 160) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(url)}`;
  }

  function buildCanvasAppPromoUrl(courseId, courseName) {
    const url = new URL(CANVAS_APP_PROMO_URL);
    url.searchParams.set('audience', 'student');
    if (courseId) url.searchParams.set('courseId', String(courseId));
    if (courseName) url.searchParams.set('courseName', String(courseName));
    return url.toString();
  }

  const DEFAULT_TEMPLATES = {
    canvasApp: {
      name: 'Canvas Student App Setup',
      description: 'Help students install the Canvas app and turn on notifications',
      subject: 'Set Up Canvas Notifications for {{courseName}}',
      inboxBody: `Hi {{studentName}},

Please set up the Canvas Student app for {{courseName}}. This is the best way to receive course announcements, reminders, and schedule changes on your phone.

Open this page for QR codes and setup instructions:
{{canvasAppUrl}}

Before class ends today:
1. Install the Canvas Student app.
2. Log in to Canvas.
3. Allow notifications when your phone asks.
4. Check Canvas notification settings and make sure course announcements are enabled.

iPhone App Store:
${CANVAS_STUDENT_IOS_URL}

Android Google Play:
${CANVAS_STUDENT_ANDROID_URL}

Thank you,
{{teacherName}}`,
      body: `<div style="font-family:Arial,Helvetica,sans-serif;border:1px solid #d1d5db;border-radius:8px;background:#ffffff;overflow:hidden;max-width:760px;">
  <div style="background:#2d3b45;color:#ffffff;padding:20px 24px;">
    <div style="font-size:24px;font-weight:800;line-height:1.2;">Get {{courseName}} Announcements on Your Phone</div>
    <div style="font-size:14px;line-height:1.5;margin-top:8px;color:#dbe5eb;">Install the Canvas Student app and turn on notifications so you do not miss class updates.</div>
  </div>
  <div style="padding:20px 24px;color:#111827;">
    <p style="font-size:15px;line-height:1.55;margin:0 0 14px;">Hi {{studentName}},</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 18px;">Please set up the Canvas Student app for {{courseName}}. This is the best way to receive course announcements, reminders, and schedule changes on your phone.</p>
    <p style="margin:0 0 18px;"><a href="{{canvasAppUrl}}" style="display:inline-block;background:#0770B8;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:10px 14px;border-radius:6px;">Open setup page</a></p>
    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
      <div style="flex:1 1 260px;min-width:240px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:10px;">Before class ends today:</div>
        <ol style="margin:0;padding-left:22px;color:#374151;font-size:14px;line-height:1.7;">
          <li>Scan the QR code for your phone.</li>
          <li>Install the Canvas Student app.</li>
          <li>Log in to Canvas.</li>
          <li>Allow notifications when your phone asks.</li>
        </ol>
        <div style="margin-top:14px;background:#f9fafb;border-left:4px solid #2d3b45;padding:11px 13px;color:#111827;font-size:13px;line-height:1.45;">
          After installing, check Canvas notification settings and make sure course announcements are enabled.
        </div>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;">
        <div style="width:150px;text-align:center;">
          <img src="${qrCodeUrl(CANVAS_STUDENT_IOS_URL, 150)}" alt="QR code for Canvas Student on iPhone" style="width:150px;height:150px;border:1px solid #e5e7eb;border-radius:6px;" />
          <div style="font-size:13px;font-weight:800;color:#111827;margin-top:8px;">iPhone</div>
          <a href="${CANVAS_STUDENT_IOS_URL}" style="font-size:12px;color:#0770B8;">Open App Store</a>
        </div>
        <div style="width:150px;text-align:center;">
          <img src="${qrCodeUrl(CANVAS_STUDENT_ANDROID_URL, 150)}" alt="QR code for Canvas Student on Android" style="width:150px;height:150px;border:1px solid #e5e7eb;border-radius:6px;" />
          <div style="font-size:13px;font-weight:800;color:#111827;margin-top:8px;">Android</div>
          <a href="${CANVAS_STUDENT_ANDROID_URL}" style="font-size:12px;color:#0770B8;">Open Google Play</a>
        </div>
      </div>
    </div>
    <p style="font-size:14px;line-height:1.55;margin:18px 0 0;">Thank you,<br>{{teacherName}}</p>
  </div>
</div>`,
    },
    upcoming: {
      name: 'Upcoming Assignments',
      description: 'Remind students of upcoming due dates',
      subject: 'Upcoming Assignments - {{courseName}}',
      body: `Dear {{studentName}},\n\nThis is a reminder from {{teacherName}} about upcoming assignments in {{courseName}} within the next {{daysForward}} days:\n\n{{assignmentList}}\n\nPlease make sure to complete and submit these assignments before their due dates.\n\nBest regards,\n{{teacherName}}`,
    },
    missing: {
      name: 'Missing Work Reminder',
      description: 'Alert students about unsubmitted work',
      subject: 'Missing Assignments - {{courseName}}',
      body: `Dear {{studentName}},\n\nThis is {{teacherName}} reaching out about some missing work in {{courseName}}.\n\nAccording to my records, the following assignments from the past {{daysBack}} days have not been submitted:\n\n{{missingAssignmentList}}\n\nI encourage you to complete and submit these assignments as soon as possible. Late submissions are still better than missing work. Please reach out if you need any assistance.\n\nSincerely,\n{{teacherName}}`,
    },
    welcome: {
      name: 'Welcome to Class',
      description: 'Send a warm welcome message',
      subject: 'Welcome to {{courseName}}!',
      body: `Dear {{studentName}},\n\nWelcome to {{courseName}}! I'm {{teacherName}}, and I'm excited to have you in class this term.\n\nHere are a few things to get started:\n- Check Canvas regularly for announcements and assignment updates\n- Review the course syllabus and schedule\n- Reach out early if you need help or accommodations\n\nI look forward to a great semester together!\n\nWarm regards,\n{{teacherName}}`,
    },
    evaluation: {
      name: 'Student Evaluation',
      description: 'Share grade status and progress',
      subject: 'Your Progress in {{courseName}}',
      body: `Dear {{studentName}},\n\nThis is {{teacherName}} with an update on your progress in {{courseName}}.\n\nCurrent Grade: {{currentGrade}} ({{currentScore}}%)\n\n{{missingSection}}\n\n{{upcomingSection}}\n\nPlease don't hesitate to reach out if you have questions about your progress or need additional support.\n\nBest regards,\n{{teacherName}}`,
    },
  };
  const DEFAULT_TEMPLATE_KEYS = new Set(Object.keys(DEFAULT_TEMPLATES));

  /* =========================================================
     CANVAS API HELPERS
  ========================================================= */
  function canvasHeaders(extra = {}) {
    const token = String(GM_getValue(STORAGE_KEYS.API_TOKEN, '') || '').trim();
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  }

  async function canvasGet(endpoint) {
    let results = [];
    let url = API + endpoint + (endpoint.includes('?') ? '&' : '?') + 'per_page=100';
    while (url) {
      const resp = await fetch(url, { credentials: 'same-origin', headers: canvasHeaders() });
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
      headers: canvasHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      }),
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
    const courses = await canvasGet('/courses?enrollment_type=teacher&state[]=available&include[]=term');
    return courses.filter(c => !c.workflow_state || c.workflow_state === 'available');
  }
  async function getCourse(courseId) {
    const resp = await fetch(`${API}/courses/${courseId}?include[]=term`, { credentials: 'same-origin', headers: canvasHeaders() });
    if (!resp.ok) throw new Error(`Canvas API error: ${resp.status} ${resp.statusText}`);
    return resp.json();
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
    const defaults = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    const stored = GM_getValue(STORAGE_KEYS.TEMPLATES, null);
    if (stored) {
      try { return { ...defaults, ...JSON.parse(stored) }; } catch(e) {}
    }
    return defaults;
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

  function isHtmlMessage(message) {
    return /<\/?[a-z][\s\S]*>/i.test(String(message || ''));
  }

  function messagePreviewHtml(message) {
    return isHtmlMessage(message)
      ? String(message || '')
      : escapeHtml(message).replace(/\n/g, '<br>');
  }

  function htmlToCanvasInboxText(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(html || '');

    wrapper.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    wrapper.querySelectorAll('p, div, li, ol, ul').forEach(el => {
      if (el.tagName === 'LI') el.prepend('- ');
      el.append(document.createTextNode('\n'));
    });
    wrapper.querySelectorAll('a[href]').forEach(link => {
      const text = link.textContent.trim();
      const href = link.getAttribute('href');
      link.textContent = text && href ? `${text}: ${href}` : href || text;
    });
    wrapper.querySelectorAll('img[alt]').forEach(img => {
      const alt = img.getAttribute('alt');
      img.replaceWith(document.createTextNode(alt ? `[${alt}]` : ''));
    });

    return wrapper.textContent
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function canvasInboxBody(message) {
    return isHtmlMessage(message) ? htmlToCanvasInboxText(message) : message;
  }

  function buildGeneratedMessage(student, vars, template, courseId) {
    const enrichedVars = {
      ...vars,
      canvasAppUrl: buildCanvasAppPromoUrl(courseId, vars.courseName),
    };
    return {
      studentId: student.id,
      studentName: enrichedVars.studentName,
      email: student.email || '',
      subject: renderTemplate(template.subject, enrichedVars),
      body: renderTemplate(template.body, enrichedVars),
      inboxBody: template.inboxBody ? renderTemplate(template.inboxBody, enrichedVars) : '',
    };
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
        messages.push(buildGeneratedMessage(student, vars, template, courseId));
      }
    } else if (emailType === 'missing') {
      for (const student of students) {
        const missing = getMissingAssignments(await getSubmissions(courseId, student.id), daysBack);
        if (!missing.length) continue;
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysBack: String(daysBack), missingAssignmentList: formatAssignmentList(missing.map(s => s.assignment || s)) };
        messages.push(buildGeneratedMessage(student, vars, template, courseId));
      }
    } else if (emailType === 'welcome') {
      for (const student of students) {
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName };
        messages.push(buildGeneratedMessage(student, vars, template, courseId));
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
        messages.push(buildGeneratedMessage(student, vars, template, courseId));
      }
    } else {
      const allAssignments = await getAssignments(courseId);
      const upcoming = getUpcomingAssignments(allAssignments, daysForward);
      const assignmentList = formatAssignmentList(upcoming);
      for (const student of students) {
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          daysForward: String(daysForward),
          daysBack: String(daysBack),
          assignmentList,
          missingAssignmentList: '',
          currentGrade: '',
          currentScore: '',
          missingSection: '',
          upcomingSection: upcoming.length ? `Upcoming Assignments (next ${daysForward} days):\n${assignmentList}` : '',
        };
        messages.push(buildGeneratedMessage(student, vars, template, courseId));
      }
    }
    return messages;
  }

  /* =========================================================
     CANVAS ACTIONS
  ========================================================= */
  async function sendCanvasMessage(courseId, recipientId, subject, body) {
    return canvasPost('/conversations', { recipients: [String(recipientId)], subject, body: canvasInboxBody(body), force_new: true, group_conversation: false, context_code: 'course_' + courseId, mode: 'sync' });
  }

  async function postAnnouncement(courseId, title, message) {
    const announcementBody = isHtmlMessage(message)
      ? message
      : '<p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>';
    return canvasPost(`/courses/${courseId}/discussion_topics`, { title, message: announcementBody, is_announcement: true, published: true });
  }

  /* =========================================================
     UTILITY
  ========================================================= */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

  function getSelectedCourseId() {
    return String(currentCourseId || getCurrentCourseId() || '');
  }

  function getActiveTabName() {
    return document.querySelector('#ces-tabs .ces-tab.active')?.dataset.tab || 'send';
  }

  function getSelectedCourseName() {
    const opt = document.getElementById('ces-course-select')?.selectedOptions?.[0];
    return opt ? opt.textContent.replace(/\s+-\s+ID\s+\d+\s*$/, '') : '';
  }

  function setCourseBadge(courseId, courseName) {
    const select = document.getElementById('ces-course-select');
    if (!select) return;
    select.title = courseId
      ? `Current Course Loaded${courseName ? ': ' + courseName : ''} ID ${courseId}`
      : 'No course loaded';
  }

  function openEmailSystem() {
    if (!_overlay) buildUI();
    if (_overlay) {
      currentCourseId = getCurrentCourseId() || currentCourseId || GM_getValue(STORAGE_KEYS.LAST_COURSE, '');
      loadCourses(currentCourseId);
      _overlay.classList.add('ces-open');
      showTab('send');
    }
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
          <div id="ces-course-control">
            <label for="ces-course-select">Course</label>
            <select id="ces-course-select" title="Loading courses...">
              <option value="">Loading courses...</option>
            </select>
          </div>
          <button class="ces-close-btn" id="ces-close">&times;</button>
        </div>
        <div id="ces-tabs">
          <button class="ces-tab active" data-tab="send">Send Messages</button>
          <button class="ces-tab" data-tab="templates">Message Templates</button>
          <button class="ces-tab" data-tab="settings">Settings</button>
        </div>
        <div id="ces-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    _overlay = overlay;

    overlay.querySelector('#ces-close').addEventListener('click', () => overlay.classList.remove('ces-open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('ces-open'); });
    overlay.querySelector('#ces-course-select')?.addEventListener('change', e => {
      currentCourseId = e.target.value || getCurrentCourseId();
      GM_setValue(STORAGE_KEYS.LAST_COURSE, currentCourseId);
      showTab(getActiveTabName());
    });
    overlay.querySelectorAll('.ces-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.ces-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showTab(tab.dataset.tab);
      });
    });
    currentCourseId = getCurrentCourseId() || GM_getValue(STORAGE_KEYS.LAST_COURSE, '');
    loadCourses(currentCourseId);
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
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '') || 'Teacher';
    const daysForward = GM_getValue(STORAGE_KEYS.DAYS_FORWARD, 7);
    const daysBack    = GM_getValue(STORAGE_KEYS.DAYS_BACK, 14);
    const courseId    = getSelectedCourseId();
    const templates   = getTemplates();
    const templateEntries = Object.entries(templates);
    const firstType = templateEntries[0]?.[0] || 'welcome';
    const templateOptions = templateEntries.map(([key, tpl]) => `
      <option value="${escapeAttr(key)}">${escapeHtml(tpl.name || key)}</option>
    `).join('');

    container.innerHTML = `
      <div id="ces-status-area"></div>
      ${teacherName === 'Teacher' ? '<div class="ces-status ces-status-info">Teacher Name is not set. Messages will use "Teacher" until you update Settings.</div>' : ''}
      <input type="hidden" id="ces-current-course" data-course-id="${escapeAttr(courseId)}" data-course-name="">
      ${!courseId ? '<div class="ces-status ces-status-error">Open Message System from inside a Canvas course.</div>' : ''}
      <div class="ces-send-grid">
        <div class="ces-send-message-field">
          <label class="ces-label">Message</label>
          <select class="ces-select" id="ces-template-select">${templateOptions}</select>
          <div id="ces-template-desc" style="font-size:12px;color:#6b7280;margin-top:4px;"></div>
        </div>
        <div class="ces-send-range-field" id="ces-days-forward-wrap">
          <label class="ces-label">Forward</label>
          <input type="number" class="ces-input" id="ces-days-forward" value="${daysForward}" min="1" max="90">
        </div>
        <div class="ces-send-range-field" id="ces-days-back-wrap" style="display:none;">
          <label class="ces-label">Back</label>
          <input type="number" class="ces-input" id="ces-days-back" value="${daysBack}" min="1" max="365">
        </div>
      </div>
      <div class="ces-send-panel">
        <div class="ces-send-panel-title">Delivery</div>
        <div class="ces-send-panel-sub">Canvas email and notifications follow each student's Canvas notification settings.</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;">
          <label class="ces-checkbox-row" style="margin:0;">
            <input type="checkbox" id="ces-canvas-message-check" checked>
            <span>Canvas Inbox / Email</span>
          </label>
          <label class="ces-checkbox-row" style="margin:0;">
            <input type="checkbox" id="ces-announce-check">
            <span>Canvas Announcement / Notification</span>
          </label>
        </div>
      </div>
      ${templateOptions ? '' : '<div class="ces-status ces-status-error">No message templates found. Add one in Message Templates.</div>'}
      <div class="ces-generate-row">
        <div id="ces-progress-area" style="display:none;flex:1;">
          <div class="ces-status ces-status-info" id="ces-progress-text" style="margin-bottom:6px;">Fetching data...</div>
          <div class="ces-progress"><div class="ces-progress-bar" id="ces-progress-bar" style="width:0%"></div></div>
        </div>
        <button class="ces-btn ces-btn-primary" id="ces-generate-btn">&#128269; Generate Messages</button>
      </div>
      <div id="ces-messages-area" class="ces-mt"></div>
    `;

    loadCurrentCourse(courseId);

    let selectedType = firstType;
    const templateSelect = container.querySelector('#ces-template-select');
    const templateDesc = container.querySelector('#ces-template-desc');
    function refreshTemplateControls() {
      selectedType = templateSelect?.value || firstType;
      const tpl = templates[selectedType];
      if (templateDesc) templateDesc.textContent = tpl?.description || tpl?.subject || '';
      updateOptionsVisibility(selectedType);
    }
    templateSelect?.addEventListener('change', refreshTemplateControls);
    refreshTemplateControls();

    container.querySelector('#ces-generate-btn').addEventListener('click', async () => {
      const courseBox = container.querySelector('#ces-current-course');
      const courseId = courseBox?.dataset.courseId || getSelectedCourseId();
      const courseName = courseBox?.dataset.courseName || `Course ${courseId}`;
      if (!courseId) { showStatus('Open Message System from inside a Canvas course first.', 'error'); return; }

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

    updateOptionsVisibility(selectedType);
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
      select.innerHTML = '';
      if (!cachedCourses.length) {
        select.innerHTML = '<option value="">No published courses found</option>';
        currentCourseId = '';
        return;
      }
      const selectedCourse = cachedCourses.find(c => String(c.id) === String(lastCourse)) || cachedCourses[0];
      currentCourseId = String(selectedCourse.id);
      cachedCourses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.term ? ` (${c.term.name})` : '') + ` - ID ${c.id}`;
        if (String(c.id) === String(currentCourseId)) opt.selected = true;
        select.appendChild(opt);
      });
      GM_setValue(STORAGE_KEYS.LAST_COURSE, currentCourseId);
    } catch(err) {
      select.innerHTML = '<option value="">Error loading courses</option>';
      showStatus(err?.message || 'Could not load Canvas courses.', 'error');
    }
  }

  async function loadCurrentCourse(courseId) {
    const courseEl = document.getElementById('ces-current-course');
    if (!courseEl || !courseId) { setCourseBadge('', ''); return; }
    setCourseBadge(courseId, '');
    try {
      const course = await getCourse(courseId);
      const name = course.name || `Course ${courseId}`;
      const term = course.term?.name ? ` (${course.term.name})` : '';
      courseEl.dataset.courseName = name + term;
      setCourseBadge(courseId, name + term);
    } catch (err) {
      courseEl.dataset.courseName = `Course ${courseId}`;
      setCourseBadge(courseId, '');
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
    let html = `<div class="ces-flex-between ces-mb"><strong>${generatedMessages.length} message(s) ready</strong><button class="ces-btn ces-btn-primary" id="ces-send-all-btn">&#9993; Send All Selected Channels</button></div>`;
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
          <div class="ces-msg-body">${messagePreviewHtml(msg.body)}</div>
        </div>
      `;
    });
    container.innerHTML = html;

    container.querySelector('#ces-send-all-btn').addEventListener('click', async () => {
      const announceCheck = document.getElementById('ces-announce-check');
      const canvasCheck = document.getElementById('ces-canvas-message-check');
      const includeAnnouncement = announceCheck && announceCheck.checked;
      const includeCanvasMessages = !canvasCheck || canvasCheck.checked;
      const channels = [
        includeCanvasMessages ? 'Canvas Inbox / Email' : '',
        includeAnnouncement ? 'Canvas Announcement / Notification' : '',
      ].filter(Boolean);
      if (!channels.length) {
        showStatus('Choose at least one delivery channel first.', 'error');
        return;
      }
      if (!confirm(`Send ${generatedMessages.length} message(s) via ${channels.join(', ')}?`)) return;
      const btn = container.querySelector('#ces-send-all-btn');
      btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span> Sending...';
      let sent = 0, failed = 0;
      if (includeCanvasMessages) {
        for (let i = 0; i < generatedMessages.length; i++) {
          const msg = generatedMessages[i];
          const row = container.querySelector(`#ces-msg-${i}`);
          try {
            await sendCanvasMessage(courseId, msg.studentId, msg.subject, msg.inboxBody || msg.body);
            sent++; if (row) row.style.background = '#eef7fc';
          } catch(err) {
            failed++; if (row) row.style.background = '#fef2f2';
          }
        }
      }
      if (includeAnnouncement) {
        try {
          const templates = getTemplates(); const tpl = templates[emailType];
          const canvasAppUrl = buildCanvasAppPromoUrl(courseId, courseName);
          await postAnnouncement(courseId,
            tpl.subject.replace(/\{\{courseName\}\}/g, courseName),
            tpl.body.replace(/\{\{teacherName\}\}/g, GM_getValue(STORAGE_KEYS.TEACHER_NAME, ''))
                    .replace(/\{\{courseName\}\}/g, courseName).replace(/\{\{studentName\}\}/g, 'Students')
                    .replace(/\{\{canvasAppUrl\}\}/g, canvasAppUrl)
                    .replace(/\{\{assignmentList\}\}/g, '(see your individual message)').replace(/\{\{missingAssignmentList\}\}/g, '(see your individual message)')
                    .replace(/\{\{currentGrade\}\}/g, '(see your individual message)').replace(/\{\{currentScore\}\}/g, '(see your individual message)')
                    .replace(/\{\{daysForward\}\}/g, String(document.getElementById('ces-days-forward')?.value || 7))
                    .replace(/\{\{daysBack\}\}/g, String(document.getElementById('ces-days-back')?.value || 14))
                    .replace(/\{\{missingSection\}\}/g, '').replace(/\{\{upcomingSection\}\}/g, '')
          );
          showStatus(`Canvas: ${sent} sent${failed ? `, ${failed} failed` : ''}. Announcement posted.`, 'success');
        } catch(err) {
          showStatus(`Canvas: ${sent} sent${failed ? `, ${failed} failed` : ''}. Announcement failed: ${err.message}`, 'error');
        }
      }
      if (!includeAnnouncement) {
        const parts = [];
        if (includeCanvasMessages) parts.push(`Canvas: ${sent} sent${failed ? `, ${failed} failed` : ''}`);
        showStatus(parts.join('. ') + '.', failed ? 'error' : 'success');
      }
      btn.disabled = false; btn.innerHTML = '&#9993; Send All Selected Channels';
    });

    container.querySelectorAll('.ces-send-one').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const msg = generatedMessages[idx];
        btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span>';
        try {
          await sendCanvasMessage(courseId, msg.studentId, msg.subject, msg.inboxBody || msg.body);
          btn.innerHTML = '&#10003; Sent'; btn.classList.remove('ces-btn-primary'); btn.style.background = '#0374b5';
          const row = document.querySelector(`#ces-msg-${idx}`); if (row) row.style.background = '#eef7fc';
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
        GM_setValue('ces_compose_pending', JSON.stringify({ recipientId: msg.studentId, recipientName: msg.studentName, subject: msg.subject, body: msg.inboxBody || canvasInboxBody(msg.body), courseId }));
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
      html += `<div class="ces-mb"><button class="ces-btn ces-btn-primary" id="ces-add-tpl">+ New Custom Message</button></div>`;
      for (const [type, tpl] of Object.entries(templates)) {
        const canDelete = !DEFAULT_TEMPLATE_KEYS.has(type);
        html += `<div class="ces-card"><div class="ces-flex-between"><div><strong>${escapeHtml(tpl.name)}</strong><div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(tpl.description || '')}</div><div style="font-size:12px;color:#6b7280;margin-top:2px;">Subject: ${escapeHtml(tpl.subject)}</div></div><div style="display:flex;gap:6px;flex-shrink:0;"><button class="ces-btn ces-btn-secondary ces-btn-sm ces-edit-tpl" data-type="${type}">Edit</button>${canDelete ? `<button class="ces-btn ces-btn-danger ces-btn-sm ces-del-tpl" data-type="${type}">Delete</button>` : ''}</div></div></div>`;
      }
      html += `<div class="ces-mt"><button class="ces-btn ces-btn-secondary" id="ces-reset-tpl">Reset All to Defaults</button></div>`;
      container.innerHTML = html;
      container.querySelector('#ces-add-tpl').addEventListener('click', () => {
        const id = `custom_${Date.now()}`;
        templates[id] = {
          name: 'Custom Message',
          description: 'Teacher-created message',
          subject: '{{courseName}} Update',
          body: `Dear {{studentName}},\n\nWrite your custom message here.\n\nBest regards,\n{{teacherName}}`,
        };
        renderEditor(id);
      });
      container.querySelectorAll('.ces-edit-tpl').forEach(btn => btn.addEventListener('click', () => renderEditor(btn.dataset.type)));
      container.querySelectorAll('.ces-del-tpl').forEach(btn => btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (DEFAULT_TEMPLATE_KEYS.has(type)) return;
        if (confirm(`Delete "${templates[type]?.name || 'this custom message'}"?`)) {
          delete templates[type];
          saveTemplates(templates);
          renderList();
        }
      }));
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
        <label class="ces-label">Message Name</label>
        <input type="text" class="ces-input" id="ces-tpl-name" value="${escapeAttr(tpl.name)}">
        <label class="ces-label">Short Description</label>
        <input type="text" class="ces-input" id="ces-tpl-desc" value="${escapeAttr(tpl.description || '')}">
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
        templates[type].name = container.querySelector('#ces-tpl-name').value.trim() || 'Custom Message';
        templates[type].description = container.querySelector('#ces-tpl-desc').value.trim();
        templates[type].subject = container.querySelector('#ces-tpl-subject').value;
        templates[type].body    = container.querySelector('#ces-tpl-body').value;
        saveTemplates(templates); renderList();
      });
      container.querySelector('#ces-tpl-preview').addEventListener('click', () => {
        const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, 'Professor Smith');
        const sampleVars = { studentName: 'Alex', teacherName, courseName: 'Sample Course', assignmentList: '  - Essay 1 (Due: 4/15/2026)\n  - Quiz 3 (Due: 4/18/2026)', missingAssignmentList: '  - Homework 5 (Due: 4/1/2026)', currentGrade: 'B+', currentScore: '87.5', daysForward: '7', daysBack: '14', missingSection: 'Missing (past 14 days):\n  - Homework 5', upcomingSection: 'Upcoming (next 7 days):\n  - Essay 1' };
        const subject = container.querySelector('#ces-tpl-subject').value;
        const body    = container.querySelector('#ces-tpl-body').value;
        container.querySelector('#ces-tpl-preview-area').innerHTML = `<div class="ces-card" style="background:#f9fafb;"><strong>Subject:</strong> ${escapeHtml(renderTemplate(subject, sampleVars))}<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;"><div style="font-size:13px;">${messagePreviewHtml(renderTemplate(body, sampleVars))}</div></div>`;
      });
    }

    renderList();
  }

  /* =========================================================
     TAB: SETTINGS
  ========================================================= */
  function renderSettingsTab(container) {
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    const apiToken = GM_getValue(STORAGE_KEYS.API_TOKEN, '');
    const daysForward = GM_getValue(STORAGE_KEYS.DAYS_FORWARD, 7);
    const daysBack    = GM_getValue(STORAGE_KEYS.DAYS_BACK, 14);

    container.innerHTML = `
      <div id="ces-settings-status"></div>
      <div class="ces-card">
        <h3 style="margin:0 0 12px;">Teacher Information</h3>
        <label class="ces-label">Teacher Name</label>
        <input type="text" class="ces-input" id="ces-set-teacher" value="${escapeAttr(teacherName)}" placeholder="Professor Smith">
        <p style="font-size:12px;color:#6b7280;margin-top:4px;">Used in all message templates as {{teacherName}}.</p>
      </div>
      <div class="ces-card">
        <h3 style="margin:0 0 12px;">Canvas API</h3>
        <label class="ces-label">Canvas API Token</label>
        <input type="password" class="ces-input" id="ces-set-api-token" value="${escapeAttr(apiToken)}" placeholder="Paste Canvas access token">
        <p style="font-size:12px;color:#6b7280;margin-top:4px;">Optional. Used for Canvas course, student, message, and announcement requests.</p>
        <div style="font-size:12px;color:#374151;line-height:1.55;margin-top:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;">
          <strong>How to find it:</strong>
          <ol style="margin:6px 0 0 18px;padding:0;">
            <li>Open Canvas Account.</li>
            <li>Go to Settings.</li>
            <li>Find Approved Integrations.</li>
            <li>Click New Access Token.</li>
            <li>Copy the token and paste it here.</li>
          </ol>
        </div>
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
          <li>Uses your Canvas login, or the Canvas API token above when provided.</li>
          <li>Messages sent through Canvas's built-in Inbox system.</li>
          <li>Announcements posted directly to the selected course.</li>
          <li>All templates and settings saved in browser storage.</li>
        </ul>
      </div>
      <div class="ces-mt"><button class="ces-btn ces-btn-primary" id="ces-save-settings">Save Settings</button></div>
    `;

    container.querySelector('#ces-save-settings').addEventListener('click', () => {
      GM_setValue(STORAGE_KEYS.TEACHER_NAME, container.querySelector('#ces-set-teacher').value.trim());
      GM_setValue(STORAGE_KEYS.API_TOKEN, container.querySelector('#ces-set-api-token').value.trim());
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
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#2d3b45;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,sans-serif;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,.2);';
    bar.innerHTML = `
      <span>&#9993; Message ready for <strong>${escapeHtml(data.recipientName)}</strong>: "${escapeHtml(data.subject)}"</span>
      <div style="display:flex;gap:8px;">
        <button id="ces-insert-compose" style="padding:6px 14px;background:#fff;color:#2d3b45;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:13px;">Insert into Compose</button>
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
     CANVAS LAUNCHER
  ========================================================= */
  function findCanvasLauncherHost() {
    return document.querySelector('.ic-app-nav-toggle-and-crumbs')
      || document.querySelector('#breadcrumbs')?.parentElement
      || document.querySelector('[data-testid="breadcrumbs"]')?.parentElement
      || document.querySelector('header[role="banner"]')
      || document.querySelector('#header');
  }

  function placeCanvasLauncher() {
    const group = document.getElementById('ces-launcher-group');
    if (isSpeedGraderPage()) {
      if (group) group.remove();
      document.getElementById('ces-ai-side-panel')?.remove();
      return;
    }
    if (!group) return;
    const host = findCanvasLauncherHost();
    if (host) {
      if (group.parentElement !== host) host.appendChild(group);
      group.classList.remove('ces-launcher-fixed');
      group.classList.add('ces-launcher-inline');
      if (getComputedStyle(host).display === 'block') {
        host.style.display = 'flex';
        host.style.alignItems = 'center';
      }
      return;
    }
    document.body.appendChild(group);
    group.classList.remove('ces-launcher-inline');
    group.classList.add('ces-launcher-fixed');
  }

  function openAiSidePanel(name, url) {
    let panel = document.getElementById('ces-ai-side-panel');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'ces-ai-side-panel';
      panel.innerHTML = `
        <div id="ces-ai-side-head">
          <span id="ces-ai-side-title"></span>
          <div id="ces-ai-side-actions">
            <button class="ces-btn ces-btn-secondary ces-btn-sm" id="ces-ai-side-open">Open in New Tab</button>
            <button class="ces-close-btn" id="ces-ai-side-close" title="Close">&times;</button>
          </div>
        </div>
        <iframe id="ces-ai-side-frame" title="AI Chat"></iframe>
        <div class="ces-ai-side-note">Some AI chats block embedded views. If this panel is blank or shows an access error, use Open in New Tab.</div>
      `;
      document.body.appendChild(panel);
      panel.querySelector('#ces-ai-side-close')?.addEventListener('click', () => panel.remove());
    }

    panel.querySelector('#ces-ai-side-title').textContent = name;
    panel.querySelector('#ces-ai-side-open').onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
    const frame = panel.querySelector('#ces-ai-side-frame');
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = url; }, 30);
  }

  function addCanvasLauncher() {
    if (document.getElementById('ces-launcher-group')) {
      placeCanvasLauncher();
      return;
    }
    const group = document.createElement('div');
    group.id = 'ces-launcher-group';

    const messageBtn = document.createElement('button');
    messageBtn.className = 'ces-launcher-btn';
    messageBtn.type = 'button';
    messageBtn.title = 'Canvas Message System';
    messageBtn.innerHTML = '<span class="ces-nav-icon">&#9993;</span><span>Messages</span>';
    messageBtn.addEventListener('click', openEmailSystem);
    group.appendChild(messageBtn);

    const aiOptions = [
      ['ChatGPT', 'GPT', 'https://chatgpt.com/'],
      ['Claude', 'Claude', 'https://claude.ai/'],
      ['Gemini', 'Gemini', 'https://gemini.google.com/'],
      ['Copilot', 'Copilot', 'https://copilot.microsoft.com/'],
      ['Perplexity', 'Perplexity', 'https://www.perplexity.ai/'],
      ['Grok', 'Grok', 'https://grok.com/'],
    ];

    const aiSelect = document.createElement('select');
    aiSelect.className = 'ces-ai-select';
    aiSelect.title = 'Choose AI chat';
    aiOptions.forEach(([name, _label, url]) => {
      const opt = document.createElement('option');
      opt.value = url;
      opt.textContent = name;
      aiSelect.appendChild(opt);
    });
    group.appendChild(aiSelect);

    const aiChatBtn = document.createElement('button');
    aiChatBtn.className = 'ces-ai-chat-btn';
    aiChatBtn.type = 'button';
    aiChatBtn.title = 'Open selected AI chat';
    aiChatBtn.textContent = 'AI Chat';
    aiChatBtn.addEventListener('click', () => {
      const selected = aiOptions.find(([_name, _label, url]) => url === aiSelect.value) || aiOptions[0];
      openAiSidePanel(selected[0], selected[2]);
    });
    group.appendChild(aiChatBtn);

    document.body.appendChild(group);
    placeCanvasLauncher();
  }
  addCanvasLauncher();
  const launcherObserver = new MutationObserver(() => placeCanvasLauncher());
  launcherObserver.observe(document.body, { childList: true, subtree: true });

  /* =========================================================
     POPUP MESSAGE LISTENER
     Receives "open" command from popup.js
  ========================================================= */
  if (globalThis.chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'CES_OPEN') {
        openEmailSystem();
        sendResponse({ ok: true });
      }
    });
  }

  /* =========================================================
     INIT
  ========================================================= */
  buildUI();
  checkComposePageHelper();
})();
