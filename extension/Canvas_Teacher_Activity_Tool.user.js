// ==UserScript==
// @name         Canvas Teacher Activity Tool
// @namespace    https://github.com/MarkAlanBrest/canvas-teacher-activity
// @version      1.2.0
// @description  Fast teacher login and ungraded work report for Canvas LMS admins
// @author       MarkAlanBrest
// @match        *://*.instructure.com/*
// @match        *://canvas.*.edu/*
// @match        *://canvas.*.com/*
// @match        *://*.canvas.*.edu/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  if (window.__CTA_TEACHER_ACTIVITY__) return;
  window.__CTA_TEACHER_ACTIVITY__ = true;
  if (window.top !== window.self) return;

  var VERSION = "1.2.0";
  var PER_PAGE = 100;
  var API_DELAY_MS = 120;
  var overlayEl = null;

  function apiBase() {
    return window.location.origin + "/api/v1";
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function escHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function pct(num, den) {
    if (!den) return 0;
    return Math.round((num / den) * 100);
  }

  function formatDate(value) {
    if (!value) return "Not available";
    var d = new Date(value);
    if (isNaN(d.getTime())) return "Not available";
    return d.toLocaleDateString();
  }

  function daysSince(value) {
    if (!value) return null;
    var d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function getCanvasAccountId() {
    var env = typeof unsafeWindow !== "undefined" && unsafeWindow.ENV ? unsafeWindow.ENV : window.ENV;
    return env && (env.ACCOUNT_ID || env.DOMAIN_ROOT_ACCOUNT_ID || env.ROOT_ACCOUNT_ID || env.account_id);
  }

  async function apiFetch(url, params) {
    var u = new URL(url, window.location.origin);
    u.searchParams.set("per_page", PER_PAGE);
    params = params || {};
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (Array.isArray(value)) value.forEach(function (item) { u.searchParams.append(key, item); });
      else u.searchParams.set(key, value);
    });
    var resp = await fetch(u.toString(), { credentials: "same-origin" });
    if (!resp.ok) throw new Error("Canvas API " + resp.status + ": " + u.pathname);
    return resp;
  }

  async function apiFetchAll(url, params) {
    var rows = [];
    var resp = await apiFetch(url, params);
    rows = rows.concat(await resp.json());
    var next = parseNext(resp.headers.get("Link"));
    while (next) {
      await sleep(API_DELAY_MS);
      resp = await fetch(next, { credentials: "same-origin" });
      if (!resp.ok) break;
      rows = rows.concat(await resp.json());
      next = parseNext(resp.headers.get("Link"));
    }
    return rows;
  }

  function parseNext(header) {
    if (!header) return null;
    var parts = header.split(",");
    for (var i = 0; i < parts.length; i++) {
      var match = parts[i].match(/<([^>]+)>;\s*rel="next"/);
      if (match) return match[1];
    }
    return null;
  }

  async function fetchCourseCatalog() {
    var params = {
      "state[]": ["available"],
      "include[]": ["teachers", "total_students"],
    };
    var accountId = getCanvasAccountId();
    if (accountId) {
      try {
        return await apiFetchAll(apiBase() + "/accounts/" + accountId + "/courses", params);
      } catch (err) {
        console.warn("[CTA] Account courses failed; falling back to visible courses.", err);
      }
    }
    return apiFetchAll(apiBase() + "/courses", params);
  }

  function courseLabel(course) {
    return course.course_code || course.name || ("Course " + course.id);
  }

  function isPublishedCourse(course) {
    return course.workflow_state === "available" || course.workflow_state === "published";
  }

  function catalogStudentCount(course) {
    var n = Number(course.total_students);
    return isFinite(n) ? n : null;
  }

  function courseTeachers(course) {
    var teachers = Array.isArray(course.teachers) ? course.teachers : [];
    return teachers.map(function (t) {
      return {
        id: String(t.id || t.user_id || t.sortable_name || t.display_name || t.name || "unknown"),
        name: t.display_name || t.name || t.sortable_name || "Teacher",
      };
    }).filter(function (t) { return t.id && t.id !== "unknown"; });
  }

  async function fetchEnrollments(courseId, type) {
    return apiFetchAll(apiBase() + "/courses/" + courseId + "/enrollments", {
      "type[]": [type],
      "state[]": ["active", "completed"],
      "include[]": ["user"],
    });
  }

  async function fetchAssignments(courseId) {
    return apiFetchAll(apiBase() + "/courses/" + courseId + "/assignments", {});
  }

  function teacherKey(teacher) {
    return String(teacher.id || teacher.user_id || (teacher.user && teacher.user.id) || teacher.name || "unknown");
  }

  function teacherName(teacher) {
    var user = teacher.user || {};
    return user.name || user.sortable_name || teacher.name || teacher.display_name || "Teacher";
  }

  function activityLevel(row) {
    var days = daysSince(row.lastActivity);
    if (days !== null && days <= 7 && row.avgUngradedDays <= 3 && row.ungradedAssignments <= 2) return "Current";
    if (days !== null && days <= 21 && row.avgUngradedDays <= 7) return "Watch";
    return "Needs check-in";
  }

  function supportReasons(row) {
    var reasons = [];
    var days = daysSince(row.lastActivity);
    if (days === null) reasons.push("no last activity found");
    else if (days > 21) reasons.push("last activity " + days + " days ago");
    if (row.avgUngradedDays > 7) reasons.push("ungraded work averages " + row.avgUngradedDays + " days old");
    if (row.oldestUngradedDays > 14) reasons.push("oldest ungraded assignment about " + row.oldestUngradedDays + " days old");
    if (row.ungradedAssignments > 0) reasons.push(row.ungradedAssignments + " assignments have ungraded work");
    if (row.needsGrading > 0) reasons.push(row.needsGrading + " submissions currently need grading");
    if (!reasons.length) reasons.push("activity looks current");
    return reasons;
  }

  function ungradedAssignmentSummary(assignments) {
    var count = 0;
    var totalDays = 0;
    var oldestDays = 0;
    assignments.forEach(function (assignment) {
      if (!(Number(assignment.needs_grading_count) > 0)) return;
      var anchor = assignment.due_at || assignment.updated_at || assignment.created_at;
      var days = daysSince(anchor);
      if (days === null) days = 0;
      count++;
      totalDays += days;
      if (days > oldestDays) oldestDays = days;
    });
    return {
      count: count,
      totalDays: totalDays,
      oldestDays: oldestDays,
    };
  }

  async function collectActivity(courses, onProgress) {
    var teachers = {};
    for (var i = 0; i < courses.length; i++) {
      var course = courses[i];
      if (onProgress) onProgress("Reading " + courseLabel(course) + " (" + (i + 1) + "/" + courses.length + ")...");

      var studentCount = catalogStudentCount(course);
      var teacherEnrollments = [];
      var studentEnrollments = [];
      try {
        var enrollments = await Promise.all([
          fetchEnrollments(course.id, "TeacherEnrollment"),
          studentCount === null ? fetchEnrollments(course.id, "StudentEnrollment") : Promise.resolve([]),
        ]);
        teacherEnrollments = enrollments[0];
        studentEnrollments = enrollments[1];
      } catch (err) {
        console.warn("[CTA] Enrollment lookup failed for course " + course.id, err);
      }

      if (studentCount === null) studentCount = studentEnrollments.length;
      if (!studentCount) continue;

      var activity = await Promise.all([
        fetchAssignments(course.id).catch(function () { return []; }),
      ]);
      var assignments = activity[0].filter(function (a) { return a.published !== false; });
      var needsGrading = assignments.reduce(function (sum, a) {
        return sum + (Number(a.needs_grading_count) || 0);
      }, 0);
      var ungraded = ungradedAssignmentSummary(assignments);

      var listedTeachers = teacherEnrollments.length ? teacherEnrollments : courseTeachers(course);
      listedTeachers.forEach(function (teacher) {
        var id = teacherKey(teacher);
        if (!id || id === "unknown") return;
        if (!teachers[id]) {
          teachers[id] = {
            id: id,
            name: teacherName(teacher),
            courses: [],
            students: 0,
            lastActivity: null,
            assignments: 0,
            ungradedAssignments: 0,
            ungradedDayTotal: 0,
            ungradedDayCount: 0,
            needsGrading: 0,
            oldestUngradedDays: 0,
          };
        }
        var row = teachers[id];
        row.courses.push(courseLabel(course));
        row.students += studentCount;
        row.assignments += assignments.length;
        row.ungradedAssignments += ungraded.count;
        row.ungradedDayTotal += ungraded.totalDays;
        row.ungradedDayCount += ungraded.count;
        row.needsGrading += needsGrading;
        row.oldestUngradedDays = Math.max(row.oldestUngradedDays, ungraded.oldestDays);

        if (teacher.last_activity_at && (!row.lastActivity || new Date(teacher.last_activity_at) > new Date(row.lastActivity))) {
          row.lastActivity = teacher.last_activity_at;
        }
      });
    }

    return Object.keys(teachers).map(function (id) {
      var row = teachers[id];
      row.avgUngradedDays = row.ungradedDayCount ? Math.round(row.ungradedDayTotal / row.ungradedDayCount) : 0;
      row.level = activityLevel(row);
      row.reasons = supportReasons(row);
      return row;
    }).sort(function (a, b) {
      var levelOrder = { "Needs check-in": 0, "Watch": 1, "Current": 2 };
      return levelOrder[a.level] - levelOrder[b.level] ||
        (daysSince(b.lastActivity) || 9999) - (daysSince(a.lastActivity) || 9999) ||
        b.avgUngradedDays - a.avgUngradedDays ||
        b.ungradedAssignments - a.ungradedAssignments ||
        a.name.localeCompare(b.name);
    });
  }

  function ensureStyles() {
    GM_addStyle([
      "#cta-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:32px 20px;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      "#cta-panel{width:min(1180px,100%);background:#f8fafc;border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.32);overflow:hidden;color:#1e293b;}",
      ".cta-head{background:#0f172a;color:#fff;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;}",
      ".cta-title{font-size:18px;font-weight:800;}.cta-sub{font-size:12px;color:#cbd5e1;margin-top:3px;}",
      ".cta-close{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:7px;height:32px;padding:0 12px;cursor:pointer;}",
      ".cta-body{padding:20px 22px;}.cta-card{background:#fff;border:1px solid #d8dee4;border-radius:8px;padding:16px;margin-bottom:14px;}",
      ".cta-controls{display:grid;grid-template-columns:minmax(220px,1fr) 160px;gap:12px;align-items:end;}",
      ".cta-label{display:block;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:6px;}",
      ".cta-select{width:100%;height:38px;border:1px solid #cbd5e1;border-radius:7px;padding:0 10px;background:#fff;color:#1e293b;}",
      ".cta-btn{height:38px;border:0;border-radius:7px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer;}",
      ".cta-note{font-size:12px;color:#64748b;line-height:1.45;margin-top:10px;}",
      ".cta-status{font-size:13px;color:#475569;padding:18px;text-align:center;}",
      ".cta-stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:14px;}",
      ".cta-stat{background:#fff;border:1px solid #d8dee4;border-radius:8px;padding:12px;}.cta-stat b{display:block;font-size:22px;color:#2563eb;}.cta-stat span{font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase;}",
      ".cta-tablewrap{overflow:auto;background:#fff;border:1px solid #d8dee4;border-radius:8px;}.cta-table{width:100%;border-collapse:collapse;font-size:12px;}",
      ".cta-table th{text-align:left;background:#f1f5f9;color:#475569;padding:10px 12px;white-space:nowrap;}.cta-table td{border-top:1px solid #eef2f7;padding:10px 12px;vertical-align:top;}",
      ".cta-table small{display:block;color:#64748b;margin-top:2px;line-height:1.35;}.cta-level{font-weight:900;white-space:nowrap;}",
      ".cta-active{color:#059669;}.cta-watch{color:#d97706;}.cta-check{color:#dc2626;}",
    ].join("\n"));
  }

  function openOverlay() {
    if (overlayEl) overlayEl.remove();
    overlayEl = document.createElement("div");
    overlayEl.id = "cta-overlay";
    document.body.appendChild(overlayEl);
    overlayEl.innerHTML =
      '<div id="cta-panel">' +
        '<div class="cta-head"><div><div class="cta-title">Teacher Activity</div><div class="cta-sub">v' + VERSION + ' - login and ungraded work summary</div></div><button class="cta-close" id="cta-close">Close</button></div>' +
        '<div class="cta-body" id="cta-body"><div class="cta-status">Loading Canvas courses...</div></div>' +
      '</div>';
    document.getElementById("cta-close").addEventListener("click", closeOverlay);
    overlayEl.addEventListener("click", function (event) { if (event.target === overlayEl) closeOverlay(); });
    loadLauncher();
  }

  function closeOverlay() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  async function loadLauncher() {
    var body = document.getElementById("cta-body");
    try {
      var courses = (await fetchCourseCatalog()).filter(function (course) {
        var count = catalogStudentCount(course);
        return isPublishedCourse(course) && (count === null || count > 0);
      });
      if (!courses.length) {
        body.innerHTML = '<div class="cta-card"><div class="cta-status">No published courses with students were found.</div></div>';
        return;
      }
      body.innerHTML =
        '<div class="cta-card">' +
          '<div class="cta-controls">' +
            '<div><span class="cta-label">Report</span><div class="cta-note" style="margin-top:0;">All published courses with enrolled students</div></div>' +
            '<button class="cta-btn" id="cta-run">Show Activity</button>' +
          '</div>' +
          '<div class="cta-note">Fast report: last Canvas activity, total assignments, assignments with ungraded work, average days ungraded, and grading backlog.</div>' +
        '</div>' +
        '<div id="cta-results"></div>';
      document.getElementById("cta-run").addEventListener("click", function () { runReport(courses); });
    } catch (err) {
      body.innerHTML = '<div class="cta-card"><div class="cta-status">Could not load courses: ' + escHtml(err.message || err) + '</div></div>';
      console.error("[CTA]", err);
    }
  }

  async function runReport(courses) {
    var results = document.getElementById("cta-results");
    results.innerHTML = '<div class="cta-card"><div class="cta-status" id="cta-progress">Starting...</div></div>';
    var progress = document.getElementById("cta-progress");
    var rows = await collectActivity(courses, function (message) {
      if (progress) progress.textContent = message;
    });
    renderReport(results, rows, courses.length);
  }

  function renderReport(container, rows, courseCount) {
    var current = rows.filter(function (r) { return r.level === "Current"; }).length;
    var watch = rows.filter(function (r) { return r.level === "Watch"; }).length;
    var check = rows.filter(function (r) { return r.level === "Needs check-in"; }).length;
    var tableRows = rows.map(function (row) {
      var levelClass = row.level === "Current" ? "cta-active" : row.level === "Watch" ? "cta-watch" : "cta-check";
      var inactive = daysSince(row.lastActivity);
      return '<tr>' +
        '<td><b>' + escHtml(row.name) + '</b><small>' + escHtml(row.courses.slice(0, 3).join(", ") + (row.courses.length > 3 ? " +" + (row.courses.length - 3) + " more" : "")) + '</small></td>' +
        '<td><span class="cta-level ' + levelClass + '">' + escHtml(row.level) + '</span><small>' + escHtml(row.reasons.slice(0, 3).join("; ")) + '</small></td>' +
        '<td>' + formatDate(row.lastActivity) + '<small>' + (inactive === null ? "No activity date" : inactive + " days ago") + '</small></td>' +
        '<td>' + row.courses.length + '</td>' +
        '<td>' + row.students + '</td>' +
        '<td>' + row.assignments + '</td>' +
        '<td>' + row.ungradedAssignments + '</td>' +
        '<td>' + row.avgUngradedDays + ' days</td>' +
        '<td>' + (row.oldestUngradedDays || 0) + ' days</td>' +
        '<td>' + row.needsGrading + '</td>' +
      '</tr>';
    }).join("");
    container.innerHTML =
      '<div class="cta-stats">' +
        '<div class="cta-stat"><b>' + rows.length + '</b><span>Teachers</span></div>' +
        '<div class="cta-stat"><b>' + courseCount + '</b><span>Courses</span></div>' +
        '<div class="cta-stat"><b>' + check + '</b><span>Need Check-in</span></div>' +
        '<div class="cta-stat"><b>' + watch + '</b><span>Watch</span></div>' +
      '</div>' +
      '<div class="cta-card"><b>Current Teacher Activity</b><div class="cta-note">' + current + ' current, ' + watch + ' watch, ' + check + ' may need a check-in across all published courses with students.</div></div>' +
      '<div class="cta-tablewrap"><table class="cta-table"><thead><tr><th>Teacher</th><th>Status</th><th>Last Canvas Activity</th><th>Courses</th><th>Students</th><th>Total Assignments</th><th>Ungraded Assignments</th><th>Avg Days Ungraded</th><th>Oldest Ungraded</th><th>Needs Grading</th></tr></thead><tbody>' + (tableRows || '<tr><td colspan="10">No teacher activity found.</td></tr>') + '</tbody></table></div>';
  }

  function init() {
    ensureStyles();
    if (typeof GM_registerMenuCommand !== "undefined") {
      GM_registerMenuCommand("Open Teacher Activity", openOverlay);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  (function tryRegister() {
    var w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    if (w.CanvasDash) {
      w.CanvasDash.register({
        id: "teacher-activity",
        name: "Teacher Activity",
        shortLabel: "TA",
        color: "#0f766e",
        description: "Fast teacher login and ungraded work report",
        run: openOverlay,
      });
    } else {
      setTimeout(tryRegister, 100);
    }
  })();
})();
