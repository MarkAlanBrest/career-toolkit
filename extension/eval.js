// Canvas Teacher Evaluation Tool — hub panel version
(function () {
  'use strict';

  // ── CONSTANTS ─────────────────────────────────────────────────────────────────
  const PER_PAGE = 100;
  const API_DELAY = 150;

  const CATEGORY_WEIGHTS = {
    assignmentStructure: 0.2,
    studentEngagement:   0.2,
    gradingEfficiency:   0.15,
    communication:       0.15,
    courseQuality:       0.15,
    studentPerformance:  0.15,
  };

  const DELIVERY_MULTIPLIERS = {
    online:      { communication: 1.2,  engagement: 1.1, assignments: 1.0 },
    hybrid:      { communication: 1.05, engagement: 1.0, assignments: 0.95 },
    'in-person': { communication: 0.85, engagement: 0.9, assignments: 0.9 },
  };

  const SCORE_LABELS = [
    { min: 90, label: 'Excellent',         color: '#10B981' },
    { min: 80, label: 'Very Good',         color: '#34D399' },
    { min: 70, label: 'Good',              color: '#FBBF24' },
    { min: 60, label: 'Needs Improvement', color: '#F59E0B' },
    { min: 0,  label: 'Critical',          color: '#EF4444' },
  ];

  const SETTINGS_META = {
    assignmentStructure: {
      label: 'Assignment Structure', icon: '📝',
      description: 'Evaluates assignment quantity, rubric adoption, due dates, and instruction clarity.',
      items: {
        assignmentCount:   { label: 'Assignment Count & Frequency' },
        rubricUsage:       { label: 'Rubric Usage' },
        dueDateUsage:      { label: 'Due Date Usage' },
        instructionLength: { label: 'Instruction Clarity' },
      },
    },
    studentEngagement: {
      label: 'Student Engagement', icon: '📊',
      description: 'Tracks submission rates, missing work, and on-time behavior.',
      items: {
        submissionRate: { label: 'Submission Rate' },
        missingWork:    { label: 'Missing Work' },
        onTimeRate:     { label: 'On-Time Rate' },
      },
    },
    gradingEfficiency: {
      label: 'Grading Efficiency', icon: '⏱️',
      description: 'Speed and consistency of returning graded work.',
      items: {
        gradingSpeed:       { label: 'Avg Grading Speed' },
        quickGrading:       { label: 'Quick Grading (≤ 3 days)' },
        gradingConsistency: { label: 'Grading Consistency' },
      },
    },
    communication: {
      label: 'Communication', icon: '💬',
      description: 'Announcements, discussions, and personalized feedback.',
      items: {
        announcements:    { label: 'Announcements' },
        discussions:      { label: 'Discussion Boards' },
        feedbackComments: { label: 'Submission Feedback' },
      },
    },
    courseQuality: {
      label: 'Course Quality / Rigor', icon: '🎯',
      description: 'Assignment diversity, depth, and module coverage.',
      items: {
        assignmentVariety: { label: 'Assignment Type Variety' },
        assignmentDepth:   { label: 'Assignment Depth' },
        moduleCoverage:    { label: 'Module Coverage' },
      },
    },
    studentPerformance: {
      label: 'Student Performance', icon: '🏆',
      description: 'Class averages, pass rates, and improvement trend.',
      items: {
        classAverage:     { label: 'Class Average Grade' },
        passRate:         { label: 'Pass Rate (≥ 70%)' },
        improvementTrend: { label: 'Score Improvement Trend' },
      },
    },
  };

  // ── SETTINGS ──────────────────────────────────────────────────────────────────
  function getDefaultSettings() {
    const s = {};
    for (const [k, m] of Object.entries(SETTINGS_META)) {
      s[k] = { enabled: true, items: {} };
      for (const ik of Object.keys(m.items)) s[k].items[ik] = true;
    }
    return s;
  }

  async function loadSettings() {
    const stored = await new Promise(r => chrome.storage.local.get('ce_eval_settings', r));
    const saved = stored.ce_eval_settings;
    if (!saved) return getDefaultSettings();
    const defaults = getDefaultSettings();
    for (const k of Object.keys(defaults)) {
      if (!saved[k]) { saved[k] = defaults[k]; continue; }
      if (saved[k].enabled === undefined) saved[k].enabled = true;
      if (!saved[k].items) saved[k].items = {};
      for (const ik of Object.keys(defaults[k].items))
        if (saved[k].items[ik] === undefined) saved[k].items[ik] = true;
    }
    return saved;
  }

  function saveSettings(settings) {
    chrome.storage.local.set({ ce_eval_settings: settings });
  }

  async function loadCtx() {
    const stored = await new Promise(r => chrome.storage.local.get('ce_eval_context', r));
    return stored.ce_eval_context || {};
  }

  function saveCtx(ctx) {
    chrome.storage.local.set({ ce_eval_context: ctx });
  }

  // ── UTILITIES ─────────────────────────────────────────────────────────────────
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mean  = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const stddev = arr => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  };
  const daysBetween = (a, b) => (new Date(b) - new Date(a)) / 86400000;
  const scoreLabel  = score => SCORE_LABELS.find(s => score >= s.min) || SCORE_LABELS[SCORE_LABELS.length - 1];
  const pct         = (n, d) => d ? (n / d) * 100 : 0;
  const sleep       = ms => new Promise(r => setTimeout(r, ms));
  const esc         = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
  const weightedAvg = items => {
    const active = items.filter(i => i.enabled !== false);
    if (!active.length) return 50;
    const tw = active.reduce((s, i) => s + i.weight, 0);
    return tw ? active.reduce((s, i) => s + i.value * (i.weight / tw), 0) : 50;
  };

  // ── CANVAS API ────────────────────────────────────────────────────────────────
  const getCourseId = () => window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || null;
  const apiBase = () => window.location.origin + '/api/v1';

  async function apiFetch(url, params = {}) {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('per_page', PER_PAGE);
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach(x => u.searchParams.append(k, x));
      else u.searchParams.set(k, v);
    }
    const resp = await fetch(u.toString(), { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('Canvas API ' + resp.status + ' — ' + u.pathname);
    return resp;
  }

  async function apiFetchAll(url, params = {}) {
    let results = [];
    const r0 = await apiFetch(url, params);
    results = results.concat(await r0.json());
    let next = parseLinkNext(r0.headers.get('Link'));
    while (next) {
      await sleep(API_DELAY);
      const r = await fetch(next, { credentials: 'same-origin' });
      if (!r.ok) break;
      results = results.concat(await r.json());
      next = parseLinkNext(r.headers.get('Link'));
    }
    return results;
  }

  function parseLinkNext(h) {
    if (!h) return null;
    for (const p of h.split(',')) { const m = p.match(/<([^>]+)>;\s*rel="next"/); if (m) return m[1]; }
    return null;
  }

  const fetchCourseInfo = id =>
    apiFetch(apiBase() + '/courses/' + id, { 'include[]': ['total_students', 'teachers'] }).then(r => r.json());

  const fetchAssignments = id =>
    apiFetchAll(apiBase() + '/courses/' + id + '/assignments', { 'include[]': ['rubric'], order_by: 'due_at' });

  const fetchSubmissionsForAssignment = (cid, aid) =>
    apiFetchAll(apiBase() + '/courses/' + cid + '/assignments/' + aid + '/submissions', { 'include[]': ['submission_comments'] });

  async function fetchAllSubmissions(cid, ids, onProgress) {
    const all = {};
    for (let i = 0; i < ids.length; i++) {
      try { all[ids[i]] = await fetchSubmissionsForAssignment(cid, ids[i]); }
      catch { all[ids[i]] = []; }
      if (onProgress) onProgress('Fetching submissions ' + (i + 1) + '/' + ids.length + '…');
      if (i < ids.length - 1) await sleep(API_DELAY);
    }
    return all;
  }

  const fetchEnrollments = (cid, type) =>
    apiFetchAll(apiBase() + '/courses/' + cid + '/enrollments', { 'type[]': [type], 'state[]': ['active', 'completed'] });

  const fetchDiscussions = cid =>
    apiFetchAll(apiBase() + '/courses/' + cid + '/discussion_topics', { plain_user_content: true });

  const fetchAnnouncements = cid =>
    apiFetchAll(apiBase() + '/announcements', { 'context_codes[]': ['course_' + cid] });

  const fetchModules = cid =>
    apiFetchAll(apiBase() + '/courses/' + cid + '/modules', { 'include[]': ['items'] });

  async function collectAllData(cid, onProgress) {
    onProgress('Fetching course info…');
    const courseInfo = await fetchCourseInfo(cid);
    onProgress('Fetching assignments…');
    const assignments = await fetchAssignments(cid);
    const submissions = await fetchAllSubmissions(cid, assignments.map(a => a.id), onProgress);
    onProgress('Fetching enrollments…');
    const [studentEnrollments, teacherEnrollments] = await Promise.all([
      fetchEnrollments(cid, 'StudentEnrollment'),
      fetchEnrollments(cid, 'TeacherEnrollment'),
    ]);
    onProgress('Fetching announcements…');
    const announcements = await fetchAnnouncements(cid);
    onProgress('Fetching discussions…');
    const discussions = await fetchDiscussions(cid);
    onProgress('Fetching modules…');
    const modules = await fetchModules(cid);
    return { courseInfo, assignments, submissions, studentEnrollments, teacherEnrollments, announcements, discussions, modules };
  }

  // ── METRICS ──────────────────────────────────────────────────────────────────
  function computeMetrics(data, context) {
    const { assignments, submissions, studentEnrollments, announcements, discussions, modules } = data;
    const { termWeeks } = context;
    const studentCount = studentEnrollments.length || 1;
    const published = assignments.filter(a => a.published !== false);
    const assignmentCount = published.length;
    const rubricUsagePct  = pct(published.filter(a => a.rubric?.length > 0).length, assignmentCount);
    const dueDateUsagePct = pct(published.filter(a => a.due_at).length, assignmentCount);
    const avgAssignmentLength = mean(published.map(a => (a.description || '').replace(/<[^>]*>/g, '').length));

    let totalExpected = 0, totalSubmitted = 0, totalOnTime = 0;
    let totalGraded = 0, totalWithComments = 0, quickGraded = 0;
    const gradingDays = [];

    for (const a of published) {
      const subs = submissions[a.id] || [];
      const dueDate = a.due_at ? new Date(a.due_at) : null;
      for (const s of subs) {
        if (s.workflow_state === 'unsubmitted' && !s.submitted_at) continue;
        totalExpected++;
        if (s.workflow_state === 'submitted' || s.workflow_state === 'graded' || s.submitted_at) {
          totalSubmitted++;
          if (dueDate && s.submitted_at && new Date(s.submitted_at) <= dueDate) totalOnTime++;
        }
        if (s.workflow_state === 'graded' && s.graded_at && s.submitted_at) {
          totalGraded++;
          const d = daysBetween(s.submitted_at, s.graded_at);
          if (d >= 0) { gradingDays.push(d); if (d <= 3) quickGraded++; }
        }
        if (s.submission_comments?.length > 0) totalWithComments++;
      }
    }

    const assignmentsWithDue = published.filter(a => a.due_at && new Date(a.due_at) < new Date());
    totalExpected = Math.max(totalExpected, assignmentsWithDue.length * studentCount);
    const totalMissing = Math.max(0, totalExpected - totalSubmitted);

    const submissionTypes = new Set();
    published.forEach(a => a.submission_types?.forEach(t => submissionTypes.add(t)));
    const allTypes = ['online_text_entry','online_upload','online_quiz','discussion_topic','external_tool','media_recording','online_url'];

    const moduleCount = modules.length;
    const modulesWithItems = modules.filter(m => m.items?.length > 0).length;

    const finalGrades = studentEnrollments.map(e => e.grades?.current_score ?? null).filter(g => g !== null);
    const classAvgPct = mean(finalGrades);
    const passRatePct = pct(finalGrades.filter(g => g >= 70).length, finalGrades.length);

    let improvementTrend = 0;
    if (published.length >= 4) {
      const sorted = [...published].sort((a, b) => new Date(a.due_at || 0) - new Date(b.due_at || 0));
      const mid = Math.floor(sorted.length / 2);
      const avgScore = assgns => {
        const scores = [];
        for (const a of assgns) for (const s of (submissions[a.id] || []))
          if (s.score != null && a.points_possible > 0) scores.push((s.score / a.points_possible) * 100);
        return mean(scores);
      };
      improvementTrend = avgScore(sorted.slice(mid)) - avgScore(sorted.slice(0, mid));
    }

    const announcementCount = announcements.length;
    const discussionCount = discussions.filter(d => d.discussion_type !== 'side_comment' && !d.is_announcement).length;

    return {
      assignmentCount, assignmentsPerWeek: termWeeks ? assignmentCount / termWeeks : 0,
      avgAssignmentLength, rubricUsagePct, dueDateUsagePct,
      submissionRatePct: pct(totalSubmitted, totalExpected),
      missingWorkPct: pct(totalMissing, totalExpected),
      onTimePct: totalSubmitted ? pct(totalOnTime, totalSubmitted) : 0,
      totalSubmitted, totalExpected,
      avgGradingDays: mean(gradingDays),
      quickGradedPct: totalGraded ? pct(quickGraded, totalGraded) : 0,
      gradingDaysStdDev: stddev(gradingDays),
      totalGraded,
      announcementCount, announcementsPerWeek: termWeeks ? announcementCount / termWeeks : 0,
      feedbackCoveragePct: totalGraded ? pct(totalWithComments, totalGraded) : 0,
      discussionCount,
      assignmentTypeVariety: pct(submissionTypes.size, allTypes.length),
      avgPoints: mean(published.map(a => a.points_possible || 0)),
      moduleCoveragePct: moduleCount ? pct(modulesWithItems, moduleCount) : 100,
      moduleCount, classAvgPct, passRatePct, improvementTrend, studentCount,
    };
  }

  // ── SCORING ──────────────────────────────────────────────────────────────────
  function normalizeExpectations(context) {
    const mult = DELIVERY_MULTIPLIERS[context.deliveryType] || DELIVERY_MULTIPLIERS.online;
    const expected = Math.max(1, (context.courseHours / 5) * mult.assignments);
    return {
      expectedAssignments: expected,
      expectedAssignmentsPerWeek: context.termWeeks ? expected / context.termWeeks : 1,
      expectedAnnouncementsPerWeek: 1.0 * mult.communication,
      expectedSubmissionRate: 85 * mult.engagement,
    };
  }

  function scoreAssignmentStructure(m, norm, s) {
    const si = s.assignmentStructure.items;
    const qr = clamp(m.assignmentCount / norm.expectedAssignments, 0, 1.5);
    const lenScore = m.avgAssignmentLength < 50 ? 15 : m.avgAssignmentLength < 150 ? 40 : m.avgAssignmentLength < 300 ? 65 : m.avgAssignmentLength < 600 ? 85 : 100;
    return clamp(Math.round(weightedAvg([
      { value: clamp(qr <= 1 ? qr * 100 : 100 - (qr - 1) * 30, 0, 100), weight: 0.3,  enabled: si.assignmentCount },
      { value: clamp(m.rubricUsagePct,  0, 100), weight: 0.25, enabled: si.rubricUsage },
      { value: clamp(m.dueDateUsagePct, 0, 100), weight: 0.25, enabled: si.dueDateUsage },
      { value: lenScore,                          weight: 0.2,  enabled: si.instructionLength },
    ])), 0, 100);
  }

  function scoreStudentEngagement(m, norm, s) {
    const si = s.studentEngagement.items;
    return clamp(Math.round(weightedAvg([
      { value: clamp((m.submissionRatePct / norm.expectedSubmissionRate) * 100, 0, 100), weight: 0.4, enabled: si.submissionRate },
      { value: clamp(m.onTimePct, 0, 100),              weight: 0.3, enabled: si.onTimeRate },
      { value: clamp(100 - m.missingWorkPct, 0, 100),   weight: 0.3, enabled: si.missingWork },
    ])), 0, 100);
  }

  function scoreGradingEfficiency(m, s) {
    const si = s.gradingEfficiency.items;
    const d = m.avgGradingDays;
    const spd = m.totalGraded === 0 ? 50 : d <= 1 ? 100 : d <= 2 ? 90 : d <= 3 ? 80 : d <= 5 ? 65 : d <= 7 ? 45 : d <= 10 ? 25 : 10;
    const sd = m.gradingDaysStdDev;
    const con = m.totalGraded === 0 ? 50 : sd <= 1 ? 100 : sd <= 2 ? 85 : sd <= 4 ? 65 : sd <= 7 ? 40 : 20;
    return clamp(Math.round(weightedAvg([
      { value: spd,                             weight: 0.4, enabled: si.gradingSpeed },
      { value: clamp(m.quickGradedPct, 0, 100), weight: 0.3, enabled: si.quickGrading },
      { value: con,                             weight: 0.3, enabled: si.gradingConsistency },
    ])), 0, 100);
  }

  function scoreCommunication(m, norm, s) {
    const si = s.communication.items;
    const freq = m.announcementsPerWeek, exp = norm.expectedAnnouncementsPerWeek;
    const annScore = freq >= exp * 2 ? 100 : freq >= exp ? 80 : freq >= exp * 0.5 ? 55 : freq > 0 ? 30 : 0;
    const d = m.discussionCount;
    const discScore = d >= 10 ? 100 : d >= 5 ? 75 : d >= 2 ? 50 : d >= 1 ? 30 : 0;
    return clamp(Math.round(weightedAvg([
      { value: annScore,                              weight: 0.35, enabled: si.announcements },
      { value: discScore,                             weight: 0.25, enabled: si.discussions },
      { value: clamp(m.feedbackCoveragePct, 0, 100), weight: 0.4,  enabled: si.feedbackComments },
    ])), 0, 100);
  }

  function scoreCourseQuality(m, s) {
    const si = s.courseQuality.items;
    const depth = clamp(Math.round(
      (m.avgAssignmentLength > 200 ? 40 : m.avgAssignmentLength / 5) +
      (m.avgPoints > 50 ? 30 : (m.avgPoints / 50) * 30) +
      (m.rubricUsagePct / 100) * 30
    ), 0, 100);
    return clamp(Math.round(weightedAvg([
      { value: clamp(m.assignmentTypeVariety, 0, 100), weight: 0.35, enabled: si.assignmentVariety },
      { value: depth,                                  weight: 0.35, enabled: si.assignmentDepth },
      { value: clamp(m.moduleCoveragePct, 0, 100),     weight: 0.3,  enabled: si.moduleCoverage },
    ])), 0, 100);
  }

  function scoreStudentPerformance(m, s) {
    const si = s.studentPerformance.items;
    const t = m.improvementTrend;
    const trendScore = t > 5 ? 90 : t > 2 ? 75 : t > 0 ? 60 : t > -2 ? 45 : t > -5 ? 30 : 15;
    return clamp(Math.round(weightedAvg([
      { value: clamp(m.classAvgPct, 0, 100), weight: 0.35, enabled: si.classAverage },
      { value: clamp(m.passRatePct, 0, 100), weight: 0.35, enabled: si.passRate },
      { value: trendScore,                   weight: 0.3,  enabled: si.improvementTrend },
    ])), 0, 100);
  }

  function computeAllScores(metrics, context, settings) {
    const norm = normalizeExpectations(context);
    const scorers = {
      assignmentStructure: () => scoreAssignmentStructure(metrics, norm, settings),
      studentEngagement:   () => scoreStudentEngagement(metrics, norm, settings),
      gradingEfficiency:   () => scoreGradingEfficiency(metrics, settings),
      communication:       () => scoreCommunication(metrics, norm, settings),
      courseQuality:       () => scoreCourseQuality(metrics, settings),
      studentPerformance:  () => scoreStudentPerformance(metrics, settings),
    };
    const details = {
      assignmentStructure: [
        { label: 'Assignments',  value: metrics.assignmentCount },
        { label: 'Per Week',     value: metrics.assignmentsPerWeek.toFixed(1) },
        { label: 'Rubric Usage', value: metrics.rubricUsagePct.toFixed(0) + '%' },
        { label: 'Due Dates',    value: metrics.dueDateUsagePct.toFixed(0) + '%' },
      ],
      studentEngagement: [
        { label: 'Submission Rate', value: metrics.submissionRatePct.toFixed(1) + '%' },
        { label: 'Missing Work',    value: metrics.missingWorkPct.toFixed(1) + '%' },
        { label: 'On-Time Rate',    value: metrics.onTimePct.toFixed(1) + '%' },
        { label: 'Submitted',       value: metrics.totalSubmitted },
      ],
      gradingEfficiency: [
        { label: 'Avg Grading',    value: metrics.avgGradingDays.toFixed(1) + ' days' },
        { label: '≤ 3 Days',       value: metrics.quickGradedPct.toFixed(0) + '%' },
        { label: 'Consistency σ',  value: metrics.gradingDaysStdDev.toFixed(1) + ' days' },
        { label: 'Total Graded',   value: metrics.totalGraded },
      ],
      communication: [
        { label: 'Announcements', value: metrics.announcementCount },
        { label: 'Per Week',      value: metrics.announcementsPerWeek.toFixed(1) },
        { label: 'Discussions',   value: metrics.discussionCount },
        { label: 'Feedback',      value: metrics.feedbackCoveragePct.toFixed(0) + '%' },
      ],
      courseQuality: [
        { label: 'Variety',    value: metrics.assignmentTypeVariety.toFixed(0) + '%' },
        { label: 'Avg Points', value: metrics.avgPoints.toFixed(1) },
        { label: 'Modules',    value: metrics.moduleCount },
        { label: 'Coverage',   value: metrics.moduleCoveragePct.toFixed(0) + '%' },
      ],
      studentPerformance: [
        { label: 'Class Avg',  value: metrics.classAvgPct.toFixed(1) + '%' },
        { label: 'Pass Rate',  value: metrics.passRatePct.toFixed(1) + '%' },
        { label: 'Trend',      value: (metrics.improvementTrend >= 0 ? '+' : '') + metrics.improvementTrend.toFixed(1) + '%' },
        { label: 'Students',   value: metrics.studentCount },
      ],
    };
    const categories = {};
    for (const [key, fn] of Object.entries(scorers)) {
      if (!settings[key]?.enabled) continue;
      const meta = SETTINGS_META[key];
      categories[key] = { name: meta.label, icon: meta.icon, score: fn(), details: details[key] };
    }
    const keys = Object.keys(categories);
    const tw = keys.reduce((s, k) => s + (CATEGORY_WEIGHTS[k] || 0), 0);
    const overallScore = clamp(Math.round(tw > 0 ? keys.reduce((s, k) => s + categories[k].score * ((CATEGORY_WEIGHTS[k] || 0) / tw), 0) : 50), 0, 100);
    return { categories, overallScore };
  }

  // ── FLAGS & RECOMMENDATIONS ───────────────────────────────────────────────────
  function generateFlags(scores) {
    const flags = [];
    if (scores.overallScore < 50)      flags.push({ level: 'critical', msg: 'Overall score critically low (' + scores.overallScore + '/100). Immediate review recommended.' });
    else if (scores.overallScore < 70) flags.push({ level: 'warning',  msg: 'Overall score needs attention (' + scores.overallScore + '/100).' });
    for (const cat of Object.values(scores.categories)) {
      if (cat.score < 50)      flags.push({ level: 'critical', msg: cat.name + ' critically low (' + cat.score + '/100).' });
      else if (cat.score < 70) flags.push({ level: 'warning',  msg: cat.name + ' needs attention (' + cat.score + '/100).' });
    }
    return flags;
  }

  function generateRecommendations(metrics, scores, settings) {
    const recs = [];
    const cat = k => settings[k]?.enabled && scores.categories[k]?.score < 70;
    if (cat('assignmentStructure')) {
      if (metrics.rubricUsagePct < 50)    recs.push('Add rubrics to more assignments for clearer grading expectations.');
      if (metrics.dueDateUsagePct < 80)   recs.push('Set due dates on all assignments to improve student time management.');
      if (metrics.avgAssignmentLength < 150) recs.push('Expand assignment instructions — aim for 150+ characters.');
    }
    if (cat('studentEngagement')) {
      if (metrics.submissionRatePct < 75)  recs.push('Investigate low submission rates — consider reminders or participation activities.');
      if (metrics.missingWorkPct > 30)     recs.push('High missing work — introduce check-ins or early warning outreach.');
      if (metrics.onTimePct < 70)          recs.push('Many late submissions — review due date spacing and workload distribution.');
    }
    if (cat('gradingEfficiency')) {
      if (metrics.avgGradingDays > 5)      recs.push('Aim to return graded work within 3 days for timely feedback.');
      if (metrics.gradingDaysStdDev > 4)   recs.push('Grading turnaround is inconsistent — try scheduling regular grading blocks.');
    }
    if (cat('communication')) {
      if (metrics.announcementsPerWeek < 0.5)  recs.push('Increase announcements to at least 1 per week.');
      if (metrics.feedbackCoveragePct < 50)    recs.push('Add personalized comments to more graded submissions.');
    }
    if (cat('courseQuality')) {
      if (metrics.assignmentTypeVariety < 40) recs.push('Diversify assignment types — use quizzes, discussions, uploads, and external tools.');
      if (metrics.moduleCoveragePct < 80)     recs.push('Populate all course modules with content for better navigation.');
    }
    if (cat('studentPerformance')) {
      if (metrics.classAvgPct < 70)           recs.push('Class average is low — review difficulty and provide more support resources.');
      if (metrics.passRatePct < 80)           recs.push('Pass rate below 80% — consider tutoring referrals or supplemental instruction.');
      if (metrics.improvementTrend < -2)      recs.push('Scores are declining — schedule a mid-term check-in.');
    }
    if (!recs.length) recs.push('All categories are performing well. Continue current practices.');
    return recs;
  }

  // ── STYLES ────────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ce-eval-styles')) return;
    const style = document.createElement('style');
    style.id = 'ce-eval-styles';
    style.textContent = `
      .ce-ev{display:flex;flex-direction:column;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif;color:#2D3B45;}
      .ce-ev-nav{display:flex;align-items:center;gap:6px;padding:10px 16px;flex-shrink:0;border-bottom:1px solid #E2E8F0;}
      .ce-ev-nav-btn{border:1px solid #C7CDD1;border-radius:3px;background:#fff;color:#2D3B45;font-size:12px;font-weight:600;padding:4px 10px;cursor:pointer;font-family:inherit;transition:background .12s;}
      .ce-ev-nav-btn:hover{background:#F5F5F5;}
      .ce-ev-nav-btn.ml{margin-left:auto;}
      .ce-ev-scroll{flex:1;min-height:0;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px;}
      .ce-ev-group{display:flex;flex-direction:column;gap:5px;}
      .ce-ev-label{font-size:12px;font-weight:600;color:#2D3B45;}
      .ce-ev-input,.ce-ev-select{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #C7CDD1;border-radius:3px;font-size:13px;font-family:inherit;color:#2D3B45;background:#fff;outline:none;}
      .ce-ev-input:focus,.ce-ev-select:focus{border-color:#0770B8;}
      .ce-ev-hint{font-size:11px;color:#6B7280;line-height:1.4;}
      .ce-ev-submit{width:100%;padding:9px;border:none;border-radius:3px;background:#0770B8;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s;}
      .ce-ev-submit:hover{opacity:.88;}
      .ce-ev-submit:disabled{opacity:.5;cursor:not-allowed;}
      .ce-ev-loading{text-align:center;padding:48px 16px;display:flex;flex-direction:column;align-items:center;gap:14px;}
      .ce-ev-spinner{width:36px;height:36px;border:3px solid #E2E8F0;border-top:3px solid #0770B8;border-radius:50%;animation:ce-ev-spin .8s linear infinite;}
      @keyframes ce-ev-spin{to{transform:rotate(360deg);}}
      .ce-ev-progress{font-size:12px;color:#6B7280;}
      .ce-ev-hero{background:#fff;border:1px solid #E2E8F0;border-radius:4px;padding:14px;display:flex;align-items:center;gap:14px;}
      .ce-ev-circle{width:72px;height:72px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:26px;flex-shrink:0;}
      .ce-ev-circle small{font-size:10px;font-weight:600;opacity:.9;}
      .ce-ev-hero-text h3{margin:0 0 4px;font-size:15px;font-weight:700;color:#1E293B;}
      .ce-ev-hero-text p{margin:0;font-size:12px;color:#64748B;line-height:1.4;}
      .ce-ev-cat{background:#fff;border:1px solid #E2E8F0;border-radius:4px;padding:12px;}
      .ce-ev-cat-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
      .ce-ev-cat-title{font-size:13px;font-weight:700;color:#1E293B;}
      .ce-ev-badge{padding:3px 8px;border-radius:3px;color:#fff;font-weight:700;font-size:13px;}
      .ce-ev-bar-bg{background:#E2E8F0;border-radius:2px;height:5px;margin-bottom:8px;overflow:hidden;}
      .ce-ev-bar-fill{height:100%;border-radius:2px;}
      .ce-ev-metrics{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;}
      .ce-ev-metric{display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #F1F5F9;}
      .ce-ev-ml{color:#6B7280;}
      .ce-ev-mv{color:#1E293B;font-weight:600;}
      .ce-ev-flag{padding:7px 10px;border-radius:3px;font-size:12px;font-weight:500;line-height:1.4;}
      .ce-ev-flag-critical{background:#FEF2F2;color:#991B1B;border-left:3px solid #EF4444;}
      .ce-ev-flag-warning{background:#FFFBEB;color:#92400E;border-left:3px solid #F59E0B;}
      .ce-ev-no-flags{background:#F0FDF4;color:#166534;padding:8px 12px;border-radius:3px;font-size:12px;font-weight:500;}
      .ce-ev-rec{background:#EFF6FF;color:#1E40AF;padding:7px 10px;border-radius:3px;font-size:12px;line-height:1.5;}
      .ce-ev-sh{font-size:13px;font-weight:700;color:#1E293B;}
      .ce-ev-error{background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;padding:14px;border-radius:4px;font-size:13px;line-height:1.5;}
      .ce-ev-sc{background:#fff;border:1px solid #E2E8F0;border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:0;}
      .ce-ev-sc-head{font-size:13px;font-weight:700;color:#1E293B;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
      .ce-ev-sc-desc{font-size:11px;color:#6B7280;line-height:1.45;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #F1F5F9;}
      .ce-ev-tr{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #F1F5F9;}
      .ce-ev-tr:last-child{border-bottom:none;}
      .ce-ev-tl{font-size:12px;color:#2D3B45;}
      .ce-ev-toggle{position:relative;display:inline-block;width:34px;height:18px;flex-shrink:0;}
      .ce-ev-toggle input{opacity:0;width:0;height:0;}
      .ce-ev-slider{position:absolute;cursor:pointer;inset:0;background:#C7CDD1;border-radius:18px;transition:background .2s;}
      .ce-ev-slider:before{content:"";position:absolute;width:14px;height:14px;left:2px;top:2px;background:#fff;border-radius:50%;transition:transform .2s;}
      .ce-ev-toggle input:checked+.ce-ev-slider{background:#0770B8;}
      .ce-ev-toggle input:checked+.ce-ev-slider:before{transform:translateX(16px);}
      .ce-ev-intro{font-size:12px;color:#64748B;line-height:1.5;}
    `;
    document.head.appendChild(style);
  }

  // ── UI STATE ──────────────────────────────────────────────────────────────────
  let _container = null;
  let _progressEl = null;

  const setProgress = msg => { if (_progressEl) _progressEl.textContent = msg; };

  function makeNav(...buttons) {
    const nav = document.createElement('div');
    nav.className = 'ce-ev-nav';
    for (const b of buttons) nav.appendChild(b);
    return nav;
  }

  function makeNavBtn(label, onClick, extraClass) {
    const b = document.createElement('button');
    b.className = 'ce-ev-nav-btn' + (extraClass ? ' ' + extraClass : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function makeSection(items) {
    const s = document.createElement('div');
    s.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    for (const item of items) s.appendChild(item);
    return s;
  }

  // ── CONTEXT FORM ──────────────────────────────────────────────────────────────
  async function showForm() {
    if (!_container) return;
    const [ctx, settings] = await Promise.all([loadCtx(), loadSettings()]);
    _container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ce-ev';
    wrap.appendChild(makeNav(makeNavBtn('⚙ Settings', () => showSettingsView(settings))));

    const scroll = document.createElement('div');
    scroll.className = 'ce-ev-scroll';

    const intro = document.createElement('div');
    intro.className = 'ce-ev-intro';
    intro.textContent = 'Configure the course context below, then run the evaluation to score this course across 6 categories.';
    scroll.appendChild(intro);

    function formGroup(labelText, inputEl, hint) {
      const g = document.createElement('div');
      g.className = 'ce-ev-group';
      const lbl = document.createElement('label');
      lbl.className = 'ce-ev-label';
      lbl.textContent = labelText;
      g.appendChild(lbl);
      g.appendChild(inputEl);
      if (hint) {
        const h = document.createElement('div');
        h.className = 'ce-ev-hint';
        h.textContent = hint;
        g.appendChild(h);
      }
      return g;
    }

    const hoursIn = document.createElement('input');
    hoursIn.className = 'ce-ev-input';
    hoursIn.type = 'number'; hoursIn.min = '1';
    hoursIn.value = ctx.courseHours || '45'; hoursIn.placeholder = '45';
    scroll.appendChild(formGroup('Total Course Hours', hoursIn, 'e.g. 45 for a 3-credit course'));

    const weeksIn = document.createElement('input');
    weeksIn.className = 'ce-ev-input';
    weeksIn.type = 'number'; weeksIn.min = '1';
    weeksIn.value = ctx.termWeeks || '16'; weeksIn.placeholder = '16';
    scroll.appendChild(formGroup('Term Length (weeks)', weeksIn));

    const delivSel = document.createElement('select');
    delivSel.className = 'ce-ev-select';
    for (const [v, t] of [['online','Online'],['hybrid','Hybrid'],['in-person','In-Person']]) {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = t;
      if (v === (ctx.deliveryType || 'online')) opt.selected = true;
      delivSel.appendChild(opt);
    }
    scroll.appendChild(formGroup('Delivery Type', delivSel));

    const errEl = document.createElement('div');
    errEl.className = 'ce-ev-error';
    errEl.style.display = 'none';
    scroll.appendChild(errEl);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'ce-ev-submit';
    submitBtn.textContent = '▶  Run Evaluation';
    submitBtn.addEventListener('click', async () => {
      const courseId = getCourseId();
      if (!courseId) {
        errEl.textContent = 'No Canvas course detected in the current URL. Open a course page first.';
        errEl.style.display = '';
        return;
      }
      const context = {
        courseHours: parseFloat(hoursIn.value) || 45,
        termWeeks: parseFloat(weeksIn.value) || 16,
        deliveryType: delivSel.value,
      };
      saveCtx(context);
      const currentSettings = await loadSettings();
      await runEvaluation(context, currentSettings);
    });
    scroll.appendChild(submitBtn);
    wrap.appendChild(scroll);
    _container.appendChild(wrap);
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────
  function showLoading(msg) {
    if (!_container) return;
    _container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ce-ev';
    const loading = document.createElement('div');
    loading.className = 'ce-ev-loading';
    const spinner = document.createElement('div');
    spinner.className = 'ce-ev-spinner';
    _progressEl = document.createElement('div');
    _progressEl.className = 'ce-ev-progress';
    _progressEl.textContent = msg || 'Starting…';
    loading.appendChild(spinner);
    loading.appendChild(_progressEl);
    wrap.appendChild(loading);
    _container.appendChild(wrap);
  }

  // ── RUN ───────────────────────────────────────────────────────────────────────
  async function runEvaluation(context, settings) {
    showLoading('Connecting to Canvas…');
    const courseId = getCourseId();
    try {
      const data = await collectAllData(courseId, msg => setProgress(msg));
      const metrics = computeMetrics(data, context);
      const scores = computeAllScores(metrics, context, settings);
      const flags = generateFlags(scores);
      const recs = generateRecommendations(metrics, scores, settings);
      showResults(scores, flags, recs, metrics, data.courseInfo, context);
    } catch (e) {
      showError(e.message);
    }
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────────
  function showResults(scores, flags, recs, metrics, courseInfo, context) {
    if (!_container) return;
    _container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ce-ev';
    wrap.appendChild(makeNav(
      makeNavBtn('◀ New Eval', () => showForm()),
      makeNavBtn('↺ Re-run', async () => {
        const s = await loadSettings();
        await runEvaluation(context, s);
      }, 'ml')
    ));

    const scroll = document.createElement('div');
    scroll.className = 'ce-ev-scroll';

    // Overall hero
    const lbl = scoreLabel(scores.overallScore);
    const hero = document.createElement('div');
    hero.className = 'ce-ev-hero';
    const circle = document.createElement('div');
    circle.className = 'ce-ev-circle';
    circle.style.background = lbl.color;
    circle.innerHTML = `${scores.overallScore}<small>/100</small>`;
    const heroText = document.createElement('div');
    heroText.className = 'ce-ev-hero-text';
    heroText.innerHTML = `<h3>${lbl.label}</h3><p>${esc(courseInfo?.name || 'Course Evaluation')}</p>`;
    hero.appendChild(circle);
    hero.appendChild(heroText);
    scroll.appendChild(hero);

    // Category cards
    for (const cat of Object.values(scores.categories)) {
      const cl = scoreLabel(cat.score);
      const card = document.createElement('div');
      card.className = 'ce-ev-cat';
      const hdr = document.createElement('div');
      hdr.className = 'ce-ev-cat-hdr';
      hdr.innerHTML = `<div class="ce-ev-cat-title">${cat.icon}  ${esc(cat.name)}</div><div class="ce-ev-badge" style="background:${cl.color}">${cat.score}</div>`;
      const bar = document.createElement('div');
      bar.className = 'ce-ev-bar-bg';
      bar.innerHTML = `<div class="ce-ev-bar-fill" style="width:${cat.score}%;background:${cl.color}"></div>`;
      const metrics = document.createElement('div');
      metrics.className = 'ce-ev-metrics';
      metrics.innerHTML = cat.details.map(d =>
        `<div class="ce-ev-metric"><span class="ce-ev-ml">${esc(d.label)}</span><span class="ce-ev-mv">${esc(String(d.value))}</span></div>`
      ).join('');
      card.appendChild(hdr);
      card.appendChild(bar);
      card.appendChild(metrics);
      scroll.appendChild(card);
    }

    // Flags
    const flagSection = makeSection([
      Object.assign(document.createElement('div'), { className: 'ce-ev-sh', textContent: 'Flags' }),
    ]);
    if (!flags.length) {
      flagSection.appendChild(Object.assign(document.createElement('div'), { className: 'ce-ev-no-flags', textContent: '✅  No critical issues found.' }));
    } else {
      for (const f of flags) {
        const el = document.createElement('div');
        el.className = 'ce-ev-flag ce-ev-flag-' + f.level;
        el.textContent = (f.level === 'critical' ? '🔴 ' : '⚠️ ') + f.msg;
        flagSection.appendChild(el);
      }
    }
    scroll.appendChild(flagSection);

    // Recommendations
    const recSection = makeSection([
      Object.assign(document.createElement('div'), { className: 'ce-ev-sh', textContent: 'Recommendations' }),
    ]);
    for (const rec of recs) {
      recSection.appendChild(Object.assign(document.createElement('div'), { className: 'ce-ev-rec', textContent: '→ ' + rec }));
    }
    scroll.appendChild(recSection);

    wrap.appendChild(scroll);
    _container.appendChild(wrap);
  }

  // ── SETTINGS VIEW ─────────────────────────────────────────────────────────────
  function showSettingsView(settings) {
    if (!_container) return;
    const local = JSON.parse(JSON.stringify(settings));
    _container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ce-ev';
    wrap.appendChild(makeNav(makeNavBtn('◀ Back', () => showForm())));

    const scroll = document.createElement('div');
    scroll.className = 'ce-ev-scroll';

    const intro = document.createElement('div');
    intro.className = 'ce-ev-intro';
    intro.textContent = 'Toggle categories and metrics on or off. Disabled items are excluded from scoring.';
    scroll.appendChild(intro);

    for (const [catKey, catMeta] of Object.entries(SETTINGS_META)) {
      const section = document.createElement('div');
      section.className = 'ce-ev-sc';

      // Category header + toggle
      const catHead = document.createElement('div');
      catHead.className = 'ce-ev-sc-head';
      const catTitle = document.createElement('span');
      catTitle.textContent = catMeta.icon + '  ' + catMeta.label;
      const catToggle = makeToggle(local[catKey]?.enabled !== false, checked => {
        if (!local[catKey]) local[catKey] = { enabled: true, items: {} };
        local[catKey].enabled = checked;
        saveSettings(local);
      });
      catHead.appendChild(catTitle);
      catHead.appendChild(catToggle);
      section.appendChild(catHead);

      const catDesc = document.createElement('div');
      catDesc.className = 'ce-ev-sc-desc';
      catDesc.textContent = catMeta.description;
      section.appendChild(catDesc);

      for (const [itemKey, itemMeta] of Object.entries(catMeta.items)) {
        const row = document.createElement('div');
        row.className = 'ce-ev-tr';
        const label = document.createElement('div');
        label.className = 'ce-ev-tl';
        label.textContent = itemMeta.label;
        const toggle = makeToggle(local[catKey]?.items?.[itemKey] !== false, checked => {
          if (!local[catKey]) local[catKey] = { enabled: true, items: {} };
          if (!local[catKey].items) local[catKey].items = {};
          local[catKey].items[itemKey] = checked;
          saveSettings(local);
        });
        row.appendChild(label);
        row.appendChild(toggle);
        section.appendChild(row);
      }
      scroll.appendChild(section);
    }

    wrap.appendChild(scroll);
    _container.appendChild(wrap);
  }

  function makeToggle(checked, onChange) {
    const label = document.createElement('label');
    label.className = 'ce-ev-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const slider = document.createElement('span');
    slider.className = 'ce-ev-slider';
    label.appendChild(input);
    label.appendChild(slider);
    return label;
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────────
  function showError(msg) {
    if (!_container) return;
    _container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ce-ev';
    wrap.appendChild(makeNav(makeNavBtn('◀ Back', () => showForm())));
    const errEl = document.createElement('div');
    errEl.className = 'ce-ev-error';
    errEl.style.margin = '14px 16px';
    errEl.textContent = '⚠ Error: ' + (msg || 'Unknown error occurred');
    wrap.appendChild(errEl);
    _container.appendChild(wrap);
  }

  // ── ENTRY POINT ───────────────────────────────────────────────────────────────
  document.addEventListener('ce-render-eval', e => {
    _container = e.detail?.container;
    if (!_container) return;
    _container.style.padding = '0';
    _container.style.overflow = 'hidden';
    injectStyles();
    showForm();
  });

})();
