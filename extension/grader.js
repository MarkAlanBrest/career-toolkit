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

    // ── SPEEDGRADER COMMENT TOOLBAR ───────────────────────────────────────────
    const _barBtnCss = 'padding:6px 12px;border:1px solid #c7cdd1;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.12);background:#fff;color:#2d3b45;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;text-align:center;transition:background .15s,color .15s;';
    const floatBar = document.createElement('div');
    floatBar.id = 'ce-sg-float-bar';
    floatBar.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-width:100%;';

    const floatBarRow = document.createElement('div');
    floatBarRow.id = 'ce-sg-float-bar-row';
    floatBarRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;align-items:center;';
    floatBar.appendChild(floatBarRow);

    function getSpeedGraderUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const m = window.location.pathname.match(/\/courses\/(\d+)/);
      return {
        courseId:     m?.[1] || '',
        assignmentId: params.get('assignment_id') || '',
        studentId:    params.get('student_id')    || '',
      };
    }

    function findSpeedGraderToolbarAnchor() {
      const toolbarSelectors = [
        '.ic-app-header__actions',
        '.ic-page-header__actions',
        '.page-header__actions',
        '.ic-actions',
        '.speedgrader-header-actions',
        '.sg-navigation',
        '.assignment-header .actions',
        '.page-header-right',
        '.title-bar__actions',
        '.ic-app-header__toolbar',
      ];
      for (const selector of toolbarSelectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    }

    function findSpeedGraderCommentAnchor() {
      const selectors = [
        '#comments_container',
        '#submission_comment_form',
        '.submission-comment-form',
        '.submission-comments',
        '.grading_comment',
        '.comment-input',
        '.comment-form',
        '.assignment-comments',
        '.speed_grader_comment',
        '.speedgrader_comment',
        '.ic-RichContentEditor',
        '#right_side_inner',
        '#right_side',
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      const textarea = document.querySelector([
        '#speed_grader_comment_textarea',
        '#speedgrader_textarea',
        '#grading_comment',
        '#comment_textarea',
        'textarea[name="comment[text_comment]"]',
        'textarea[aria-label*="comment" i]',
        'textarea[placeholder*="comment" i]',
        '[contenteditable="true"][aria-label*="comment" i]',
      ].join(','));
      if (textarea) return textarea.closest('form,section,div,article,aside') || textarea.parentElement;
      const label = [...document.querySelectorAll('label,button,strong,div,span,h1,h2,h3,h4,h5,h6')]
        .find(el => /assignment comments|post a comment|add a comment|student comment/i.test(el.textContent || ''));
      if (label) return label.closest('section,div,fieldset,form,article,aside') || label.parentElement;
      return null;
    }

    function placeSpeedGraderFloatBar() {
      const commentAnchor = findSpeedGraderCommentAnchor();
      const toolbarAnchor = commentAnchor ? null : findSpeedGraderToolbarAnchor();
      const anchor = commentAnchor || toolbarAnchor;
      if (!anchor) return false;

      const isToolbar = !commentAnchor && !!toolbarAnchor;
      floatBar.style.cssText = isToolbar
        ? 'display:flex;flex-direction:row;align-items:center;flex-wrap:wrap;gap:4px;max-width:100%;margin:8px 0;padding:8px 10px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;'
        : 'display:flex;flex-direction:column;gap:6px;max-width:100%;margin:10px 0 8px;padding:8px 10px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;';

      if (anchor.contains(floatBar)) return true;
      try {
        if (isToolbar && anchor.appendChild) {
          anchor.appendChild(floatBar);
        } else {
          const tag = anchor.tagName.toLowerCase();
          if (tag === 'textarea' || tag === 'input') {
            anchor.insertAdjacentElement('beforebegin', floatBar);
          } else if (anchor.parentElement) {
            anchor.parentElement.insertBefore(floatBar, anchor.nextSibling);
          } else {
            anchor.insertAdjacentElement('afterend', floatBar);
          }
        }
        return true;
      } catch (_) {
        try {
          anchor.appendChild(floatBar);
          return true;
        } catch (_) {
          return false;
        }
      }
    }

    function ceSgStorageGet(keys) {
      return new Promise(resolve => chrome.storage.local.get(keys, resolve));
    }

    function ceSgStorageSet(values) {
      chrome.storage.local.set(values);
    }

    async function ceSgCanvasGet(path) {
      const res = await fetch(location.origin + path, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`Canvas ${res.status}`);
      return res.json();
    }

    function ceSgBtn(label, primary) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.cssText = primary
        ? 'padding:7px 10px;border:1px solid #0b5f7f;border-radius:3px;background:#0b5f7f;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;line-height:1.25;'
        : 'padding:7px 10px;border:1px solid #c7cdd1;border-radius:3px;background:#f5f5f5;color:#2d3b45;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;line-height:1.25;';
      return btn;
    }

    function ceSgSection(parent, title) {
      const box = document.createElement('section');
      box.style.cssText = 'border-top:1px solid #c7cdd1;background:#fff;';
      const head = document.createElement('div');
      head.textContent = title;
      head.style.cssText = 'padding:10px 12px 6px;background:#fff;font-size:13px;font-weight:700;color:#2d3b45;';
      const body = document.createElement('div');
      body.style.cssText = 'padding:0 12px 12px;display:flex;flex-direction:column;gap:8px;';
      box.append(head, body);
      parent.appendChild(box);
      return body;
    }

    function ceSgVisibleSubmissionText() {
      const selectors = [
        '#iframe_holder iframe', '#submission_preview iframe', '#speedgrader_iframe',
        'iframe[src*="/submissions/"]', '#iframe_holder', '#submission_preview',
        '#document_preview', '.submission_preview', '.submission-details', '.submission_body',
      ];
      for (const selector of selectors) {
        for (const el of document.querySelectorAll(selector)) {
          try {
            const text = el.tagName?.toLowerCase() === 'iframe'
              ? (el.contentDocument?.body?.innerText || '')
              : (el.innerText || el.textContent || '');
            const clean = String(text || '').replace(/\n{3,}/g, '\n\n').trim();
            if (clean.length > 40) return clean.slice(0, 45000);
          } catch (_) {}
        }
      }
      return '';
    }

    function ceSgHtml(value) {
      return String(value || '')
        .split(/\n{2,}/)
        .map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    function ceSgSetValue(el, value) {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') {
        const proto = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.focus();
        return true;
      }
      if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') {
        el.focus();
        el.innerHTML = ceSgHtml(value);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    function ceSgInsertComment(value, append) {
      const opener = document.querySelector('button[data-testid*="add-comment" i],button[aria-label*="add comment" i],button[title*="add comment" i],a[aria-label*="add comment" i],a[title*="add comment" i],.add_comment_link,#add_a_comment');
      try { opener?.click(); } catch (_) {}
      const currentEl = document.querySelector('#speed_grader_comment_textarea,#speedgrader_textarea,textarea[name="comment[text_comment]"],#grading_comment,#submission_comment_form textarea,#right_side_inner textarea,.tox-edit-area [contenteditable="true"],[contenteditable="true"][aria-label*="comment" i]');
      const current = append ? (currentEl?.value || currentEl?.innerText || '').trim() : '';
      const next = current ? `${current}\n\n${value}` : value;
      const tiny = window.tinymce || window.tinyMCE;
      if (tiny?.get) {
        for (const id of ['speed_grader_comment_textarea', 'speedgrader_textarea', 'grading_comment', 'comment_textarea']) {
          const ed = tiny.get(id);
          if (ed) {
            ed.setContent(ceSgHtml(next));
            ed.fire?.('input');
            ed.fire?.('change');
            ed.save?.();
            return true;
          }
        }
      }
      const selectors = [
        '#speed_grader_comment_textarea', '#speedgrader_textarea', 'textarea[name="comment[text_comment]"]',
        '#grading_comment', '#comment_textarea', '.submission-comment-form textarea', '.grading_comment textarea',
        'textarea[data-testid*="comment" i]', 'textarea[aria-label*="comment" i]', 'textarea[placeholder*="comment" i]',
        '#comments_container textarea', '#submission_comment_form textarea', '.comment-input textarea',
        '#right_side textarea', '#right_side_inner textarea', '[contenteditable="true"][aria-label*="comment" i]',
        '[contenteditable="true"][data-testid*="comment" i]', '.tox-edit-area [contenteditable="true"]',
      ];
      for (const selector of selectors) if (ceSgSetValue(document.querySelector(selector), next)) return true;
      navigator.clipboard?.writeText(value).catch(() => {});
      return false;
    }

    function ceSgInsertGrade(value) {
      const selectors = [
        'input.grading_value', '#grading-box-extended input', 'input[data-testid="grading-box-extended-grade-input"]',
        'input[data-testid*="grade" i]', '#grade_container input', '#grading_box input',
        '#student_and_assignment_grade input', '.grading-box input', 'input.grade',
        'input[name*="grade" i]', 'input[id*="grade" i]', 'input[aria-label*="grade" i]',
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && !el.disabled && !el.readOnly && ceSgSetValue(el, value)) return true;
      }
      return false;
    }

    function ceSgParseAi(text) {
      return {
        score: text.match(/SCORE:\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '',
        comments: (text.match(/COMMENTS?:\s*([\s\S]*?)(?:TEACHER CHECK:|$)/i)?.[1] || text).trim(),
        teacherCheck: (text.match(/TEACHER CHECK:\s*([\s\S]*)/i)?.[1] || '').trim(),
      };
    }

    async function mountSpeedGraderToolbar() {
      if (document.getElementById('ce-sg-toolbar')) return true;
      const { courseId, assignmentId } = getSpeedGraderUrlParts();
      const host = document.querySelector('#full_width_container, #main, .ic-app-main-content, body');
      if (!host) return false;

      const state = {
        courseId,
        assignmentId,
        stored: await ceSgStorageGet(['ce_criteria', 'ce_sg_comment_snippets']),
        draftScore: '',
        draftComment: '',
        teacherCheck: '',
      };
      const criteriaKey = `${courseId}_${assignmentId}`;

      const style = document.createElement('style');
      style.id = 'ce-sg-toolbar-style';
      style.textContent = `
        body.ce-sg-toolbar-open { padding-top:0 !important; box-sizing:border-box !important; }
        #ce-sg-toolbar { position:sticky; top:0; width:100%; height:56px; z-index:2147483640; border-bottom:1px solid #c7cdd1; background:#fff; color:#2d3b45; font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif; box-sizing:border-box; box-shadow:0 2px 8px rgba(0,0,0,.10); }
        #ce-sg-toolbar.ce-sg-collapsed { display:none !important; }
        #ce-sg-toolbar * { box-sizing:border-box; }
        .ce-sg-mainbar { height:100%; display:flex; align-items:stretch; gap:2px; padding:0 8px; overflow-x:auto; overflow-y:hidden; }
        .ce-sg-brand { min-width:84px; height:100%; border-right:1px solid #c7cdd1; background:#f5f5f5; color:#6b7280; display:flex; align-items:center; justify-content:center; padding:0 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
        .ce-sg-btn { width:78px; height:100%; flex-shrink:0; border:none; border-bottom:3px solid transparent; background:rgba(60,190,120,0.11); color:#2d3b45; padding:0 6px; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; }
        .ce-sg-btn-inner { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; pointer-events:none; }
        .ce-sg-btn-icon { font-size:18px; line-height:1; display:block; text-align:center; }
        .ce-sg-btn-label { display:block; text-align:center; font-size:10px; color:#2d3b45; opacity:.8; letter-spacing:.2px; text-transform:uppercase; font-weight:700; line-height:1.05; }
        .ce-sg-btn:hover { background:#eef2f4; }
        .ce-sg-btn-primary { border-bottom-color:#0770b8; background:#1b303d; color:#fff; }
        .ce-sg-btn-primary:hover { background:#1b303d; }
        .ce-sg-btn-primary .ce-sg-btn-label { color:#fff; opacity:1; }
        .ce-sg-collapse { margin-left:auto; width:54px; border-left:1px solid #c7cdd1; background:#f5f5f5; color:#2d3b45; }
        #ce-sg-tab { position:sticky; top:0; margin-left:auto; z-index:2147483641; width:128px; height:26px; border:1px solid #c7cdd1; border-top:none; border-radius:0 0 4px 4px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.14); color:#2d3b45; font:700 11px/1 -apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif; cursor:pointer; display:none; align-items:center; justify-content:center; }
        .ce-sg-drawer { display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); width:min(760px,calc(100vw - 56px)); max-height:min(620px,calc(100vh - 96px)); overflow:auto; z-index:2147483638; border:1px solid #c7cdd1; border-radius:4px; background:#fff; box-shadow:0 12px 36px rgba(0,0,0,.22); padding:12px; gap:10px; align-items:flex-start; flex-wrap:wrap; }
        .ce-sg-drawer.ce-open { display:flex; }
        .ce-sg-drawer .ce-sg-btn { width:auto; height:auto; min-width:auto; min-height:34px; border:1px solid #c7cdd1; border-radius:3px; background:#fff; color:#2d3b45; padding:7px 10px; font-size:13px; font-weight:600; text-transform:none; letter-spacing:0; line-height:1.2; }
        .ce-sg-drawer .ce-sg-btn-primary { border-color:#0b5f7f; background:#0b5f7f; color:#fff; }
        .ce-sg-field { display:flex; flex-direction:column; gap:5px; min-width:220px; flex:1 1 260px; }
        .ce-sg-field label { font-size:12px; font-weight:700; color:#2d3b45; }
        .ce-sg-input, .ce-sg-textarea, .ce-sg-select { width:100%; border:1px solid #c7cdd1; border-radius:3px; padding:8px; font:13px/1.35 inherit; color:#2d3b45; background:#fff; }
        .ce-sg-textarea { min-height:92px; resize:vertical; }
        .ce-sg-small { font-size:12px; color:#6b7780; line-height:1.35; }
        .ce-sg-list { display:flex; flex-direction:column; gap:6px; max-height:190px; overflow:auto; min-width:260px; flex:1 1 320px; }
        .ce-sg-teacher { display:none; background:#fff8e1; border:1px solid #e6c45f; color:#5f4200; border-radius:3px; padding:8px; font-size:12px; line-height:1.35; flex:1 1 100%; }
      `;
      document.head.appendChild(style);

      const bar = document.createElement('section');
      bar.id = 'ce-sg-toolbar';

      const main = document.createElement('div');
      main.className = 'ce-sg-mainbar';
      const brand = document.createElement('div');
      brand.className = 'ce-sg-brand';
      brand.textContent = 'Grading';
      const needsBtn = ceSgToolbarButton('Needs', false, '📋');
      const aiBtn = ceSgToolbarButton('AI Grade', true, '🎓');
      const criteriaBtn = ceSgToolbarButton('Criteria', false, '📌');
      const commentsBtn = ceSgToolbarButton('Comments', false, '💬');
      const insertDraftBtn = ceSgToolbarButton('Insert', true, '↪');
      const collapseBtn = ceSgToolbarButton('Hide', false, '▴');
      collapseBtn.classList.add('ce-sg-collapse');
      main.append(brand, needsBtn, aiBtn, criteriaBtn, commentsBtn, insertDraftBtn, collapseBtn);
      bar.appendChild(main);

      const drawer = document.createElement('div');
      drawer.className = 'ce-sg-drawer';
      bar.appendChild(drawer);

      const tab = document.createElement('button');
      tab.id = 'ce-sg-tab';
      tab.type = 'button';
      tab.textContent = 'Grader Toolbar';
      document.body.classList.add('ce-sg-toolbar-open');

      function setToolbarOpen(open) {
        bar.classList.toggle('ce-sg-collapsed', !open);
        tab.style.display = open ? 'none' : 'flex';
        document.body.classList.toggle('ce-sg-toolbar-open', open);
        if (!open) {
          drawer.classList.remove('ce-open');
          [needsBtn, aiBtn, criteriaBtn, commentsBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
        }
      }

      collapseBtn.addEventListener('click', () => setToolbarOpen(false));
      tab.addEventListener('click', () => setToolbarOpen(true));

      const scoreInput = document.createElement('input');
      scoreInput.className = 'ce-sg-input';
      scoreInput.placeholder = 'Suggested score';
      const draftInput = document.createElement('textarea');
      draftInput.className = 'ce-sg-textarea';
      draftInput.placeholder = 'AI feedback draft appears here. Edit before inserting.';
      const teacherBox = document.createElement('div');
      teacherBox.className = 'ce-sg-teacher';

      const criteriaInput = document.createElement('textarea');
      criteriaInput.className = 'ce-sg-textarea';
      criteriaInput.placeholder = 'Paste rubric, answer key, grading rules, or AI instructions for this assignment.';
      criteriaInput.value = state.stored.ce_criteria?.[criteriaKey] || '';
      criteriaInput.addEventListener('input', async () => {
        const latest = await ceSgStorageGet(['ce_criteria']);
        ceSgStorageSet({ ce_criteria: { ...(latest.ce_criteria || {}), [criteriaKey]: criteriaInput.value } });
      });

      const snippetEdit = document.createElement('textarea');
      snippetEdit.className = 'ce-sg-textarea';
      snippetEdit.placeholder = 'One reusable comment per blank line.';
      snippetEdit.value = state.stored.ce_sg_comment_snippets || 'Strong work overall.\n\nPlease review the assignment directions and resubmit.\n\nGood start. Add more specific evidence and examples.';
      const snippetSelect = document.createElement('select');
      snippetSelect.className = 'ce-sg-select';
      function refreshSnippets() {
        ceSgStorageSet({ ce_sg_comment_snippets: snippetEdit.value });
        snippetSelect.innerHTML = '';
        snippetEdit.value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s.slice(0, 90);
          snippetSelect.appendChild(opt);
        });
      }
      snippetEdit.addEventListener('input', refreshSnippets);
      refreshSnippets();

      const queueStatus = document.createElement('div');
      queueStatus.className = 'ce-sg-small';
      queueStatus.textContent = courseId ? 'Click Refresh to load assignments with submitted work.' : 'Course not detected.';
      const queueList = document.createElement('div');
      queueList.className = 'ce-sg-list';
      const refreshQueueBtn = ceSgToolbarButton('Refresh');

      function ceSgToolbarButton(label, primary, iconText) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = primary ? 'ce-sg-btn ce-sg-btn-primary' : 'ce-sg-btn';
        if (iconText) {
          const inner = document.createElement('div');
          inner.className = 'ce-sg-btn-inner';
          const icon = document.createElement('span');
          icon.className = 'ce-sg-btn-icon';
          icon.textContent = iconText;
          const text = document.createElement('span');
          text.className = 'ce-sg-btn-label';
          text.textContent = label;
          inner.append(icon, text);
          b.appendChild(inner);
        } else {
          b.textContent = label;
        }
        return b;
      }

      function setToolbarButtonLabel(button, label) {
        const labelEl = button.querySelector('.ce-sg-btn-label');
        if (labelEl) labelEl.textContent = label;
        else button.textContent = label;
      }

      function field(label, control) {
        const wrap = document.createElement('div');
        wrap.className = 'ce-sg-field';
        const l = document.createElement('label');
        l.textContent = label;
        wrap.append(l, control);
        return wrap;
      }

      function showDrawer(mode) {
        drawer.dataset.mode = mode;
        drawer.innerHTML = '';
        drawer.classList.add('ce-open');
        [needsBtn, aiBtn, criteriaBtn, commentsBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
        const close = ceSgToolbarButton('Close');
        close.style.marginLeft = 'auto';
        close.addEventListener('click', () => {
          drawer.classList.remove('ce-open');
          [needsBtn, aiBtn, criteriaBtn, commentsBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
        });
        if (mode === 'needs') {
          needsBtn.classList.add('ce-sg-btn-primary');
          const box = document.createElement('div');
          box.className = 'ce-sg-field';
          box.style.flex = '1 1 100%';
          box.append(queueStatus, refreshQueueBtn, queueList);
          drawer.appendChild(close);
          drawer.appendChild(box);
        } else if (mode === 'ai') {
          aiBtn.classList.add('ce-sg-btn-primary');
          drawer.appendChild(close);
          drawer.append(field('Suggested score', scoreInput), field('Draft feedback', draftInput), teacherBox);
        } else if (mode === 'criteria') {
          criteriaBtn.classList.add('ce-sg-btn-primary');
          drawer.appendChild(close);
          drawer.appendChild(field('Assignment criteria', criteriaInput));
        } else if (mode === 'comments') {
          commentsBtn.classList.add('ce-sg-btn-primary');
          const insertCommentBtn = ceSgToolbarButton('Insert Selected Comment', true);
          insertCommentBtn.addEventListener('click', () => snippetSelect.value && ceSgInsertComment(snippetSelect.value, true));
          drawer.appendChild(close);
          drawer.append(field('Saved comments', snippetSelect), field('Edit saved comments', snippetEdit), insertCommentBtn);
        }
      }

      needsBtn.addEventListener('click', () => showDrawer('needs'));
      criteriaBtn.addEventListener('click', () => showDrawer('criteria'));
      commentsBtn.addEventListener('click', () => showDrawer('comments'));
      aiBtn.addEventListener('click', async () => {
        showDrawer('ai');
        const subText = ceSgVisibleSubmissionText();
        if (!subText) { setToolbarButtonLabel(aiBtn, 'No Text'); setTimeout(() => setToolbarButtonLabel(aiBtn, 'AI Grade'), 2500); return; }
        aiBtn.disabled = true;
        setToolbarButtonLabel(aiBtn, 'Grading...');
        try {
          const student = document.querySelector('#student_carousel_name,#students_selectmenu-button .ui-selectmenu-text,#students_selectmenu-button')?.textContent?.trim() || 'the student';
          const prompt = `Grade this Canvas submission.\nStudent: ${student}\nCourse ID: ${courseId}\nAssignment ID: ${assignmentId}\n\nGRADING CRITERIA:\n${criteriaInput.value || 'Grade fairly. Be specific and concise.'}\n\nSUBMISSION:\n${subText}\n\nRespond exactly in this format:\nSCORE: [number]\nCOMMENTS:\n[student-facing feedback]\nTEACHER CHECK:\n[private verification notes for the teacher]`;
          const response = await new Promise(resolve => chrome.runtime.sendMessage(
            { type: 'GENERATE', payload: { messages: [{ role: 'user', content: prompt }], max_tokens: 1500, model: gradingModel } },
            resolve
          ));
          if (response?.error) throw new Error(response.error);
          const parsed = ceSgParseAi(response?.content?.[0]?.text || '');
          scoreInput.value = parsed.score;
          draftInput.value = parsed.comments;
          teacherBox.textContent = parsed.teacherCheck ? `Teacher check: ${parsed.teacherCheck}` : '';
          teacherBox.style.display = parsed.teacherCheck ? 'block' : 'none';
        } catch (e) {
          draftInput.value = e.message || 'AI grading failed.';
        } finally {
          aiBtn.disabled = false;
          setToolbarButtonLabel(aiBtn, 'AI Grade');
        }
      });

      insertDraftBtn.addEventListener('click', () => {
        if (scoreInput.value.trim()) ceSgInsertGrade(scoreInput.value.trim());
        if (draftInput.value.trim()) ceSgInsertComment(draftInput.value.trim(), false);
      });

      refreshQueueBtn.addEventListener('click', async () => {
        if (!courseId) return;
        refreshQueueBtn.disabled = true;
        queueStatus.textContent = 'Loading assignments...';
        queueList.innerHTML = '';
        try {
          const assignments = await ceSgCanvasGet(`/api/v1/courses/${courseId}/assignments?order_by=due_at&per_page=100`);
          const needing = (assignments || []).filter(a => Number(a.needs_grading_count || 0) > 0);
          queueStatus.textContent = needing.length ? `${needing.length} assignments need grading.` : 'No assignments with Canvas needs_grading_count.';
          needing.slice(0, 40).forEach(a => {
            const b = ceSgToolbarButton(`${a.name} (${a.needs_grading_count})`);
            b.style.textAlign = 'left';
            b.addEventListener('click', () => { location.href = `${location.origin}/courses/${courseId}/gradebook/speed_grader?assignment_id=${a.id}`; });
            queueList.appendChild(b);
          });
        } catch (e) {
          queueStatus.textContent = e.message || 'Could not load list.';
        } finally {
          refreshQueueBtn.disabled = false;
        }
      });

      document.body.insertBefore(tab, document.body.firstChild);
      document.body.insertBefore(bar, tab);
      return true;
    }

    let _sgToolbarMounting = false;
    function ensureSpeedGraderToolbar() {
      if (_sgToolbarMounting || document.getElementById('ce-sg-toolbar')) return;
      _sgToolbarMounting = true;
      mountSpeedGraderToolbar().finally(() => { _sgToolbarMounting = false; });
    }
    ensureSpeedGraderToolbar();
    setInterval(ensureSpeedGraderToolbar, 1500);
    new MutationObserver(() => {
      if (!document.getElementById('ce-sg-toolbar')) setTimeout(ensureSpeedGraderToolbar, 100);
    }).observe(document.body, { childList: true, subtree: true });
    if (!token) return;

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function getUrlParts() {
      return getSpeedGraderUrlParts();
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
      if (btn) { btn.textContent = '✦ AI Grade'; btn.style.background = '#fff'; btn.style.color = '#2d3b45'; btn.disabled = false; }
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

    function injectInlineUiIfNeeded() {
      if (placeSpeedGraderFloatBar()) {
        const bar = document.getElementById('ce-sg-float-bar');
        if (bar) {
          bar.style.position = 'static';
          bar.style.margin = '10px 0 8px';
        }
        teacherCheckWrap.style.display = 'block';
      }
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
    aiBtn.style.cssText = _barBtnCss;
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
    teacherCheckWrap.style.cssText = 'display:block;max-width:100%;';
    teacherCheckWrap.appendChild(teacherCheckLabel);
    floatBar.appendChild(teacherCheckWrap);

    function injectAiBtn() {
      const existing = document.getElementById('ce-ai-grade-btn');
      if (existing?.isConnected) return;
      if (!placeSpeedGraderFloatBar()) return false;
      const barRow = document.getElementById('ce-sg-float-bar-row');
      if (barRow) {
        barRow.appendChild(aiBtn);
        return true;
      }
      const bar = document.getElementById('ce-sg-float-bar');
      if (bar) {
        bar.appendChild(aiBtn);
        return true;
      }
      return false;
    }
    // Dedicated SpeedGrader toolbar replaces the old floating AI Grade button.

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
