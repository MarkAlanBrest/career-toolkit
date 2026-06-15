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
      p += `Respond in EXACTLY this format:
SCORE: [number]/${tot}
FEEDBACK:
- TEACHER CHECK: [private note to the teacher only; items to verify manually]
- [Address ${fn} by name, overall]
- [Specific finding]
- [Another finding]

Use 3-5 bullets. First must be TEACHER CHECK.`;
      return p;
    }

    function setReactValue(el, value) {
      const tag = el.tagName.toLowerCase();
      const proto = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function valueToHtml(value) {
      return String(value || '')
        .split(/\n{2,}/)
        .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    function setEditableValue(el, value) {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      const style = el.ownerDocument?.defaultView?.getComputedStyle?.(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
      if (tag === 'textarea' || tag === 'input') {
        setReactValue(el, value);
        el.focus();
        return true;
      }
      if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') {
        el.focus();
        el.innerHTML = valueToHtml(value);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    function openCommentEditorIfCollapsed() {
      const opener = document.querySelector([
        'button[data-testid*="add-comment" i]',
        'button[aria-label*="add comment" i]',
        'button[title*="add comment" i]',
        'a[aria-label*="add comment" i]',
        'a[title*="add comment" i]',
        '.add_comment_link',
        '#add_a_comment',
      ].join(', '));
      if (opener) {
        try { opener.click(); } catch (_) {}
      }
    }

    function fillTinyMceComment(value) {
      const tiny = window.tinymce || window.tinyMCE;
      if (!tiny?.get) return false;
      for (const id of ['speed_grader_comment_textarea', 'speedgrader_textarea', 'grading_comment', 'comment_textarea']) {
        const editor = tiny.get(id);
        if (!editor) continue;
        editor.setContent(valueToHtml(value));
        editor.fire?.('input');
        editor.fire?.('change');
        editor.save?.();
        return true;
      }
      return false;
    }

    function findAndFillComment(value) {
      if (fillTinyMceComment(value)) return true;
      openCommentEditorIfCollapsed();
      const selectors = [
        '#speed_grader_comment_textarea',
        '#speedgrader_textarea',
        'textarea[name="comment[text_comment]"]',
        '#grading_comment',
        '#comment_textarea',
        '.submission-comment-form textarea',
        '.grading_comment textarea',
        'textarea[data-testid*="comment" i]',
        'textarea[aria-label*="comment" i]',
        'textarea[placeholder*="comment" i]',
        '#comments_container textarea',
        '#submission_comment_form textarea',
        '.ic-RichContentEditor textarea',
        '.comment-input textarea',
        '#right_side textarea',
        '#right_side_inner textarea',
        '[contenteditable="true"][aria-label*="comment" i]',
        '[contenteditable="true"][data-testid*="comment" i]',
        '.tox-edit-area [contenteditable="true"]',
        '.ic-RichContentEditor [contenteditable="true"]',
      ];
      for (const selector of selectors) {
        if (setEditableValue(document.querySelector(selector), value)) return true;
      }
      const iframeSelectors = [
        'iframe#speed_grader_comment_textarea_ifr',
        'iframe[id*="speed_grader_comment" i]',
        'iframe[id*="comment" i]',
        'iframe[title*="comment" i]',
        'iframe[title*="Rich Text" i]',
        'iframe.tox-edit-area__iframe',
      ];
      const iframes = [...new Set([
        ...iframeSelectors.flatMap(selector => [...document.querySelectorAll(selector)]),
        ...document.querySelectorAll('#right_side iframe, #right_side_inner iframe, .submission-comment-form iframe'),
      ])];
      for (const iframe of iframes) {
        try {
          if (setEditableValue(iframe?.contentDocument?.body || iframe?.contentWindow?.document?.body, value)) return true;
        } catch (_) {}
      }
      return false;
    }

    function fillFields(text, criteria) {
      const tot      = parseInt(criteria?.match(/TOTAL POINTS:\s*(\d+)/i)?.[1] || '100', 10);
      const grade    = text.match(/SCORE:\s*(\d+)/i)?.[1] || null;
      const fbMatch  = text.match(/FEEDBACK:\s*([\s\S]+)/i);
      const feedback = (fbMatch ? fbMatch[1] : text).trim();
      const feedbackLines = feedback.split('\n');
      const privateLines = feedbackLines.filter(line => /^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:/i.test(line.trim()));
      const publicLines = feedbackLines.filter(line => !/^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:/i.test(line.trim()) && line.trim());
      const teacherCheck = privateLines
        .map(line => line.replace(/^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:\s*/i, '').trim())
        .filter(Boolean)
        .join('\n');
      const commentTxt = publicLines.join('\n').trim();
      let gradeInserted = false;

      // ── Grade field ──────────────────────────────────────────────────────────
      if (grade) {
        const gEl = document.querySelector([
          'input.grading_value',
          'input[data-testid="grading-box-extended-grade-input"]',
          '#grade_container input',
          'input.grade',
          '#grading-box-extended input[type="text"]',
          'input[aria-label*="Grade" i][type="text"]',
        ].join(', '));
        if (gEl) {
          setReactValue(gEl, grade);
          gradeInserted = true;
        }
      }

      const commentInserted = findAndFillComment(commentTxt);
      if (!commentInserted) navigator.clipboard?.writeText(commentTxt).catch(() => {});
      return { gradeInserted, commentInserted, teacherCheck };
    }

    const aiBtn = document.createElement('button');
    aiBtn.id = 'ce-ai-grade-btn';
    aiBtn.textContent = '✦ AI Grade';
    aiBtn.style.cssText = `
      position:fixed;top:${TOP_OFF + 62}px;right:${TOOLBAR_W + 8}px;
      z-index:2147483640;
      background:#fff;color:#2d3b45;border:1px solid #000;border-radius:4px;
      padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,.15);white-space:nowrap;
      transition:background .15s,color .15s;
    `;
    aiBtn._baseBg = '#fff';
    aiBtn.addEventListener('mouseenter', () => { if (!aiBtn.disabled) aiBtn.style.background = '#f5f5f5'; });
    aiBtn.addEventListener('mouseleave', () => { if (!aiBtn.disabled) aiBtn.style.background = aiBtn._baseBg || '#fff'; });

    const teacherCheckLabel = document.createElement('div');
    teacherCheckLabel.id = 'ce-ai-teacher-check';
    teacherCheckLabel.style.cssText = `
      display:none;position:fixed;top:${TOP_OFF + 104}px;right:${TOOLBAR_W + 8}px;
      z-index:2147483640;max-width:320px;background:#fff8e1;color:#5f4200;
      border:1px solid #f3d27a;border-radius:4px;padding:8px 10px;
      font:12px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.16);
    `;

    function showTeacherCheckLabel(text) {
      const clean = String(text || '').trim();
      if (!clean) {
        teacherCheckLabel.style.display = 'none';
        teacherCheckLabel.textContent = '';
        return;
      }
      teacherCheckLabel.textContent = `Teacher check: ${clean}`;
      teacherCheckLabel.style.display = 'block';
    }

    let _grading = false;
    function resetBtn(label, bg, color, border) {
      aiBtn.textContent = label || '✦ AI Grade';
      aiBtn._baseBg = bg || '#fff';
      aiBtn.style.background = bg || '#fff';
      aiBtn.style.color = color || '#2d3b45';
      aiBtn.style.border = border || '1px solid #000';
      aiBtn.disabled = false;
      _grading = false;
      if (!label) showTeacherCheckLabel('');
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

        const inserted = fillFields(text, criteria);
        showTeacherCheckLabel(inserted.teacherCheck);
        aiBtn.textContent = inserted.commentInserted && inserted.gradeInserted
          ? 'Grade & Comment Inserted'
          : inserted.commentInserted
            ? 'Comment Inserted'
            : 'Comment copied';
        aiBtn._baseBg = '#27AE60';
        aiBtn.style.background = '#27AE60';
        aiBtn.style.color = '#fff';
        aiBtn.style.border = '1px solid #27AE60';
        setTimeout(() => resetBtn(), 4000);
      } catch(e) {
        aiBtn.textContent = '⚠ ' + e.message.slice(0, 30);
        aiBtn._baseBg = '#C0392B';
        aiBtn.style.background = '#C0392B';
        aiBtn.style.color = '#fff';
        aiBtn.style.border = '1px solid #C0392B';
        setTimeout(() => resetBtn(), 4000);
      }
    });

    document.body.appendChild(aiBtn);
    document.body.appendChild(teacherCheckLabel);

  } catch(e) { /* don't crash SpeedGrader */ }
})();
