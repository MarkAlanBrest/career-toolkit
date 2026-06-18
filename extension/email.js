(async function () {
  'use strict';

  // Storage shim — pre-load keys used by the email system
  const EMAIL_KEYS = ['ces_templates', 'ces_template_version', 'ces_teacher_name', 'ces_last_course', 'ces_send_settings', 'ces_quick_messages', 'ces_quick_messages_version', 'ces_compose_pending', 'ces_automations', 'ces_automation_logs'];
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
      inset: 0;
      z-index: 2147483638;
      background: rgba(0,0,0,.45);
      backdrop-filter: blur(2px);
      display: none; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Lato", "Segoe UI", sans-serif;
      color: #2D3B45;
    }
    #ces-overlay.ces-open { display: flex; }

    .ces-modal-box {
      background: #fff;
      width: min(680px, calc(100vw - 48px));
      max-height: min(700px, calc(100vh - 80px));
      border-radius: 10px;
      box-shadow: 0 8px 40px rgba(0,0,0,.28);
      display: flex; flex-direction: column; overflow: hidden;
    }

    #ces-header {
      height: 52px; flex-shrink: 0;
      background: #1B303D;
      display: flex; align-items: center; padding: 0 16px; gap: 10px;
    }
    #ces-header h2 {
      flex: 1; margin: 0;
      font-size: 15px; font-weight: 700; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ces-close-btn {
      width: 32px; height: 32px; flex-shrink: 0;
      background: none; border: none; color: rgba(255,255,255,0.65);
      font-size: 22px; cursor: pointer; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; padding: 0;
      transition: background .12s, color .12s;
    }
    .ces-close-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

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
    .ces-template-list { display: flex; flex-direction: column; gap: 8px; }
    .ces-template-card {
      min-height: 0; padding: 7px 10px;
      display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 10px;
      cursor: pointer;
    }
    .ces-template-card strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ces-template-card .ces-template-rule-text {
      font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 55%; margin-top: 0;
    }
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
    .ces-color-swatch {
      width: 24px; height: 24px; border-radius: 3px;
      border: 1px solid #C7CDD1; cursor: pointer;
    }
    .ces-course-toolbar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      margin-top: 12px; margin-bottom: 6px;
    }
    .ces-course-toolbar .ces-label { margin: 0; }
    .ces-course-toolbar .ces-checkbox-row { margin: 0; }
    .ces-course-toolbar-actions { margin-left: auto; display: flex; gap: 6px; }
    .ces-course-list {
      border: 1px solid #C7CDD1; border-radius: 3px;
      max-height: 210px; overflow-y: auto; background: #fff;
    }
    .ces-course-option {
      display: flex; gap: 8px; align-items: center;
      padding: 5px 10px; border-bottom: 1px solid #eef1f3;
      font-size: 13px;
    }
    .ces-course-option:last-child { border-bottom: none; }
    .ces-recipient-list {
      max-height: 240px; overflow-y: auto;
    }
    .ces-recipient-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 5px 0; border-bottom: 1px solid #eef1f3;
      font-size: 13px;
    }
    .ces-recipient-row:last-child { border-bottom: none; }
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
    TEMPLATE_VERSION: 'ces_template_version',
    TEACHER_NAME: 'ces_teacher_name',
    LAST_COURSE:  'ces_last_course',
    SEND_SETTINGS: 'ces_send_settings',
    QUICK_MESSAGES: 'ces_quick_messages',
    QUICK_MESSAGES_VERSION: 'ces_quick_messages_version',
    AUTOMATIONS:  'ces_automations',
    AUTO_LOGS:    'ces_automation_logs',
  };

  const DEFAULT_TEMPLATES = {
    upcoming: {
      name: 'Upcoming Assignments',
      subject: 'Upcoming Work for {{courseName}}',
      body: `Hi {{studentName}},\n\nUpcoming work in {{courseName}}\n------------------------------\n\nHere is what is coming up over the next {{daysForward}} days:\n\n{{assignmentList}}\n\nThis is a good moment to look ahead, block out time, and make sure you understand what each assignment is asking you to do.\n\nPlease review the instructions in Canvas and reach out before the due date if anything is unclear.\n\nBest,\n{{teacherName}}`,
      daysForward: 7,
    },
    missing: {
      name: 'Missing Work Reminder',
      subject: 'Missing Work in {{courseName}}',
      body: `Hi {{studentName}},\n\nMissing work check-in\n------------------------------\n\nI am reaching out because the following work still appears as missing in {{courseName}}:\n\n{{missingAssignmentList}}\n\nMissing work can add up quickly, but there is still value in taking the next step now. Please review the list above and submit what you can as soon as you are able.\n\nIf something is preventing you from completing the work, reply to this message so we can talk about a realistic plan.\n\nBest,\n{{teacherName}}`,
      daysBack: 7,
      condition: { type: 'missing_past_days', daysBack: 7 },
    },
    welcome: {
      name: 'Welcome to Class',
      subject: 'Welcome to {{courseName}}!',
      body: `Hi {{studentName}},\n\nWelcome to {{courseName}}\n------------------------------\n\nI am glad you are in the course and look forward to working with you this term.\n\nTo start strong:\n- Review the syllabus and course schedule.\n- Check Canvas regularly for announcements, modules, and due dates.\n- Set aside consistent time each week for readings, assignments, and review.\n- Reach out early if you have questions or need help.\n\nI hope this is a productive and engaging semester for you.\n\nWelcome,\n{{teacherName}}`,
    },
    evaluation: {
      name: 'Student Evaluation',
      subject: 'Progress Update for {{courseName}}',
      body: `Hi {{studentName}},\n\nProgress update for {{courseName}}\n------------------------------\n\nCurrent Grade: {{currentGrade}} ({{currentScore}}%)\n\n{{missingSection}}\n\n{{upcomingSection}}\n\nIf your current standing is not where you want it to be, this is a good time to make a plan. Please review the items above and reach out if you would like to discuss next steps.\n\nBest regards,\n{{teacherName}}`,
      daysForward: 7,
      daysBack: 14,
    },
    low_grade_checkin: {
      name: 'Low Grade Check-In',
      subject: 'Grade Check-In for {{courseName}}',
      body: `Hi {{studentName}},\n\nGrade check-in\n------------------------------\n\nI am reaching out because your current performance in {{courseName}} is below the alert point for this message.\n\n{{gradeAlertDetail}}\n\nThis message is meant to catch the issue early enough that you can respond. Please review your recent feedback in Canvas and consider what needs attention first.\n\nIf you would like help making a recovery plan, reply to this message.\n\nBest,\n{{teacherName}}`,
      condition: { type: 'grade_below', threshold: 70, daysBack: 14, daysForward: 7 },
    },
    attendance_checkin: {
      name: 'Attendance Check-In',
      subject: 'Checking In - {{courseName}}',
      body: `Hi {{studentName}},\n\nChecking in - {{courseName}}\n------------------------------\n\nI wanted to check in because I have noticed some recent attendance or participation concerns.\n\nIf something is getting in the way of attending, participating, or keeping up with the course, please reply so we can talk about next steps.\n\nYou are still part of this class, and reconnecting sooner is better than waiting.\n\nBest,\n{{teacherName}}`,
      daysBack: 14,
    },
    positive_note: {
      name: 'Positive Note',
      subject: 'Nice Work in {{courseName}}',
      body: `Hi {{studentName}},\n\nNice work in {{courseName}}\n------------------------------\n\nI wanted to send a quick note to recognize the effort and progress you are showing.\n\nKeep protecting the habits that are helping you succeed. Consistent effort matters.\n\nThank you for the work you are putting in.\n\nBest,\n{{teacherName}}`,
      containsPersonalData: true,
    },
    feedback_followup: {
      name: 'Feedback Follow-Up',
      subject: 'Please Review Feedback in {{courseName}}',
      body: `Hi {{studentName}},\n\nFeedback follow-up\n------------------------------\n\nPlease take a few minutes to review your recent feedback in {{courseName}}.\n\nFeedback is most useful when you use it before the next assignment. Look for one or two specific changes you can apply right away.\n\nIf you have questions about the feedback, reply to this message.\n\nBest,\n{{teacherName}}`,
    },
    office_hours_invite: {
      name: 'Office Hours Invitation',
      subject: 'Office Hours Invitation - {{courseName}}',
      body: `Hi {{studentName}},\n\nOffice hours invitation\n------------------------------\n\nI would like to invite you to office hours or a quick check-in for {{courseName}}.\n\nBring one question, one assignment, or one thing that feels unclear. We can start there.\n\nReply with a time that works for you, or use the office hours information posted in Canvas.\n\nBest,\n{{teacherName}}`,
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
    return canvasGet('/courses?enrollment_type=teacher&state[]=available&state[]=created&include[]=term&include[]=favorites');
  }
  async function getDashboardCourseIds() {
    const cards = await canvasGet('/dashboard/dashboard_cards');
    return new Set(cards.map(card => String(card.id || card.course_id)).filter(Boolean));
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
  async function getCurrentTeacherName() {
    const stored = GM_getValue(STORAGE_KEYS.TEACHER_NAME, '');
    if (stored) return stored;
    try {
      const profile = await canvasGet('/users/self/profile');
      const name = profile?.short_name || profile?.name || profile?.sortable_name || '';
      if (name) GM_setValue(STORAGE_KEYS.TEACHER_NAME, name);
      return name;
    } catch(e) {
      return '';
    }
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
      try {
        const parsed = JSON.parse(stored);
        if (GM_getValue(STORAGE_KEYS.TEMPLATE_VERSION, '') !== '4') {
          const migrated = { ...parsed };
          for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
            migrated[key] = JSON.parse(JSON.stringify(template));
          }
          GM_setValue(STORAGE_KEYS.TEMPLATES, JSON.stringify(migrated));
          GM_setValue(STORAGE_KEYS.TEMPLATE_VERSION, '4');
          return migrated;
        }
        return { ...JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)), ...parsed };
      } catch(e) {}
    }
    GM_setValue(STORAGE_KEYS.TEMPLATE_VERSION, '4');
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  }

  function saveTemplates(templates) {
    GM_setValue(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }

  function getSendSettings() {
    const stored = GM_getValue(STORAGE_KEYS.SEND_SETTINGS, '{}');
    try { return JSON.parse(stored) || {}; } catch(e) { return {}; }
  }

  function saveSendSettingsPatch(patch) {
    const next = { ...getSendSettings(), ...patch };
    GM_setValue(STORAGE_KEYS.SEND_SETTINGS, JSON.stringify(next));
  }

  const DEFAULT_QUICK_MESSAGES = [
    {
      id: 'quick_thanks',
      name: 'Thank You',
      subject: 'Thank you for the update',
      body: 'Hi,\n\nThank you for reaching out and keeping me updated. I appreciate you taking the time to communicate instead of letting the question sit unanswered.\n\nI will review what you sent and follow up if I need anything else. If there is a deadline connected to this, please make sure you are also checking the assignment directions and any Canvas announcements so you have the most current information.\n\nBest,',
    },
    {
      id: 'quick_received',
      name: 'Received',
      subject: 'Message received',
      body: 'Hi,\n\nI received your message. I wanted to let you know it came through, and I will take a closer look as soon as I can.\n\nIf your question is about an assignment, please keep working on any parts you can complete while you wait for my response. If you find the answer in Canvas before I reply, you are welcome to send a quick follow-up letting me know.\n\nBest,',
    },
    {
      id: 'quick_meet',
      name: 'Schedule a Time',
      subject: 'Let us schedule a time to talk',
      body: 'Hi,\n\nThanks for your message. This would be easier to discuss together than to solve back and forth over email.\n\nPlease send me two or three times that work for you, or stop by office hours if that is easier. When we meet, bring the assignment, notes, or Canvas page you are looking at so we can get specific and make a clear plan.\n\nBest,',
    },
    {
      id: 'quick_missing_context',
      name: 'Need More Information',
      subject: 'A little more information needed',
      body: 'Hi,\n\nThanks for reaching out. I want to help, but I need a little more information first.\n\nPlease reply with:\n- The course name\n- The assignment or quiz name\n- What part is confusing or not working\n- What you have already tried\n- A screenshot if Canvas is showing an error\n\nOnce I have those details, I can give you a much more useful answer.\n\nBest,',
    },
    {
      id: 'quick_late_policy',
      name: 'Late Work Policy',
      subject: 'Late work question',
      body: 'Hi,\n\nThanks for asking about this. Please review the late work policy posted in Canvas first, because that is the policy I will use when I grade or respond to the request.\n\nIf you still have a question after reviewing it, reply and explain:\n- Which assignment you are asking about\n- When it was due\n- Whether you have already submitted it\n- What specific issue prevented you from completing it on time\n\nThat information will help me respond fairly and clearly.\n\nBest,',
    },
    {
      id: 'quick_resubmit',
      name: 'Resubmission',
      subject: 'Resubmission information',
      body: 'Hi,\n\nYou may submit an updated version if Canvas is still accepting submissions for the assignment and the assignment settings allow another submission.\n\nBefore you resubmit, please review the feedback carefully and make sure the new version addresses the main issue. After you resubmit, reply to this message so I know there is a newer version to check.\n\nBest,',
    },
    {
      id: 'quick_tech_canvas',
      name: 'Canvas/Tech Issue',
      subject: 'Canvas or technology issue',
      body: 'Hi,\n\nI am sorry you are running into a technical issue. Please try these steps:\n\n- Refresh Canvas and try again.\n- Try a different browser if possible.\n- Clear the page and open Canvas again from a new tab.\n- Take a screenshot of the error or problem.\n- Contact Canvas support if the issue continues.\n\nPlease send me the screenshot, the assignment or page name, and a short description of what happened. That will help me tell whether this is a Canvas issue, a submission issue, or something I can fix from my side.\n\nBest,',
    },
    {
      id: 'quick_encouragement',
      name: 'Encouragement',
      subject: 'Keep going',
      body: 'Hi,\n\nI know this part of the course can feel challenging, but you are not stuck forever. The best next step is to choose one specific task and make progress on that first.\n\nStart with the smallest useful step: open the assignment, read the directions again, and identify the first thing you can do. If you are unsure where to start, reply with what feels most confusing and we can narrow it down together.\n\nBest,',
    },
    {
      id: 'quick_missing_work_plan',
      name: 'Missing Work Plan',
      subject: 'Plan for missing work',
      body: 'Hi,\n\nI noticed there may be missing work that needs your attention. The best approach is to make a short, realistic plan instead of trying to solve everything at once.\n\nPlease reply with:\n- Which assignment you will complete first\n- When you plan to submit it\n- What help, if any, you need from me\n\nOnce you take the first step, it becomes much easier to keep going.\n\nBest,',
    },
    {
      id: 'quick_parent_guardian_followup',
      name: 'Family Follow-Up',
      subject: 'Follow-up about student progress',
      body: 'Hello,\n\nThank you for reaching out. I appreciate the chance to work together in support of the student.\n\nAt this point, the most helpful next step is to review Canvas together, including current grades, missing work, due dates, and teacher feedback. If there are specific assignments or concerns you would like me to address, please send those details and I will respond as clearly as I can.\n\nBest,',
    },
    {
      id: 'comment_strong_work',
      name: 'Strong Work',
      subject: '',
      body: 'Strong work on this assignment. You demonstrated a clear understanding of the key concepts, communicated your ideas effectively, and followed through on the requirements. This is the kind of effort that moves things forward.',
    },
    {
      id: 'comment_good_effort',
      name: 'Good Effort',
      subject: '',
      body: 'Good effort here. You addressed the main requirements and showed solid understanding of the core ideas. Continue building on this — the habits you are developing now will carry through the rest of the course.',
    },
    {
      id: 'comment_needs_revision',
      name: 'Needs Revision',
      subject: '',
      body: 'Please review the feedback on this assignment carefully and resubmit. Focus on addressing the specific areas noted. If you are unsure what is expected, re-read the assignment directions or reach out before the deadline.',
    },
    {
      id: 'comment_missing_requirements',
      name: 'Missing Requirements',
      subject: '',
      body: 'This submission is missing one or more required elements. Please review the assignment directions and make sure every part is addressed before resubmitting. Incomplete submissions will be scored based on what was received.',
    },
    {
      id: 'comment_incomplete',
      name: 'Incomplete Submission',
      subject: '',
      body: 'This submission appears incomplete. Please finish all required parts and resubmit as soon as possible. If something prevented you from completing it, reach out so we can work out a plan before it affects your grade further.',
    },
    {
      id: 'comment_late_submission',
      name: 'Late Submission',
      subject: '',
      body: 'This assignment was submitted after the due date. Please review the course late work policy — points have been adjusted accordingly. If there were extenuating circumstances, reach out directly.',
    },
    {
      id: 'comment_see_rubric',
      name: 'Review the Rubric',
      subject: '',
      body: 'Please review the rubric and your feedback carefully. The rubric outlines exactly what was expected for each section and explains how points were assigned. Use it to guide any revisions before resubmitting.',
    },
    {
      id: 'comment_citation_formatting',
      name: 'Citations / Formatting',
      subject: '',
      body: 'Please review your citations and formatting. Make sure sources are credited correctly and consistently using the required citation style. Formatting issues can affect your score on future assignments, so it is worth getting this right now.',
    },
    {
      id: 'comment_stronger_evidence',
      name: 'Needs More Evidence',
      subject: '',
      body: 'Your main idea is on the right track, but your argument needs stronger evidence and support. Go back to your sources, find specific examples or data that back up your claim, and explain the connection clearly. Assertions without support do not hold up on their own.',
    },
    {
      id: 'comment_see_me',
      name: 'Please See Me',
      subject: '',
      body: 'Please come see me during office hours or reply to this feedback so we can talk through this assignment. I want to make sure you understand where things stand and what the next step looks like.',
    },
  ];

  function getQuickMessages() {
    const stored = GM_getValue(STORAGE_KEYS.QUICK_MESSAGES, null);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) || [];
        if (GM_getValue(STORAGE_KEYS.QUICK_MESSAGES_VERSION, '') !== '4') {
          const custom = parsed.filter(msg => !DEFAULT_QUICK_MESSAGES.some(defaultMsg => defaultMsg.id === msg.id));
          const migrated = [...DEFAULT_QUICK_MESSAGES.map(msg => ({ ...msg })), ...custom];
          saveQuickMessages(migrated);
          GM_setValue(STORAGE_KEYS.QUICK_MESSAGES_VERSION, '4');
          return migrated;
        }
        return parsed;
      } catch(e) {}
    }
    GM_setValue(STORAGE_KEYS.QUICK_MESSAGES_VERSION, '4');
    return DEFAULT_QUICK_MESSAGES.map(msg => ({ ...msg }));
  }

  function saveQuickMessages(messages) {
    GM_setValue(STORAGE_KEYS.QUICK_MESSAGES, JSON.stringify(messages));
  }

  function makeQuickMessageId() {
    return 'quick_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
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

  function bodyForCanvasMessage(body) {
    const text = String(body || '');
    if (!/<\/?[a-z][\s\S]*>/i.test(text)) return text;
    const wrap = document.createElement('div');
    wrap.innerHTML = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2|h3|h4|blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/li>/gi, '');
    return (wrap.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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

  function describeNoMatchReason(template) {
    const condition = normalizeTemplateCondition(template);
    if (condition.type === 'missing_past_days') {
      return `No students matched this request. No students were found with missing work in the past ${condition.daysBack} days.`;
    }
    if (condition.type === 'upcoming_next_days') {
      return `No students matched this request. No course work was found due in the next ${condition.daysForward} days.`;
    }
    if (condition.type === 'grade_below') {
      return `No students matched this request. No students were found below ${condition.threshold}%.`;
    }
    const timing = normalizeTemplateTiming(template);
    if ((template?.body || '').includes('{{missingAssignmentList}}')) {
      return `No students matched this request. No students were found with missing work in the past ${timing.daysBack} days.`;
    }
    return 'No students matched this request.';
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
    if (!students.length) return [];

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
      subject,
      body: bodyForCanvasMessage(body),
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
  let cachedDashboardCourseIds = null;
  let generatedMessages = [];
  let currentCourseId = null;
  let _overlay = null;

  function buildUI() {
    const overlay = document.createElement('div');
    overlay.id = 'ces-overlay';

    const box = document.createElement('div');
    box.className = 'ces-modal-box';
    box.innerHTML = `
      <div id="ces-header">
        <h2>Messages</h2>
        <button class="ces-close-btn" id="ces-close">&times;</button>
      </div>
      <div id="ces-tabs">
        <button class="ces-tab active" data-tab="send">Send</button>
        <button class="ces-tab" data-tab="templates">Templates</button>
      </div>
      <div id="ces-body"></div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    _overlay = overlay;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('ces-open'); });
    box.addEventListener('click', e => e.stopPropagation());

    box.querySelector('#ces-close').addEventListener('click', () => overlay.classList.remove('ces-open'));

    box.querySelectorAll('.ces-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        box.querySelectorAll('.ces-tab').forEach(t => t.classList.remove('active'));
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
    const sendSettings = getSendSettings();
    const lastCourses = Array.isArray(sendSettings.selectedCourseIds)
      ? sendSettings.selectedCourseIds.map(String)
      : String(GM_getValue(STORAGE_KEYS.LAST_COURSE, '') || '').split(',').filter(Boolean);
    const templates = getTemplates();
    const visibleTemplates = getVisibleTemplateEntries(templates);
    const savedTemplateType = sendSettings.selectedTemplateType;
    const firstTemplateType = visibleTemplates.some(([type]) => type === savedTemplateType)
      ? savedTemplateType
      : visibleTemplates[0]?.[0] || 'upcoming';
    const templateCards = visibleTemplates.map(([type, tpl], index) => `
        <div class="ces-card ces-template-card ${type === firstTemplateType ? 'selected' : ''}" data-type="${escapeAttr(type)}">
          <strong>${escapeHtml(tpl.name || 'Untitled Template')}</strong>
          <div class="ces-template-rule-text">${escapeHtml(describeTemplateCondition(tpl))}</div>
        </div>
      `).join('');

    container.innerHTML = `
      <div id="ces-status-area"></div>
      <div class="ces-checkbox-row" style="margin-top:0;"><input type="checkbox" id="ces-announce-check" ${sendSettings.includeAnnouncement ? 'checked' : ''}><label for="ces-announce-check" id="ces-announce-label">Also post as Canvas Announcement</label></div>
      <div class="ces-course-toolbar">
        <label class="ces-label">Classes</label>
        <label class="ces-checkbox-row" style="margin-top:0;"><input type="checkbox" id="ces-filter-published" ${sendSettings.publishedOnly !== false ? 'checked' : ''}> Published only</label>
        <label class="ces-checkbox-row" style="margin-top:0;"><input type="checkbox" id="ces-filter-dashboard" ${sendSettings.dashboardOnly ? 'checked' : ''}> Dashboard only</label>
        <div class="ces-course-toolbar-actions">
          <button class="ces-btn ces-btn-secondary ces-btn-sm" id="ces-select-all-courses">Select All</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" id="ces-clear-courses">Clear</button>
        </div>
      </div>
      <div id="ces-course-list" class="ces-course-list"><div class="ces-status ces-status-info" style="margin:8px;">Loading classes...</div></div>
      <label class="ces-label">Email Type</label>
      <div class="ces-template-list" id="ces-type-cards">
        ${templateCards}
      </div>
      <div id="ces-template-rule" class="ces-status ces-status-info ces-mt"></div>
      <div id="ces-progress-area" style="display:none;" class="ces-mt">
        <div class="ces-status ces-status-info" id="ces-progress-text">Fetching data...</div>
        <div class="ces-progress"><div class="ces-progress-bar" id="ces-progress-bar" style="width:0%"></div></div>
      </div>
      <div id="ces-messages-area" class="ces-mt"></div>
    `;

    const selectedCourseIds = new Set(lastCourses);
    await renderCourseChecklist(selectedCourseIds);
    container.querySelector('#ces-announce-check').addEventListener('change', (event) => saveSendSettingsPatch({ includeAnnouncement: event.target.checked }));
    container.querySelector('#ces-filter-published').addEventListener('change', (event) => {
      saveSendSettingsPatch({ publishedOnly: event.target.checked });
      renderCourseChecklist(selectedCourseIds);
    });
    container.querySelector('#ces-filter-dashboard').addEventListener('change', (event) => {
      saveSendSettingsPatch({ dashboardOnly: event.target.checked });
      renderCourseChecklist(selectedCourseIds);
    });
    container.querySelector('#ces-select-all-courses').addEventListener('click', async () => {
      const visibleCourses = await getVisibleCoursesForSend();
      visibleCourses.forEach(course => selectedCourseIds.add(String(course.id)));
      saveSendSettingsPatch({ selectedCourseIds: [...selectedCourseIds] });
      renderCourseChecklist(selectedCourseIds);
    });
    container.querySelector('#ces-clear-courses').addEventListener('click', () => {
      selectedCourseIds.clear();
      saveSendSettingsPatch({ selectedCourseIds: [] });
      renderCourseChecklist(selectedCourseIds);
    });

    let selectedType = firstTemplateType;
    const typeCards = container.querySelectorAll('#ces-type-cards .ces-card');
    const buildMessagesForSelection = async () => {
      const visibleCourses = await getVisibleCoursesForSend();
      const selectedCourses = visibleCourses.filter(course => selectedCourseIds.has(String(course.id)));
      const currentTeacherName = await getCurrentTeacherName();
      if (!selectedCourses.length) { showStatus('Please select at least one class.', 'error'); return; }

      currentCourseId = selectedCourses[0].id;
      GM_setValue(STORAGE_KEYS.LAST_COURSE, selectedCourses.map(course => course.id).join(','));
      saveSendSettingsPatch({ selectedCourseIds: selectedCourses.map(course => String(course.id)), selectedTemplateType: selectedType });
      const selectedTemplate = getTemplates()[selectedType];
      const timing = normalizeTemplateTiming(selectedTemplate);

      const progressArea = container.querySelector('#ces-progress-area');
      progressArea.style.display = 'block';
      setProgress('Fetching student data from Canvas...', 10);

      try {
        generatedMessages = [];
        let failedCourses = 0;
        for (let i = 0; i < selectedCourses.length; i++) {
          const course = selectedCourses[i];
          const courseName = course.name + (course.term ? ` (${course.term.name})` : '');
          setProgress(`Building messages for ${course.name}...`, Math.round(((i + 0.25) / selectedCourses.length) * 100));
          try {
            const courseMessages = await generateMessages(course.id, courseName, selectedType, timing.daysForward, timing.daysBack, currentTeacherName);
            generatedMessages.push(...courseMessages.map(message => ({ ...message, courseId: course.id, courseName })));
          } catch(courseErr) {
            failedCourses++;
          }
        }
        setProgress('Done!', 100);
        if (generatedMessages.length === 0) {
          const noMatch = describeNoMatchReason(selectedTemplate);
          showStatus(failedCourses ? `${noMatch} ${failedCourses} class(es) could not be checked.` : noMatch, failedCourses ? 'error' : 'info');
          container.querySelector('#ces-messages-area').innerHTML = '';
        } else {
          renderMessagesList(container, selectedCourses, selectedType, failedCourses);
        }
      } catch(err) {
        showStatus('Error: ' + err.message, 'error');
        setProgress('Error occurred.', 0);
      }
      setTimeout(() => { progressArea.style.display = 'none'; }, 2000);
    };

    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        typeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedType = card.dataset.type;
        saveSendSettingsPatch({ selectedTemplateType: selectedType });
        updateAnnouncementAvailability(selectedType);
        buildMessagesForSelection();
      });
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

  function isPublishedCourse(course) {
    return course.workflow_state === 'available' || course.published === true;
  }

  async function getVisibleCoursesForSend() {
    if (!cachedCourses) cachedCourses = await getCourses();
    const publishedOnly = document.getElementById('ces-filter-published')?.checked;
    const dashboardOnly = document.getElementById('ces-filter-dashboard')?.checked;
    if (dashboardOnly && !cachedDashboardCourseIds) {
      cachedDashboardCourseIds = await getDashboardCourseIds();
    }
    return cachedCourses.filter(course => {
      if (publishedOnly && !isPublishedCourse(course)) return false;
      if (dashboardOnly && !cachedDashboardCourseIds.has(String(course.id))) return false;
      return true;
    });
  }

  async function renderCourseChecklist(selectedCourseIds) {
    const list = document.getElementById('ces-course-list');
    if (!list) return;
    list.innerHTML = '<div class="ces-status ces-status-info" style="margin:8px;">Loading classes...</div>';
    try {
      const courses = await getVisibleCoursesForSend();
      if (!courses.length) {
        list.innerHTML = '<div class="ces-status ces-status-info" style="margin:8px;">No classes match the current filters.</div>';
        return;
      }
      list.innerHTML = courses.map(course => {
        const id = String(course.id);
        return `
          <label class="ces-course-option">
            <input type="checkbox" class="ces-course-check" value="${escapeAttr(id)}" ${selectedCourseIds.has(id) ? 'checked' : ''}>
            <span>${escapeHtml(course.name || 'Untitled Class')}</span>
          </label>
        `;
      }).join('');
      list.querySelectorAll('.ces-course-check').forEach(check => {
        check.addEventListener('change', () => {
          if (check.checked) selectedCourseIds.add(check.value);
          else selectedCourseIds.delete(check.value);
          saveSendSettingsPatch({ selectedCourseIds: [...selectedCourseIds] });
        });
      });
    } catch(err) {
      list.innerHTML = `<div class="ces-status ces-status-error" style="margin:8px;">Error loading classes: ${escapeHtml(err.message)}</div>`;
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

  function messagePlainText(body) {
    const text = String(body || '');
    if (!/<\/?[a-z][\s\S]*>/i.test(text)) return text;
    const wrap = document.createElement('div');
    wrap.innerHTML = text;
    return wrap.innerText || wrap.textContent || '';
  }

  function messageFindings(msg) {
    const text = messagePlainText(msg.body);
    const lines = text.split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    const findings = [];
    for (const line of lines) {
      if (/^(current grade|current score|current course score|grade check-in|missing work|missing assignments|progress update|what i am seeing|items to review)/i.test(line)) {
        findings.push(line);
      } else if (/^[-*]\s+/.test(line)) {
        findings.push(line.replace(/^[-*]\s+/, ''));
      }
      if (findings.length >= 6) break;
    }
    if (!findings.length && msg.subject) findings.push(msg.subject);
    return findings;
  }

  function bodyToLetterHtml(body) {
    const text = messagePlainText(body).trim();
    if (!text) return '<p>No message body generated.</p>';
    return text.split(/\n{2,}/)
      .map(part => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function printableWarningLetter(msg, pageBreak) {
    const date = new Date().toLocaleDateString();
    return `
      <section class="letter${pageBreak ? ' page-break' : ''}">
        <div class="letter-meta">${escapeHtml(msg.courseName || 'Course')} &middot; ${escapeHtml(date)}</div>
        <h1>Student Progress Warning</h1>
        <div class="recipient">
          <strong>Student:</strong> ${escapeHtml(msg.studentName || 'Student')}<br>
          <strong>Subject:</strong> ${escapeHtml(msg.subject || 'Progress check-in')}
        </div>
        <div class="message-body">${bodyToLetterHtml(msg.body)}</div>
        <div class="signature">
          <p>Sincerely,</p>
          <p>____________________________<br>${escapeHtml(GM_getValue(STORAGE_KEYS.TEACHER_NAME, 'Instructor'))}</p>
        </div>
      </section>
    `;
  }

  function printHtmlDocument(title, bodyHtml) {
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; font-size: 11pt; }
      h1 { font-size: 18pt; margin: 0 0 12px; color: #1f2937; }
      h2 { font-size: 13pt; margin: 18px 0 8px; }
      .meta, .letter-meta { color: #6b7280; font-size: 9pt; margin-bottom: 12px; }
      .recipient { border: 1px solid #d1d5db; background: #f9fafb; padding: 10px 12px; margin: 10px 0 16px; }
      .message-body p { margin: 0 0 11px; line-height: 1.45; }
      .signature { margin-top: 28px; }
      .letter { min-height: 9.5in; padding-bottom: 16px; }
      .page-break { page-break-after: always; }
      table { width: 100%; border-collapse: collapse; font-size: 10pt; }
      th { text-align: left; background: #374151; color: #fff; padding: 7px 8px; }
      td { border-bottom: 1px solid #e5e7eb; padding: 7px 8px; vertical-align: top; }
      tr:nth-child(even) td { background: #f9fafb; }
      ul { margin: 0; padding-left: 18px; }
    </style></head><body>${bodyHtml}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  function printWarningLetters(messages) {
    const body = messages.map((msg, i) => printableWarningLetter(msg, i < messages.length - 1)).join('');
    printHtmlDocument('Student Progress Warning Letters', body);
  }

  function printTeacherMessageReport(messages) {
    const date = new Date().toLocaleString();
    const rows = messages.map(msg => {
      const findings = messageFindings(msg);
      return `
        <tr>
          <td>${escapeHtml(msg.studentName || 'Student')}</td>
          <td>${escapeHtml(msg.courseName || '')}</td>
          <td>${escapeHtml(msg.subject || '')}</td>
          <td><ul>${findings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></td>
          <td>${escapeHtml(date)}</td>
        </tr>
      `;
    }).join('');
    printHtmlDocument('Teacher Message Findings Report', `
      <h1>Teacher Findings Report</h1>
      <div class="meta">Generated ${escapeHtml(date)} &middot; ${messages.length} student${messages.length === 1 ? '' : 's'}</div>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Message</th><th>Findings</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  function renderMessagesList(container, selectedCourses, emailType, failedCourses) {
    const announceCheck = document.getElementById('ces-announce-check');
    const templates = getTemplates();
    const tpl = templates[emailType];
    const timing = normalizeTemplateTiming(tpl);
    const includeAnnouncement = announceCheck && announceCheck.checked && !templateHasPersonalData(tpl);
    const preview = generatedMessages[0];

    let html = `
      <div id="ces-status-area"></div>
      <div class="ces-flex-between ces-mb">
        <div>
          <strong>${generatedMessages.length} recipient(s) ready</strong>
          ${failedCourses ? `<div style="font-size:12px;color:#BC1212;margin-top:3px;">${failedCourses} class(es) could not be checked.</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="ces-btn ces-btn-secondary" id="ces-print-report-btn">Print Report</button>
          <button class="ces-btn ces-btn-secondary" id="ces-print-letters-btn">Print Letters</button>
          <button class="ces-btn ces-btn-secondary" id="ces-review-cancel">Cancel</button>
          <button class="ces-btn ces-btn-primary" id="ces-send-all-btn">&#9993; Send All</button>
        </div>
      </div>
      <div class="ces-msg-row">
        <div class="ces-msg-header"><span class="ces-msg-name">Email Preview</span><span style="font-size:12px;color:#6b7280;">Canvas Inbox sends a clean text version</span></div>
        <div class="ces-msg-subject"><strong>Subject:</strong> ${escapeHtml(preview.subject)}</div>
        <div class="ces-msg-body">${renderBodyForPreview(preview.body)}</div>
      </div>
      <label class="ces-label">Recipients</label>
      <div class="ces-recipient-list">
    `;
    generatedMessages.forEach((msg, i) => {
      html += `
        <div class="ces-recipient-row" id="ces-msg-${i}">
          <div>
            <strong>${escapeHtml(msg.studentName)}</strong>
            <div style="font-size:12px;color:#6b7280;">${escapeHtml(msg.courseName || '')}</div>
          </div>
          <div class="ces-msg-actions">
            <button class="ces-btn ces-btn-secondary ces-btn-sm ces-print-one" data-idx="${i}">Print Letter</button>
            <button class="ces-btn ces-btn-primary ces-btn-sm ces-send-one" data-idx="${i}">&#9993; Send</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelector('#ces-review-cancel').addEventListener('click', () => {
      generatedMessages = [];
      renderSendTab(container);
    });

    container.querySelector('#ces-print-report-btn').addEventListener('click', () => {
      printTeacherMessageReport(generatedMessages);
    });

    container.querySelector('#ces-print-letters-btn').addEventListener('click', () => {
      printWarningLetters(generatedMessages);
    });

    container.querySelector('#ces-send-all-btn').addEventListener('click', async () => {
      const btn = container.querySelector('#ces-send-all-btn');
      btn.disabled = true; btn.innerHTML = '<span class="ces-spinner"></span> Sending...';
      let sent = 0, failed = 0;
      for (let i = 0; i < generatedMessages.length; i++) {
        const msg = generatedMessages[i];
        const row = container.querySelector(`#ces-msg-${i}`);
        try {
          await sendCanvasMessage(msg.courseId, msg.studentId, msg.subject, msg.body);
          sent++;
          if (row) row.style.background = '#ecfdf5';
        } catch(err) {
          failed++;
          if (row) row.style.background = '#fef2f2';
        }
      }
      if (includeAnnouncement) {
        let posted = 0, announcementFailed = 0;
        for (const course of selectedCourses) {
          const courseName = course.name + (course.term ? ` (${course.term.name})` : '');
          try {
            await postAnnouncement(course.id,
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
            posted++;
          } catch(err) {
            announcementFailed++;
          }
        }
        showStatus(`Sent ${sent} message(s)${failed ? `, ${failed} failed` : ''}. Posted ${posted} announcement(s)${announcementFailed ? `, ${announcementFailed} failed` : ''}.`, announcementFailed ? 'error' : 'success');
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
          await sendCanvasMessage(msg.courseId, msg.studentId, msg.subject, msg.body);
          btn.innerHTML = '&#10003; Sent'; btn.classList.remove('ces-btn-primary'); btn.style.background = '#059669';
          const row = document.querySelector(`#ces-msg-${idx}`);
          if (row) row.style.background = '#ecfdf5';
        } catch(err) {
          btn.innerHTML = '&#10007; Failed'; btn.classList.add('ces-btn-danger');
          showStatus('Failed to send to ' + msg.studentName + ': ' + err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.ces-print-one').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const msg = generatedMessages[idx];
        if (msg) printWarningLetters([msg]);
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
      let html = '';
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
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="insertOrderedList">1. List</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="formatBlock" data-value="h3">Heading</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" data-cmd="formatBlock" data-value="p">Text</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" id="ces-editor-link">Link</button>
          <button class="ces-btn ces-btn-secondary ces-btn-sm" type="button" id="ces-editor-line">Line</button>
          <button class="ces-color-swatch" type="button" title="Blue text" data-color="#0770B8" style="background:#0770B8;"></button>
          <button class="ces-color-swatch" type="button" title="Green text" data-color="#127A1B" style="background:#127A1B;"></button>
          <button class="ces-color-swatch" type="button" title="Red text" data-color="#BC1212" style="background:#BC1212;"></button>
        </div>
        <div class="ces-editor" id="ces-tpl-body" contenteditable="true">${bodyToEditorHtml(tpl.body)}</div>
        <div class="ces-flex-between" style="align-items:flex-end;gap:10px;">
          <label class="ces-label">Canvas Variables</label>
          <div style="font-size:12px;color:#6b7280;text-align:right;line-height:1.35;">Customize email templates and choose when each one is eligible to send. Use placeholders like <code>{{studentName}}</code>, <code>{{teacherName}}</code>, <code>{{courseName}}</code>, and more.</div>
        </div>
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
      container.querySelector('#ces-editor-line').addEventListener('click', () => {
        bodyEditor.focus();
        document.execCommand('insertText', false, '\n------------------------------\n');
      });
      container.querySelectorAll('.ces-color-swatch').forEach(btn => btn.addEventListener('click', () => {
        bodyEditor.focus();
        document.execCommand('foreColor', false, btn.dataset.color);
      }));
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
        const inserted = insertIntoCompose(data.subject, data.body);
        GM_setValue('ces_compose_pending', '');
        bar.innerHTML = `<span>&#10003; Message inserted${inserted.subjectInserted ? '' : ' (subject field not found)'}. Review and click Send when ready.</span><button id="ces-dismiss2" style="padding:6px 14px;background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Dismiss</button>`;
        bar.querySelector('#ces-dismiss2').addEventListener('click', () => bar.remove());
      }, 1500);
    });
  }

  function findSubjectByLabel(root) {
    const labels = Array.from(root.querySelectorAll('label, span, div'));
    const label = labels.find(el => /^subject:?$/i.test((el.textContent || '').trim()));
    if (!label) return null;
    const forId = label.getAttribute('for');
    if (forId) {
      const byFor = window.CSS?.escape
        ? root.querySelector(`#${CSS.escape(forId)}`)
        : root.querySelector(`[id="${forId.replace(/"/g, '\\"')}"]`);
      if (byFor) return byFor;
    }
    const wrapper = label.closest('div, label, fieldset') || label.parentElement;
    return wrapper?.querySelector('input, textarea, [contenteditable="true"]') || null;
  }

  function getComposeSubjectInput(root) {
    const scope = root || document;
    const direct = scope.querySelector([
      'input[name="subject"]',
      'input[name*="subject" i]',
      'input[id*="subject" i]',
      'input[placeholder*="Subject" i]',
      'input[aria-label*="Subject" i]',
      '#compose-message-subject'
    ].join(', '));
    if (direct) return direct;
    const byLabel = findSubjectByLabel(scope);
    if (byLabel) return byLabel;
    const candidates = Array.from(scope.querySelectorAll('input[type="text"], input:not([type]), textarea, [contenteditable="true"]'));
    return candidates.find(input => {
      const text = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''}`.toLowerCase();
      if (/(to|recipient|search|filter|course|user|body|message)/.test(text)) return false;
      return /subject|topic/.test(text);
    }) || null;
  }

  function getComposeBodyInput(root) {
    const scope = root || document;
    return scope.querySelector('textarea[name="body"], textarea[data-testid="message-body"], #compose-message-body, [contenteditable="true"][role="textbox"], [contenteditable="true"], [role="textbox"]');
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getActiveComposeRoot() {
    const button = document.getElementById('ces-quick-message-btn');
    const buttonRoot = button?.closest('form, [role="dialog"], .ui-dialog, .ReactModal__Content, .compose-message, .message-form');
    if (buttonRoot) return buttonRoot;
    const subjectInput = getComposeSubjectInput(document);
    const bodyInput = getComposeBodyInput(document);
    const field = subjectInput || bodyInput;
    return field?.closest('form, [role="dialog"], .ui-dialog, .ReactModal__Content, .compose-message, .message-form') || document;
  }

  function insertIntoCompose(subject, body) {
    const root = getActiveComposeRoot();
    const subjectInput = getComposeSubjectInput(root) || getComposeSubjectInput(document);
    let subjectInserted = false;
    if (subjectInput && subject) {
      subjectInput.focus();
      if (subjectInput.tagName === 'INPUT' || subjectInput.tagName === 'TEXTAREA') {
        setNativeValue(subjectInput, subject);
      } else {
        subjectInput.textContent = subject;
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      subjectInserted = true;
    }
    const bodyInput = getComposeBodyInput(root) || getComposeBodyInput(document);
    let bodyInserted = false;
    if (bodyInput) {
      if (bodyInput.tagName === 'TEXTAREA') {
        setNativeValue(bodyInput, body || '');
      } else {
        bodyInput.innerHTML = escapeHtml(body || '').replace(/\n/g, '<br>');
        bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
        bodyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      bodyInput.focus();
      bodyInserted = true;
    }
    return { subjectInserted, bodyInserted };
  }

  function installQuickMessageInserter() {
    if (document.getElementById('ces-quick-message-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'ces-quick-message-panel';
    panel.style.cssText = 'position:fixed;width:360px;max-height:70vh;overflow:auto;z-index:2147483642;display:none;background:#fff;border:1px solid #C7CDD1;border-radius:3px;box-shadow:0 8px 24px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2D3B45;';
    document.body.appendChild(panel);

    function renderQuickPanel(editId) {
      const messages = getQuickMessages();
      const editing = editId ? messages.find(msg => msg.id === editId) : null;
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #C7CDD1;">
          <strong style="font-size:13px;">Stored Messages</strong>
          <button id="ces-quick-close" style="border:none;background:none;font-size:18px;cursor:pointer;color:#6B7280;">&times;</button>
        </div>
        <div style="padding:10px 12px;">
          ${messages.map(msg => `
            <div style="border-bottom:1px solid #eef1f3;padding:8px 0;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <strong style="font-size:13px;">${escapeHtml(msg.name)}</strong>
                <div style="display:flex;gap:5px;">
                  <button class="ces-quick-insert ces-btn ces-btn-primary ces-btn-sm" data-id="${escapeAttr(msg.id)}">Insert</button>
                  <button class="ces-quick-edit ces-btn ces-btn-secondary ces-btn-sm" data-id="${escapeAttr(msg.id)}">Edit</button>
                  <button class="ces-quick-delete ces-btn ces-btn-danger ces-btn-sm" data-id="${escapeAttr(msg.id)}">Delete</button>
                </div>
              </div>
              <div style="font-size:12px;color:#6b7280;margin-top:3px;">${escapeHtml(msg.subject || '(no subject)')}</div>
            </div>
          `).join('')}
          <div style="margin-top:12px;">
            <label class="ces-label">${editing ? 'Edit Message' : 'Add Message'}</label>
            <input class="ces-input" id="ces-quick-name" placeholder="Message name" value="${escapeAttr(editing?.name || '')}">
            <input class="ces-input" id="ces-quick-subject" placeholder="Subject" value="${escapeAttr(editing?.subject || '')}" style="margin-top:7px;">
            <textarea class="ces-textarea" id="ces-quick-body" placeholder="Message body" style="margin-top:7px;min-height:110px;">${escapeHtml(editing?.body || '')}</textarea>
            <div style="display:flex;gap:7px;margin-top:8px;">
              <button class="ces-btn ces-btn-primary" id="ces-quick-save">${editing ? 'Update' : 'Save'}</button>
              ${editing ? '<button class="ces-btn ces-btn-secondary" id="ces-quick-cancel-edit">Cancel Edit</button>' : ''}
            </div>
          </div>
        </div>
      `;
      panel.querySelector('#ces-quick-close').addEventListener('click', () => { panel.style.display = 'none'; });
      panel.querySelectorAll('.ces-quick-insert').forEach(btn => btn.addEventListener('click', () => {
        const msg = getQuickMessages().find(item => item.id === btn.dataset.id);
        if (!msg) return;
        const inserted = insertIntoCompose(msg.subject, msg.body);
        if (!inserted.subjectInserted && !inserted.bodyInserted) alert('Open a Canvas compose message first, then insert the stored message.');
        else if (!inserted.subjectInserted) alert('Message inserted, but I could not find the Canvas subject field.');
        if (inserted.subjectInserted || inserted.bodyInserted) panel.style.display = 'none';
      }));
      panel.querySelectorAll('.ces-quick-edit').forEach(btn => btn.addEventListener('click', () => renderQuickPanel(btn.dataset.id)));
      panel.querySelectorAll('.ces-quick-delete').forEach(btn => btn.addEventListener('click', () => {
        saveQuickMessages(getQuickMessages().filter(msg => msg.id !== btn.dataset.id));
        renderQuickPanel();
      }));
      const cancelEdit = panel.querySelector('#ces-quick-cancel-edit');
      if (cancelEdit) cancelEdit.addEventListener('click', () => renderQuickPanel());
      panel.querySelector('#ces-quick-save').addEventListener('click', () => {
        const name = panel.querySelector('#ces-quick-name').value.trim();
        const subject = panel.querySelector('#ces-quick-subject').value.trim();
        const body = panel.querySelector('#ces-quick-body').value;
        if (!name || !body.trim()) return;
        const next = getQuickMessages().filter(msg => msg.id !== editId);
        next.push({ id: editId || makeQuickMessageId(), name, subject, body });
        saveQuickMessages(next);
        renderQuickPanel();
      });
    }

    function toggleQuickPanel(anchor) {
      renderQuickPanel();
      const rect = anchor.getBoundingClientRect();
      const panelH = panel.offsetHeight || 420;
      panel.style.top = Math.max(8, rect.top - panelH - 6) + 'px';
      panel.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 380)) + 'px';
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    function findComposeAnchor() {
      const subjectInput = getComposeSubjectInput();
      const bodyInput = getComposeBodyInput();
      const field = subjectInput || bodyInput;
      if (!field) return null;
      return field.closest('form, [role="dialog"], .ui-dialog, .ReactModal__Content, .compose-message, .message-form') || field.parentElement;
    }

    function injectComposePicker() {
      const PICKER_ID = 'ces-compose-tpl';

      if (!window.location.pathname.includes('/conversations')) {
        document.getElementById(PICKER_ID)?.remove();
        return false;
      }

      const bodyInput  = getComposeBodyInput(document);
      const subjectInput = getComposeSubjectInput(document);
      if (!bodyInput && !subjectInput) {
        document.getElementById(PICKER_ID)?.remove();
        return false;
      }

      const existing = document.getElementById(PICKER_ID);
      const anchor   = bodyInput || subjectInput;
      if (existing && anchor.parentElement.contains(existing)) return true;
      existing?.remove();

      const font = '-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif';
      const wrap = document.createElement('div');
      wrap.id = PICKER_ID;
      wrap.style.cssText = 'margin-bottom:6px;border:1px solid #C7CDD1;border-radius:4px;overflow:hidden;font-family:' + font + ';';

      function render(open) {
        wrap.innerHTML = '';
        const messages = getQuickMessages();

        const hdr = document.createElement('button');
        hdr.type = 'button';
        hdr.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#F5F5F5;border:none;border-bottom:' + (open ? '1px solid #C7CDD1' : 'none') + ';cursor:pointer;font-size:12px;font-weight:700;color:#2D3B45;font-family:inherit;';
        hdr.innerHTML = '<span>Templates</span><span style="font-size:10px;color:#6B7280;">' + (open ? '▲' : '▼') + '</span>';
        hdr.addEventListener('click', () => render(!open));
        wrap.appendChild(hdr);

        if (!open) return;

        const list = document.createElement('div');
        list.style.cssText = 'background:#fff;max-height:180px;overflow-y:auto;';

        if (!messages.length) {
          const empty = document.createElement('div');
          empty.style.cssText = 'padding:10px;font-size:12px;color:#6B7280;text-align:center;';
          empty.textContent = 'No templates saved — add them in Message Templates.';
          list.appendChild(empty);
        } else {
          messages.forEach(msg => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-top:1px solid #eef1f3;gap:8px;';

            const name = document.createElement('span');
            name.style.cssText = 'font-size:13px;color:#2D3B45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;';
            name.textContent = msg.name;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Insert';
            btn.style.cssText = 'flex-shrink:0;padding:4px 12px;border:1px solid #0770B8;border-radius:3px;background:#0770B8;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;';
            btn.addEventListener('mouseenter', () => { btn.style.background = '#0860A8'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = '#0770B8'; });
            btn.addEventListener('click', () => {
              insertIntoCompose(msg.subject, msg.body);
              render(false);
            });

            row.append(name, btn);
            list.appendChild(row);
          });
        }
        wrap.appendChild(list);
      }

      render(false);

      if (bodyInput) {
        bodyInput.parentElement.insertBefore(wrap, bodyInput);
      } else {
        subjectInput.parentElement.insertAdjacentElement('afterend', wrap);
      }
      return true;
    }

    new MutationObserver(() => setTimeout(injectComposePicker, 300)).observe(document.body, { childList: true, subtree: true });
    setInterval(injectComposePicker, 1500);
    injectComposePicker();
  }

  /* =========================================================
     SPEEDGRADER COMMENT INSERTER
  ========================================================= */
  function installSpeedGraderInserter() {
    if (!/speed_grader/.test(window.location.href)) return;

    const sgPanel = document.createElement('div');
    sgPanel.id = 'ces-sg-message-panel';
    sgPanel.style.cssText = 'position:fixed;width:360px;max-height:70vh;overflow:auto;z-index:2147483642;display:none;background:#fff;border:1px solid #C7CDD1;border-radius:3px;box-shadow:0 8px 24px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif;color:#2D3B45;';
    document.body.appendChild(sgPanel);

    const sgBtn = document.createElement('button');
    sgBtn.id = 'ces-sg-message-btn';
    sgBtn.type = 'button';
    sgBtn.textContent = 'Insert Comment';
    sgBtn.title = 'Insert a stored comment into the comment box';
    sgBtn.style.cssText = 'padding:6px 12px;border:1px solid #C7CDD1;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.12);background:#fff;color:#2D3B45;font-size:13px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif;cursor:pointer;white-space:nowrap;text-align:center;transition:background .15s;';
    sgBtn.addEventListener('mouseenter', () => { sgBtn.style.background = '#F5F5F5'; sgBtn.style.borderColor = '#8B969E'; });
    sgBtn.addEventListener('mouseleave', () => { sgBtn.style.background = '#fff'; sgBtn.style.borderColor = '#C7CDD1'; });


    function insertIntoComment(text) {
      document.dispatchEvent(new CustomEvent('ce-sg-insert-comment', { detail: { text } }));
      return true;
    }

    function renderSgPanel(editId) {
      const messages = getQuickMessages();
      const editing = editId ? messages.find(m => m.id === editId) : null;
      sgPanel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #C7CDD1;flex-shrink:0;">
          <strong style="font-size:13px;">Stored Messages</strong>
          <button id="ces-sg-close" style="border:none;background:none;font-size:18px;cursor:pointer;color:#6B7280;">&times;</button>
        </div>
        <div style="padding:10px 12px;overflow-y:auto;">
          ${messages.map(msg => `
            <div style="border-bottom:1px solid #eef1f3;padding:8px 0;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <strong style="font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(msg.name)}</strong>
                <div style="display:flex;gap:4px;flex-shrink:0;">
                  <button class="ces-sg-insert ces-btn ces-btn-primary ces-btn-sm" data-id="${escapeAttr(msg.id)}">Insert</button>
                  <button class="ces-sg-edit ces-btn ces-btn-secondary ces-btn-sm" data-id="${escapeAttr(msg.id)}">Edit</button>
                  <button class="ces-sg-delete ces-btn ces-btn-danger ces-btn-sm" data-id="${escapeAttr(msg.id)}">Delete</button>
                </div>
              </div>
              <div style="font-size:12px;color:#6b7280;margin-top:3px;">${escapeHtml(msg.subject || '(no subject)')}</div>
            </div>
          `).join('')}
          <div style="margin-top:12px;border-top:1px solid #C7CDD1;padding-top:12px;">
            <div style="font-size:12px;font-weight:600;color:#2D3B45;margin-bottom:6px;">${editing ? 'Edit Message' : 'Add Message'}</div>
            <input id="ces-sg-name" class="ces-input" placeholder="Name" value="${escapeAttr(editing?.name || '')}" style="margin-bottom:6px;">
            <textarea id="ces-sg-body" class="ces-textarea" placeholder="Message body" style="min-height:80px;margin-bottom:6px;">${escapeHtml(editing?.body || '')}</textarea>
            <div style="display:flex;gap:6px;">
              <button id="ces-sg-save" class="ces-btn ces-btn-primary ces-btn-sm">${editing ? 'Update' : 'Save'}</button>
              ${editing ? '<button id="ces-sg-cancel" class="ces-btn ces-btn-secondary ces-btn-sm">Cancel</button>' : ''}
            </div>
          </div>
        </div>
      `;
      sgPanel.querySelector('#ces-sg-close').addEventListener('click', () => { sgPanel.style.display = 'none'; });
      sgPanel.querySelectorAll('.ces-sg-insert').forEach(btn => btn.addEventListener('click', () => {
        const msg = getQuickMessages().find(item => item.id === btn.dataset.id);
        if (!msg) return;
        insertIntoComment(msg.body);
        sgPanel.style.display = 'none';
      }));
      sgPanel.querySelectorAll('.ces-sg-edit').forEach(btn => btn.addEventListener('click', () => renderSgPanel(btn.dataset.id)));
      sgPanel.querySelectorAll('.ces-sg-delete').forEach(btn => btn.addEventListener('click', () => {
        saveQuickMessages(getQuickMessages().filter(m => m.id !== btn.dataset.id));
        renderSgPanel();
      }));
      sgPanel.querySelector('#ces-sg-save').addEventListener('click', () => {
        const name = sgPanel.querySelector('#ces-sg-name').value.trim();
        const body = sgPanel.querySelector('#ces-sg-body').value;
        if (!name || !body.trim()) return;
        const next = getQuickMessages().filter(m => m.id !== editId);
        next.push({ id: editId || makeQuickMessageId(), name, body });
        saveQuickMessages(next);
        renderSgPanel();
      });
      sgPanel.querySelector('#ces-sg-cancel')?.addEventListener('click', () => renderSgPanel());
    }

    sgBtn.addEventListener('click', () => {
      renderSgPanel();
      const rect = sgBtn.getBoundingClientRect();
      const panelH = sgPanel.offsetHeight || 420;
      sgPanel.style.top = Math.max(8, rect.top - panelH - 6) + 'px';
      sgPanel.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 380)) + 'px';
      sgPanel.style.display = sgPanel.style.display === 'none' ? 'flex' : 'none';
      if (sgPanel.style.display === 'flex') sgPanel.style.flexDirection = 'column';
    });

    function injectSgBtn() {
      if (document.getElementById('ces-sg-message-btn')?.isConnected) return true;
      const bar = document.getElementById('ce-sg-float-bar-row') || document.getElementById('ce-sg-float-bar');
      if (bar) {
        bar.appendChild(sgBtn);
        return true;
      }
      return false;
    }
    let _sgPoll = 0;
    const _sgTimer = window.setInterval(() => {
      const attached = injectSgBtn();
      if (attached || ++_sgPoll >= 30) {
        if (!attached && !document.getElementById('ces-sg-message-btn')?.isConnected) {
          sgBtn.style.cssText = 'position:fixed;top:110px;right:60px;z-index:2147483641;width:160px;text-align:center;padding:6px 12px;border:1px solid #C7CDD1;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.12);background:#fff;color:#2D3B45;font-size:13px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif;cursor:pointer;white-space:nowrap;transition:background .15s;';
          document.body.appendChild(sgBtn);
        }
        clearInterval(_sgTimer);
      }
    }, 1000);

    const _sgObserver = new MutationObserver(() => injectSgBtn());
    _sgObserver.observe(document.body, { childList: true, subtree: true });
  }

  /* =========================================================
     INBOX TOOLBAR
  ========================================================= */
  function installInboxToolbar() {
    if (document.getElementById('ces-inbox-bar')) return;

    const font = '-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif';

    // CSS: hides hub toolbar on inbox pages (inbox bar takes its place in flow)
    const st = document.createElement('style');
    st.id = 'ces-inbox-style';
    st.textContent = 'body.ces-inbox-mode #ce-hub { display:none!important; } body.ces-inbox-mode #ce-hub-panel { display:none!important; }';
    (document.head || document.documentElement).appendChild(st);

    // ── COLLAPSED TAB ────────────────────────────────────────────────────────
    const colTab = document.createElement('button');
    colTab.id = 'ces-inbox-tab';
    colTab.type = 'button';
    colTab.textContent = 'Messages  ▾';
    colTab.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483640;display:none;height:28px;padding:0 16px;background:#394B58;border:none;border-left:1px solid #1B303D;border-bottom:1px solid #1B303D;border-radius:0 0 0 6px;color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;cursor:pointer;font-family:' + font + ';letter-spacing:.2px;white-space:nowrap;';
    colTab.addEventListener('mouseenter', () => colTab.style.color = '#fff');
    colTab.addEventListener('mouseleave', () => colTab.style.color = 'rgba(255,255,255,0.85)');
    document.body.appendChild(colTab);

    // ── FULL BAR ─────────────────────────────────────────────────────────────
    const bar = document.createElement('div');
    bar.id = 'ces-inbox-bar';
    bar.style.cssText = 'position:relative;width:100%;height:56px;z-index:10;background:#394B58;border-bottom:1px solid #1B303D;box-shadow:0 2px 8px rgba(0,0,0,.22);display:none;align-items:center;padding:0 16px;gap:8px;font-family:' + font + ';box-sizing:border-box;flex-shrink:0;';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.5px;margin-right:4px;flex-shrink:0;';
    lbl.textContent = 'Messages';

    function mkBtn(text) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.cssText = 'height:32px;padding:0 16px;border:none;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;border-radius:4px;cursor:pointer;font-family:' + font + ';white-space:nowrap;transition:background .12s,color .12s;letter-spacing:.2px;';
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(255,255,255,0.22)'; b.style.color = '#fff'; });
      b.addEventListener('mouseleave', () => { b.style.background = 'rgba(255,255,255,0.12)'; b.style.color = 'rgba(255,255,255,0.85)'; });
      return b;
    }

    const sendBtn = mkBtn('Bulk Message Students');
    const tplBtn  = mkBtn('Message Templates');

    sendBtn.addEventListener('click', () => { if (_overlay) { _overlay.classList.add('ces-open'); showTab('send'); } });
    tplBtn.addEventListener('click',  () => { if (_overlay) { _overlay.classList.add('ces-open'); showTab('templates'); } });

    // ── HIDE / SHOW TOGGLE ───────────────────────────────────────────────────
    const hideBtn = mkBtn('Hide');
    hideBtn.style.marginLeft = 'auto';
    hideBtn.addEventListener('click', () => {
      bar.style.display = 'none';
      colTab.style.display = 'block';
      document.body.classList.add('ces-inbox-collapsed');
    });
    colTab.addEventListener('click', () => {
      colTab.style.display = 'none';
      bar.style.display = 'flex';
      document.body.classList.remove('ces-inbox-collapsed');
    });

    bar.append(lbl, sendBtn, tplBtn, hideBtn);
    // Insert before all other body children so it's first in document flow
    document.body.insertBefore(bar, document.body.firstChild);

    let _onInbox = false;

    function updateBar() {
      const onInbox = window.location.pathname.includes('/conversations');

      if (onInbox && !_onInbox) {
        // Just arrived at inbox — expand by default
        document.body.classList.add('ces-inbox-mode');
        document.body.classList.remove('ces-inbox-collapsed');
        bar.style.display = 'flex';
        colTab.style.display = 'none';
      } else if (!onInbox && _onInbox) {
        // Left inbox — restore hub toolbar
        document.body.classList.remove('ces-inbox-mode', 'ces-inbox-collapsed');
        bar.style.display = 'none';
        colTab.style.display = 'none';
      }
      _onInbox = onInbox;
    }

    updateBar();
    new MutationObserver(() => setTimeout(updateBar, 200)).observe(document.body, { childList: true, subtree: false });
    setInterval(updateBar, 1500);
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
  installQuickMessageInserter();
  installSpeedGraderInserter();
  installInboxToolbar();
})();
