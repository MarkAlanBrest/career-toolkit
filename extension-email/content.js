(async function () {
  'use strict';

  // Prevent double-init if reloaded
  if (window.__cesLoaded) return;
  window.__cesLoaded = true;

  // Storage shim — pre-load all keys used by the email system
  const EMAIL_KEYS = ['ces_templates', 'ces_templates_version', 'ces_teacher_name', 'ces_canvas_api_token', 'ces_days_forward', 'ces_days_back', 'ces_last_course', 'ces_compose_pending', 'ces_automations', 'ces_automation_logs', 'ces_last_auto_check'];
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

  function isCanvasCourseToolbarPage() {
    const path = window.location.pathname;
    if (!/\/courses\/\d+\b/.test(path)) return false;
    if (/^\/(?:accounts|admin|profile|users|login|logout)\b/.test(path)) return false;
    return !isSpeedGraderPage();
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
    .ces-editor-toolbar {
      display:flex; align-items:center; gap:6px; flex-wrap:wrap;
      padding:8px; margin:0 0 0; border:1px solid #c7cdd1;
      border-bottom:none; border-radius:6px 6px 0 0; background:#f8fafc;
    }
    .ces-editor-toolbar .ces-select, .ces-editor-toolbar .ces-input {
      width:auto; min-width:92px; padding:5px 8px; font-size:12px;
    }
    .ces-editor-btn {
      height:30px; min-width:30px; padding:0 8px; border:1px solid #c7cdd1;
      border-radius:4px; background:#fff; color:#2d3b45; font-size:12px;
      font-weight:700; cursor:pointer;
    }
    .ces-editor-btn:hover { background:#eef7fc; border-color:#8aa9bf; }
    .ces-email-editor {
      min-height:340px; max-height:48vh; overflow:auto; padding:20px 22px;
      border:1px solid #c7cdd1; border-radius:0 0 6px 6px; background:#fff;
      color:#111827; font-family:Arial,Helvetica,sans-serif; line-height:1.6;
    }
    .ces-email-editor:focus { outline:none; border-color:#0374b5; box-shadow:0 0 0 3px rgba(3,116,181,.12); }
    .ces-email-editor img { max-width:100%; height:auto; }
    .ces-editor-shell { border:1px solid #d1d5db; border-radius:6px; overflow:hidden; background:#fff; }
    .ces-editor-shell .ces-email-editor { border:none; border-radius:0; }
    .ces-editor-subject-preview { font-size:13px;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:9px 10px;margin-bottom:10px; }
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
    .ces-review-preview {
      border:1px solid #e5e7eb; border-radius:8px; background:#fff;
      padding:14px; margin-bottom:12px;
    }
    .ces-review-preview-body {
      font-size:13px; color:#374151; max-height:360px; overflow:auto;
      background:#f9fafb; border-radius:4px; padding:10px; margin-top:8px;
    }
    .ces-review-preview-body img { max-width:100%; }
    .ces-recipient-list {
      border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#fff;
    }
    .ces-recipient-row {
      display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px;
      align-items:center; padding:8px 10px; border-top:1px solid #eef0f2;
    }
    .ces-recipient-row:first-child { border-top:0; }
    .ces-recipient-row:hover { background:#f9fafb; }
    .ces-recipient-name { font-size:13px; font-weight:700; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
    .ces-course-picker {
      display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
      gap:10px; align-items:stretch; margin-top:6px;
    }
    .ces-course-box {
      border:1px solid #d1d5db; border-radius:8px; background:#fff;
      min-height:220px; max-height:320px; overflow:auto;
    }
    .ces-course-box-head {
      position:sticky; top:0; z-index:1;
      display:flex; justify-content:space-between; gap:8px; align-items:center;
      padding:8px 10px; background:#f9fafb; border-bottom:1px solid #e5e7eb;
      font-size:12px; font-weight:800; color:#374151;
    }
    .ces-course-list { display:grid; gap:0; }
    .ces-course-row {
      width:100%; display:grid; grid-template-columns:minmax(0,1fr) auto;
      gap:8px; align-items:center; text-align:left; padding:9px 10px;
      border:0; border-bottom:1px solid #f0f2f4; background:#fff; color:#111827;
      cursor:pointer; font:inherit;
    }
    .ces-course-row:hover { background:#eef7fc; }
    .ces-course-row-title { font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ces-course-row-meta { font-size:11px; color:#6b7280; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ces-course-row-action { font-size:16px; font-weight:800; color:#0374b5; }
    .ces-course-transfer { display:grid; align-content:center; gap:8px; }
    .ces-course-empty { padding:14px 10px; font-size:13px; color:#6b7280; }
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
      line-height: 34px;
      box-sizing: border-box;
      vertical-align: middle;
      cursor: pointer;
    }
    .ces-launcher-btn { gap: 7px; padding: 0 12px; }
    .ces-launcher-btn.ces-launcher-action {
      background:#059669; border-color:#047857; color:#fff;
      box-shadow:0 1px 4px rgba(5,150,105,.28);
    }
    .ces-launcher-btn.ces-launcher-action:hover { background:#047857; border-color:#065f46; color:#fff; }
    .ces-launcher-btn.ces-launcher-action .ces-nav-icon { color:#fff; }
    .ces-launcher-btn.ces-launcher-action.ces-launcher-done,
    .ces-launcher-btn.ces-launcher-action.ces-launcher-done:hover,
    .ces-launcher-btn.ces-launcher-action:disabled {
      background:#e5e7eb; border-color:#c7cdd1; color:#6b7280;
      box-shadow:none; cursor:not-allowed;
    }
    .ces-launcher-btn.ces-launcher-action.ces-launcher-done .ces-nav-icon,
    .ces-launcher-btn.ces-launcher-action:disabled .ces-nav-icon { color:#6b7280; }
    .ces-ai-select { width: 126px; padding: 0 26px 0 8px; justify-content: flex-start; appearance: auto; margin: 0; align-self: center; transform: none; }
    .ces-launcher-btn:hover, .ces-ai-select:hover { background: #f5f5f5; border-color:#8aa9bf; }
    .ces-launcher-btn .ces-nav-icon { font-size: 16px; line-height: 1; color:#0374b5; }
    @media (max-width: 720px) {
      #ces-body { padding: 14px; }
      .ces-send-grid { grid-template-columns: 1fr 1fr; }
      .ces-course-picker { grid-template-columns:1fr; }
      .ces-course-transfer { grid-template-columns:1fr 1fr; }
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
    TEMPLATE_VERSION: 'ces_templates_version',
    TEACHER_NAME: 'ces_teacher_name',
    API_TOKEN:    'ces_canvas_api_token',
    CANVAS_BASE:  'ces_canvas_base',
    DAYS_FORWARD: 'ces_days_forward',
    DAYS_BACK:    'ces_days_back',
    LAST_COURSE:  'ces_last_course',
    AUTOMATIONS:  'ces_automations',
    AUTO_LOGS:    'ces_automation_logs',
    LAST_AUTO_CHECK: 'ces_last_auto_check',
  };

  const CANVAS_STUDENT_IOS_URL = 'https://apps.apple.com/us/app/canvas-student/id480883488';
  const CANVAS_STUDENT_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.instructure.candroid';
  const CANVAS_APP_PROMO_URL = 'https://career-toolkit-ruby.vercel.app/canvas-app';

  function buildCanvasAppPromoUrl(courseId, courseName) {
    const url = new URL(CANVAS_APP_PROMO_URL);
    url.searchParams.set('audience', 'student');
    if (courseId) url.searchParams.set('courseId', String(courseId));
    if (courseName) url.searchParams.set('courseName', String(courseName));
    return url.toString();
  }

  const TEMPLATE_VERSION_VALUE = '8';

  function templateBody(source) {
    return {
      bodyText: source,
      body: teacherTextToCanvasHtml(source),
    };
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
      ...templateBody(`# Canvas Notification Setup

Hi {{studentName}},

Please set up the Canvas Student app for {{courseName}}. This is the best way to receive course announcements, reminders, and schedule changes on your phone.

Open setup page:
{{canvasAppUrl}}

> Before class ends today, install the app, log in, allow notifications, and make sure announcements are enabled for this course.

- iPhone App Store: ${CANVAS_STUDENT_IOS_URL}
- Android Google Play: ${CANVAS_STUDENT_ANDROID_URL}

Thank you,
{{teacherName}}`),
    },
    upcoming: {
      name: 'Upcoming Assignments',
      description: 'Remind students of upcoming due dates',
      subject: 'Upcoming Work for {{courseName}}',
      ...templateBody(`# Upcoming Work

Hi {{studentName}},

Here is what is coming up in {{courseName}} over the next {{daysForward}} days.

{{assignmentListHtml}}

This is a good moment to look ahead, block out time, and make sure you understand what each assignment is asking you to do.

> Please review the instructions in Canvas and plan enough time to complete each item before the deadline. If anything is unclear, reach out before the due date so there is time to help.

Best,
{{teacherName}}`),
    },
    missing: {
      name: 'Missing Work Reminder',
      description: 'Alert students about unsubmitted work',
      subject: 'Missing Work in {{courseName}}',
      ...templateBody(`# Missing Work Check-In

Hi {{studentName}},

I am reaching out because the following work still appears as missing in {{courseName}}.

{{missingAssignmentListHtml}}

Missing work can add up quickly, but there is still value in taking the next step now. Please review the list above and submit what you can as soon as you are able.

> If something is preventing you from completing the work, reply to this message so we can talk about a realistic plan. You do not need to wait until everything is perfect to get started.

Best,
{{teacherName}}`),
    },
    welcome: {
      name: 'Welcome to Class',
      description: 'Send a warm welcome message',
      subject: 'Welcome to {{courseName}}!',
      ...templateBody(`# Welcome to {{courseName}}

Hi {{studentName}},

Welcome to {{courseName}}. I am glad you are in the course and look forward to working with you this term.

To start strong, please take a few minutes to:

- Review the syllabus and course schedule.
- Check Canvas regularly for announcements, modules, and due dates.
- Set aside consistent time each week for readings, assignments, and review.
- Reach out early if you have questions, need help, or have approved accommodations.

---

I hope this is a productive and engaging semester for you.

Welcome,
{{teacherName}}`),
    },
    evaluation: {
      name: 'Student Evaluation',
      description: 'Share grade status and progress',
      subject: 'Progress Update for {{courseName}}',
      ...templateBody(`# Course Progress Update

Hi {{studentName}},

I am sending a brief progress update for {{courseName}} so you have a clear picture of where things stand.

> Current grade: {{currentGrade}} ({{currentScore}}%)

# Missing Work
{{missingSectionHtml}}

# Coming Up
{{upcomingSectionHtml}}

> If your current standing is not where you want it to be, this is a good time to make a plan. Please review the items above and reach out if you would like to discuss next steps.

Best regards,
{{teacherName}}`),
    },
    auto_late: {
      name: 'Automation: Late Work',
      description: 'Automatically remind students about past-due missing work',
      subject: 'Past Due Work in {{courseName}}',
      ...templateBody(`# Past Due Work Reminder

Hi {{studentName}},

This is an automated reminder that the following work in {{courseName}} is currently past due.

{{missingAssignmentListHtml}}

I know late work can feel difficult to restart, but taking action now can still help your progress in the course. Start with the most manageable item, then continue from there.

> Please submit what you can as soon as possible. If you are stuck, unsure where to begin, or need to discuss your options, reply to this message or come to office hours. I would rather hear from you early than have you try to handle it alone.

Best regards,
{{teacherName}}`),
    },
    auto_upcoming: {
      name: 'Automation: Upcoming Work',
      description: 'Automatically send upcoming work reminders',
      subject: 'Upcoming Work in {{courseName}}',
      ...templateBody(`# Upcoming Work Reminder

Hi {{studentName}},

Here is the work coming up in {{courseName}} over the next {{daysForward}} days.

{{assignmentListHtml}}

Use this as a planning checklist for the week. If one of these items will take longer than expected, it is better to find that out now than close to the deadline.

> Please check Canvas for full instructions, required materials, and submission details. Planning ahead now will help you avoid last-minute issues.

Best regards,
{{teacherName}}`),
    },
    auto_midpoint: {
      name: 'Automation: Midpoint Evaluation',
      description: 'Automatically send a midpoint progress check',
      subject: 'Midpoint Progress Check for {{courseName}}',
      ...templateBody(`# Midpoint Progress Check

Hi {{studentName}},

We are at the midpoint of {{courseName}}, so I am sharing a progress check to help you assess where things stand and what to focus on next.

> Current grade: {{currentGrade}} ({{currentScore}}%)

# Missing Work
{{missingSectionHtml}}

# Coming Up
{{upcomingSectionHtml}}

There is still time to make meaningful adjustments. If you are doing well, keep protecting the habits that are working. If you are behind, focus first on the items that will have the greatest impact and reach out if you want help prioritizing.

> This is a useful point in the course to review your habits, catch up where possible, and ask for support before the final stretch.

Best regards,
{{teacherName}}`),
    },
    auto_low_grade: {
      name: 'Automation: Low Grade Warning',
      description: 'Automatically warn students when grades fall below a threshold',
      subject: 'Grade Check-In for {{courseName}}',
      ...templateBody(`# Grade Check-In

Hi {{studentName}},

I am reaching out because your current performance in {{courseName}} has fallen below the alert threshold I set for the course.

{{gradeAlertDetailHtml}}

This message is meant to catch the issue early enough that you can respond. A lower score does not have to define the rest of the course, but it is important to take action soon.

> Please review your recent feedback in Canvas and consider what needs attention first. If you would like help making a recovery plan, reply to this message or visit office hours.

Best regards,
{{teacherName}}`),
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
  function dashboardCourseId(card) {
    const raw = card?.assetString || card?.asset_string || card?.href || card?.url || card?.id || '';
    const match = String(raw).match(/(?:course_|\/courses\/)(\d+)|^(\d+)$/);
    return match ? String(match[1] || match[2]) : '';
  }

  async function getCourses() {
    const courses = await canvasGet('/courses?enrollment_type=teacher&state[]=available&include[]=term');
    const publishedCourses = courses.filter(c => !c.workflow_state || c.workflow_state === 'available');
    try {
      const dashboardCards = await canvasGet('/dashboard/dashboard_cards');
      const dashboardIds = new Set(dashboardCards.map(dashboardCourseId).filter(Boolean));
      if (dashboardIds.size) {
        return publishedCourses.filter(course => dashboardIds.has(String(course.id)));
      }
    } catch (_err) {
      // If Dashboard Cards are unavailable, keep the published-course fallback.
    }
    return publishedCourses;
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

  function formatAssignmentListHtml(assignments, emptyText = 'No assignments to show.') {
    if (!assignments.length) return `<p style="margin:0;color:#4b5563;font-size:14px;line-height:1.5;">${escapeHtml(emptyText)}</p>`;
    return `<ul style="margin:0;padding-left:20px;color:#111827;font-size:14px;line-height:1.7;">${assignments.map(a => {
      const due = a.due_at ? new Date(a.due_at).toLocaleDateString() : 'No due date';
      const name = a.name || a.assignment?.name || 'Unnamed';
      return `<li><strong>${escapeHtml(name)}</strong> <span style="color:#6b7280;">Due: ${escapeHtml(due)}</span></li>`;
    }).join('')}</ul>`;
  }

  /* =========================================================
     TEMPLATE ENGINE
  ========================================================= */
  function getTemplates() {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    const stored = GM_getValue(STORAGE_KEYS.TEMPLATES, null);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (GM_getValue(STORAGE_KEYS.TEMPLATE_VERSION, '') !== TEMPLATE_VERSION_VALUE) {
          const customTemplates = {};
          for (const [key, value] of Object.entries(parsed)) {
            if (!DEFAULT_TEMPLATE_KEYS.has(key)) customTemplates[key] = normalizeTemplateSource(value);
          }
          const upgraded = { ...defaults, ...customTemplates };
          saveTemplates(upgraded);
          GM_setValue(STORAGE_KEYS.TEMPLATE_VERSION, TEMPLATE_VERSION_VALUE);
          return upgraded;
        }
        return normalizeTemplateCollection({ ...defaults, ...parsed });
      } catch(e) {}
    }
    GM_setValue(STORAGE_KEYS.TEMPLATE_VERSION, TEMPLATE_VERSION_VALUE);
    return defaults;
  }

  function saveTemplates(templates) {
    GM_setValue(STORAGE_KEYS.TEMPLATES, JSON.stringify(normalizeTemplateCollection(templates)));
  }

  function normalizeTemplateCollection(templates) {
    return Object.fromEntries(Object.entries(templates).map(([key, tpl]) => [key, normalizeTemplateSource(tpl)]));
  }

  function normalizeTemplateSource(tpl) {
    const next = { ...tpl };
    if (next.bodyMode === 'html') {
      next.body = sanitizeCanvasEmailHtml(next.body || next.bodyText || '');
      next.bodyText = htmlToTeacherText(next.body);
      return next;
    }
    next.bodyText = String(next.bodyText || htmlToTeacherText(next.body || ''));
    next.body = teacherTextToCanvasHtml(next.bodyText);
    return next;
  }

  function sanitizeCanvasEmailHtml(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(html || '');
    wrapper.querySelectorAll('script, iframe, object, embed, form, input, button, video, audio, canvas, svg').forEach(el => el.remove());
    wrapper.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value || '';
        if (name.startsWith('on')) el.removeAttribute(attr.name);
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name);
      });
    });
    return wrapper.innerHTML.trim();
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

  function htmlToTeacherText(message) {
    if (!isHtmlMessage(message)) return String(message || '');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(message || '');
    wrapper.querySelectorAll('a[href]').forEach(link => {
      const text = link.textContent.trim() || 'Open Link';
      const href = link.getAttribute('href') || '';
      link.replaceWith(document.createTextNode(text && href ? `${text}: ${href}` : href || text));
    });
    wrapper.querySelectorAll('img[src]').forEach(img => {
      const alt = img.getAttribute('alt') || 'Image';
      img.replaceWith(document.createTextNode(alt ? `[${alt}]` : ''));
    });
    wrapper.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    wrapper.querySelectorAll('h1,h2,h3,p,div,li,ol,ul').forEach(el => {
      if (el.tagName === 'LI') el.prepend('- ');
      el.append(document.createTextNode('\n'));
    });
    return wrapper.textContent
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function teacherTextToCanvasHtml(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let paragraph = [];
    let list = [];
    let title = '';

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const body = paragraph.map(escapeHtml).join('<br>');
      out.push(`<p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2937;">${body}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (!list.length) return;
      out.push(`<ul style="margin:0 0 16px;padding-left:22px;color:#1f2937;font-size:14px;line-height:1.75;">${list.map(item => `<li style="margin:0 0 4px;">${escapeHtml(item)}</li>`).join('')}</ul>`);
      list = [];
    };
    const flushAll = () => { flushParagraph(); flushList(); };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line) { flushAll(); continue; }

      if (/^\{\{[a-zA-Z0-9]+Html\}\}$/.test(line)) {
        flushAll();
        out.push(line);
      } else if (line.startsWith('# ')) {
        flushAll();
        if (!title && !out.length) {
          title = line.slice(2).trim();
        } else {
          out.push(`<div style="font-size:16px;font-weight:800;line-height:1.25;color:#111827;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">${escapeHtml(line.slice(2).trim())}</div>`);
        }
      } else if (line === '---') {
        flushAll();
        out.push('<div style="height:1px;background:#d1d5db;margin:16px 0;"></div>');
      } else if (line.startsWith('> ')) {
        flushAll();
        out.push(`<div style="border-left:4px solid #0770B8;background:#f4f9fc;padding:11px 13px;margin:12px 0 16px;font-size:14px;line-height:1.55;color:#1f2937;">${escapeHtml(line.slice(2).trim())}</div>`);
      } else if (line.startsWith('- ')) {
        flushParagraph();
        list.push(line.slice(2).trim());
      } else {
        flushList();
        paragraph.push(raw);
      }
    }
    flushAll();
    const header = title
      ? `<div style="background:#2d3b45;color:#ffffff;padding:18px 22px;border-bottom:4px solid #0770B8;"><div style="font-size:22px;font-weight:800;line-height:1.2;">${escapeHtml(title)}</div></div>`
      : '';
    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;color:#111827;background:#ffffff;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;">
  ${header}
  <div style="padding:20px 22px;">${out.join('\n')}</div>
</div>`;
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

  function getAutomations() {
    const stored = GM_getValue(STORAGE_KEYS.AUTOMATIONS, '[]');
    try { return JSON.parse(stored) || []; } catch(e) { return []; }
  }

  function saveAutomations(automations) {
    GM_setValue(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(automations));
  }

  function getAutomationLogs() {
    const stored = GM_getValue(STORAGE_KEYS.AUTO_LOGS, '[]');
    try { return JSON.parse(stored) || []; } catch(e) { return []; }
  }

  function saveAutomationLogs(logs) {
    GM_setValue(STORAGE_KEYS.AUTO_LOGS, JSON.stringify(logs.slice(-500)));
  }

  function addAutomationLog(entry) {
    const logs = getAutomationLogs();
    logs.push({ id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), at: new Date().toISOString(), ...entry });
    saveAutomationLogs(logs);
  }

  function makeAutomationId() {
    return 'auto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function todayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function weekStamp() {
    const now = new Date();
    const first = new Date(now.getFullYear(), 0, 1);
    const dayCount = Math.floor((now - first) / 86400000);
    return `${now.getFullYear()}-W${Math.ceil((dayCount + first.getDay() + 1) / 7)}`;
  }

  function frequencyStamp(frequency) {
    if (frequency === 'daily') return todayStamp();
    if (frequency === 'weekly') return weekStamp();
    return 'once';
  }

  function alreadyLogged(logs, automationId, dedupeKey) {
    return logs.some(log => log.automationId === automationId && log.dedupeKey === dedupeKey && (log.status === 'sent' || log.status === 'draft'));
  }

  function courseDisplayName(courseId) {
    const course = (cachedCourses || []).find(c => String(c.id) === String(courseId));
    return course?.name || `Course ${courseId}`;
  }

  function getTemplateForAutomation(type) {
    const templates = getTemplates();
    const map = { late: 'auto_late', upcoming: 'auto_upcoming', midpoint: 'auto_midpoint', low_grade: 'auto_low_grade' };
    return templates[map[type]] || DEFAULT_TEMPLATES[map[type]];
  }

  function buildAutomationGeneratedMessage(student, vars, template, courseId, extra = {}) {
    return { kind: 'message', ...buildGeneratedMessage(student, vars, template, courseId), ...extra };
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
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysForward: String(daysForward), assignmentList, assignmentListHtml: formatAssignmentListHtml(upcoming, 'No upcoming assignments in this date range.') };
        messages.push(buildGeneratedMessage(student, vars, template, courseId));
      }
    } else if (emailType === 'missing') {
      for (const student of students) {
        const missing = getMissingAssignments(await getSubmissions(courseId, student.id), daysBack);
        if (!missing.length) continue;
        const missingAssignments = missing.map(s => s.assignment || s);
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysBack: String(daysBack), missingAssignmentList: formatAssignmentList(missingAssignments), missingAssignmentListHtml: formatAssignmentListHtml(missingAssignments, 'No missing assignments found.') };
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
        const missingAssignments = missing.map(s => s.assignment || s);
        const missingSection = missing.length > 0 ? `Missing Assignments (past ${daysBack} days):\n${formatAssignmentList(missingAssignments)}` : 'You have no missing assignments. Great work!';
        const upcomingSection = upcoming.length > 0 ? `Upcoming Assignments (next ${daysForward} days):\n${formatAssignmentList(upcoming)}` : 'No upcoming assignments in the next ' + daysForward + ' days.';
        const missingSectionHtml = missing.length > 0 ? formatAssignmentListHtml(missingAssignments) : '<p style="margin:0;color:#047857;font-size:14px;line-height:1.5;">You have no missing assignments. Great work.</p>';
        const upcomingSectionHtml = upcoming.length > 0 ? formatAssignmentListHtml(upcoming) : `<p style="margin:0;color:#4b5563;font-size:14px;line-height:1.5;">No upcoming assignments in the next ${daysForward} days.</p>`;
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, currentGrade: grade, currentScore: String(score), daysForward: String(daysForward), daysBack: String(daysBack), missingSection, upcomingSection, missingSectionHtml, upcomingSectionHtml };
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
          assignmentListHtml: formatAssignmentListHtml(upcoming),
          missingAssignmentList: '',
          missingAssignmentListHtml: '',
          currentGrade: '',
          currentScore: '',
          missingSection: '',
          missingSectionHtml: '',
          upcomingSection: upcoming.length ? `Upcoming Assignments (next ${daysForward} days):\n${assignmentList}` : '',
          upcomingSectionHtml: upcoming.length ? formatAssignmentListHtml(upcoming) : '',
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
     AUTOMATED MESSAGES
  ========================================================= */
  async function sendOrDraftAutomationMessage(automation, message, logs) {
    if ((automation.mode || 'auto') === 'draft') {
      logs.push({ automationId: automation.id, status: 'draft', dedupeKey: message.dedupeKey });
      addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'draft', dedupeKey: message.dedupeKey, recipientName: message.studentName || 'Students', subject: message.subject, note: 'Matched condition; draft mode did not send.' });
      return 'draft';
    }
    if (message.kind === 'announcement') {
      await postAnnouncement(automation.courseId, message.subject, message.body);
    } else {
      await sendCanvasMessage(automation.courseId, message.studentId, message.subject, message.inboxBody || message.body);
    }
    logs.push({ automationId: automation.id, status: 'sent', dedupeKey: message.dedupeKey });
    addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'sent', dedupeKey: message.dedupeKey, recipientName: message.studentName || 'Students', subject: message.subject });
    return 'sent';
  }

  async function buildLateAutomationMessages(automation, teacherName) {
    const students = await getStudents(automation.courseId);
    const template = getTemplateForAutomation('late');
    const maxAge = Number(automation.daysBack) || 14;
    const courseName = automation.courseName || courseDisplayName(automation.courseId);
    const messages = [];
    for (const student of students) {
      const missing = getMissingAssignments(await getSubmissions(automation.courseId, student.id), maxAge);
      if (!missing.length) continue;
      const missingAssignments = missing.map(s => s.assignment || s);
      const vars = {
        studentName: student.name || student.sortable_name || 'Student',
        teacherName,
        courseName,
        daysBack: String(maxAge),
        missingAssignmentList: formatAssignmentList(missingAssignments),
        missingAssignmentListHtml: formatAssignmentListHtml(missingAssignments, 'No missing assignments found.'),
      };
      const assignmentIds = missing.map(s => s.assignment_id || s.assignment?.id || s.id).sort().join(',');
      messages.push(buildAutomationGeneratedMessage(student, vars, template, automation.courseId, { dedupeKey: `${automation.id}:late:${student.id}:${assignmentIds}:${frequencyStamp(automation.frequency)}` }));
    }
    return messages;
  }

  async function buildUpcomingAutomationMessages(automation, teacherName) {
    const upcoming = getUpcomingAssignments(await getAssignments(automation.courseId), Number(automation.daysForward) || 7);
    if (!upcoming.length) return [];
    const template = getTemplateForAutomation('upcoming');
    const courseName = automation.courseName || courseDisplayName(automation.courseId);
    const daysForward = Number(automation.daysForward) || 7;
    const assignmentIds = upcoming.map(a => a.id).sort().join(',');
    const baseVars = {
      teacherName,
      courseName,
      daysForward: String(daysForward),
      assignmentList: formatAssignmentList(upcoming),
      assignmentListHtml: formatAssignmentListHtml(upcoming, 'No upcoming assignments in this date range.'),
    };
    if ((automation.audience || 'announcement') === 'announcement') {
      const vars = { ...baseVars, studentName: 'Students' };
      return [{
        kind: 'announcement',
        studentName: 'Students',
        subject: renderTemplate(template.subject, vars),
        body: renderTemplate(template.body, vars),
        inboxBody: template.inboxBody ? renderTemplate(template.inboxBody, vars) : '',
        dedupeKey: `${automation.id}:upcoming:announcement:${assignmentIds}:${frequencyStamp(automation.frequency)}`,
      }];
    }
    return (await getStudents(automation.courseId)).map(student => {
      const vars = { ...baseVars, studentName: student.name || student.sortable_name || 'Student' };
      return buildAutomationGeneratedMessage(student, vars, template, automation.courseId, { dedupeKey: `${automation.id}:upcoming:${student.id}:${assignmentIds}:${frequencyStamp(automation.frequency)}` });
    });
  }

  async function buildMidpointAutomationMessages(automation, teacherName) {
    const start = automation.startDate ? new Date(automation.startDate + 'T00:00:00') : null;
    const end = automation.endDate ? new Date(automation.endDate + 'T23:59:59') : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (new Date() < new Date((start.getTime() + end.getTime()) / 2)) return [];
    const messages = await generateMessages(automation.courseId, automation.courseName || courseDisplayName(automation.courseId), 'evaluation', Number(automation.daysForward) || 7, Number(automation.daysBack) || 14, teacherName);
    return messages.map(msg => ({ kind: 'message', ...msg, dedupeKey: `${automation.id}:midpoint:${msg.studentId}:once` }));
  }

  async function buildLowGradeAutomationMessages(automation, teacherName) {
    const template = getTemplateForAutomation('low_grade');
    const threshold = Number(automation.threshold) || 70;
    const courseName = automation.courseName || courseDisplayName(automation.courseId);
    const messages = [];
    if ((automation.gradeScope || 'overall') === 'overall') {
      const enrollments = await getEnrollments(automation.courseId);
      for (const student of await getStudents(automation.courseId)) {
        const enrollment = enrollments.find(e => e.user_id === student.id && e.grades);
        const score = Number(enrollment?.grades?.current_score);
        if (!Number.isFinite(score) || score >= threshold) continue;
        const detail = `Current course score: ${score}%\nAlert threshold: ${threshold}%`;
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          currentGrade: enrollment?.grades?.current_grade || 'N/A',
          currentScore: String(score),
          gradeAlertDetail: detail,
          gradeAlertDetailHtml: `<p style="margin:0;color:#111827;font-size:14px;line-height:1.6;">${escapeHtml(detail).replace(/\n/g, '<br>')}</p>`,
        };
        messages.push(buildAutomationGeneratedMessage(student, vars, template, automation.courseId, { dedupeKey: `${automation.id}:low-overall:${student.id}:below-${threshold}:once` }));
      }
      return messages;
    }
    for (const student of await getStudents(automation.courseId)) {
      const lowSubs = (await getSubmissions(automation.courseId, student.id)).filter(s => {
        const score = Number(s.score);
        const points = Number(s.assignment?.points_possible);
        return Number.isFinite(score) && Number.isFinite(points) && points > 0 && (score / points) * 100 < threshold;
      });
      for (const sub of lowSubs) {
        const pct = Math.round((Number(sub.score) / Number(sub.assignment.points_possible)) * 1000) / 10;
        const detail = `${sub.assignment?.name || 'Assignment'} score: ${pct}%\nAlert threshold: ${threshold}%`;
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          currentGrade: '',
          currentScore: String(pct),
          gradeAlertDetail: detail,
          gradeAlertDetailHtml: `<p style="margin:0;color:#111827;font-size:14px;line-height:1.6;">${escapeHtml(detail).replace(/\n/g, '<br>')}</p>`,
        };
        messages.push(buildAutomationGeneratedMessage(student, vars, template, automation.courseId, { dedupeKey: `${automation.id}:low-assignment:${student.id}:${sub.assignment_id}:below-${threshold}:once` }));
      }
    }
    return messages;
  }

  async function buildAutomationMessages(automation, teacherName) {
    if (automation.type === 'late') return buildLateAutomationMessages(automation, teacherName);
    if (automation.type === 'upcoming') return buildUpcomingAutomationMessages(automation, teacherName);
    if (automation.type === 'midpoint') return buildMidpointAutomationMessages(automation, teacherName);
    if (automation.type === 'low_grade') return buildLowGradeAutomationMessages(automation, teacherName);
    return [];
  }

  async function runAutomations(onlyAutomationId) {
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '') || 'Teacher';
    if (!cachedCourses) cachedCourses = await getCourses();
    const automations = getAutomations().filter(a => a.active !== false && (!onlyAutomationId || a.id === onlyAutomationId));
    const sentKeys = getAutomationLogs().filter(l => l.status === 'sent' || l.status === 'draft');
    let matched = 0, sent = 0, drafted = 0, skipped = 0, failed = 0;
    for (const automation of automations) {
      try {
        const messages = await buildAutomationMessages(automation, teacherName);
        matched += messages.length;
        for (const message of messages) {
          if (alreadyLogged(sentKeys, automation.id, message.dedupeKey)) { skipped++; continue; }
          try {
            const result = await sendOrDraftAutomationMessage(automation, message, sentKeys);
            if (result === 'sent') sent++; else drafted++;
          } catch(err) {
            failed++;
            addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'failed', dedupeKey: message.dedupeKey, recipientName: message.studentName || 'Students', subject: message.subject, note: err.message });
          }
        }
      } catch(err) {
        failed++;
        addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'failed', note: err.message });
      }
    }
    return { checked: automations.length, matched, sent, drafted, skipped, failed };
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
  let automationCheckInFlight = false;
  const AUTO_MENU_CHECK_INTERVAL_MS = 15 * 60 * 1000;

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
      GM_setValue(STORAGE_KEYS.CANVAS_BASE, CANVAS_BASE);
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
          <button class="ces-tab" data-tab="automations">Automated Messages</button>
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
      else if (tabName === 'automations') renderAutomationsTab(body);
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
        select.innerHTML = '<option value="">No dashboard courses found</option>';
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
    const preview = generatedMessages[0];
    const previewBody = preview.studentName ? preview.body.replaceAll(preview.studentName, '{{studentName}}') : preview.body;
    const previewSubject = preview.studentName ? preview.subject.replaceAll(preview.studentName, '{{studentName}}') : preview.subject;
    const uniqueSubjects = new Set(generatedMessages.map(msg => msg.subject)).size;
    let html = `
      <div class="ces-flex-between ces-mb">
        <strong>${generatedMessages.length} student${generatedMessages.length === 1 ? '' : 's'} ready</strong>
        <button class="ces-btn ces-btn-primary" id="ces-send-all-btn">&#9993; Send All Selected Channels</button>
      </div>
      <div class="ces-review-preview">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Message Preview</div>
            <div class="ces-msg-subject" style="margin-top:4px;"><strong>Subject:</strong> ${escapeHtml(previewSubject)}</div>
          </div>
          ${uniqueSubjects > 1 ? '<div class="ces-status ces-status-info" style="margin:0;padding:5px 8px;">Some personalized subjects may vary by student.</div>' : ''}
        </div>
        <div class="ces-review-preview-body">${messagePreviewHtml(previewBody)}</div>
      </div>
      <div style="font-size:13px;font-weight:800;color:#111827;margin:12px 0 8px;">Recipients</div>
      <div class="ces-recipient-list">
    `;
    generatedMessages.forEach((msg, i) => {
      html += `
        <div class="ces-recipient-row" id="ces-msg-${i}">
          <div class="ces-recipient-name" title="${escapeAttr(msg.studentName)}">${escapeHtml(msg.studentName)}</div>
          <div class="ces-msg-actions">
            <button class="ces-btn ces-btn-primary ces-btn-sm ces-send-one" data-idx="${i}">&#9993; Send</button>
            <button class="ces-btn ces-btn-secondary ces-btn-sm ces-compose-one" data-idx="${i}">&#128221; Compose</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
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

  function courseSortTime(course) {
    const candidates = [course.start_at, course.created_at, course.updated_at, course.end_at];
    for (const value of candidates) {
      const time = value ? new Date(value).getTime() : NaN;
      if (Number.isFinite(time)) return time;
    }
    return Number(course.id) || 0;
  }

  function newestPublishedCourses() {
    return [...(cachedCourses || [])].sort((a, b) => courseSortTime(b) - courseSortTime(a));
  }

  function coursePickerLabel(course) {
    return course.name + (course.term ? ` (${course.term.name})` : '');
  }

  function renderCourseRows(courses, action) {
    if (!courses.length) return '<div class="ces-course-empty">No classes to show.</div>';
    return courses.map(course => `
      <button type="button" class="ces-course-row" data-course-id="${escapeAttr(String(course.id))}" data-action="${action}">
        <span>
          <span class="ces-course-row-title">${escapeHtml(course.name || `Course ${course.id}`)}</span>
          <span class="ces-course-row-meta">${escapeHtml((course.term?.name || 'Published course') + ` - ID ${course.id}`)}</span>
        </span>
        <span class="ces-course-row-action">${action === 'add' ? '+' : '-'}</span>
      </button>
    `).join('');
  }

  function renderAutomationCoursePicker(container, selectedIds) {
    const picker = container.querySelector('#ces-auto-course-picker');
    if (!picker) return;
    const selectedSet = new Set(selectedIds.map(String));
    const courses = newestPublishedCourses();
    const available = courses.filter(course => !selectedSet.has(String(course.id)));
    const selected = courses.filter(course => selectedSet.has(String(course.id)));
    picker.dataset.selectedIds = selected.map(course => course.id).join(',');
    picker.querySelector('#ces-course-available').innerHTML = renderCourseRows(available, 'add');
    picker.querySelector('#ces-course-selected').innerHTML = renderCourseRows(selected, 'remove');
    picker.querySelector('#ces-course-available-count').textContent = String(available.length);
    picker.querySelector('#ces-course-selected-count').textContent = String(selected.length);
  }

  function getAutomationSelectedCourses(container) {
    const selectedIds = (container.querySelector('#ces-auto-course-picker')?.dataset.selectedIds || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const coursesById = new Map((cachedCourses || []).map(course => [String(course.id), course]));
    return selectedIds.map(id => {
      const course = coursesById.get(String(id));
      return { id: String(id), name: course ? coursePickerLabel(course) : `Course ${id}` };
    });
  }

  /* =========================================================
     TAB: AUTOMATED MESSAGES
  ========================================================= */
  function renderAutomationsTab(container) {
    const automations = getAutomations();
    const logs = getAutomationLogs().slice(-12).reverse();
    const courseId = getSelectedCourseId();

    container.innerHTML = `
      <div id="ces-status-area"></div>
      <div class="ces-card">
        <div class="ces-flex-between ces-mb">
          <div>
            <h3 style="margin:0;">Create Automation</h3>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">Choose one or more published classes, then choose the message, trigger, and frequency.</div>
          </div>
          <button class="ces-btn ces-btn-secondary" id="ces-run-all-autos">Test Check Now</button>
        </div>
        <div class="ces-status ces-status-info">Automations run in the background about once per hour when a Canvas API token is saved in Settings, and also check once when the Messages button loads in Canvas. Test Check Now is only for testing or sending immediately.</div>
        ${!cachedCourses?.length ? '<div class="ces-status ces-status-error">No Canvas courses are loaded yet. Close and reopen Messages from a Canvas course, then try again.</div>' : ''}

        <label class="ces-label">Dashboard Classes</label>
        <div class="ces-course-picker" id="ces-auto-course-picker" data-selected-ids="">
          <div class="ces-course-box">
            <div class="ces-course-box-head"><span>Available Dashboard Classes</span><span id="ces-course-available-count">0</span></div>
            <div class="ces-course-list" id="ces-course-available"></div>
          </div>
          <div class="ces-course-transfer">
            <button type="button" class="ces-btn ces-btn-secondary ces-btn-sm" id="ces-add-all-courses">Add All</button>
            <button type="button" class="ces-btn ces-btn-secondary ces-btn-sm" id="ces-clear-courses">Clear</button>
          </div>
          <div class="ces-course-box">
            <div class="ces-course-box-head"><span>Selected Classes</span><span id="ces-course-selected-count">0</span></div>
            <div class="ces-course-list" id="ces-course-selected"></div>
          </div>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Only published courses visible on your Canvas Dashboard are shown, newest first. Click a class to move it between lists. Saving creates one automation tile per selected class.</div>

        <div class="ces-grid-2">
          <div>
            <label class="ces-label">Message</label>
            <select class="ces-select" id="ces-auto-type">
              <option value="late">Late work reminder</option>
              <option value="upcoming">Upcoming work</option>
              <option value="midpoint">Midpoint evaluation</option>
              <option value="low_grade">Low grade warning</option>
            </select>
          </div>
          <div>
            <label class="ces-label">Frequency</label>
            <select class="ces-select" id="ces-auto-frequency">
              <option value="daily">Daily while true</option>
              <option value="weekly">Weekly while true</option>
              <option value="once">Once per matching condition</option>
            </select>
          </div>
        </div>
        <div id="ces-auto-fields"></div>
        <div class="ces-grid-2">
          <div>
            <label class="ces-label">Send Mode</label>
            <select class="ces-select" id="ces-auto-mode">
              <option value="auto">Send automatically</option>
              <option value="draft">Draft/log only</option>
            </select>
          </div>
          <div>
            <label class="ces-label">Automation Name</label>
            <input class="ces-input" id="ces-auto-name" placeholder="Example: Daily late work nudge">
          </div>
        </div>
        <div class="ces-mt"><button class="ces-btn ces-btn-primary" id="ces-save-auto">Save Automation</button></div>
        <input type="hidden" id="ces-auto-edit-id" value="">
      </div>

      <h3 style="margin:18px 0 10px;">Saved Automations</h3>
      <div id="ces-auto-list"></div>

      <h3 style="margin:18px 0 10px;">Recent Message Log</h3>
      <div id="ces-auto-log">
        ${logs.length ? logs.map(log => `
          <div class="ces-msg-row">
            <div class="ces-msg-header">
              <span class="ces-msg-name">${escapeHtml(log.status || 'log')} - ${escapeHtml(log.automationName || 'Automation')}</span>
              <span style="font-size:12px;color:#6b7280;">${escapeHtml(new Date(log.at).toLocaleString())}</span>
            </div>
            <div class="ces-msg-subject">${escapeHtml(log.courseName || '')} ${log.recipientName ? '- ' + escapeHtml(log.recipientName) : ''}</div>
            <div class="ces-msg-body">${escapeHtml(log.subject || log.note || '')}</div>
          </div>
        `).join('') : '<div class="ces-status ces-status-info">No automation messages logged yet.</div>'}
      </div>
    `;

    renderAutomationFields(container);
    renderAutomationCoursePicker(container, courseId ? [courseId] : []);
    renderAutomationTiles(container.querySelector('#ces-auto-list'), automations);

    container.querySelector('#ces-auto-type').addEventListener('change', () => renderAutomationFields(container));
    container.querySelector('#ces-auto-course-picker').addEventListener('click', event => {
      const row = event.target.closest('.ces-course-row');
      if (!row) return;
      const picker = container.querySelector('#ces-auto-course-picker');
      const selected = new Set((picker.dataset.selectedIds || '').split(',').filter(Boolean));
      if (row.dataset.action === 'add') selected.add(row.dataset.courseId);
      else selected.delete(row.dataset.courseId);
      renderAutomationCoursePicker(container, [...selected]);
    });
    container.querySelector('#ces-add-all-courses').addEventListener('click', () => {
      renderAutomationCoursePicker(container, newestPublishedCourses().map(course => String(course.id)));
    });
    container.querySelector('#ces-clear-courses').addEventListener('click', () => {
      renderAutomationCoursePicker(container, []);
    });
    container.querySelector('#ces-run-all-autos').addEventListener('click', async () => {
      const btn = container.querySelector('#ces-run-all-autos');
      btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span> Checking...';
      try {
        const result = await runAutomations();
        renderAutomationsTab(container);
        setTimeout(() => showStatus(`Checked ${result.checked} automation(s). Matched ${result.matched}, sent ${result.sent}, drafted ${result.drafted}, skipped ${result.skipped}${result.failed ? `, failed ${result.failed}` : ''}.`, result.failed ? 'error' : 'success'), 0);
      } catch(err) {
        showStatus(err.message, 'error');
      }
      btn.disabled = false; btn.textContent = 'Test Check Now';
    });

    container.querySelector('#ces-save-auto').addEventListener('click', () => {
      const selectedCourses = getAutomationSelectedCourses(container);
      const type = container.querySelector('#ces-auto-type').value;
      if (!selectedCourses.length) { showStatus('Select at least one class first.', 'error'); return; }
      const editId = container.querySelector('#ces-auto-edit-id').value;
      const existingAuto = editId ? getAutomations().find(auto => auto.id === editId) : null;
      const sharedName = container.querySelector('#ces-auto-name').value.trim();
      const buildAutomation = (selectedCourse, index) => ({
        id: editId && selectedCourses.length === 1 ? editId : makeAutomationId(),
        active: existingAuto ? existingAuto.active !== false : true,
        canvasBase: CANVAS_BASE,
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        type,
        name: sharedName || defaultAutomationName(type, selectedCourse.name),
        frequency: container.querySelector('#ces-auto-frequency').value,
        mode: container.querySelector('#ces-auto-mode').value,
        daysBack: Number(container.querySelector('#ces-auto-days-back')?.value || 14),
        daysForward: Number(container.querySelector('#ces-auto-days-forward')?.value || 7),
        threshold: Number(container.querySelector('#ces-auto-threshold')?.value || 70),
        gradeScope: container.querySelector('#ces-auto-grade-scope')?.value || 'overall',
        audience: container.querySelector('#ces-auto-audience')?.value || 'announcement',
        startDate: container.querySelector('#ces-auto-start')?.value || '',
        endDate: container.querySelector('#ces-auto-end')?.value || '',
        createdAt: index === 0 && existingAuto?.createdAt ? existingAuto.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const next = getAutomations().filter(auto => auto.id !== editId);
      next.push(...selectedCourses.map(buildAutomation));
      saveAutomations(next);
      renderAutomationsTab(container);
      setTimeout(() => showStatus(editId && selectedCourses.length === 1 ? 'Automation updated.' : `Saved ${selectedCourses.length} automation${selectedCourses.length === 1 ? '' : 's'}.`, 'success'), 0);
    });
  }

  function renderAutomationFields(container) {
    const type = container.querySelector('#ces-auto-type').value;
    const fields = container.querySelector('#ces-auto-fields');
    if (type === 'late') {
      fields.innerHTML = `<div class="ces-grid-2"><div><label class="ces-label">Past Due Age Window</label><input class="ces-input" type="number" id="ces-auto-days-back" value="14" min="1" max="365"><div style="font-size:12px;color:#6b7280;margin-top:4px;">Send while missing work is no more than this many days old.</div></div><div><label class="ces-label">Condition</label><input class="ces-input" value="Past due and unsubmitted" disabled></div></div>`;
    } else if (type === 'upcoming') {
      fields.innerHTML = `<div class="ces-grid-2"><div><label class="ces-label">Look Ahead Days</label><input class="ces-input" type="number" id="ces-auto-days-forward" value="7" min="1" max="90"></div><div><label class="ces-label">Send As</label><select class="ces-select" id="ces-auto-audience"><option value="announcement">Course announcement</option><option value="students">Message every student</option></select></div></div>`;
    } else if (type === 'midpoint') {
      fields.innerHTML = `<div class="ces-grid-2"><div><label class="ces-label">Class Start Date</label><input class="ces-input" type="date" id="ces-auto-start"></div><div><label class="ces-label">Class End Date</label><input class="ces-input" type="date" id="ces-auto-end"></div></div><div class="ces-grid-2"><div><label class="ces-label">Upcoming Days</label><input class="ces-input" type="number" id="ces-auto-days-forward" value="7" min="1" max="90"></div><div><label class="ces-label">Missing Work Days Back</label><input class="ces-input" type="number" id="ces-auto-days-back" value="14" min="1" max="365"></div></div>`;
    } else {
      fields.innerHTML = `<div class="ces-grid-2"><div><label class="ces-label">Grade Scope</label><select class="ces-select" id="ces-auto-grade-scope"><option value="overall">Overall course grade</option><option value="assignment">Individual assignment score</option></select></div><div><label class="ces-label">Warning Threshold</label><input class="ces-input" type="number" id="ces-auto-threshold" value="70" min="1" max="100"></div></div>`;
    }
  }

  function defaultAutomationName(type, courseName) {
    const names = { late: 'Late work reminder', upcoming: 'Upcoming work message', midpoint: 'Midpoint evaluation', low_grade: 'Low grade warning' };
    return `${names[type] || 'Automation'} - ${courseName}`;
  }

  function describeAutomation(auto) {
    if (auto.type === 'late') return `Late work until submitted or older than ${auto.daysBack || 14} days`;
    if (auto.type === 'upcoming') return `Looks ${auto.daysForward || 7} days ahead; sends as ${auto.audience === 'students' ? 'student messages' : 'announcement'}`;
    if (auto.type === 'midpoint') return `Sends once after midpoint between ${auto.startDate || '?'} and ${auto.endDate || '?'}`;
    if (auto.type === 'low_grade') return `${auto.gradeScope === 'assignment' ? 'Assignment' : 'Overall'} grade below ${auto.threshold || 70}%`;
    return '';
  }

  function renderAutomationTiles(container, automations) {
    if (!automations.length) {
      container.innerHTML = '<div class="ces-status ces-status-info">No automations yet. Create one above.</div>';
      return;
    }
    container.innerHTML = automations.map(auto => `
      <div class="ces-card">
        <div class="ces-flex-between">
          <div>
            <strong>${escapeHtml(auto.name)}</strong>
            <div style="font-size:12px;color:#6b7280;margin-top:3px;">${escapeHtml(auto.courseName || auto.courseId)}</div>
            <div style="font-size:13px;color:#374151;margin-top:8px;">${escapeHtml(describeAutomation(auto))}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px;">${auto.active === false ? 'Paused' : 'Active'} - ${auto.mode === 'draft' ? 'Draft/log only' : 'Auto-send'} - ${escapeHtml(auto.frequency || 'once')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="ces-btn ces-btn-secondary ces-btn-sm ces-run-auto" data-id="${escapeAttr(auto.id)}">Run</button>
            <button class="ces-btn ces-btn-secondary ces-btn-sm ces-edit-auto" data-id="${escapeAttr(auto.id)}">Edit</button>
            <button class="ces-btn ces-btn-secondary ces-btn-sm ces-toggle-auto" data-id="${escapeAttr(auto.id)}">${auto.active === false ? 'Resume' : 'Pause'}</button>
            <button class="ces-btn ces-btn-danger ces-btn-sm ces-delete-auto" data-id="${escapeAttr(auto.id)}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.ces-run-auto').forEach(btn => btn.addEventListener('click', async () => {
      btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span>';
      try {
        const result = await runAutomations(btn.dataset.id);
        renderAutomationsTab(document.getElementById('ces-body'));
        setTimeout(() => showStatus(`Checked 1 automation. Matched ${result.matched}, sent ${result.sent}, drafted ${result.drafted}, skipped ${result.skipped}${result.failed ? `, failed ${result.failed}` : ''}.`, result.failed ? 'error' : 'success'), 0);
      } catch(err) { showStatus(err.message, 'error'); }
    }));
    container.querySelectorAll('.ces-edit-auto').forEach(btn => btn.addEventListener('click', () => {
      const auto = getAutomations().find(item => item.id === btn.dataset.id);
      if (!auto) return;
      const body = document.getElementById('ces-body');
      body.querySelector('#ces-auto-edit-id').value = auto.id;
      body.querySelector('#ces-auto-type').value = auto.type;
      body.querySelector('#ces-auto-frequency').value = auto.frequency || 'daily';
      body.querySelector('#ces-auto-mode').value = auto.mode || 'auto';
      body.querySelector('#ces-auto-name').value = auto.name || '';
      renderAutomationCoursePicker(body, [String(auto.courseId)]);
      renderAutomationFields(body);
      if (body.querySelector('#ces-auto-days-back')) body.querySelector('#ces-auto-days-back').value = auto.daysBack || 14;
      if (body.querySelector('#ces-auto-days-forward')) body.querySelector('#ces-auto-days-forward').value = auto.daysForward || 7;
      if (body.querySelector('#ces-auto-threshold')) body.querySelector('#ces-auto-threshold').value = auto.threshold || 70;
      if (body.querySelector('#ces-auto-grade-scope')) body.querySelector('#ces-auto-grade-scope').value = auto.gradeScope || 'overall';
      if (body.querySelector('#ces-auto-audience')) body.querySelector('#ces-auto-audience').value = auto.audience || 'announcement';
      if (body.querySelector('#ces-auto-start')) body.querySelector('#ces-auto-start').value = auto.startDate || '';
      if (body.querySelector('#ces-auto-end')) body.querySelector('#ces-auto-end').value = auto.endDate || '';
      body.querySelector('#ces-save-auto').textContent = 'Update Automation';
      body.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    container.querySelectorAll('.ces-toggle-auto').forEach(btn => btn.addEventListener('click', () => {
      saveAutomations(getAutomations().map(auto => auto.id === btn.dataset.id ? { ...auto, active: auto.active === false } : auto));
      renderAutomationsTab(document.getElementById('ces-body'));
    }));
    container.querySelectorAll('.ces-delete-auto').forEach(btn => btn.addEventListener('click', () => {
      if (!confirm('Delete this automation?')) return;
      saveAutomations(getAutomations().filter(auto => auto.id !== btn.dataset.id));
      renderAutomationsTab(document.getElementById('ces-body'));
    }));
  }

  async function checkAutomationsOnOpen(options = {}) {
    if (!getAutomations().some(auto => auto.active !== false)) return;
    if (automationCheckInFlight) return;
    const force = !!options.force;
    const silent = !!options.silent;
    const lastCheck = Number(GM_getValue(STORAGE_KEYS.LAST_AUTO_CHECK, 0) || 0);
    if (!force && Date.now() - lastCheck < AUTO_MENU_CHECK_INTERVAL_MS) return;
    automationCheckInFlight = true;
    GM_setValue(STORAGE_KEYS.CANVAS_BASE, CANVAS_BASE);
    try {
      const result = await runAutomations();
      GM_setValue(STORAGE_KEYS.LAST_AUTO_CHECK, String(Date.now()));
      if (!silent && (result.sent || result.drafted || result.failed)) {
        showStatus(`Automations checked: sent ${result.sent}, drafted ${result.drafted}${result.failed ? `, failed ${result.failed}` : ''}.`, result.failed ? 'error' : 'success');
      }
    } catch(err) {
      GM_setValue(STORAGE_KEYS.LAST_AUTO_CHECK, String(Date.now()));
      if (!silent) showStatus('Automation check skipped: ' + err.message, 'error');
    } finally {
      automationCheckInFlight = false;
    }
  }

  function isSameLocalDay(timestamp) {
    const value = Number(timestamp || 0);
    if (!value) return false;
    return new Date(value).toDateString() === new Date().toDateString();
  }

  function setAutomationToolbarState(button) {
    if (!button) return;
    const lastCheck = GM_getValue(STORAGE_KEYS.LAST_AUTO_CHECK, 0);
    if (isSameLocalDay(lastCheck)) {
      button.classList.add('ces-launcher-done');
      button.disabled = true;
      button.title = 'Automated messages have already been checked today';
      button.innerHTML = '<span class="ces-nav-icon">&#10003;</span><span>Messages Sent</span>';
      return;
    }
    button.classList.remove('ces-launcher-done');
    button.disabled = false;
    button.title = 'Run automated message check now';
    button.innerHTML = '<span class="ces-nav-icon">&#9658;</span><span>Send Messages</span>';
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
          ...templateBody(`# {{courseName}} Update

Hi {{studentName}},

Write your message here.

---

Thank you,
{{teacherName}}`),
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
          saveTemplates(defaults); GM_setValue(STORAGE_KEYS.TEMPLATE_VERSION, TEMPLATE_VERSION_VALUE); Object.assign(templates, defaults); renderList();
        }
      });
    }

    function renderEditor(type) {
      const tpl = templates[type];
      const editableBody = tpl.bodyText || htmlToTeacherText(tpl.body);
      const editorHtml = tpl.bodyMode === 'html' ? sanitizeCanvasEmailHtml(tpl.body || '') : teacherTextToCanvasHtml(editableBody);
      container.innerHTML = `
        <div class="ces-flex-between ces-mb"><h3 style="margin:0;">Editing: ${escapeHtml(tpl.name)}</h3><button class="ces-btn ces-btn-secondary" id="ces-tpl-cancel">Cancel</button></div>
        <label class="ces-label">Message Name</label>
        <input type="text" class="ces-input" id="ces-tpl-name" value="${escapeAttr(tpl.name)}">
        <label class="ces-label">Short Description</label>
        <input type="text" class="ces-input" id="ces-tpl-desc" value="${escapeAttr(tpl.description || '')}">
        <label class="ces-label">Subject Line</label>
        <input type="text" class="ces-input" id="ces-tpl-subject" value="${escapeAttr(tpl.subject)}">
        <div class="ces-editor-subject-preview"><strong>Subject:</strong> <span id="ces-subject-preview">${escapeHtml(tpl.subject)}</span></div>
        <label class="ces-label">Message Body</label>
        <div class="ces-editor-shell">
          <div id="ces-format-toolbar" class="ces-editor-toolbar">
            <select class="ces-select" id="ces-editor-font" title="Font">
              <option value="">Font</option>
              <option value="Arial,Helvetica,sans-serif">Arial</option>
              <option value="Georgia,serif">Georgia</option>
              <option value="'Trebuchet MS',Arial,sans-serif">Trebuchet</option>
              <option value="Verdana,Arial,sans-serif">Verdana</option>
            </select>
            <select class="ces-select" id="ces-editor-size" title="Text size">
              <option value="">Size</option>
              <option value="13px">Small</option>
              <option value="15px">Normal</option>
              <option value="18px">Large</option>
              <option value="22px">Heading</option>
            </select>
            <input class="ces-input" id="ces-editor-color" type="color" value="#111827" title="Text color">
            <button type="button" class="ces-editor-btn" data-command="bold" title="Bold">B</button>
            <button type="button" class="ces-editor-btn" data-command="italic" title="Italic"><em>I</em></button>
            <button type="button" class="ces-editor-btn" data-command="underline" title="Underline"><u>U</u></button>
            <button type="button" class="ces-editor-btn" data-command="insertUnorderedList" title="Bulleted list">&bull; List</button>
            <button type="button" class="ces-editor-btn" data-block="heading" title="Insert heading">Heading</button>
            <button type="button" class="ces-editor-btn" data-block="callout" title="Insert callout">Callout</button>
            <button type="button" class="ces-editor-btn" data-block="divider" title="Insert line">Line</button>
            <button type="button" class="ces-editor-btn" data-block="signature" title="Insert signature">Signature</button>
          </div>
          <div id="ces-tpl-body" class="ces-email-editor" contenteditable="true">${editorHtml}</div>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:6px;">This is the message preview and editor. Saved formatting uses Canvas-safe email HTML.</div>
        <div style="font-size:12px;color:#6b7280;margin-top:8px;"><strong>Placeholders:</strong> {{studentName}} {{teacherName}} {{courseName}} {{assignmentList}} {{assignmentListHtml}} {{missingAssignmentList}} {{missingAssignmentListHtml}} {{currentGrade}} {{currentScore}} {{daysForward}} {{daysBack}} {{missingSection}} {{missingSectionHtml}} {{upcomingSection}} {{upcomingSectionHtml}} {{canvasAppUrl}}</div>
        <div class="ces-mt" style="display:flex;gap:8px;">
          <button class="ces-btn ces-btn-primary" id="ces-tpl-save">Save Template</button>
        </div>
      `;
      container.querySelector('#ces-tpl-cancel').addEventListener('click', renderList);
      const editor = container.querySelector('#ces-tpl-body');
      const subjectInput = container.querySelector('#ces-tpl-subject');
      const subjectPreview = container.querySelector('#ces-subject-preview');
      let savedEditorRange = null;
      const rememberEditorSelection = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const node = selection.anchorNode;
        if (node && editor.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) {
          savedEditorRange = selection.getRangeAt(0).cloneRange();
        }
      };
      const restoreEditorSelection = () => {
        editor.focus();
        if (!savedEditorRange) return;
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedEditorRange);
      };
      ['keyup', 'mouseup', 'input', 'blur'].forEach(eventName => editor.addEventListener(eventName, rememberEditorSelection));
      container.querySelector('#ces-format-toolbar').addEventListener('mousedown', e => {
        if (e.target.closest('button')) e.preventDefault();
      });
      subjectInput.addEventListener('input', () => {
        subjectPreview.textContent = subjectInput.value || '(no subject)';
      });
      container.querySelectorAll('#ces-format-toolbar [data-command]').forEach(btn => {
        btn.addEventListener('click', () => {
          restoreEditorSelection();
          runEditorCommand(editor, btn.dataset.command);
          rememberEditorSelection();
        });
      });
      container.querySelectorAll('#ces-format-toolbar [data-block]').forEach(btn => {
        btn.addEventListener('click', () => {
          restoreEditorSelection();
          insertEditorBlock(editor, btn.dataset.block);
          rememberEditorSelection();
        });
      });
      container.querySelector('#ces-editor-font').addEventListener('change', e => {
        if (!e.target.value) return;
        restoreEditorSelection();
        applyEditorStyle(editor, { fontFamily: e.target.value });
        rememberEditorSelection();
        e.target.value = '';
      });
      container.querySelector('#ces-editor-size').addEventListener('change', e => {
        if (!e.target.value) return;
        restoreEditorSelection();
        applyEditorStyle(editor, { fontSize: e.target.value });
        rememberEditorSelection();
        e.target.value = '';
      });
      container.querySelector('#ces-editor-color').addEventListener('input', e => {
        restoreEditorSelection();
        applyEditorStyle(editor, { color: e.target.value });
        rememberEditorSelection();
      });
      container.querySelector('#ces-tpl-save').addEventListener('click', () => {
        const body = sanitizeCanvasEmailHtml(editor.innerHTML);
        templates[type].name = container.querySelector('#ces-tpl-name').value.trim() || 'Custom Message';
        templates[type].description = container.querySelector('#ces-tpl-desc').value.trim();
        templates[type].subject = subjectInput.value;
        templates[type].bodyMode = 'html';
        templates[type].body = body;
        templates[type].bodyText = htmlToTeacherText(body);
        saveTemplates(templates); renderList();
      });
    }

    function runEditorCommand(editor, command) {
      editor.focus();
      document.execCommand(command, false, null);
    }

    function applyEditorStyle(editor, styles) {
      editor.focus();
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      Object.assign(span.style, styles);
      if (range.collapsed) {
        span.appendChild(document.createTextNode('Text'));
        range.insertNode(span);
        range.selectNodeContents(span);
      } else {
        try {
          range.surroundContents(span);
        } catch (_err) {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        }
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function insertEditorBlock(editor, kind) {
      const blocks = {
        heading: '<div style="font-size:18px;font-weight:800;line-height:1.25;color:#111827;margin:18px 0 8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">Section Heading</div>',
        callout: '<div style="border-left:4px solid #0770B8;background:#f4f9fc;padding:11px 13px;margin:12px 0 16px;font-size:14px;line-height:1.55;color:#1f2937;">Important note goes here.</div>',
        divider: '<div style="height:1px;background:#d1d5db;margin:16px 0;"></div>',
        signature: '<p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2937;">Thank you,<br>{{teacherName}}</p>',
      };
      editor.focus();
      document.execCommand('insertHTML', false, blocks[kind] || '');
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
          <li>Manual sends use your Canvas login, or the Canvas API token above when provided.</li>
          <li>Background automations require the Canvas API token so checks can run when this panel is closed.</li>
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
      GM_setValue(STORAGE_KEYS.CANVAS_BASE, CANVAS_BASE);
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
    if (!isCanvasCourseToolbarPage()) return null;
    return document.querySelector('.ic-app-nav-toggle-and-crumbs')
      || document.querySelector('#breadcrumbs')?.parentElement
      || document.querySelector('[data-testid="breadcrumbs"]')?.parentElement;
  }

  function placeCanvasLauncher() {
    const group = document.getElementById('ces-launcher-group');
    if (!isCanvasCourseToolbarPage()) {
      if (group) group.remove();
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
    group.remove();
  }

  function openAiSideWindow(url) {
    const width = 560;
    const height = Math.max(720, Math.floor((window.screen?.availHeight || 820) * 0.92));
    const left = Math.max(0, (window.screen?.availWidth || 1200) - width - 12);
    const top = 20;
    window.open(url, 'ces_ai_chat', `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`);
  }

  function addCanvasLauncher() {
    if (!findCanvasLauncherHost()) return;
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

    const checkBtn = document.createElement('button');
    checkBtn.className = 'ces-launcher-btn ces-launcher-action';
    checkBtn.type = 'button';
    setAutomationToolbarState(checkBtn);
    checkBtn.addEventListener('click', async e => {
      e.stopPropagation();
      if (checkBtn.disabled || isSameLocalDay(GM_getValue(STORAGE_KEYS.LAST_AUTO_CHECK, 0))) {
        setAutomationToolbarState(checkBtn);
        return;
      }
      checkBtn.disabled = true;
      checkBtn.innerHTML = '<span class="ces-nav-icon">&#8635;</span><span>Checking...</span>';
      try {
        await checkAutomationsOnOpen({ force: true, silent: true });
        setAutomationToolbarState(checkBtn);
      } catch (_err) {
        checkBtn.innerHTML = '<span class="ces-nav-icon">&#9888;</span><span>Check Failed</span>';
        setTimeout(() => setAutomationToolbarState(checkBtn), 2200);
      }
    });
    group.appendChild(checkBtn);

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
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'AI Chat';
    aiSelect.appendChild(placeholder);
    aiOptions.forEach(([name, _label, url]) => {
      const opt = document.createElement('option');
      opt.value = url;
      opt.textContent = name;
      aiSelect.appendChild(opt);
    });
    aiSelect.addEventListener('change', () => {
      if (!aiSelect.value) return;
      openAiSideWindow(aiSelect.value);
      aiSelect.value = '';
    });
    group.appendChild(aiSelect);

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
