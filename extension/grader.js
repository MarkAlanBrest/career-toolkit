(async function () {
  'use strict';
  try {
    if (!/speed_grader/.test(window.location.href)) return;

    // ── STORAGE SHIM ──────────────────────────────────────────────────────────
    const _store = await new Promise(resolve =>
      chrome.storage.local.get(['ce_canvas_token', 'ce_grader_settings', 'ce_grading_model'], resolve)
    );
    function GM_getValue(key, def) { return _store[key] ?? def; }
    function GM_setValue(key, val) { _store[key] = val; chrome.storage.local.set({ [key]: val }); }

    const token        = GM_getValue('ce_canvas_token', '');
    const gradingModel = GM_getValue('ce_grading_model', 'claude-haiku-4-5-20251001');
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

    function isVisible(el) {
      if (!el) return false;
      const style = el.ownerDocument?.defaultView?.getComputedStyle?.(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
      const rect = el.getBoundingClientRect?.();
      return !rect || (rect.width > 0 && rect.height > 0);
    }

    function cleanSubmissionText(text) {
      return String(text || '')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    function getVisibleSubmissionText() {
      const selectors = [
        '#iframe_holder iframe',
        '#submission_preview iframe',
        '#speedgrader_iframe',
        'iframe[src*="/submissions/"]',
        'iframe[title*="submission" i]',
        '#iframe_holder',
        '#submission_preview',
        '#document_preview',
        '#preview_frame',
        '.submission_preview',
        '.submission-details',
        '.submission_body',
        '[data-testid*="submission" i]',
      ];

      for (const selector of selectors) {
        for (const el of document.querySelectorAll(selector)) {
          if (!isVisible(el)) continue;
          try {
            if (el.tagName?.toLowerCase() === 'iframe') {
              const doc = el.contentDocument || el.contentWindow?.document;
              const text = cleanSubmissionText(doc?.body?.innerText || doc?.body?.textContent || '');
              if (text.length > 20) return text;
            } else {
              const text = cleanSubmissionText(el.innerText || el.textContent || '');
              if (text.length > 20) return text;
            }
          } catch (_) {}
        }
      }

      return '';
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
    let fetchSeq = 0;
    async function fetchSubmission() {
      const seq = ++fetchSeq;
      const { courseId, assignmentId, studentId } = getUrlParts();
      if (!studentId || !courseId || !assignmentId) return null;

      const nextCtx = {
        ...ctx,
        token,
        canvasOrigin: location.origin,
        courseId,
        assignmentId,
        studentId,
        studentName: '',
        assignmentName: '',
        settings: loadSettings(courseId, assignmentId),
        attachments: [],
        subText: '',
        mode: 'grade',
      };

      try {
        const a = await canvasApi(`${location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}`);
        nextCtx.assignmentName = a.name || '';
      } catch(_) {}

      try {
        const u = await canvasApi(`${location.origin}/api/v1/users/${studentId}/profile`);
        nextCtx.studentName = u.name || u.short_name || '';
      } catch(_) {
        const nameEl = document.querySelector(
          '#student_carousel_name, .student_selection option:checked, #students_selectmenu-button .ui-selectmenu-text'
        );
        if (nameEl) nextCtx.studentName = nameEl.textContent.trim().replace(/\s*\(.*\)$/, '');
      }

      try {
        const sub = await canvasApi(
          `${location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}?include[]=attachments`
        );

        if (sub.submission_type === 'online_text_entry' && sub.body) {
          const tmp = document.createElement('div'); tmp.innerHTML = sub.body;
          nextCtx.subText = (tmp.textContent || tmp.innerText || '').trim();
        } else if (sub.submission_type === 'online_upload' && sub.attachments?.length) {
          nextCtx.attachments = sub.attachments.map(att => ({
            id:       att.id,
            filename: decodeURIComponent((att.filename || att.display_name || 'file').replace(/\+/g, ' ')),
            mimeType: att['content-type'] || att.content_type || '',
            url:      att.url || att.preview_url || '',
          }));
          nextCtx.subText = `[File upload: ${nextCtx.attachments.map(a => a.filename).join(', ')}]`;
        } else if (sub.submission_type === 'online_url') {
          nextCtx.subText = `[URL submission: ${sub.url}]`;
        }
      } catch(_) {}

      if (!nextCtx.subText && !nextCtx.attachments.length) {
        const visibleText = getVisibleSubmissionText();
        if (visibleText) nextCtx.subText = visibleText;
      }

      const current = getUrlParts();
      const stillCurrent = current.courseId === courseId && current.assignmentId === assignmentId && current.studentId === studentId;
      if (seq !== fetchSeq || !stillCurrent) return null;

      ctx = nextCtx;
      saveContext();
      return ctx;
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
    const PROMPT_SUBMISSION_CHARS = 55000;
    const PROMPT_HEAD_CHARS = 38000;
    const PROMPT_TAIL_CHARS = 14000;

    function submissionForPrompt(text) {
      const value = String(text || '(no submission)');
      if (value.length <= PROMPT_SUBMISSION_CHARS) return value;
      const head = value.slice(0, PROMPT_HEAD_CHARS).trimEnd();
      const tail = value.slice(-PROMPT_TAIL_CHARS).trimStart();
      const omitted = value.length - head.length - tail.length;
      return [
        `[Long submission excerpt: ${omitted.toLocaleString()} characters omitted from the middle]`,
        '',
        '[Beginning]',
        head,
        '',
        '[End]',
        tail,
      ].join('\n');
    }

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
      p += `SUBMISSION:\n${submissionForPrompt(c?.subText)}\n\n`;
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
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
      el.blur?.();
    }

    function findGradeInput() {
      const selectors = [
        'input.grading_value',
        '#grading-box-extended input',
        'input[data-testid="grading-box-extended-grade-input"]',
        'input[data-testid*="grade" i]',
        '#grade_container input',
        '#grading_box input',
        '#student_and_assignment_grade input',
        '.grading-box input',
        '.grading_value input',
        'input.grade',
        'input[name*="grade" i]',
        'input[id*="grade" i]',
        'input[aria-label*="grade" i]',
        'input[placeholder*="grade" i]',
      ];

      for (const selector of selectors) {
        const found = [...document.querySelectorAll(selector)].find(el =>
          isVisible(el) && !el.disabled && !el.readOnly
        );
        if (found) return found;
      }

      const candidates = [...document.querySelectorAll('input[type="text"], input:not([type]), [contenteditable="true"]')]
        .filter(el => isVisible(el) && !el.disabled && !el.readOnly);
      return candidates.find(el => {
        const labelText = [
          el.getAttribute('aria-label'),
          el.getAttribute('placeholder'),
          el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent,
          el.closest('label')?.textContent,
          el.closest('[data-testid], .grading-box, #grading_box, #grade_container')?.textContent,
        ].filter(Boolean).join(' ');
        return /grade|score|points/i.test(labelText);
      }) || null;
    }

    function setGradeValue(value) {
      const gEl = findGradeInput();
      if (!gEl) return false;
      if (gEl.isContentEditable || gEl.getAttribute?.('contenteditable') === 'true') {
        gEl.focus();
        gEl.textContent = value;
        gEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
        gEl.dispatchEvent(new Event('change', { bubbles: true }));
        gEl.blur?.();
        return true;
      }
      setReactValue(gEl, value);
      return true;
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
      const grade    = text.match(/SCORE:\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || null;
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
        gradeInserted = setGradeValue(grade);
      }

      const commentInserted = findAndFillComment(commentTxt);
      if (!commentInserted) navigator.clipboard?.writeText(commentTxt).catch(() => {});
      return { gradeInserted, commentInserted, teacherCheck };
    }

    const aiBtn = document.createElement('button');
    aiBtn.id = 'ce-ai-grade-btn';
    aiBtn.textContent = '✦ AI Grade';
    aiBtn.style.cssText = `
      position:fixed;top:68px;right:60px;z-index:2147483641;width:160px;
      text-align:center;background:#fff;color:#2d3b45;
      border:1px solid #c7cdd1;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.12);
      padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      white-space:nowrap;transition:background .15s,color .15s;
    `;
    aiBtn._baseBg = '#fff';
    aiBtn.addEventListener('mouseenter', () => { if (!aiBtn.disabled) aiBtn.style.background = '#f5f5f5'; });
    aiBtn.addEventListener('mouseleave', () => { if (!aiBtn.disabled) aiBtn.style.background = aiBtn._baseBg || '#fff'; });

    const teacherCheckLabel = document.createElement('div');
    teacherCheckLabel.id = 'ce-ai-teacher-check';
    teacherCheckLabel.style.cssText = `
      display:none;margin-top:6px;background:#fff8e1;color:#5f4200;
      border:1px solid #f3d27a;border-radius:4px;padding:8px 10px;
      font:12px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
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
        const { ce_criteria: allCriteria } =
          await new Promise(r => chrome.storage.local.get(['ce_criteria'], r));

        aiBtn.textContent = 'Loading current student...';
        const freshCtx = await fetchSubmission();
        const current = getUrlParts();
        const c = freshCtx || ctx;
        if (
          !c ||
          c.courseId !== current.courseId ||
          c.assignmentId !== current.assignmentId ||
          c.studentId !== current.studentId
        ) {
          throw new Error('Student changed - try again');
        }
        if (!c.subText && !c.attachments?.length) throw new Error('No submission loaded yet');

        const k        = c.courseId && c.assignmentId ? `${c.courseId}_${c.assignmentId}` : null;
        const criteria = k ? (allCriteria?.[k] || '') : '';

        // Fetch file content if not yet parsed
        if (c.attachments?.length && (!c.subText || c.subText.startsWith('[File upload'))) {
          const visiblePreview = getVisibleSubmissionText();
          if (visiblePreview.length > 200) {
            c.subText = `[Visible SpeedGrader preview]\n${visiblePreview}`;
          } else {
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
            if (res?.error) {
              const fallbackPreview = getVisibleSubmissionText();
              if (fallbackPreview.length > 200) {
                parts.push(`[${att.filename} - visible SpeedGrader preview]\n${fallbackPreview}`);
                continue;
              }
              throw new Error(res.error);
            }
            const parsed = res?.text?.trim();
            if (!parsed) {
              const fallbackPreview = getVisibleSubmissionText();
              if (fallbackPreview.length > 200) {
                parts.push(`[${att.filename} - visible SpeedGrader preview]\n${fallbackPreview}`);
                continue;
              }
              throw new Error(`Could not read ${att.filename}`);
            }
            const note = res.truncated
              ? `[Large file note: parsed ${Number(res.originalChars || parsed.length).toLocaleString()} characters and used an excerpt for reliable grading]\n`
              : '';
            parts.push(`[${att.filename}]\n${note}${parsed}`);
          }
          c.subText = parts.join('\n\n');
          }
          chrome.storage.local.set({ ce_claude_context: c });
          aiBtn.textContent = '⟳ Grading…';
        }

        const afterFiles = getUrlParts();
        if (
          afterFiles.courseId !== c.courseId ||
          afterFiles.assignmentId !== c.assignmentId ||
          afterFiles.studentId !== c.studentId
        ) {
          throw new Error('Student changed - try again');
        }

        const response = await new Promise(r => chrome.runtime.sendMessage(
          { type: 'GENERATE', payload: { messages: [{ role: 'user', content: buildPrompt(c, criteria) }], max_tokens: 1500, model: gradingModel } }, r
        ));
        if (response?.error) throw new Error(response.error);
        const text = response?.content?.[0]?.text || '';
        if (!text) throw new Error('Empty response — check your API key in settings');

        const beforeInsert = getUrlParts();
        if (
          beforeInsert.courseId !== c.courseId ||
          beforeInsert.assignmentId !== c.assignmentId ||
          beforeInsert.studentId !== c.studentId
        ) {
          throw new Error('Student changed before insert');
        }

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
        setTimeout(() => resetBtn(), 12000);
      } catch(e) {
        aiBtn.textContent = '⚠ ' + e.message.slice(0, 30);
        aiBtn._baseBg = '#C0392B';
        aiBtn.style.background = '#C0392B';
        aiBtn.style.color = '#fff';
        aiBtn.style.border = '1px solid #C0392B';
        setTimeout(() => resetBtn(), 10000);
      }
    });

    const teacherCheckWrap = document.createElement('div');
    teacherCheckWrap.id = 'ce-ai-grade-wrap';
    teacherCheckWrap.style.cssText = 'position:fixed;top:150px;right:60px;z-index:2147483641;width:260px;';
    teacherCheckWrap.appendChild(teacherCheckLabel);
    document.body.appendChild(teacherCheckWrap);

    function injectAiBtn() {
      if (document.getElementById('ce-ai-grade-btn')?.isConnected) return;
      document.body.appendChild(aiBtn);
    }
    let _aiPoll = 0;
    const _aiTimer = setInterval(() => {
      injectAiBtn();
      if (++_aiPoll >= 10 || document.getElementById('ce-ai-grade-btn')?.isConnected) clearInterval(_aiTimer);
    }, 1000);

    function getCurrentCommentText() {
      const tiny = window.tinymce || window.tinyMCE;
      if (tiny?.get) {
        for (const id of ['speed_grader_comment_textarea', 'speedgrader_textarea', 'grading_comment', 'comment_textarea']) {
          const editor = tiny.get(id);
          if (editor) return editor.getContent({ format: 'text' }) || '';
        }
      }
      const textarea = document.querySelector([
        '#speed_grader_comment_textarea', '#speedgrader_textarea',
        'textarea[name="comment[text_comment]"]', '#grading_comment',
        '#submission_comment_form textarea', '#right_side_inner textarea',
      ].join(','));
      if (textarea) return textarea.value || '';
      const editable = document.querySelector('.tox-edit-area [contenteditable="true"], [contenteditable="true"][aria-label*="comment" i]');
      if (editable) return editable.innerText || '';
      for (const iframe of document.querySelectorAll('iframe#speed_grader_comment_textarea_ifr, iframe[id*="speed_grader_comment" i]')) {
        try {
          const body = iframe.contentDocument?.body || iframe.contentWindow?.document?.body;
          if (body) return body.innerText || '';
        } catch(_) {}
      }
      return '';
    }

    document.addEventListener('ce-sg-insert-comment', (e) => {
      const text = e.detail?.text;
      if (!text) return;
      const existing = getCurrentCommentText().trim();
      findAndFillComment(existing ? existing + '\n\n' + text : text);
    });

  } catch(e) { /* don't crash SpeedGrader */ }
})();
