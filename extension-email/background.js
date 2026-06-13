// Canvas Message System - scheduled automation runner

const STORAGE_KEYS = {
  TEMPLATES: 'ces_templates',
  TEACHER_NAME: 'ces_teacher_name',
  API_TOKEN: 'ces_canvas_api_token',
  CANVAS_BASE: 'ces_canvas_base',
  AUTOMATIONS: 'ces_automations',
  AUTO_LOGS: 'ces_automation_logs',
};

const ALARM_NAME = 'ces-automation-check';
const CHECK_MINUTES = 60;

const DEFAULT_TEMPLATES = {
  auto_late: {
    subject: 'Past Due Work in {{courseName}}',
    body: 'Hi {{studentName}},\n\nThis is a reminder that the following work in {{courseName}} is currently past due:\n\n{{missingAssignmentList}}\n\nPlease submit what you can as soon as possible. If you need help making a plan, reply to this message or visit office hours.\n\nBest regards,\n{{teacherName}}',
  },
  auto_upcoming: {
    subject: 'Upcoming Work in {{courseName}}',
    body: 'Hi {{studentName}},\n\nHere is the work coming up in {{courseName}} over the next {{daysForward}} days:\n\n{{assignmentList}}\n\nPlease check Canvas for full instructions, required materials, and submission details.\n\nBest regards,\n{{teacherName}}',
  },
  auto_midpoint: {
    subject: 'Midpoint Progress Check for {{courseName}}',
    body: 'Hi {{studentName}},\n\nWe are at the midpoint of {{courseName}}, so I am sharing a progress check.\n\nCurrent Grade: {{currentGrade}} ({{currentScore}}%)\n\n{{missingSection}}\n\n{{upcomingSection}}\n\nThere is still time to make meaningful adjustments. Please reach out if you want help prioritizing next steps.\n\nBest regards,\n{{teacherName}}',
  },
  auto_low_grade: {
    subject: 'Grade Check-In for {{courseName}}',
    body: 'Hi {{studentName}},\n\nI am reaching out because your current performance in {{courseName}} has fallen below the alert threshold I set for the course.\n\n{{gradeAlertDetail}}\n\nThis message is meant to catch the issue early enough that you can respond. Please review your recent feedback in Canvas and reach out if you would like help making a recovery plan.\n\nBest regards,\n{{teacherName}}',
  },
};

chrome.runtime.onInstalled.addListener(ensureAutomationAlarm);
chrome.runtime.onStartup.addListener(ensureAutomationAlarm);
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) runAutomations().catch(error => {
    addAutomationLog({ status: 'failed', note: `Background automation check failed: ${error.message}` });
  });
});

ensureAutomationAlarm();

function ensureAutomationAlarm() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_MINUTES });
}

async function getStored(keys) {
  return chrome.storage.local.get(keys);
}

async function setStored(values) {
  return chrome.storage.local.set(values);
}

function parseJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch (_err) { return fallback; }
}

async function getAutomations() {
  const stored = await getStored([STORAGE_KEYS.AUTOMATIONS]);
  return parseJson(stored[STORAGE_KEYS.AUTOMATIONS], []);
}

async function getAutomationLogs() {
  const stored = await getStored([STORAGE_KEYS.AUTO_LOGS]);
  return parseJson(stored[STORAGE_KEYS.AUTO_LOGS], []);
}

async function saveAutomationLogs(logs) {
  await setStored({ [STORAGE_KEYS.AUTO_LOGS]: JSON.stringify(logs.slice(-500)) });
}

async function addAutomationLog(entry) {
  const logs = await getAutomationLogs();
  logs.push({ id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), ...entry });
  await saveAutomationLogs(logs);
}

function renderTemplate(template, vars) {
  let text = String(template || '');
  for (const [key, val] of Object.entries(vars)) {
    text = text.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), val == null ? '' : String(val));
  }
  return text;
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h\d|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

function messageBody(template, vars) {
  const body = renderTemplate(template.body || '', vars);
  return isHtml(body) ? htmlToText(body) : body;
}

function announcementBody(template, vars) {
  const body = renderTemplate(template.body || '', vars);
  return isHtml(body) ? body : `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAssignmentList(assignments) {
  if (!assignments.length) return '(none)';
  return assignments.map(assignment => {
    const due = assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date';
    return `  - ${assignment.name || assignment.assignment?.name || 'Unnamed'} (Due: ${due})`;
  }).join('\n');
}

function formatAssignmentListHtml(assignments, emptyText = 'No assignments to show.') {
  if (!assignments.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<ul>${assignments.map(assignment => {
    const due = assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date';
    return `<li><strong>${escapeHtml(assignment.name || assignment.assignment?.name || 'Unnamed')}</strong> Due: ${escapeHtml(due)}</li>`;
  }).join('')}</ul>`;
}

function getUpcomingAssignments(assignments, daysForward) {
  const now = new Date();
  const future = new Date(now.getTime() + daysForward * 86400000);
  return assignments.filter(assignment => {
    if (!assignment.due_at) return false;
    const due = new Date(assignment.due_at);
    return due >= now && due <= future;
  });
}

function getMissingAssignments(submissions, daysBack) {
  const cutoff = new Date(Date.now() - daysBack * 86400000);
  return submissions.filter(submission => {
    if (!submission.assignment) return false;
    const due = submission.assignment.due_at ? new Date(submission.assignment.due_at) : null;
    if (!due || due < cutoff || due > new Date()) return false;
    return submission.workflow_state === 'unsubmitted' || submission.missing;
  });
}

function frequencyStamp(frequency) {
  if (frequency === 'daily') return new Date().toISOString().slice(0, 10);
  if (frequency === 'weekly') {
    const now = new Date();
    const first = new Date(now.getFullYear(), 0, 1);
    const dayCount = Math.floor((now - first) / 86400000);
    return `${now.getFullYear()}-W${Math.ceil((dayCount + first.getDay() + 1) / 7)}`;
  }
  return 'once';
}

function alreadyLogged(logs, automationId, dedupeKey) {
  return logs.some(log => log.automationId === automationId && log.dedupeKey === dedupeKey && (log.status === 'sent' || log.status === 'draft'));
}

function automationDelivery(automation) {
  if (automation.delivery) return automation.delivery;
  return (automation.audience || 'announcement') === 'students' ? 'students' : 'announcement';
}

function wantsStudentMessages(automation) {
  const delivery = automationDelivery(automation);
  return delivery === 'students' || delivery === 'both';
}

function wantsAnnouncement(automation) {
  const delivery = automationDelivery(automation);
  return delivery === 'announcement' || delivery === 'both';
}

function plainAnnouncementBody(text) {
  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}

function buildAutomationAnnouncement(automation, subject, body, dedupePart) {
  return {
    kind: 'announcement',
    studentName: 'Students',
    subject,
    body: plainAnnouncementBody(body),
    dedupeKey: `${automation.id}:${dedupePart}:announcement:${frequencyStamp(automation.frequency)}`,
  };
}

function baseForAutomation(automation, fallbackBase) {
  return String(automation.canvasBase || fallbackBase || '').replace(/\/$/, '');
}

function apiUrl(base, endpoint) {
  return `${base}/api/v1${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100`;
}

async function canvasGet(base, token, endpoint) {
  let results = [];
  let url = apiUrl(base, endpoint);
  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    results = results.concat(data);
    const link = response.headers.get('Link') || '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }
  return results;
}

async function canvasPost(base, token, endpoint, body) {
  const formData = new URLSearchParams();
  const flatten = (obj, prefix) => {
    for (const [key, val] of Object.entries(obj)) {
      const formKey = prefix ? `${prefix}[${key}]` : key;
      if (Array.isArray(val)) val.forEach(item => formData.append(`${formKey}[]`, String(item)));
      else if (typeof val === 'boolean') formData.append(formKey, val ? '1' : '0');
      else if (typeof val === 'object' && val !== null) flatten(val, formKey);
      else formData.append(formKey, String(val));
    }
  };
  flatten(body, '');
  const response = await fetch(`${base}/api/v1${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Canvas API error: ${response.status} - ${text}`);
  try { return JSON.parse(text); } catch (_err) { return text; }
}

async function sendCanvasMessage(base, token, courseId, recipientId, subject, body) {
  return canvasPost(base, token, '/conversations', {
    recipients: [String(recipientId)],
    subject,
    body,
    force_new: true,
    group_conversation: false,
    context_code: `course_${courseId}`,
    mode: 'sync',
  });
}

async function postAnnouncement(base, token, courseId, title, message) {
  return canvasPost(base, token, `/courses/${courseId}/discussion_topics`, {
    title,
    message,
    is_announcement: true,
    published: true,
  });
}

async function getStudents(base, token, courseId) {
  return canvasGet(base, token, `/courses/${courseId}/users?enrollment_type[]=student&include[]=email&include[]=enrollments`);
}

async function getAssignments(base, token, courseId) {
  return canvasGet(base, token, `/courses/${courseId}/assignments?order_by=due_at`);
}

async function getSubmissions(base, token, courseId, studentId) {
  return canvasGet(base, token, `/courses/${courseId}/students/submissions?student_ids[]=${studentId}&include[]=assignment`);
}

async function getEnrollments(base, token, courseId) {
  return canvasGet(base, token, `/courses/${courseId}/enrollments?type[]=StudentEnrollment&state[]=active&include[]=grades`);
}

async function getTemplates() {
  const stored = await getStored([STORAGE_KEYS.TEMPLATES]);
  return { ...DEFAULT_TEMPLATES, ...parseJson(stored[STORAGE_KEYS.TEMPLATES], {}) };
}

function templateKeyForType(type) {
  return { late: 'auto_late', upcoming: 'auto_upcoming', midpoint: 'auto_midpoint', low_grade: 'auto_low_grade' }[type];
}

async function buildAutomationMessages(automation, context) {
  const { base, token, teacherName, templates } = context;
  const template = templates[templateKeyForType(automation.type)] || DEFAULT_TEMPLATES[templateKeyForType(automation.type)];
  const courseName = automation.courseName || `Course ${automation.courseId}`;

  if (automation.type === 'late') {
    const students = await getStudents(base, token, automation.courseId);
    const maxAge = Number(automation.daysBack) || 14;
    const messages = [];
    const announcementAssignments = new Map();
    for (const student of students) {
      const missing = getMissingAssignments(await getSubmissions(base, token, automation.courseId, student.id), maxAge);
      if (!missing.length) continue;
      const missingAssignments = missing.map(submission => submission.assignment || submission);
      missingAssignments.forEach(assignment => announcementAssignments.set(String(assignment.id || assignment.name), assignment));
      if (!wantsStudentMessages(automation)) continue;
      const vars = {
        studentName: student.name || student.sortable_name || 'Student',
        teacherName,
        courseName,
        daysBack: String(maxAge),
        missingAssignmentList: formatAssignmentList(missingAssignments),
        missingAssignmentListHtml: formatAssignmentListHtml(missingAssignments, 'No missing assignments found.'),
      };
      const assignmentIds = missing.map(submission => submission.assignment_id || submission.assignment?.id || submission.id).sort().join(',');
      messages.push({
        kind: 'message',
        studentId: student.id,
        studentName: vars.studentName,
        subject: renderTemplate(template.subject, vars),
        body: messageBody(template, vars),
        dedupeKey: `${automation.id}:late:${student.id}:${assignmentIds}:${frequencyStamp(automation.frequency)}`,
      });
    }
    if (wantsAnnouncement(automation) && announcementAssignments.size) {
      const assignments = [...announcementAssignments.values()];
      messages.push(buildAutomationAnnouncement(
        automation,
        `Past Due Work Reminder for ${courseName}`,
        `This is a class reminder to check Canvas for any past due work in ${courseName}.\n\n${formatAssignmentList(assignments)}\n\nIf any of these items show as missing for you, please submit what you can as soon as possible or reach out if you need help making a plan.\n\nThank you,\n${teacherName}`,
        `late:${assignments.map(item => item.id || item.name).sort().join(',')}`
      ));
    }
    return messages;
  }

  if (automation.type === 'upcoming') {
    const daysForward = Number(automation.daysForward) || 7;
    const upcoming = getUpcomingAssignments(await getAssignments(base, token, automation.courseId), daysForward);
    if (!upcoming.length) return [];
    const vars = {
      teacherName,
      courseName,
      daysForward: String(daysForward),
      assignmentList: formatAssignmentList(upcoming),
      assignmentListHtml: formatAssignmentListHtml(upcoming),
    };
    const assignmentIds = upcoming.map(assignment => assignment.id).sort().join(',');
    const messages = [];
    if (wantsAnnouncement(automation)) {
      const announcementVars = { ...vars, studentName: 'Students' };
      messages.push({
        kind: 'announcement',
        studentName: 'Students',
        subject: renderTemplate(template.subject, announcementVars),
        body: announcementBody(template, announcementVars),
        dedupeKey: `${automation.id}:upcoming:announcement:${assignmentIds}:${frequencyStamp(automation.frequency)}`,
      });
    }
    if (wantsStudentMessages(automation)) {
      messages.push(...(await getStudents(base, token, automation.courseId)).map(student => {
        const studentVars = { ...vars, studentName: student.name || student.sortable_name || 'Student' };
        return {
          kind: 'message',
          studentId: student.id,
          studentName: studentVars.studentName,
          subject: renderTemplate(template.subject, studentVars),
          body: messageBody(template, studentVars),
          dedupeKey: `${automation.id}:upcoming:${student.id}:${assignmentIds}:${frequencyStamp(automation.frequency)}`,
        };
      }));
    }
    return messages;
  }

  if (automation.type === 'midpoint') {
    const start = automation.startDate ? new Date(`${automation.startDate}T00:00:00`) : null;
    const end = automation.endDate ? new Date(`${automation.endDate}T23:59:59`) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (new Date() < new Date((start.getTime() + end.getTime()) / 2)) return [];
    const enrollments = await getEnrollments(base, token, automation.courseId);
    const assignments = await getAssignments(base, token, automation.courseId);
    const upcoming = getUpcomingAssignments(assignments, Number(automation.daysForward) || 7);
    const messages = [];
    for (const student of await getStudents(base, token, automation.courseId)) {
      const enrollment = enrollments.find(item => item.user_id === student.id && item.grades);
      const missing = getMissingAssignments(await getSubmissions(base, token, automation.courseId, student.id), Number(automation.daysBack) || 14);
      const missingAssignments = missing.map(submission => submission.assignment || submission);
      const vars = {
        studentName: student.name || student.sortable_name || 'Student',
        teacherName,
        courseName,
        currentGrade: enrollment?.grades?.current_grade || 'N/A',
        currentScore: String(enrollment?.grades?.current_score || 'N/A'),
        daysForward: String(Number(automation.daysForward) || 7),
        daysBack: String(Number(automation.daysBack) || 14),
        missingSection: missing.length ? `Missing Assignments:\n${formatAssignmentList(missingAssignments)}` : 'You have no missing assignments. Great work!',
        upcomingSection: upcoming.length ? `Upcoming Assignments:\n${formatAssignmentList(upcoming)}` : 'No upcoming assignments in the selected date range.',
        missingSectionHtml: formatAssignmentListHtml(missingAssignments, 'You have no missing assignments. Great work.'),
        upcomingSectionHtml: formatAssignmentListHtml(upcoming, 'No upcoming assignments in the selected date range.'),
      };
      messages.push({
        kind: 'message',
        studentId: student.id,
        studentName: vars.studentName,
        subject: renderTemplate(template.subject, vars),
        body: messageBody(template, vars),
        dedupeKey: `${automation.id}:midpoint:${student.id}:once`,
      });
    }
    return messages;
  }

  if (automation.type === 'low_grade') {
    const threshold = Number(automation.threshold) || 70;
    const messages = [];
    if ((automation.gradeScope || 'overall') === 'overall') {
      const enrollments = await getEnrollments(base, token, automation.courseId);
      for (const student of await getStudents(base, token, automation.courseId)) {
        const enrollment = enrollments.find(item => item.user_id === student.id && item.grades);
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
          gradeAlertDetailHtml: `<p>${escapeHtml(detail).replace(/\n/g, '<br>')}</p>`,
        };
        messages.push({
          kind: 'message',
          studentId: student.id,
          studentName: vars.studentName,
          subject: renderTemplate(template.subject, vars),
          body: messageBody(template, vars),
          dedupeKey: `${automation.id}:low-overall:${student.id}:below-${threshold}:once`,
        });
      }
      return messages;
    }
    for (const student of await getStudents(base, token, automation.courseId)) {
      const submissions = await getSubmissions(base, token, automation.courseId, student.id);
      for (const submission of submissions) {
        const score = Number(submission.score);
        const points = Number(submission.assignment?.points_possible);
        if (!Number.isFinite(score) || !Number.isFinite(points) || points <= 0 || (score / points) * 100 >= threshold) continue;
        const pct = Math.round((score / points) * 1000) / 10;
        const detail = `${submission.assignment?.name || 'Assignment'} score: ${pct}%\nAlert threshold: ${threshold}%`;
        const vars = {
          studentName: student.name || student.sortable_name || 'Student',
          teacherName,
          courseName,
          currentGrade: '',
          currentScore: String(pct),
          gradeAlertDetail: detail,
          gradeAlertDetailHtml: `<p>${escapeHtml(detail).replace(/\n/g, '<br>')}</p>`,
        };
        messages.push({
          kind: 'message',
          studentId: student.id,
          studentName: vars.studentName,
          subject: renderTemplate(template.subject, vars),
          body: messageBody(template, vars),
          dedupeKey: `${automation.id}:low-assignment:${student.id}:${submission.assignment_id}:below-${threshold}:once`,
        });
      }
    }
    return messages;
  }

  return [];
}

async function runAutomations() {
  const stored = await getStored([STORAGE_KEYS.API_TOKEN, STORAGE_KEYS.TEACHER_NAME, STORAGE_KEYS.CANVAS_BASE]);
  const token = String(stored[STORAGE_KEYS.API_TOKEN] || '').trim();
  if (!token) {
    await addAutomationLog({ status: 'failed', note: 'Background automation requires a Canvas API token in Settings.' });
    return;
  }
  const teacherName = stored[STORAGE_KEYS.TEACHER_NAME] || 'Teacher';
  const automations = (await getAutomations()).filter(automation => automation.active !== false);
  const logs = await getAutomationLogs();
  const sentKeys = logs.filter(log => log.status === 'sent' || log.status === 'draft');
  const templates = await getTemplates();

  for (const automation of automations) {
    const base = baseForAutomation(automation, stored[STORAGE_KEYS.CANVAS_BASE]);
    if (!base) {
      await addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'failed', note: 'Missing Canvas base URL. Open Canvas once and resave this automation.' });
      continue;
    }
    try {
      const messages = await buildAutomationMessages(automation, { base, token, teacherName, templates });
      for (const message of messages) {
        if (alreadyLogged(sentKeys, automation.id, message.dedupeKey)) continue;
        try {
          if ((automation.mode || 'auto') === 'draft') {
            await addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'draft', dedupeKey: message.dedupeKey, recipientName: message.studentName || 'Students', subject: message.subject, note: 'Matched condition; draft mode did not send.' });
            sentKeys.push({ automationId: automation.id, status: 'draft', dedupeKey: message.dedupeKey });
          } else if (message.kind === 'announcement') {
            await postAnnouncement(base, token, automation.courseId, message.subject, message.body);
            sentKeys.push({ automationId: automation.id, status: 'sent', dedupeKey: message.dedupeKey });
            await addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'sent', dedupeKey: message.dedupeKey, recipientName: 'Students', subject: message.subject });
          } else {
            await sendCanvasMessage(base, token, automation.courseId, message.studentId, message.subject, message.body);
            sentKeys.push({ automationId: automation.id, status: 'sent', dedupeKey: message.dedupeKey });
            await addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'sent', dedupeKey: message.dedupeKey, recipientName: message.studentName, subject: message.subject });
          }
        } catch (error) {
          await addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'failed', dedupeKey: message.dedupeKey, recipientName: message.studentName || 'Students', subject: message.subject, note: error.message });
        }
      }
    } catch (error) {
      await addAutomationLog({ automationId: automation.id, automationName: automation.name, courseId: automation.courseId, courseName: automation.courseName, status: 'failed', note: error.message });
    }
  }
}
