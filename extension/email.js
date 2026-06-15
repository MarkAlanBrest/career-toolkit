(async function () {
  'use strict';

  // Storage shim — pre-load keys used by the email system
  const EMAIL_KEYS = ['ces_templates', 'ces_teacher_name', 'ces_last_course', 'ces_compose_pending', 'ces_automations', 'ces_automation_logs'];
  const _store = await new Promise(resolve => chrome.storage.local.get(EMAIL_KEYS, resolve));
  function GM_getValue(key, def) { return _store[key] ?? def; }
  function GM_setValue(key, val) {
    _store[key] = val;
    chrome.storage.local.set({ [key]: val });
  }

  // Inject styles — matches the Canvas Enhancer hub panel design system
  const _style = document.createElement('style');
  _style.textContent = `
    #ces-overlay {
      position: fixed;
      top: 0; bottom: 0;
      right: 52px;
      width: 30vw; min-width: 460px; max-width: 580px;
      z-index: 2147483638;
      background: #fff;
      border-left: 1px solid #C7CDD1;
      box-shadow: -4px 0 16px rgba(0,0,0,.1);
      display: none; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Lato", "Segoe UI", sans-serif;
      color: #2D3B45;
    }
    #ces-overlay.ces-open { display: flex; }

    #ces-header {
      height: 44px; flex-shrink: 0;
      background: #fff;
      border-bottom: 1px solid #C7CDD1;
      display: flex; align-items: center; padding: 0 16px; gap: 8px;
    }
    #ces-header h2 {
      flex: 1; margin: 0;
      font-size: 14px; font-weight: 700; color: #2D3B45;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ces-close-btn {
      background: none; border: none; color: #6B7280;
      font-size: 20px; cursor: pointer; line-height: 1;
      padding: 0 2px; flex-shrink: 0;
      transition: color .12s;
    }
    .ces-close-btn:hover { color: #2D3B45; }

    #ces-tabs {
      display: flex;
      border-bottom: 1px solid #C7CDD1;
      flex-shrink: 0;
      background: #F5F5F5;
    }
    .ces-tab {
      padding: 8px 14px; cursor: pointer; border: none;
      background: none; font-size: 12px; font-weight: 600;
      color: #6B7280;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color .12s, border-color .12s;
      font-family: inherit;
    }
    .ces-tab:hover { color: #0770B8; }
    .ces-tab.active { color: #0770B8; border-bottom-color: #0770B8; }

    #ces-body { flex: 1; overflow-y: auto; padding: 16px; }

    .ces-label {
      display: block; font-size: 12px; font-weight: 600;
      color: #2D3B45; margin-bottom: 4px; margin-top: 12px;
    }
    .ces-select, .ces-input, .ces-textarea {
      width: 100%; padding: 7px 10px;
      border: 1px solid #C7CDD1; border-radius: 3px;
      font-size: 13px; color: #2D3B45;
      background: #fff; box-sizing: border-box;
      font-family: inherit;
    }
    .ces-select:focus, .ces-input:focus, .ces-textarea:focus {
      outline: none; border-color: #0770B8;
      box-shadow: 0 0 0 2px rgba(7,112,184,.12);
    }
    .ces-textarea { min-height: 110px; resize: vertical; font-family: inherit; }

    .ces-btn {
      padding: 7px 14px; border: 1px solid #C7CDD1; border-radius: 3px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      font-family: inherit;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background .12s;
    }
    .ces-btn-primary { background: #0770B8; border-color: #0770B8; color: #fff; }
    .ces-btn-primary:hover { background: #0860A8; }
    .ces-btn-primary:disabled { background: #C7CDD1; border-color: #C7CDD1; cursor: not-allowed; }
    .ces-btn-secondary { background: #F5F5F5; color: #2D3B45; }
    .ces-btn-secondary:hover { background: #E8F1F8; border-color: #0770B8; color: #0770B8; }
    .ces-btn-danger { background: #fff; border-color: #C7CDD1; color: #BC1212; }
    .ces-btn-danger:hover { background: #fef2f2; border-color: #BC1212; }
    .ces-btn-sm { padding: 4px 9px; font-size: 11px; }

    .ces-card {
      border: 1px solid #C7CDD1; border-radius: 3px;
      padding: 12px; margin-bottom: 8px; background: #fff;
      transition: border-color .12s;
    }
    .ces-card:hover { border-color: #0770B8; }
    .ces-card.selected { border-color: #0770B8; background: #E8F1F8; }

    .ces-msg-row {
      border: 1px solid #C7CDD1; border-radius: 3px;
      padding: 10px; margin-bottom: 6px; background: #fff;
    }
    .ces-msg-row .ces-msg-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
    }
    .ces-msg-row .ces-msg-name { font-weight: 700; font-size: 13px; color: #2D3B45; }
    .ces-msg-row .ces-msg-subject { font-size: 12px; color: #6B7280; margin-bottom: 5px; }
    .ces-msg-row .ces-msg-body {
      font-size: 12px; color: #2D3B45; white-space: pre-wrap;
      max-height: 80px; overflow-y: auto; background: #F5F5F5;
      padding: 6px 8px; border-radius: 3px;
    }
    .ces-msg-actions { display: flex; gap: 5px; flex-wrap: wrap; }

    .ces-status {
      padding: 7px 10px; border-radius: 3px; margin-bottom: 10px;
      font-size: 12px; font-weight: 600;
    }
    .ces-status-success { background: #ecfdf5; color: #127A1B; border: 1px solid #a7f3d0; }
    .ces-status-error   { background: #fef2f2; color: #BC1212; border: 1px solid #fecaca; }
    .ces-status-info    { background: #E8F1F8; color: #0770B8; border: 1px solid #b8d4f0; }

    .ces-progress {
      width: 100%; height: 4px; background: #C7CDD1;
      border-radius: 2px; overflow: hidden; margin: 6px 0;
    }
    .ces-progress-bar {
      height: 100%; background: #0770B8; transition: width .3s; border-radius: 2px;
    }

    .ces-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .ces-flex-between { display: flex; justify-content: space-between; align-items: center; }
    .ces-mt { margin-top: 14px; }
    .ces-mb { margin-bottom: 14px; }

    .ces-checkbox-row {
      display: flex; align-items: center; gap: 7px; margin-top: 8px;
      font-size: 13px; color: #2D3B45;
    }
    .ces-checkbox-row input[type="checkbox"] { width: 14px; height: 14px; accent-color: #0770B8; }

    .ces-spinner {
      display: inline-block; width: 13px; height: 13px;
      border: 2px solid currentColor; border-top-color: transparent;
      border-radius: 50%; animation: ces-spin .6s linear infinite;
    }
    .ces-editor-toolbar {
      display: flex; flex-wrap: wrap; gap: 5px;
      padding: 7px; border: 1px solid #C7CDD1; border-bottom: none;
      border-radius: 3px 3px 0 0; background: #F5F5F5;
      margin-top: 4px;
    }
    .ces-editor {
      min-height: 210px; max-height: 360px; overflow-y: auto;
      border: 1px solid #C7CDD1; border-radius: 0 0 3px 3px;
      padding: 10px; background: #fff; font-size: 13px; line-height: 1.5;
      outline: none;
    }
    .ces-editor:focus { border-color: #0770B8; box-shadow: 0 0 0 2px rgba(7,112,184,.12); }
    .ces-variable-row { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
    @keyframes ces-spin { to { transform: rotate(360deg); } }
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
    LAST_COURSE:  'ces_last_course',
    AUTOMATIONS:  'ces_automations',
    AUTO_LOGS:    'ces_automation_logs',
  };

  const DEFAULT_TEMPLATES = {
    upcoming: {
      name: 'Upcoming Assignments',
      subject: 'Upcoming Work for {{courseName}}',
      body: `Hi {{studentName}},\n\nHere is what is coming up in {{courseName}} over the next {{daysForward}} days:\n\n{{assignmentList}}\n\nThis is a good moment to look ahead, block out time, and make sure you understand what each assignment is asking you to do.\n\nPlease review the instructions in Canvas and plan enough time to complete each item before the deadline. If anything is unclear, reach out before the due date so there is time to help.\n\nBest,\n{{teacherName}}`,
      daysForward: 7,
    },
    missing: {
      name: 'Missing Work Reminder',
      subject: 'Missing Work in {{courseName}}',
      body: `Hi {{studentName}},\n\nI am reaching out because the following work still appears as missing in {{courseName}}:\n\n{{missingAssignmentList}}\n\nMissing work can add up quickly, but there is still value in taking the next step now. Please review the list above and submit what you can as soon as you are able.\n\nIf something is preventing you from completing the work, reply to this message so we can talk about a realistic plan. You do not need to wait until everything is perfect to get started.\n\nBest,\n{{teacherName}}`,
      daysBack: 7,
      condition: { type: 'missing_past_days', daysBack: 7 },
    },
    welcome: {
      name: 'Welcome to Class',
      subject: 'Welcome to {{courseName}}!',
      body: `Hi {{studentName}},\n\nWelcome to {{courseName}}. I am glad you are in the course and look forward to working with you this term.\n\nTo start strong, please take a few minutes to:\n- Review the syllabus and course schedule.\n- Check Canvas regularly for announcements, modules, and due dates.\n- Set aside consistent time each week for readings, assignments, and review.\n- Reach out early if you have questions, need help, or have approved accommodations.\n\nI hope this is a productive and engaging semester for you.\n\nWelcome,\n{{teacherName}}`,
    },
    evaluation: {
      name: 'Student Evaluation',
      subject: 'Progress Update for {{courseName}}',
      body: `Hi {{studentName}},\n\nI am sending a brief progress update for {{courseName}} so you have a clear picture of where things stand.\n\nCurrent Grade: {{currentGrade}} ({{currentScore}}%)\n\n{{missingSection}}\n\n{{upcomingSection}}\n\nIf your current standing is not where you want it to be, this is a good time to make a plan. Please review the items above and reach out if you would like to discuss next steps.\n\nBest regards,\n{{teacherName}}`,
      daysForward: 7,
      daysBack: 14,
    },
    auto_late: {
      name: 'Automation: Late Work',
      subject: 'Past Due Work in {{courseName}}',
      body: `Hi {{studentName}},\n\nThis is an automated reminder that the following work in {{courseName}} is currently past due:\n\n{{missingAssignmentList}}\n\nI know late work can feel difficult to restart, but taking action now can still help your progress in the course. Start with the most manageable item, then continue from there.\n\nPlease submit what you can as soon as possible. If you are stuck, unsure where to begin, or need to discuss your options, reply to this message or come to office hours. I would rather hear from you early than have you try to handle it alone.\n\nBest regards,\n{{teacherName}}`,
    },
    auto_upcoming: {
      name: 'Automation: Upcoming Work',
      subject: 'Upcoming Work in {{courseName}}',
      body: `Hi {{studentName}},\n\nHere is the work coming up in {{courseName}} over the next {{daysForward}} days:\n\n{{assignmentList}}\n\nUse this as a planning checklist for the week. If one of these items will take longer than expected, it is better to find that out now than close to the deadline.\n\nPlease check Canvas for full instructions, required materials, and submission details. Planning ahead now will help you avoid last-minute issues.\n\nBest regards,\n{{teacherName}}`,
    },
    auto_midpoint: {
      name: 'Automation: Midpoint Evaluation',
      subject: 'Midpoint Progress Check for {{courseName}}',
      body: `Hi {{studentName}},\n\nWe are at the midpoint of {{courseName}}, so I am sharing a progress check to help you assess where things stand and what to focus on next.\n\nCurrent Grade: {{currentGrade}} ({{currentScore}}%)\n\n{{missingSection}}\n\n{{upcomingSection}}\n\nThere is still time to make meaningful adjustments. If you are doing well, keep protecting the habits that are working. If you are behind, focus first on the items that will have the greatest impact and reach out if you want help prioritizing.\n\nThis is a useful point in the course to review your habits, catch up where possible, and ask for support before the final stretch.\n\nBest regards,\n{{teacherName}}`,
    },
    auto_low_grade: {
      name: 'Automation: Low Grade Warning',
      subject: 'Grade Check-In for {{courseName}}',
      body: `Hi {{studentName}},\n\nI am reaching out because your current performance in {{courseName}} has fallen below the alert threshold I set for the course.\n\n{{gradeAlertDetail}}\n\nThis message is meant to catch the issue early enough that you can respond. A lower score does not have to define the rest of the course, but it is important to take action soon.\n\nPlease review your recent feedback in Canvas and consider what needs attention first. If you would like help making a recovery plan, reply to this message or visit office hours.\n\nBest regards,\n{{teacherName}}`,
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
      try { return { ...JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)), ...JSON.parse(stored) }; } catch(e) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  }

  function saveTemplates(templates) {
    GM_setValue(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }

  function renderTemplate(template, vars) {
    let text = template;
    const htmlMode = /<\/?[a-z][\s\S]*>/i.test(text);
    for (const [key, val] of Object.entries(vars)) {
      let value = val || '';
      if (htmlMode) value = escapeHtml(String(value)).replace(/\n/g, '<br>');
      text = text.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), value);
    }
    return text;
  }

  const TEMPLATE_VARIABLES = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'teacherName', label: 'Teacher Name' },
    { key: 'courseName', label: 'Course Name' },
    { key: 'assignmentList', label: 'Upcoming List' },
    { key: 'missingAssignmentList', label: 'Missing List' },
    { key: 'currentGrade', label: 'Current Grade' },
    { key: 'currentScore', label: 'Current Score' },
    { key: 'daysForward', label: 'Days Forward' },
    { key: 'daysBack', label: 'Days Back' },
    { key: 'missingSection', label: 'Missing Section' },
    { key: 'upcomingSection', label: 'Upcoming Section' },
    { key: 'gradeAlertDetail', label: 'Grade Alert' },
  ];

  function makeTemplateId() {
    return 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function bodyToEditorHtml(body) {
    const text = String(body || '');
    if (/<\/?[a-z][\s\S]*>/i.test(text)) return text;
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function renderBodyForPreview(body) {
    const text = String(body || '');
    if (/<\/?[a-z][\s\S]*>/i.test(text)) return text;
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function bodyForCanvasHtml(body) {
    const text = String(body || '');
    if (/<\/?[a-z][\s\S]*>/i.test(text)) return text;
    return '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>';
  }

  function isDefaultTemplate(type) {
    return Object.prototype.hasOwnProperty.call(DEFAULT_TEMPLATES, type);
  }

  function getVisibleTemplateEntries(templates) {
    return Object.entries(templates).filter(([type]) => !type.startsWith('auto_'));
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
    if (frequency === 'always') return String(Date.now());
    return 'once';
  }

  function alreadyLogged(logs, automationId, dedupeKey) {
    return logs.some(log => log.automationId === automationId && log.dedupeKey === dedupeKey && (log.status === 'sent' || log.status === 'draft'));
  }

  function courseDisplayName(courseId) {
    const course = (cachedCourses || []).find(c => String(c.id) === String(courseId));
    return course?.name || 'Selected Course';
  }

  function getTemplateForAutomation(type) {
    const templates = getTemplates();
    const map = {
      late: 'auto_late',
      upcoming: 'auto_upcoming',
      midpoint: 'auto_midpoint',
      low_grade: 'auto_low_grade',
    };
    return templates[map[type]] || DEFAULT_TEMPLATES[map[type]];
  }

  function buildMessage(template, vars) {
    return {
      subject: renderTemplate(template.subject, vars),
      body: renderTemplate(template.body, vars),
    };
  }

  const PERSONAL_PLACEHOLDERS = [
    'studentName',
    'missingAssignmentList',
    'currentGrade',
    'currentScore',
    'missingSection',
    'upcomingSection',
    'gradeAlertDetail',
  ];

  function normalizeTemplateCondition(template) {
    const condition = template?.condition || {};
    return {
      type: condition.type || 'none',
      daysBack: Number(condition.daysBack) || 7,
      daysForward: Number(condition.daysForward) || 7,
      threshold: Number(condition.threshold) || 70,
    };
  }

  function normalizeTemplateTiming(template) {
    return {
      daysForward: Number(template?.daysForward) || 7,
      daysBack: Number(template?.daysBack) || 14,
    };
  }

  function templateHasPersonalData(template) {
    if (template?.containsPersonalData === true) return true;
    const text = `${template?.subject || ''}\n${template?.body || ''}`;
    return PERSONAL_PLACEHOLDERS.some(name => text.includes(`{{${name}}}`));
  }

  function describeTemplateCondition(template) {
    const condition = normalizeTemplateCondition(template);
    if (condition.type === 'missing_past_days') {
      return `Only students with missing work in the past ${condition.daysBack} days`;
    }
    if (condition.type === 'upcoming_next_days') {
      return `Only send if the course has work due in the next ${condition.daysForward} days`;
    }
    if (condition.type === 'grade_below') {
      return `Only students with a current grade below ${condition.threshold}%`;
    }
    return 'No extra send condition';
  }

  async function getConditionVars(courseId, student, condition, timing, context) {
    if (condition.type === 'upcoming_next_days') {
      const upcoming = context?.conditionUpcoming || [];
      if (!upcoming.length) return false;
      return {
        daysForward: String(condition.daysForward),
        assignmentList: formatAssignmentList(upcoming),
      };
    }
    if (condition.type === 'grade_below') {
      const enrollment = context?.enrollments?.find(e => e.user_id === student.id && e.grades);
      const score = Number(enrollment?.grades?.current_score);
      if (!Number.isFinite(score) || score >= condition.threshold) return false;
      const grade = enrollment?.grades?.current_grade || 'N/A';
      return {
        currentGrade: grade,
        currentScore: String(score),
        gradeAlertDetail: `Current course score: ${score}%\nAlert threshold: ${condition.threshold}%`,
      };
    }
    if (condition.type !== 'missing_past_days') return null;
    const daysBack = Number(condition.daysBack) || Number(timing?.daysBack) || 7;
    const subs = await getSubmissions(courseId, student.id);
    const missing = getMissingAssignments(subs, daysBack);
    if (!missing.length) return false;
    return {
      daysBack: String(daysBack),
      missingAssignmentList: formatAssignmentList(missing.map(s => s.assignment || s)),
    };
  }

  /* =========================================================
     MESSAGE GENERATION
  ========================================================= */
  async function generateMessages(courseId, courseName, emailType, daysForward, daysBack, teacherName) {
    const templates = getTemplates();
    const template = templates[emailType];
    if (!template) throw new Error('Unknown email type: ' + emailType);
    const templateCondition = normalizeTemplateCondition(template);
    const timing = normalizeTemplateTiming(template);
    daysForward = Number(template.daysForward) || Number(daysForward) || timing.daysForward;
    daysBack = Number(template.daysBack) || Number(daysBack) || timing.daysBack;

    const students = await getStudents(courseId);
    if (!students.length) throw new Error('No students found in this course.');

    const context = {};
    if (templateCondition.type === 'grade_below') {
      context.enrollments = await getEnrollments(courseId);
    }
    if (templateCondition.type === 'upcoming_next_days') {
      const assignments = await getAssignments(courseId);
      context.conditionUpcoming = getUpcomingAssignments(assignments, templateCondition.daysForward);
    }

    const messages = [];

    if (emailType === 'upcoming') {
      const allAssignments = await getAssignments(courseId);
      const upcoming = getUpcomingAssignments(allAssignments, daysForward);
      const assignmentList = formatAssignmentList(upcoming);
      for (const student of students) {
        const conditionVars = await getConditionVars(courseId, student, templateCondition, timing, context);
        if (conditionVars === false) continue;
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysForward: String(daysForward), daysBack: String(daysBack), assignmentList, ...(conditionVars || {}) };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else if (emailType === 'missing') {
      for (const student of students) {
        const subs = await getSubmissions(courseId, student.id);
        const effectiveDaysBack = templateCondition.type === 'missing_past_days' ? templateCondition.daysBack : daysBack;
        const missing = getMissingAssignments(subs, effectiveDaysBack);
        if (missing.length === 0) continue;
        let conditionVars = null;
        if (templateCondition.type !== 'missing_past_days') {
          conditionVars = await getConditionVars(courseId, student, templateCondition, timing, context);
          if (conditionVars === false) continue;
        }
        const missingList = formatAssignmentList(missing.map(s => s.assignment || s));
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysBack: String(effectiveDaysBack), missingAssignmentList: missingList, ...(conditionVars || {}) };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else if (emailType === 'welcome') {
      for (const student of students) {
        const conditionVars = await getConditionVars(courseId, student, templateCondition, timing, context);
        if (conditionVars === false) continue;
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysBack: String(daysBack), ...(conditionVars || {}) };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else if (emailType === 'evaluation') {
      const enrollments = await getEnrollments(courseId);
      const allAssignments = await getAssignments(courseId);
      const upcoming = getUpcomingAssignments(allAssignments, daysForward);
      for (const student of students) {
        const conditionVars = await getConditionVars(courseId, student, templateCondition, timing, context);
        if (conditionVars === false) continue;
        const enrollment = enrollments.find(e => e.user_id === student.id && e.grades);
        const grade = enrollment?.grades?.current_grade || 'N/A';
        const score = enrollment?.grades?.current_score || 'N/A';
        const subs = await getSubmissions(courseId, student.id);
        const missing = getMissingAssignments(subs, daysBack);
        const missingSection = missing.length > 0
          ? `Missing Assignments (past ${daysBack} days):\n${formatAssignmentList(missing.map(s => s.assignment || s))}`
          : 'You have no missing assignments. Great work!';
        const upcomingSection = upcoming.length > 0
          ? `Upcoming Assignments (next ${daysForward} days):\n${formatAssignmentList(upcoming)}`
          : 'No upcoming assignments in the next ' + daysForward + ' days.';
        const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, currentGrade: grade, currentScore: String(score), daysForward: String(daysForward), daysBack: String(daysBack), missingSection, upcomingSection, ...(conditionVars || {}) };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    } else {
      const bodyText = `${template.subject || ''}\n${template.body || ''}`;
      const needsAssignments = bodyText.includes('{{assignmentList}}') || bodyText.includes('{{upcomingSection}}') || templateCondition.type === 'upcoming_next_days';
      const needsMissing = bodyText.includes('{{missingAssignmentList}}') || bodyText.includes('{{missingSection}}') || templateCondition.type === 'missing_past_days';
      const needsGrades = bodyText.includes('{{currentGrade}}') || bodyText.includes('{{currentScore}}') || bodyText.includes('{{gradeAlertDetail}}') || templateCondition.type === 'grade_below';
      const allAssignments = needsAssignments ? await getAssignments(courseId) : [];
      const upcoming = needsAssignments ? getUpcomingAssignments(allAssignments, daysForward) : [];
      const enrollments = needsGrades ? await getEnrollments(courseId) : [];
      const upcomingSection = upcoming.length > 0
        ? `Upcoming Assignments (next ${daysForward} days):\n${formatAssignmentList(upcoming)}`
        : 'No upcoming assignments in the next ' + daysForward + ' days.';

      for (const student of students) {
        const conditionContext = { ...context, enrollments };
        if (templateCondition.type === 'upcoming_next_days' && !conditionContext.conditionUpcoming) {
          conditionContext.conditionUpcoming = getUpcomingAssignments(allAssignments, templateCondition.daysForward);
        }
        const conditionVars = await getConditionVars(courseId, student, templateCondition, timing, conditionContext);
        if (conditionVars === false) continue;

        let missingAssignmentList = '';
        let missingSection = '';
        if (needsMissing) {
          const subs = await getSubmissions(courseId, student.id);
          const missing = getMissingAssignments(subs, daysBack);
          missingAssignmentList = formatAssignmentList(missing.map(s => s.assignment || s));
          missingSection = missing.length > 0
            ? `Missing Assignments (past ${daysBack} days):\n${missingAssignmentList}`
            : 'You have no missing assignments. Great work!';
        }

        const enrollment = enrollments.find(e => e.user_id === student.id && e.grades);
        const grade = enrollment?.grades?.current_grade || 'N/A';
        const score = enrollment?.grades?.current_score || 'N/A';
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          daysForward: String(daysForward),
          daysBack: String(daysBack),
          assignmentList: formatAssignmentList(upcoming),
          missingAssignmentList,
          currentGrade: grade,
          currentScore: String(score),
          missingSection,
          upcomingSection,
          gradeAlertDetail: `Current course score: ${score}%`,
          ...(conditionVars || {}),
        };
        messages.push({ studentId: student.id, studentName: vars.studentName, email: student.email || '', subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) });
      }
    }

    return messages;
  }

  /* =========================================================
     CANVAS ACTIONS
  ========================================================= */
  async function sendCanvasMessage(courseId, recipientId, subject, body) {
    return canvasPost('/conversations', {
      recipients: [String(recipientId)],
      subject, body,
      force_new: true,
      group_conversation: false,
      context_code: 'course_' + courseId,
      mode: 'sync',
    });
  }

  async function postAnnouncement(courseId, title, message) {
    return canvasPost(`/courses/${courseId}/discussion_topics`, {
      title,
      message: bodyForCanvasHtml(message),
      is_announcement: true,
      published: true,
    });
  }

  /* =========================================================
     AUTOMATED MESSAGES
  ========================================================= */
  async function sendOrDraftAutomationMessage(automation, message, logs) {
    const mode = automation.mode || 'auto';
    if (mode === 'draft') {
      addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'draft', dedupeKey: message.dedupeKey, recipientName: message.studentName || 'Students', subject: message.subject, note: 'Matched condition; draft mode did not send.' });
      return 'draft';
    }

    if (message.kind === 'announcement') {
      await postAnnouncement(automation.courseId, message.subject, message.body);
    } else {
      await sendCanvasMessage(automation.courseId, message.studentId, message.subject, message.body);
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
      const subs = await getSubmissions(automation.courseId, student.id);
      const missing = getMissingAssignments(subs, maxAge);
      if (!missing.length) continue;
      const missingAssignmentList = formatAssignmentList(missing.map(s => s.assignment || s));
      const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysBack: String(maxAge), missingAssignmentList };
      const rendered = buildMessage(template, vars);
      const assignmentIds = missing.map(s => s.assignment_id || s.assignment?.id || s.id).sort().join(',');
      messages.push({ kind: 'message', studentId: student.id, studentName: vars.studentName, dedupeKey: `${automation.id}:late:${student.id}:${assignmentIds}:${frequencyStamp(automation.frequency)}`, ...rendered });
    }
    return messages;
  }

  async function buildUpcomingAutomationMessages(automation, teacherName) {
    const assignments = await getAssignments(automation.courseId);
    const daysForward = Number(automation.daysForward) || 7;
    const upcoming = getUpcomingAssignments(assignments, daysForward);
    if (!upcoming.length) return [];
    const template = getTemplateForAutomation('upcoming');
    const courseName = automation.courseName || courseDisplayName(automation.courseId);
    const assignmentList = formatAssignmentList(upcoming);
    const assignmentIds = upcoming.map(a => a.id).sort().join(',');
    const audience = automation.audience || 'announcement';
    if (audience === 'announcement') {
      const vars = { studentName: 'Students', teacherName, courseName, daysForward: String(daysForward), assignmentList };
      const rendered = buildMessage(template, vars);
      return [{ kind: 'announcement', studentName: 'Students', dedupeKey: `${automation.id}:upcoming:announcement:${assignmentIds}:${frequencyStamp(automation.frequency)}`, ...rendered }];
    }
    const students = await getStudents(automation.courseId);
    return students.map(student => {
      const vars = { studentName: student.name || student.sortable_name || 'Student', teacherName, courseName, daysForward: String(daysForward), assignmentList };
      return { kind: 'message', studentId: student.id, studentName: vars.studentName, dedupeKey: `${automation.id}:upcoming:${student.id}:${assignmentIds}:${frequencyStamp(automation.frequency)}`, ...buildMessage(template, vars) };
    });
  }

  async function buildMidpointAutomationMessages(automation, teacherName) {
    const start = automation.startDate ? new Date(automation.startDate + 'T00:00:00') : null;
    const end = automation.endDate ? new Date(automation.endDate + 'T23:59:59') : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const midpoint = new Date((start.getTime() + end.getTime()) / 2);
    if (new Date() < midpoint) return [];
    return generateMessages(automation.courseId, automation.courseName || courseDisplayName(automation.courseId), 'evaluation', Number(automation.daysForward) || 7, Number(automation.daysBack) || 14, teacherName)
      .then(messages => messages.map(msg => ({ kind: 'message', ...msg, dedupeKey: `${automation.id}:midpoint:${msg.studentId}:once` })));
  }

  async function buildLowGradeAutomationMessages(automation, teacherName) {
    const template = getTemplateForAutomation('low_grade');
    const threshold = Number(automation.threshold) || 70;
    const courseName = automation.courseName || courseDisplayName(automation.courseId);
    const messages = [];
    if ((automation.gradeScope || 'overall') === 'overall') {
      const enrollments = await getEnrollments(automation.courseId);
      const students = await getStudents(automation.courseId);
      for (const student of students) {
        const enrollment = enrollments.find(e => e.user_id === student.id && e.grades);
        const score = Number(enrollment?.grades?.current_score);
        if (!Number.isFinite(score) || score >= threshold) continue;
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          currentGrade: enrollment?.grades?.current_grade || 'N/A',
          currentScore: String(score),
          gradeAlertDetail: `Current course score: ${score}%\nAlert threshold: ${threshold}%`,
        };
        messages.push({ kind: 'message', studentId: student.id, studentName: vars.studentName, dedupeKey: `${automation.id}:low-overall:${student.id}:below-${threshold}:once`, ...buildMessage(template, vars) });
      }
      return messages;
    }

    const students = await getStudents(automation.courseId);
    for (const student of students) {
      const subs = await getSubmissions(automation.courseId, student.id);
      const lowSubs = subs.filter(s => {
        const score = Number(s.score);
        const points = Number(s.assignment?.points_possible);
        return Number.isFinite(score) && Number.isFinite(points) && points > 0 && (score / points) * 100 < threshold;
      });
      for (const sub of lowSubs) {
        const pct = Math.round((Number(sub.score) / Number(sub.assignment.points_possible)) * 1000) / 10;
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          currentGrade: '',
          currentScore: String(pct),
          gradeAlertDetail: `${sub.assignment?.name || 'Assignment'} score: ${pct}%\nAlert threshold: ${threshold}%`,
        };
        messages.push({ kind: 'message', studentId: student.id, studentName: vars.studentName, dedupeKey: `${automation.id}:low-assignment:${student.id}:${sub.assignment_id}:below-${threshold}:once`, ...buildMessage(template, vars) });
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
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    if (!teacherName) throw new Error('Set your Teacher Name in Settings before running automations.');
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
            if (result === 'sent') sent++;
            else drafted++;
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

  function buildUI() {
    const overlay = document.createElement('div');
    overlay.id = 'ces-overlay';
    overlay.innerHTML = `
      <div id="ces-header">
        <h2>&#9993; Messages</h2>
        <button class="ces-close-btn" id="ces-close">&times;</button>
      </div>
      <div id="ces-tabs">
        <button class="ces-tab active" data-tab="send">Send</button>
        <button class="ces-tab" data-tab="templates">Templates</button>
      </div>
      <div id="ces-body"></div>
    `;
    document.body.appendChild(overlay);
    _overlay = overlay;

    overlay.querySelector('#ces-close').addEventListener('click', () => overlay.classList.remove('ces-open'));

    overlay.querySelectorAll('.ces-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.ces-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showTab(tab.dataset.tab);
      });
    });
  }

  /* =========================================================
     TAB: SEND MESSAGES
  ========================================================= */
  async function showTab(tabName) {
    const body = document.getElementById('ces-body');
    if (tabName === 'send') renderSendTab(body);
    else if (tabName === 'templates') renderTemplatesTab(body);
  }

  async function renderSendTab(container) {
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    const lastCourse  = GM_getValue(STORAGE_KEYS.LAST_COURSE, '');
    const templates = getTemplates();
    const visibleTemplates = getVisibleTemplateEntries(templates);
    const firstTemplateType = visibleTemplates[0]?.[0] || 'upcoming';
    const templateCards = visibleTemplates.map(([type, tpl], index) => `
        <div class="ces-card ${index === 0 ? 'selected' : ''}" data-type="${escapeAttr(type)}">
          <strong>${escapeHtml(tpl.name || 'Untitled Template')}</strong>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">${escapeHtml(describeTemplateCondition(tpl))}</div>
        </div>
      `).join('');

    container.innerHTML = `
      <div id="ces-status-area"></div>
      <label class="ces-label">Teacher Name</label>
      <input type="text" class="ces-input" id="ces-teacher-name" value="${escapeAttr(teacherName)}" placeholder="Professor Smith">
      <label class="ces-label">Select Course</label>
      <select class="ces-select" id="ces-course-select"><option value="">Loading courses...</option></select>
      <label class="ces-label">Email Type</label>
      <div class="ces-grid-2" id="ces-type-cards">
        ${templateCards}
      </div>
      <div id="ces-template-rule" class="ces-status ces-status-info ces-mt"></div>
      <div class="ces-checkbox-row"><input type="checkbox" id="ces-announce-check"><label for="ces-announce-check" id="ces-announce-label">Also post as Canvas Announcement</label></div>
      <div class="ces-mt"><button class="ces-btn ces-btn-primary" id="ces-generate-btn">&#128269; Generate Messages</button></div>
      <div id="ces-progress-area" style="display:none;" class="ces-mt">
        <div class="ces-status ces-status-info" id="ces-progress-text">Fetching data...</div>
        <div class="ces-progress"><div class="ces-progress-bar" id="ces-progress-bar" style="width:0%"></div></div>
      </div>
      <div id="ces-messages-area" class="ces-mt"></div>
    `;

    loadCourses(lastCourse);

    let selectedType = firstTemplateType;
    const typeCards = container.querySelectorAll('#ces-type-cards .ces-card');
    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        typeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedType = card.dataset.type;
        updateAnnouncementAvailability(selectedType);
      });
    });

    container.querySelector('#ces-generate-btn').addEventListener('click', async () => {
      const courseSelect = container.querySelector('#ces-course-select');
      const courseId = courseSelect.value;
      const courseName = courseSelect.options[courseSelect.selectedIndex]?.text || '';
      const currentTeacherName = container.querySelector('#ces-teacher-name').value.trim();
      if (!courseId) { showStatus('Please select a course.', 'error'); return; }
      if (!currentTeacherName) { showStatus('Please enter your teacher name.', 'error'); return; }
      GM_setValue(STORAGE_KEYS.TEACHER_NAME, currentTeacherName);

      currentCourseId = courseId;
      GM_setValue(STORAGE_KEYS.LAST_COURSE, courseId);
      const selectedTemplate = getTemplates()[selectedType];
      const timing = normalizeTemplateTiming(selectedTemplate);

      const btn = container.querySelector('#ces-generate-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="ces-spinner"></span> Generating...';

      const progressArea = container.querySelector('#ces-progress-area');
      progressArea.style.display = 'block';
      setProgress('Fetching student data from Canvas...', 10);

      try {
        generatedMessages = await generateMessages(courseId, courseName, selectedType, timing.daysForward, timing.daysBack, currentTeacherName);
        setProgress('Done!', 100);
        if (generatedMessages.length === 0) {
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

      btn.disabled = false;
      btn.innerHTML = '&#128269; Generate Messages';
      setTimeout(() => { progressArea.style.display = 'none'; }, 2000);
    });

    updateAnnouncementAvailability(firstTemplateType);
  }

  function updateAnnouncementAvailability(type) {
    const templates = getTemplates();
    const template = templates[type];
    const rule = document.getElementById('ces-template-rule');
    const checkbox = document.getElementById('ces-announce-check');
    const label = document.getElementById('ces-announce-label');
    const hasPersonalData = templateHasPersonalData(template);
    if (rule) {
      const privacy = hasPersonalData
        ? 'Announcements disabled because this template contains personal student data.'
        : 'Announcements are available for this template.';
      const timing = normalizeTemplateTiming(template);
      rule.innerHTML = `Template timing: ${timing.daysForward} days forward, ${timing.daysBack} days back.<br>${escapeHtml(describeTemplateCondition(template))}<br>${escapeHtml(privacy)}`;
    }
    if (checkbox) {
      checkbox.disabled = hasPersonalData;
      if (hasPersonalData) checkbox.checked = false;
    }
    if (label) {
      label.style.color = hasPersonalData ? '#6B7280' : '#2D3B45';
      label.textContent = hasPersonalData
        ? 'Canvas Announcement unavailable for personal templates'
        : 'Also post as Canvas Announcement';
    }
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
    const templates = getTemplates();
    const tpl = templates[emailType];
    const timing = normalizeTemplateTiming(tpl);
    const includeAnnouncement = announceCheck && announceCheck.checked && !templateHasPersonalData(tpl);

    let html = `<div class="ces-flex-between ces-mb"><strong>${generatedMessages.length} message(s) ready</strong><div style="display:flex;gap:8px;"><button class="ces-btn ces-btn-primary" id="ces-send-all-btn">&#9993; Send All via Canvas Message</button></div></div>`;
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
          <div class="ces-msg-body">${renderBodyForPreview(msg.body)}</div>
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
          sent++;
          if (row) row.style.background = '#ecfdf5';
        } catch(err) {
          failed++;
          if (row) row.style.background = '#fef2f2';
        }
      }
      if (includeAnnouncement) {
        try {
          await postAnnouncement(courseId,
            tpl.subject.replace(/\{\{courseName\}\}/g, courseName),
            tpl.body.replace(/\{\{teacherName\}\}/g, GM_getValue(STORAGE_KEYS.TEACHER_NAME, ''))
                    .replace(/\{\{courseName\}\}/g, courseName)
                    .replace(/\{\{studentName\}\}/g, 'Students')
                    .replace(/\{\{assignmentList\}\}/g, '(see your individual message)')
                    .replace(/\{\{missingAssignmentList\}\}/g, '(see your individual message)')
                    .replace(/\{\{currentGrade\}\}/g, '(see your individual message)')
                    .replace(/\{\{currentScore\}\}/g, '(see your individual message)')
                    .replace(/\{\{daysForward\}\}/g, String(timing.daysForward))
                    .replace(/\{\{daysBack\}\}/g, String(timing.daysBack))
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
          const row = document.querySelector(`#ces-msg-${idx}`);
          if (row) row.style.background = '#ecfdf5';
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
        const composeUrl = `${CANVAS_BASE}/conversations#filter=type=inbox&user_name=${encodeURIComponent(msg.studentName)}&user_id=${msg.studentId}`;
        window.open(composeUrl, '_blank');
        GM_setValue('ces_compose_pending', JSON.stringify({ recipientId: msg.studentId, recipientName: msg.studentName, subject: msg.subject, body: msg.body, courseId }));
        showStatus(`Compose window opened for ${msg.studentName}. Click "Insert Message" on the compose page.`, 'info');
      });
    });
  }

  /* =========================================================
     TAB: AUTOMATED MESSAGES
  ========================================================= */
  async function renderAutomationsTab(container) {
    const automations = getAutomations();
    const logs = getAutomationLogs().slice(-12).reverse();
    const lastCourse = GM_getValue(STORAGE_KEYS.LAST_COURSE, '');

    container.innerHTML = `
      <div id="ces-status-area"></div>
      <div class="ces-card">
        <div class="ces-flex-between ces-mb">
          <div>
            <h3 style="margin:0;">Create Automation</h3>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">Select a class, message, condition, and frequency.</div>
          </div>
          <button class="ces-btn ces-btn-secondary" id="ces-run-all-autos">Run Check Now</button>
        </div>

        <label class="ces-label">Class</label>
        <select class="ces-select" id="ces-auto-course"><option value="">Loading courses...</option></select>

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

    await populateAutomationCourses(container.querySelector('#ces-auto-course'), lastCourse);
    renderAutomationFields(container);
    renderAutomationTiles(container.querySelector('#ces-auto-list'), automations);

    container.querySelector('#ces-auto-type').addEventListener('change', () => renderAutomationFields(container));
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
      btn.disabled = false; btn.textContent = 'Run Check Now';
    });

    container.querySelector('#ces-save-auto').addEventListener('click', () => {
      const courseSelect = container.querySelector('#ces-auto-course');
      const courseId = courseSelect.value;
      const courseName = courseSelect.options[courseSelect.selectedIndex]?.text || '';
      const type = container.querySelector('#ces-auto-type').value;
      if (!courseId) { showStatus('Select a class first.', 'error'); return; }
      const editId = container.querySelector('#ces-auto-edit-id').value;
      const existingAuto = editId ? getAutomations().find(auto => auto.id === editId) : null;
      const automation = {
        id: editId || makeAutomationId(),
        active: existingAuto ? existingAuto.active !== false : true,
        courseId,
        courseName,
        type,
        name: container.querySelector('#ces-auto-name').value.trim() || defaultAutomationName(type, courseName),
        frequency: container.querySelector('#ces-auto-frequency').value,
        mode: container.querySelector('#ces-auto-mode').value,
        daysBack: Number(container.querySelector('#ces-auto-days-back')?.value || 14),
        daysForward: Number(container.querySelector('#ces-auto-days-forward')?.value || 7),
        threshold: Number(container.querySelector('#ces-auto-threshold')?.value || 70),
        gradeScope: container.querySelector('#ces-auto-grade-scope')?.value || 'overall',
        audience: container.querySelector('#ces-auto-audience')?.value || 'announcement',
        startDate: container.querySelector('#ces-auto-start')?.value || '',
        endDate: container.querySelector('#ces-auto-end')?.value || '',
        createdAt: existingAuto?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = getAutomations().filter(auto => auto.id !== editId);
      next.push(automation);
      saveAutomations(next);
      GM_setValue(STORAGE_KEYS.LAST_COURSE, courseId);
      renderAutomationsTab(container);
      setTimeout(() => showStatus(editId ? 'Automation updated.' : 'Automation saved.', 'success'), 0);
    });
  }

  async function populateAutomationCourses(select, lastCourse) {
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
    }
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
    if (auto.type === 'late') return `Late work, daily/weekly until submitted or older than ${auto.daysBack || 14} days`;
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
      const courseSelect = body.querySelector('#ces-auto-course');
      body.querySelector('#ces-auto-edit-id').value = auto.id;
      body.querySelector('#ces-auto-type').value = auto.type;
      body.querySelector('#ces-auto-frequency').value = auto.frequency || 'daily';
      body.querySelector('#ces-auto-mode').value = auto.mode || 'auto';
      body.querySelector('#ces-auto-name').value = auto.name || '';
      if (courseSelect) courseSelect.value = auto.courseId;
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
      const next = getAutomations().map(auto => auto.id === btn.dataset.id ? { ...auto, active: auto.active === false } : auto);
      saveAutomations(next);
      renderAutomationsTab(document.getElementById('ces-body'));
    }));
    container.querySelectorAll('.ces-delete-auto').forEach(btn => btn.addEventListener('click', () => {
      if (!confirm('Delete this automation?')) return;
      saveAutomations(getAutomations().filter(auto => auto.id !== btn.dataset.id));
      renderAutomationsTab(document.getElementById('ces-body'));
    }));
  }

  async function checkAutomationsOnOpen() {
    const automations = getAutomations().filter(auto => auto.active !== false);
    if (!automations.length) return;
    try {
      const result = await runAutomations();
      if (result.sent || result.drafted || result.failed) {
        showStatus(`Automations checked: sent ${result.sent}, drafted ${result.drafted}${result.failed ? `, failed ${result.failed}` : ''}.`, result.failed ? 'error' : 'success');
      }
    } catch(err) {
      showStatus('Automation check skipped: ' + err.message, 'error');
    }
  }

  /* =========================================================
     TAB: TEMPLATES
  ========================================================= */
  function renderTemplatesTab(container) {
    const templates = getTemplates();

    function renderList() {
      let html = `<p style="font-size:13px;color:#6b7280;margin-bottom:16px;">Customize email templates and choose when each one is eligible to send. Use placeholders like <code>{{studentName}}</code>, <code>{{teacherName}}</code>, <code>{{courseName}}</code>, and more.</p>`;
      html += `<div class="ces-mb"><button class="ces-btn ces-btn-primary" id="ces-add-tpl">Add Email Template</button></div>`;
      for (const [type, tpl] of getVisibleTemplateEntries(templates)) {
        const personal = templateHasPersonalData(tpl);
        const timing = normalizeTemplateTiming(tpl);
        html += `<div class="ces-card"><div class="ces-flex-between"><div><strong>${escapeHtml(tpl.name)}</strong><div style="font-size:12px;color:#6b7280;margin-top:2px;">Subject: ${escapeHtml(tpl.subject)}</div><div style="font-size:12px;color:#6b7280;margin-top:6px;">${timing.daysForward} days forward, ${timing.daysBack} days back - ${escapeHtml(describeTemplateCondition(tpl))} - ${personal ? 'Personal data; announcements disabled' : 'Announcements allowed'}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;"><button class="ces-btn ces-btn-secondary ces-btn-sm ces-edit-tpl" data-type="${type}">Edit</button>${isDefaultTemplate(type) ? '' : `<button class="ces-btn ces-btn-danger ces-btn-sm ces-delete-tpl" data-type="${type}">Delete</button>`}</div></div></div>`;
      }
      html += `<div class="ces-mt"><button class="ces-btn ces-btn-secondary" id="ces-reset-tpl">Reset All to Defaults</button></div>`;
      container.innerHTML = html;
      container.querySelector('#ces-add-tpl').addEventListener('click', () => {
        const id = makeTemplateId();
        templates[id] = {
          name: 'New Email Template',
          subject: '{{courseName}} Update',
          body: '<p>Hi {{studentName}},</p><p></p><p>Best,<br>{{teacherName}}</p>',
          daysForward: 7,
          daysBack: 14,
          condition: { type: 'none', daysBack: 7, daysForward: 7, threshold: 70 },
          containsPersonalData: true,
        };
        saveTemplates(templates);
        renderEditor(id);
      });
      container.querySelectorAll('.ces-edit-tpl').forEach(btn => btn.addEventListener('click', () => renderEditor(btn.dataset.type)));
      container.querySelectorAll('.ces-delete-tpl').forEach(btn => btn.addEventListener('click', () => {
        if (!confirm('Delete this template?')) return;
        delete templates[btn.dataset.type];
        saveTemplates(templates);
        renderList();
        showStatus('Template deleted.', 'success');
      }));
      container.querySelector('#ces-reset-tpl').addEventListener('click', () => {
        if (confirm('Reset all templates to defaults? Your custom templates will be lost.')) {
          const defaults = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
          saveTemplates(defaults); Object.assign(templates, defaults); renderList();
          showStatus('Templates reset to defaults.', 'success');
        }
      });
    }

    function renderEditor(type) {
      const tpl = templates[type];
      const condition = normalizeTemplateCondition(tpl);
      const timing = normalizeTemplateTiming(tpl);
      const personalChecked = templateHasPersonalData(tpl);
      container.innerHTML = `
        <div class="ces-flex-between ces-mb"><h3 style="margin:0;">Editing: ${escapeHtml(tpl.name)}</h3><button class="ces-btn ces-btn-secondary" id="ces-tpl-cancel">Cancel</button></div>
        <label class="ces-label">Template Name</label>
        <input type="text" class="ces-input" id="ces-tpl-name" value="${escapeAttr(tpl.name || '')}">
        <label class="ces-label">Subject Line</label>
        <input type="text" class="ces-input" id="ces-tpl-subject" value="${escapeAttr(tpl.subject)}">
        <label class="ces-label">Email Body</label>
        <div class="ces-editor-toolbar" id="ces-editor-toolbar">
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="bold"><strong>B</strong></button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="italic"><em>I</em></button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="insertUnorderedList">List</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="formatBlock" data-value="h3">Heading</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="formatBlock" data-value="p">Text</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" id="ces-editor-link">Link</button>
        </div>
        <div class="ces-editor" id="ces-tpl-body" contenteditable="true">${bodyToEditorHtml(tpl.body)}</div>
        <label class="ces-label">Canvas Variables</label>
        <div class="ces-variable-row">
          ${TEMPLATE_VARIABLES.map(variable => `<button class="ces-btn ces-btn-secondary ces-btn-sm ces-var-btn" type="button" data-var="${variable.key}">${escapeHtml(variable.label)}</button>`).join('')}
        </div>
        <div class="ces-card ces-mt" style="background:#f9fafb;">
          <h3 style="margin:0 0 10px;">Send Rules</h3>
          <div class="ces-grid-2">
            <div><label class="ces-label">Days Forward</label><input type="number" class="ces-input" id="ces-tpl-days-forward" value="${timing.daysForward}" min="1" max="90"></div>
            <div><label class="ces-label">Days Back</label><input type="number" class="ces-input" id="ces-tpl-days-back" value="${timing.daysBack}" min="1" max="365"></div>
          </div>
          <label class="ces-label">Condition</label>
          <select class="ces-select" id="ces-tpl-condition">
            <option value="none"${condition.type === 'none' ? ' selected' : ''}>No extra condition</option>
            <option value="missing_past_days"${condition.type === 'missing_past_days' ? ' selected' : ''}>Only students with missing work in the past N days</option>
            <option value="upcoming_next_days"${condition.type === 'upcoming_next_days' ? ' selected' : ''}>Only send if the course has work due in the next N days</option>
            <option value="grade_below"${condition.type === 'grade_below' ? ' selected' : ''}>Only students with current grade below N%</option>
          </select>
          <div class="ces-grid-2" id="ces-tpl-condition-values">
            <div id="ces-tpl-condition-days-back-wrap"><label class="ces-label">Missing Work Days Back</label><input type="number" class="ces-input" id="ces-tpl-condition-days-back" value="${condition.daysBack}" min="1" max="365"></div>
            <div id="ces-tpl-condition-days-forward-wrap"><label class="ces-label">Upcoming Days Forward</label><input type="number" class="ces-input" id="ces-tpl-condition-days-forward" value="${condition.daysForward}" min="1" max="90"></div>
            <div id="ces-tpl-condition-threshold-wrap"><label class="ces-label">Grade Threshold</label><input type="number" class="ces-input" id="ces-tpl-condition-threshold" value="${condition.threshold}" min="1" max="100"></div>
          </div>
          <div class="ces-checkbox-row">
            <input type="checkbox" id="ces-tpl-personal" ${personalChecked ? 'checked' : ''}>
            <label for="ces-tpl-personal">This template contains personal student data</label>
          </div>
          <div style="font-size:12px;color:#6b7280;margin-top:6px;">When this is checked, Canvas Announcement is disabled for the template.</div>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:8px;"><strong>Available placeholders:</strong> {{studentName}} {{teacherName}} {{courseName}} {{assignmentList}} {{missingAssignmentList}} {{currentGrade}} {{currentScore}} {{daysForward}} {{daysBack}} {{missingSection}} {{upcomingSection}} {{gradeAlertDetail}}</div>
        <div class="ces-mt" style="display:flex;gap:8px;">
          <button class="ces-btn ces-btn-primary" id="ces-tpl-save">Save Template</button>
          <button class="ces-btn ces-btn-secondary" id="ces-tpl-preview">Preview with Sample Data</button>
        </div>
        <div id="ces-tpl-preview-area" class="ces-mt"></div>
      `;
      const conditionSelect = container.querySelector('#ces-tpl-condition');
      const subjectInput = container.querySelector('#ces-tpl-subject');
      const bodyEditor = container.querySelector('#ces-tpl-body');
      let lastTarget = bodyEditor;
      subjectInput.addEventListener('focus', () => { lastTarget = subjectInput; });
      bodyEditor.addEventListener('focus', () => { lastTarget = bodyEditor; });
      container.querySelectorAll('#ces-editor-toolbar [data-cmd]').forEach(btn => btn.addEventListener('click', () => {
        bodyEditor.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
      }));
      container.querySelector('#ces-editor-link').addEventListener('click', () => {
        const url = prompt('Paste the link URL');
        if (!url) return;
        bodyEditor.focus();
        document.execCommand('createLink', false, url);
      });
      function insertAtSubject(text) {
        const start = subjectInput.selectionStart || 0;
        const end = subjectInput.selectionEnd || 0;
        subjectInput.value = subjectInput.value.slice(0, start) + text + subjectInput.value.slice(end);
        subjectInput.focus();
        subjectInput.setSelectionRange(start + text.length, start + text.length);
      }
      container.querySelectorAll('.ces-var-btn').forEach(btn => btn.addEventListener('click', () => {
        const token = `{{${btn.dataset.var}}}`;
        if (lastTarget === subjectInput) {
          insertAtSubject(token);
        } else {
          bodyEditor.focus();
          document.execCommand('insertText', false, token);
          lastTarget = bodyEditor;
        }
        updatePersonalFlagFromText();
      }));
      const updateConditionFields = () => {
        const selectedCondition = conditionSelect.value;
        container.querySelector('#ces-tpl-condition-days-back-wrap').style.display = selectedCondition === 'missing_past_days' ? 'block' : 'none';
        container.querySelector('#ces-tpl-condition-days-forward-wrap').style.display = selectedCondition === 'upcoming_next_days' ? 'block' : 'none';
        container.querySelector('#ces-tpl-condition-threshold-wrap').style.display = selectedCondition === 'grade_below' ? 'block' : 'none';
      };
      conditionSelect.addEventListener('change', updateConditionFields);
      updateConditionFields();

      const updatePersonalFlagFromText = () => {
        const textTemplate = {
          subject: container.querySelector('#ces-tpl-subject').value,
          body: container.querySelector('#ces-tpl-body').innerHTML,
        };
        if (templateHasPersonalData(textTemplate)) {
          container.querySelector('#ces-tpl-personal').checked = true;
        }
      };
      container.querySelector('#ces-tpl-subject').addEventListener('input', updatePersonalFlagFromText);
      container.querySelector('#ces-tpl-body').addEventListener('input', updatePersonalFlagFromText);

      container.querySelector('#ces-tpl-cancel').addEventListener('click', renderList);
      container.querySelector('#ces-tpl-save').addEventListener('click', () => {
        templates[type].name = container.querySelector('#ces-tpl-name').value.trim() || 'Untitled Template';
        templates[type].subject = container.querySelector('#ces-tpl-subject').value;
        templates[type].body    = container.querySelector('#ces-tpl-body').innerHTML;
        templates[type].daysForward = parseInt(container.querySelector('#ces-tpl-days-forward').value, 10) || 7;
        templates[type].daysBack = parseInt(container.querySelector('#ces-tpl-days-back').value, 10) || 14;
        templates[type].condition = {
          type: container.querySelector('#ces-tpl-condition').value,
          daysBack: parseInt(container.querySelector('#ces-tpl-condition-days-back').value, 10) || 7,
          daysForward: parseInt(container.querySelector('#ces-tpl-condition-days-forward').value, 10) || 7,
          threshold: parseInt(container.querySelector('#ces-tpl-condition-threshold').value, 10) || 70,
        };
        templates[type].containsPersonalData = container.querySelector('#ces-tpl-personal').checked;
        saveTemplates(templates); showStatus('Template saved!', 'success'); renderList();
      });
      container.querySelector('#ces-tpl-preview').addEventListener('click', () => {
        const subject = container.querySelector('#ces-tpl-subject').value;
        const body    = container.querySelector('#ces-tpl-body').innerHTML;
        const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, 'Professor Smith');
        const sampleDaysForward = container.querySelector('#ces-tpl-days-forward').value || '7';
        const sampleDaysBack = container.querySelector('#ces-tpl-days-back').value || '14';
        const sampleVars = { studentName: 'Alex', teacherName, courseName: 'Sample Course', assignmentList: '  - Essay 1 (Due: 4/15/2026)\n  - Quiz 3 (Due: 4/18/2026)', missingAssignmentList: '  - Homework 5 (Due: 4/1/2026)', currentGrade: 'B+', currentScore: '87.5', daysForward: sampleDaysForward, daysBack: sampleDaysBack, missingSection: `Missing Assignments (past ${sampleDaysBack} days):\n  - Homework 5`, upcomingSection: `Upcoming Assignments (next ${sampleDaysForward} days):\n  - Essay 1`, gradeAlertDetail: 'Current course score: 68%\nAlert threshold: 70%' };
        container.querySelector('#ces-tpl-preview-area').innerHTML = `<div class="ces-card" style="background:#f9fafb;"><strong>Subject:</strong> ${escapeHtml(renderTemplate(subject, sampleVars))}<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;"><div style="font-size:13px;">${renderTemplate(body, sampleVars)}</div></div>`;
      });
    }

    renderList();
  }

  /* =========================================================
     TAB: SETTINGS
  ========================================================= */
  function legacyRenderSettingsTab(container) {
    const teacherName = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    const daysForward = GM_getValue(STORAGE_KEYS.DAYS_FORWARD, 7);
    const daysBack    = GM_getValue(STORAGE_KEYS.DAYS_BACK, 14);

    container.innerHTML = `
      <div id="ces-settings-status"></div>
      <div class="ces-card">
        <h3 style="margin:0 0 12px;">Teacher Information</h3>
        <label class="ces-label">Teacher Name</label>
        <input type="text" class="ces-input" id="ces-set-teacher" value="${escapeAttr(teacherName)}" placeholder="Professor Smith">
        <p style="font-size:12px;color:#6b7280;margin-top:4px;">This name is used in all email templates as {{teacherName}}.</p>
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
          <li>Messages sent through Canvas's built-in messaging system (Inbox).</li>
          <li>Announcements are posted directly to the selected course.</li>
          <li>All templates and settings are saved in browser extension storage.</li>
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
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#059669;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,.2);';
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
      const composeBtn = document.querySelector('[data-testid="compose"], .ic-Layout-contentMain button[aria-label="Compose"], #compose-btn, a[href="#compose"]');
      if (composeBtn) composeBtn.click();
      setTimeout(() => {
        const subjectInput = document.querySelector('input[name="subject"], input[placeholder*="Subject"], #compose-message-subject');
        if (subjectInput) { subjectInput.value = data.subject; subjectInput.dispatchEvent(new Event('input', { bubbles: true })); }
        const bodyInput = document.querySelector('textarea[name="body"], textarea[data-testid="message-body"], #compose-message-body, [role="textbox"]');
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
     HUB INTEGRATION
  ========================================================= */
  document.addEventListener('ce-toggle-messages', () => {
    if (!_overlay) return;
    if (_overlay.classList.contains('ces-open')) {
      _overlay.classList.remove('ces-open');
    } else {
      _overlay.classList.add('ces-open');
      showTab('send');
    }
  });

  /* =========================================================
     INIT
  ========================================================= */
  buildUI();
  checkComposePageHelper();
})();
