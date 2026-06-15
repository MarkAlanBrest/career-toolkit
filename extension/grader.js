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
      // Reset the AI Grade button for the new student
      const btn = document.getElementById('ce-ai-grade-btn');
      if (btn) { btn.textContent = '✦ AI Grade'; btn.style.background = '#0770B8'; btn.disabled = false; }
      _grading = false;
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

    // Initial load
    fetchSubmission();

    // ── FLOATING GRADE BUTTON ─────────────────────────────────────────────────
    // Appended to document.body so it never touches Canvas's React tree
    const TOOLBAR_W = 52;
    const TOP_OFF   = 60;

    function buildPrompt(c, criteria) {
      const tot = parseInt(criteria?.match(/TOTAL POINTS:\s*(\d+)/i)?.[1] || '100', 10);
      const fn  = c?.studentName?.split(' ')[0] || 'the student';
      let p = 'Grade this student assignment.\n';
      if (c?.assignmentName) p += `Assignment: ${c.assignmentName}\n`;
      p += '\n';
      if (criteria) {
        p += `${criteria}\n\n`;
      } else {
        p += `Grade fairly. Total points: ${tot}\n\n`;
      }
      p += `SUBMISSION:\n${(c?.subText || '(no submission)').slice(0, 18000)}\n\n`;
      p += `Respond in EXACTLY this format:\nSCORE: [number]/${tot}\nFEEDBACK:\n- TEACHER CHECK: [items to verify manually]\n- [Address ${fn} by name, overall]\n- [Specific finding]\n- [Another finding]\n\nUse 3–5 bullets. First must be TEACHER CHECK.`;
      return p;
    }

    function fillFields(text, criteria) {
      const tot        = parseInt(criteria?.match(/TOTAL POINTS:\s*(\d+)/i)?.[1] || '100', 10);
      const grade      = text.match(/SCORE:\s*(\d+)/i)?.[1] || null;
      const fbMatch    = text.match(/FEEDBACK:\s*([\s\S]+)/i);
      const bullets    = (fbMatch ? fbMatch[1] : text)
        .split('\n')
        .filter(l => !/^[-*]?\s*(TEACHER CHECK|⚠)/i.test(l.trim()) && l.trim())
        .join('\n').trim();
      const commentTxt = [grade ? `Score: ${grade} / ${tot}` : '', bullets].filter(Boolean).join('\n\n');

      if (grade) {
        const gEl = document.querySelector('input.grading_value, input[data-testid="grading-box-extended-grade-input"], #grade_container input, input.grade');
        if (gEl) {
          const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (s) s.call(gEl, grade);
          gEl.dispatchEvent(new Event('input',  { bubbles: true }));
          gEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (commentTxt) {
        const cEl = document.querySelector('#speed_grader_comment_textarea');
        if (cEl) {
          const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (s) s.call(cEl, commentTxt);
          cEl.dispatchEvent(new Event('input',  { bubbles: true }));
          cEl.dispatchEvent(new Event('change', { bubbles: true }));
          cEl.focus();
        }
      }
    }

    const aiBtn = document.createElement('button');
    aiBtn.id = 'ce-ai-grade-btn';
    aiBtn.textContent = '✦ AI Grade';
    aiBtn.style.cssText = `
      position:fixed;top:${TOP_OFF + 62}px;right:${TOOLBAR_W + 8}px;
      z-index:2147483640;
      background:#0770B8;color:#fff;border:none;border-radius:4px;
      padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;
      transition:opacity .15s,background .2s;
    `;
    aiBtn.addEventListener('mouseenter', () => { if (!aiBtn.disabled) aiBtn.style.opacity = '.85'; });
    aiBtn.addEventListener('mouseleave', () => aiBtn.style.opacity = '1');

    let _grading = false;
    function resetBtn(label, bg) {
      aiBtn.textContent = label || '✦ AI Grade';
      aiBtn.style.background = bg || '#0770B8';
      aiBtn.disabled = false;
      _grading = false;
    }

    aiBtn.addEventListener('click', async () => {
      if (_grading) return;
      _grading = true;
      aiBtn.disabled = true;
      aiBtn.textContent = '⟳ Grading…';

      try {
        const { ce_claude_context: storedCtx, ce_criteria: allCriteria } =
          await new Promise(r => chrome.storage.local.get(['ce_claude_context', 'ce_criteria'], r));

        const c = storedCtx;
        if (!c) throw new Error('No submission loaded yet');

        const k        = c.courseId && c.assignmentId ? `${c.courseId}_${c.assignmentId}` : null;
        const criteria = k ? (allCriteria?.[k] || '') : '';

        // Fetch file content if not yet parsed
        if (c.attachments?.length && (!c.subText || c.subText.startsWith('[File upload'))) {
          const parts = [];
          for (const att of c.attachments) {
            aiBtn.textContent = '⟳ Reading file…';
            let url = att.url;
            if (att.id && c.token) {
              try {
                const info = await new Promise(r => chrome.runtime.sendMessage(
                  { type: 'CANVAS_API', payload: { url: `${c.canvasOrigin}/api/v1/files/${att.id}`, token: c.token } }, r
                ));
                if (info?.url) url = info.url;
              } catch(_) {}
            }
            const res = await new Promise(r => chrome.runtime.sendMessage(
              { type: 'PARSE_FILE', payload: { fileUrl: url, token: c.token, filename: att.filename, mimeType: att.mimeType } }, r
            ));
            if (res?.error) throw new Error(res.error);
            const parsed = res?.text?.trim();
            if (!parsed) throw new Error(`Could not read ${att.filename}`);
            parts.push(`[${att.filename}]\n${parsed}`);
          }
          c.subText = parts.join('\n\n');
          chrome.storage.local.set({ ce_claude_context: c });
          aiBtn.textContent = '⟳ Grading…';
        }

        const response = await new Promise(r => chrome.runtime.sendMessage(
          { type: 'GENERATE', payload: { messages: [{ role: 'user', content: buildPrompt(c, criteria) }], max_tokens: 1500 } }, r
        ));
        if (response?.error) throw new Error(response.error);
        const text = response?.content?.[0]?.text || '';
        if (!text) throw new Error('Empty response — check your API key in settings');

        fillFields(text, criteria);
        aiBtn.textContent = '✓ Review & Submit';
        aiBtn.style.background = '#27AE60';
        setTimeout(() => resetBtn(), 4000);
      } catch(e) {
        aiBtn.textContent = '⚠ ' + e.message.slice(0, 30);
        aiBtn.style.background = '#C0392B';
        setTimeout(() => resetBtn(), 4000);
      }
    });

    document.body.appendChild(aiBtn);

  } catch(e) { /* don't crash SpeedGrader */ }
})();
