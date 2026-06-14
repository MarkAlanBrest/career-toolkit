(async function () {
  'use strict';
  try {
    if (!/speed_grader/.test(window.location.href)) return;

    // ── STORAGE SHIM ──────────────────────────────────────────────────────────
    const _store = await new Promise(resolve =>
      chrome.storage.local.get(['ce_canvas_token', 'ce_grader_settings'], resolve)
    );
    function GM_getValue(key, def) { return _store[key] ?? def; }
    function GM_setValue(key, val) { _store[key] = val; chrome.storage.local.set({ [key]: val }); }

    const token = GM_getValue('ce_canvas_token', '');
    if (!token) return; // nothing we can do without a token

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function getUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const m = window.location.pathname.match(/\/courses\/(\d+)/);
      return {
        courseId:     m?.[1] || '',
        assignmentId: params.get('assignment_id') || '',
        studentId:    params.get('student_id')    || '',
      };
    }

    function loadSettings(courseId, assignmentId) {
      const all = GM_getValue('ce_grader_settings', {});
      return all[`${courseId}_${assignmentId}`] || {
        totalPoints: 100, rubricText: '', answerKey: '',
        gradingIntensity: 'balanced', feedbackTone: 'encouraging',
        acceptIntent: true, partialCredit: true, customInstructions: '',
      };
    }

    async function canvasApi(url) {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errors?.[0]?.message || `Canvas API ${res.status}`);
      return data;
    }

    // ── CONTEXT ───────────────────────────────────────────────────────────────
    let ctx = {
      token,
      canvasOrigin: location.origin,
      courseId: '', assignmentId: '', assignmentName: '',
      studentId: '', studentName: '',
      settings: {},
      attachments: [],
      subText: '',
      mode: 'grade',
    };

    function saveContext() {
      chrome.storage.local.set({ ce_claude_context: { ...ctx, timestamp: Date.now() } });
    }

    // ── FETCH SUBMISSION ──────────────────────────────────────────────────────
    async function fetchSubmission() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      if (!studentId || !courseId || !assignmentId) return;

      ctx.courseId = courseId;
      ctx.assignmentId = assignmentId;
      ctx.studentId = studentId;
      ctx.attachments = [];
      ctx.subText = '';
      ctx.settings = loadSettings(courseId, assignmentId);

      // Student name from DOM first (fastest)
      const nameEl = document.querySelector(
        '#student_carousel_name, .student_selection option:checked, #students_selectmenu-button .ui-selectmenu-text'
      );
      if (nameEl) ctx.studentName = nameEl.textContent.trim().replace(/\s*\(.*\)$/, '');

      // Assignment name
      if (!ctx.assignmentName) {
        try {
          const a = await canvasApi(`${location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}`);
          ctx.assignmentName = a.name || '';
        } catch(_) {}
      }

      // Profile fallback for student name
      if (!ctx.studentName) {
        try {
          const u = await canvasApi(`${location.origin}/api/v1/users/${studentId}/profile`);
          ctx.studentName = u.name || u.short_name || '';
        } catch(_) {}
      }

      // Submission
      try {
        const sub = await canvasApi(
          `${location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}?include[]=attachments`
        );

        if (sub.submission_type === 'online_text_entry' && sub.body) {
          const tmp = document.createElement('div'); tmp.innerHTML = sub.body;
          ctx.subText = (tmp.textContent || tmp.innerText || '').trim();
        } else if (sub.submission_type === 'online_upload' && sub.attachments?.length) {
          ctx.attachments = sub.attachments.map(att => ({
            id:       att.id,
            filename: decodeURIComponent((att.filename || att.display_name || 'file').replace(/\+/g, ' ')),
            mimeType: att['content-type'] || att.content_type || '',
            url:      att.url || att.preview_url || '',
          }));
          ctx.subText = `[File upload: ${ctx.attachments.map(a => a.filename).join(', ')}]`;
        } else if (sub.submission_type === 'online_url') {
          ctx.subText = `[URL submission: ${sub.url}]`;
        }
      } catch(_) {}

      saveContext();
    }

    // ── OPEN CLAUDE ───────────────────────────────────────────────────────────
    function openClaude() {
      saveContext();
      chrome.runtime.sendMessage({
        type: 'OPEN_CLAUDE_SPLIT',
        payload: {
          screenWidth:  window.screen.width,
          screenHeight: window.screen.availHeight,
          screenTop:    window.screen.availTop  || 0,
          screenLeft:   window.screen.availLeft || 0,
        },
      });
    }

    // ── INJECT BUTTON (replaces Canvas "Message Student" button) ───────────────
    let _btn = null;

    function injectButton() {
      if (_btn) return;
      const msgBtn = document.querySelector(
        '#message_student_link, a.message_student_link, button.message_student_link, ' +
        '[data-testid="message-student-button"], [data-testid="send_message_student"], ' +
        'button[aria-label="Send message to student"], a[aria-label="Send message to student"]'
      );
      if (!msgBtn) return;

      msgBtn.style.setProperty('display', 'none', 'important');

      _btn = document.createElement('button');
      _btn.id = 'ce-open-claude-btn';
      _btn.textContent = '✦ Open AI Grader';
      _btn.style.cssText = [
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'padding:6px 14px', 'border:none', 'border-radius:4px',
        'background:#0770B8', 'color:#fff',
        'font:600 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'cursor:pointer', 'white-space:nowrap',
      ].join(';');
      _btn.onclick = openClaude;

      msgBtn.parentNode.insertBefore(_btn, msgBtn.nextSibling);
    }

    // ── NAVIGATION TRACKING ───────────────────────────────────────────────────
    let lastStudentId    = getUrlParts().studentId;
    let lastAssignmentId = getUrlParts().assignmentId;

    function onNavChange() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      const assignmentChanged = assignmentId && assignmentId !== lastAssignmentId;
      const studentChanged    = studentId    && studentId    !== lastStudentId;
      if (!assignmentChanged && !studentChanged) return;
      if (assignmentChanged) {
        lastAssignmentId = assignmentId;
        ctx.assignmentName = '';
      }
      lastStudentId = studentId;
      fetchSubmission();
    }

    const _origPush    = history.pushState.bind(history);
    const _origReplace = history.replaceState.bind(history);
    history.pushState    = function(...a) { _origPush(...a);    setTimeout(onNavChange, 100); };
    history.replaceState = function(...a) { _origReplace(...a); setTimeout(onNavChange, 100); };
    window.addEventListener('popstate',   () => setTimeout(onNavChange, 100));
    window.addEventListener('hashchange', () => setTimeout(onNavChange, 100));
    setInterval(onNavChange, 1200);

    const nameEl = document.querySelector('#student_carousel_name, #students_selectmenu-button');
    if (nameEl) {
      new MutationObserver(() => setTimeout(onNavChange, 200))
        .observe(nameEl, { childList: true, subtree: true, characterData: true });
    }

    // Poll for the Message Student button (Canvas renders it late)
    let _btnTries = 0;
    const _btnPoll = setInterval(() => {
      injectButton();
      if (_btn || ++_btnTries > 40) clearInterval(_btnPoll);
    }, 400);

    // Initial load
    fetchSubmission();

  } catch(e) { /* don't crash SpeedGrader */ }
})();
