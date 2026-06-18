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

    function ceSgToast(msg, ok) {
      const t = document.createElement('div');
      t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${ok === false ? '#C0392B' : '#127A1B'};color:#fff;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;z-index:2147483640;box-shadow:0 4px 14px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif;pointer-events:none;white-space:nowrap;`;
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2800);
    }

    function ceSgInsertComment(value, append) {
      const opener = document.querySelector([
        'button[data-testid*="add-comment" i]', 'button[aria-label*="add comment" i]',
        'button[title*="add comment" i]', 'a[aria-label*="add comment" i]',
        'a[title*="add comment" i]', '.add_comment_link', '#add_a_comment',
      ].join(','));
      try { opener?.click(); } catch (_) {}

      function tryInsert() {
        // 1. TinyMCE via global — activeEditor first, then by ID, then editors array
        const tiny = window.tinymce || window.tinyMCE;
        if (tiny) {
          const ed = tiny.activeEditor ||
            tiny.get?.('speed_grader_comment_textarea') || tiny.get?.('speedgrader_textarea') ||
            tiny.get?.('grading_comment') || tiny.get?.('comment_textarea') ||
            (tiny.editors?.length ? tiny.editors[tiny.editors.length - 1] : null);
          if (ed) {
            const current = append ? (ed.getContent({ format: 'text' }) || '').trim() : '';
            const next = current ? `${current}\n\n${value}` : value;
            ed.setContent(ceSgHtml(next));
            ed.fire?.('input'); ed.fire?.('change'); ed.save?.();
            return true;
          }
        }
        // 2. TinyMCE iframe direct body access (works even when global is unavailable)
        for (const frame of document.querySelectorAll('iframe[id$="_ifr"], iframe.tox-edit-area__iframe')) {
          try {
            const body = frame.contentDocument?.body || frame.contentWindow?.document?.body;
            if (body?.isContentEditable) {
              const current = append ? (body.innerText || '').trim() : '';
              const next = current ? `${current}\n\n${value}` : value;
              body.innerHTML = ceSgHtml(next);
              body.dispatchEvent(new InputEvent('input', { bubbles: true }));
              body.focus();
              return true;
            }
          } catch (_) {}
        }
        // 3. Specific well-known selectors (visible only)
        const selectors = [
          '#speed_grader_comment_textarea', '#speedgrader_textarea',
          'textarea[name="comment[text_comment]"]', '#grading_comment', '#comment_textarea',
          'textarea[data-testid*="comment" i]', 'textarea[aria-label*="comment" i]',
          'textarea[placeholder*="comment" i]', '#comments_container textarea',
          '#submission_comment_form textarea', '.submission-comment-form textarea',
          '#right_side textarea', '#right_side_inner textarea',
          '[contenteditable="true"][aria-label*="comment" i]',
          '[contenteditable="true"][data-testid*="comment" i]',
          '.tox-edit-area [contenteditable="true"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (!el || el.closest('#ce-sg-toolbar') || el.offsetParent === null) continue;
          const current = append ? (el.value || el.innerText || '').trim() : '';
          if (ceSgSetValue(el, current ? `${current}\n\n${value}` : value)) return true;
        }
        // 4. Last resort: any visible textarea not inside our toolbar
        for (const el of document.querySelectorAll('textarea')) {
          if (el.disabled || el.readOnly || el.offsetParent === null || el.closest('#ce-sg-toolbar')) continue;
          const current = append ? (el.value || '').trim() : '';
          if (ceSgSetValue(el, current ? `${current}\n\n${value}` : value)) return true;
        }
        return false;
      }

      let attempts = 0;
      function attempt() {
        if (tryInsert()) { ceSgToast('✓ Comment inserted'); return; }
        attempts++;
        if (attempts < 4) {
          setTimeout(attempt, attempts * 400);
        } else {
          ceSgToast('Could not find comment box — click inside it first', false);
        }
      }
      attempt();
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
      const score = text.match(/SCORE:\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '';
      let comments = '';
      let teacherCheck = '';
      const feedbackMatch = text.match(/FEEDBACK:\s*([\s\S]*)/i);
      const commentsMatch = text.match(/COMMENTS?:\s*([\s\S]*?)(?:TEACHER CHECK:|$)/i);
      if (feedbackMatch) {
        const lines = feedbackMatch[1].split('\n');
        const pub = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (/^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:/i.test(trimmed)) {
            if (!teacherCheck) teacherCheck = trimmed.replace(/^[-*•]?\s*(TEACHER CHECK|REVIEW)\s*:\s*/i, '').trim();
          } else if (trimmed) {
            pub.push(trimmed.replace(/^[-*•]\s*/, ''));
          }
        }
        comments = pub.join('\n').trim();
      } else if (commentsMatch) {
        comments = commentsMatch[1].trim();
        teacherCheck = (text.match(/TEACHER CHECK:\s*([\s\S]*)/i)?.[1] || '').trim();
      } else {
        comments = text.replace(/SCORE:[^\n]*/i, '').replace(/TEACHER CHECK:[\s\S]*/i, '').trim();
      }
      return { score, comments, teacherCheck };
    }

    async function mountSpeedGraderToolbar() {
      if (document.getElementById('ce-sg-toolbar')) return true;
      const { courseId, assignmentId } = getSpeedGraderUrlParts();
      const host = document.querySelector('#full_width_container, #main, .ic-app-main-content, body');
      if (!host) return false;

      const state = {
        courseId,
        assignmentId,
        stored: await ceSgStorageGet(['ce_criteria', 'ce_sg_comment_snippets', 'ce_sg_snippet_ver']),
        draftScore: '',
        draftComment: '',
        teacherCheck: '',
      };
      const criteriaKey = `${courseId}_${assignmentId}`;

      const style = document.createElement('style');
      style.id = 'ce-sg-toolbar-style';
      style.textContent = `
        body.ce-sg-toolbar-open { padding-top:0 !important; box-sizing:border-box !important; }
        #ce-sg-toolbar { position:relative; width:100%; height:56px; z-index:10; border-bottom:1px solid #1B303D; background:#394B58; color:#fff; font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif; box-sizing:border-box; box-shadow:0 2px 8px rgba(0,0,0,.22); }
        #ce-sg-toolbar.ce-sg-collapsed { display:none !important; }
        #ce-sg-toolbar * { box-sizing:border-box; }
        .ce-sg-mainbar { height:100%; display:flex; align-items:stretch; gap:0; padding:0 8px; overflow-x:auto; overflow-y:hidden; }
        .ce-sg-brand { min-width:84px; height:100%; border-right:1px solid rgba(255,255,255,0.15); color:#fff; display:flex; align-items:center; justify-content:center; padding:0 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }
        .ce-sg-btn { height:100%; flex-shrink:0; border:none; border-bottom:3px solid transparent; background:transparent; color:rgba(255,255,255,0.75); padding:0 18px; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; position:relative; transition:background 0.15s; }
        .ce-sg-badge { position:absolute;top:5px;right:5px;background:#e53e3e;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:1px 4px;line-height:1.3;display:none;pointer-events:none; }
        .ce-sg-btn-inner { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; pointer-events:none; }
        .ce-sg-btn-icon { font-size:18px; line-height:1; display:block; text-align:center; }
        .ce-sg-btn-label { display:block; text-align:center; font-size:11px; color:rgba(255,255,255,0.8); letter-spacing:.3px; text-transform:uppercase; font-weight:700; line-height:1; }
        .ce-sg-btn:hover { background:rgba(255,255,255,0.12); }
        .ce-sg-btn-primary { border-bottom-color:#fff !important; background:rgba(255,255,255,0.18) !important; color:#fff !important; }
        .ce-sg-btn-primary .ce-sg-btn-label { color:#fff !important; }
        .ce-sg-collapse { margin-left:auto; width:54px; border-left:1px solid rgba(255,255,255,0.15); }
        #ce-sg-tab { position:relative; margin-left:auto; z-index:10; width:128px; height:26px; border:1px solid #394B58; border-top:none; border-radius:0 0 4px 4px; background:#394B58; box-shadow:0 2px 8px rgba(0,0,0,.22); color:#fff; font:700 11px/1 inherit; cursor:pointer; display:none; align-items:center; justify-content:center; }
        .ce-sg-drawer { display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:2147483638; border-radius:8px; background:#fff; box-shadow:0 24px 64px rgba(0,0,0,.32),0 0 0 1px rgba(0,0,0,0.08); flex-direction:column; overflow:hidden; }
        .ce-sg-drawer.ce-open { display:flex; }
        .ce-sz-sm { width:min(520px,calc(100vw - 48px)); max-height:min(480px,calc(100vh - 80px)); }
        .ce-sz-md { width:min(720px,calc(100vw - 48px)); max-height:min(560px,calc(100vh - 80px)); }
        .ce-sz-lg { width:min(900px,calc(100vw - 48px)); max-height:min(640px,calc(100vh - 80px)); }
        .ce-sz-xl { width:min(980px,calc(100vw - 48px)); max-height:min(740px,calc(100vh - 60px)); }
        .ce-sg-mhdr { flex-shrink:0; height:48px; background:#1B303D; display:flex; align-items:center; padding:0 16px; gap:10px; }
        .ce-sg-mhdr-icon { font-size:18px; line-height:1; }
        .ce-sg-mhdr-title { font-size:14px; font-weight:700; color:#fff; letter-spacing:0.2px; flex:1; }
        .ce-sg-mhdr-close { width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:none; border:none; color:rgba(255,255,255,0.65); font-size:22px; cursor:pointer; border-radius:4px; line-height:1; padding:0; transition:background 0.15s,color 0.15s; font-family:inherit; }
        .ce-sg-mhdr-close:hover { background:rgba(255,255,255,0.15); color:#fff; }
        .ce-sg-mbody { flex:1; min-height:0; overflow:auto; padding:20px; display:flex; flex-direction:column; gap:14px; }
        .ce-sg-mbody-split { flex:1; min-height:0; overflow:hidden; display:flex; }
        .ce-sg-mcol { flex:1; min-width:0; overflow:auto; padding:20px; display:flex; flex-direction:column; gap:14px; }
        .ce-sg-mcol+.ce-sg-mcol { border-left:1px solid #e8eaec; }
        .ce-sg-mfooter { flex-shrink:0; height:56px; background:#f8f9fa; border-top:1px solid #e8eaec; display:flex; align-items:center; justify-content:flex-end; padding:0 16px; gap:8px; }
        .ce-sg-flabel { font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px; display:block; }
        .ce-sg-input,.ce-sg-textarea,.ce-sg-select { width:100%; border:1px solid #C7CDD1; border-radius:4px; padding:8px 10px; font:13px/1.4 -apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif; color:#2D3B45; background:#fff; box-sizing:border-box; transition:border-color 0.15s,box-shadow 0.15s; }
        .ce-sg-input:focus,.ce-sg-textarea:focus,.ce-sg-select:focus { outline:none; border-color:#0770B8; box-shadow:0 0 0 2px rgba(7,112,184,0.12); }
        .ce-sg-textarea { min-height:100px; resize:vertical; }
        .ce-sg-fgrp { display:flex; flex-direction:column; }
        .ce-sg-fgrp-grow { display:flex; flex-direction:column; flex:1; min-height:0; }
        .ce-sg-fgrp-grow .ce-sg-textarea { flex:1; min-height:80px; }
        .ce-sg-abtn { height:36px; padding:0 16px; border-radius:4px; font:600 13px/1 -apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; border:1px solid transparent; transition:background 0.15s,border-color 0.15s; }
        .ce-sg-abtn:disabled { opacity:0.55; cursor:not-allowed; }
        .ce-sg-abtn-primary { background:#0770B8; color:#fff; border-color:#0770B8; }
        .ce-sg-abtn-primary:hover:not(:disabled) { background:#0660A0; border-color:#0660A0; }
        .ce-sg-abtn-secondary { background:#fff; color:#2D3B45; border-color:#C7CDD1; }
        .ce-sg-abtn-secondary:hover:not(:disabled) { background:#F5F5F5; }
        .ce-sg-abtn-success { background:#127A1B; color:#fff; border-color:#127A1B; }
        .ce-sg-abtn-success:hover:not(:disabled) { background:#0f6617; }
        .ce-sg-status-text { font-size:12px; color:#6B7280; line-height:1.4; min-height:16px; }
        .ce-sg-tchnote { display:none; background:#fff8e1; border:1px solid #f3d27a; border-radius:4px; padding:10px 12px; font-size:12px; color:#5f4200; line-height:1.4; }
        .ce-sg-qitem { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:4px; border:1px solid #e8eaec; background:#fff; cursor:pointer; font-size:13px; color:#2D3B45; text-align:left; width:100%; transition:background 0.1s,border-color 0.1s; font-family:inherit; }
        .ce-sg-qitem:hover { background:#f0f6ff; border-color:#0770B8; }
        .ce-sg-qbadge { flex-shrink:0; background:#e53e3e; color:#fff; border-radius:10px; font-size:11px; font-weight:700; padding:2px 7px; margin-left:auto; }
      `;
      document.head.appendChild(style);

      const bar = document.createElement('section');
      bar.id = 'ce-sg-toolbar';

      const main = document.createElement('div');
      main.className = 'ce-sg-mainbar';
      const brand = document.createElement('div');
      brand.className = 'ce-sg-brand';
      brand.textContent = 'Grading';
      const queueBtn = ceSgToolbarButton('Queue', false);
      const queueBadge = document.createElement('span');
      queueBadge.className = 'ce-sg-badge';
      queueBtn.appendChild(queueBadge);
      function setQueueBadge(count) {
        if (count > 0) { queueBadge.textContent = String(count); queueBadge.style.display = ''; }
        else { queueBadge.style.display = 'none'; }
      }
      const aiBtn = ceSgToolbarButton('AI Grade', false);
      const criteriaBtn = ceSgToolbarButton('Criteria', false);
      const commentsBtn = ceSgToolbarButton('Comments', false);
      const auditBtn = ceSgToolbarButton('Audit', false);
      const collapseBtn = ceSgToolbarButton('Hide', false);
      collapseBtn.classList.add('ce-sg-collapse');
      main.append(brand, queueBtn, aiBtn, criteriaBtn, commentsBtn, auditBtn, collapseBtn);
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
          [queueBtn, aiBtn, criteriaBtn, commentsBtn, auditBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
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
      teacherBox.className = 'ce-sg-tchnote';

      const snippetEdit = document.createElement('textarea');
      const CE_DEFAULT_SNIPPETS = [
        // ── STRONG POSITIVE ─────────────────────────────────────────────────
        'Excellent work on this assignment. Your response is thorough, well-organized, and demonstrates a clear command of the material. You supported your argument with strong, specific evidence and communicated your ideas with precision. This is exactly the standard of work this course aims for — keep it up.',

        'Outstanding submission. You addressed every component of the prompt, your analysis goes beyond surface-level observations, and your writing is polished and focused. The connections you drew between the concepts show genuine critical thinking. Well done.',

        'Your analysis in this assignment stands out. You moved past simple description and made meaningful connections between the ideas, which is exactly the kind of thinking this course is designed to develop. The evidence you chose is well-matched to your claims. Excellent work.',

        'Impressive improvement since your last submission. The feedback from before is clearly reflected here — your structure is tighter, your evidence is more specific, and your argument is much easier to follow. Keep building on this momentum.',

        'Great job this week. Your use of course terminology is accurate, your thesis is specific and arguable, and your body paragraphs each stay on point. A few minor notes are in the rubric below, but overall this is a very strong response.',

        // ── POSITIVE WITH MINOR NOTES ────────────────────────────────────────
        'This is a well-written response that addresses the prompt clearly. To push into the top score range, develop your conclusion more fully — rather than restating your thesis, explain what your argument ultimately means or implies. See rubric notes for specifics.',

        'Strong work overall. The main area to strengthen is your use of sources — make sure every claim drawn from outside material is cited in the required format. A few instances are noted in the rubric. Otherwise, this is a solid submission.',

        'Good analysis throughout. One thing to watch: a few of your paragraphs cover more than one distinct idea. One main point per paragraph, supported by evidence, makes your argument cleaner and easier to follow. Minor note — the content here is strong.',

        // ── NEEDS DEVELOPMENT ────────────────────────────────────────────────
        'Your response shows a reasonable grasp of the topic, but the argument relies too heavily on general statements. After each main point, ask yourself: what specific example, quote, or data supports this? Grounding every claim in evidence will significantly strengthen your grade.',

        'The introduction sets up an interesting topic, but the response does not develop a clear, arguable thesis. A strong thesis takes a specific position — not just a topic statement. Revise your introduction to state exactly what you are arguing, then make sure every body paragraph supports that claim.',

        'Your ideas are interesting and the effort is clear. The main issue is structure: the argument loses focus in the middle, and some paragraphs cover multiple unrelated points. Try outlining before you draft — one main idea per paragraph, each one tied directly back to your thesis.',

        'I can see you understand the general topic, but this response stays at the surface level. Push further by asking "why does this matter?" and "what does this imply?" after each main point. Strong analysis explains the significance of the evidence, not just what it says.',

        'Your vocabulary and sentence-level writing are solid. The area that needs work is explanation — several concepts are introduced but not fully explained before you move on. When you bring in a new idea, define it, explain it in your own words, and then connect it to your argument before proceeding.',

        // ── OFF-PROMPT / INCOMPLETE ──────────────────────────────────────────
        'Thank you for submitting. After reviewing your response, it appears that you addressed a related but different topic than what was assigned. Please reread the prompt carefully, note the specific question being asked, and revise your response to answer it directly. Reach out if anything in the prompt is unclear.',

        'This submission is missing one or more required components listed in the assignment directions. Please review the rubric, complete the missing sections, and resubmit before the late deadline to earn partial credit. I have indicated what is missing in the rubric notes below.',

        'This submission is shorter than the minimum requirement. A response this brief cannot address the expected depth for this assignment. Please expand your analysis — particularly the body paragraphs — and resubmit.',

        'This appears to be an incomplete or draft version of the assignment. Please finish your revisions, review for clarity and errors, and resubmit the final version. If you are having trouble completing the work, please contact me before the deadline.',

        'The file submitted did not open correctly on my end. Please resubmit your assignment as a PDF or .docx file so I can access and grade your work. If you continue to have trouble, email the file directly and I will work from that version.',

        // ── LATE / ADMINISTRATIVE ────────────────────────────────────────────
        'This assignment was submitted after the deadline. A late penalty has been applied in accordance with the course policy. If you experienced an emergency or an extenuating circumstance that affected your ability to submit on time, please email me so we can discuss whether an accommodation is appropriate.',

        'I see the resubmission — thank you for following up on the feedback. I will regrade your updated response and update your score within the normal grading window. Let me know if you have any questions about the revised rubric.',

        // ── ENCOURAGEMENT / OUTREACH ─────────────────────────────────────────
        'You are clearly putting effort into this course and I want you to know that it is recognized. This submission shows real progress, even where it falls short of the top mark. Come to office hours and we can work through the specific areas together — you have the foundation to do well here.',

        'This was a challenging assignment and you gave it a solid attempt. The areas where your score fell short are very fixable — they are about technique, not understanding. Review the rubric notes, and reach out if you would like help applying the feedback before the next assignment.',
      ];
      const SNIPPET_VER = '3';
      const useDefaults = !state.stored.ce_sg_snippet_ver || state.stored.ce_sg_snippet_ver !== SNIPPET_VER;
      snippetEdit.value = (!useDefaults && state.stored.ce_sg_comment_snippets)
        ? state.stored.ce_sg_comment_snippets
        : CE_DEFAULT_SNIPPETS.join('\n\n');
      if (useDefaults) ceSgStorageSet({ ce_sg_comment_snippets: snippetEdit.value, ce_sg_snippet_ver: SNIPPET_VER });

      const queueStatus = document.createElement('div');
      queueStatus.className = 'ce-sg-status-text';
      queueStatus.textContent = courseId ? 'Click Refresh to load assignments needing grades.' : 'Course not detected.';
      const queueList = document.createElement('div');
      queueList.style.cssText = 'display:flex;flex-direction:column;gap:6px;overflow:auto;flex:1;min-height:0;';
      const refreshQueueBtn = document.createElement('button');
      refreshQueueBtn.type = 'button';
      refreshQueueBtn.className = 'ce-sg-abtn ce-sg-abtn-primary';
      refreshQueueBtn.textContent = '↻ Refresh';

      function ceSgToolbarButton(label, primary) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = primary ? 'ce-sg-btn ce-sg-btn-primary' : 'ce-sg-btn';
        const text = document.createElement('span');
        text.className = 'ce-sg-btn-label';
        text.textContent = label;
        b.appendChild(text);
        return b;
      }

      function setToolbarButtonLabel(button, label) {
        const labelEl = button.querySelector('.ce-sg-btn-label');
        if (labelEl) labelEl.textContent = label;
        else button.textContent = label;
      }

      function closeDrawer() {
        drawer.classList.remove('ce-open');
        [queueBtn, aiBtn, criteriaBtn, commentsBtn, auditBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
      }

      function makeModalHeader(icon, title) {
        const hdr = document.createElement('div');
        hdr.className = 'ce-sg-mhdr';
        const ico = document.createElement('span');
        ico.className = 'ce-sg-mhdr-icon';
        ico.textContent = icon;
        const ttl = document.createElement('span');
        ttl.className = 'ce-sg-mhdr-title';
        ttl.textContent = title;
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'ce-sg-mhdr-close';
        x.textContent = '×';
        x.title = 'Close';
        x.addEventListener('click', closeDrawer);
        hdr.append(ico, ttl, x);
        return hdr;
      }

      function mkAbtn(text, cls) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `ce-sg-abtn ${cls}`;
        b.textContent = text;
        return b;
      }

      function mkFgrp(labelText, control, grow) {
        const g = document.createElement('div');
        g.className = grow ? 'ce-sg-fgrp-grow' : 'ce-sg-fgrp';
        const l = document.createElement('label');
        l.className = 'ce-sg-flabel';
        l.textContent = labelText;
        g.append(l, control);
        return g;
      }

      function mkFooter(...btns) {
        const f = document.createElement('div');
        f.className = 'ce-sg-mfooter';
        btns.forEach(b => f.appendChild(b));
        return f;
      }

      function composeCriteriaText(c) {
        if (!c) return '';
        if (typeof c === 'string') return c;
        const parts = [];
        if (c.pointsPossible) parts.push(`Points Possible: ${c.pointsPossible}`);
        if (c.difficulty) parts.push(`Difficulty: ${c.difficulty}`);
        if (c.rubric?.trim()) parts.push(`Rubric:\n${c.rubric.trim()}`);
        if (c.answerKey?.trim()) parts.push(`Answer Key:\n${c.answerKey.trim()}`);
        if (c.suggestedComments?.trim()) parts.push(`Suggested Comments:\n${c.suggestedComments.trim()}`);
        if (c.aiNotes?.trim()) parts.push(`Additional Instructions:\n${c.aiNotes.trim()}`);
        return parts.join('\n\n');
      }

      async function saveCriteriaField(update) {
        const latest = await ceSgStorageGet(['ce_criteria']);
        const all = latest.ce_criteria || {};
        const current = (all[criteriaKey] && typeof all[criteriaKey] === 'object') ? all[criteriaKey] : {};
        ceSgStorageSet({ ce_criteria: { ...all, [criteriaKey]: { ...current, ...update } } });
      }

      function showDrawer(mode) {
        drawer.dataset.mode = mode;
        drawer.innerHTML = '';
        drawer.className = 'ce-sg-drawer';
        drawer.classList.add('ce-open');
        [queueBtn, aiBtn, criteriaBtn, commentsBtn, auditBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));

        if (mode === 'needs') {
          queueBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-sm');
          const body = document.createElement('div');
          body.className = 'ce-sg-mbody';
          body.append(queueStatus, queueList);
          const cancelBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          cancelBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('📬', 'Grading Queue'), body, mkFooter(cancelBtn, refreshQueueBtn));

        } else if (mode === 'ai') {
          aiBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-md');

          const body = document.createElement('div');
          body.className = 'ce-sg-mbody';

          const statusEl = document.createElement('div');
          statusEl.className = 'ce-sg-status-text';

          const runBtn = mkAbtn('▶ Grade This Assignment', 'ce-sg-abtn-primary');
          const runRow = document.createElement('div');
          runRow.style.cssText = 'display:flex;gap:12px;align-items:center;';
          runRow.append(runBtn, statusEl);

          runBtn.addEventListener('click', async () => {
            if (runBtn.disabled) return;
            runBtn.disabled = true;
            scoreInput.value = '';
            draftInput.value = '';
            teacherBox.style.display = 'none';
            statusEl.textContent = 'Loading submission…';
            try {
              const latestCrit = await ceSgStorageGet(['ce_criteria']);
              const criteriaText = composeCriteriaText(latestCrit.ce_criteria?.[criteriaKey]);
              let c = null;
              try { const freshCtx = await fetchSubmission(); c = freshCtx || ctx; } catch (_) {}
              if (!c) {
                const vis = ceSgVisibleSubmissionText() || getVisibleSubmissionText();
                if (!vis) throw new Error('No submission found — check Canvas token in Settings');
                const { courseId: cid, assignmentId: aid } = getSpeedGraderUrlParts();
                c = { subText: vis, courseId: cid, assignmentId: aid, studentId: '', studentName: 'the student', assignmentName: '', attachments: [], token: '' };
              }
              if (!c.subText && !c.attachments?.length) throw new Error('No submission loaded yet');
              if (c.attachments?.length && (!c.subText || c.subText.startsWith('[File upload'))) {
                const vis = ceSgVisibleSubmissionText() || getVisibleSubmissionText();
                if (vis.length > 200) {
                  c.subText = `[Visible preview]\n${vis}`;
                } else {
                  const parts = [];
                  for (const att of c.attachments) {
                    statusEl.textContent = `Reading ${att.filename}…`;
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
                      const fb = ceSgVisibleSubmissionText() || getVisibleSubmissionText();
                      if (fb.length > 200) { parts.push(`[${att.filename}]\n${fb}`); continue; }
                      throw new Error(res.error);
                    }
                    const parsed = res?.text?.trim();
                    if (!parsed) {
                      const fb = ceSgVisibleSubmissionText() || getVisibleSubmissionText();
                      if (fb.length > 200) { parts.push(`[${att.filename}]\n${fb}`); continue; }
                      throw new Error(`Could not read ${att.filename}`);
                    }
                    parts.push(`[${att.filename}]\n${parsed}`);
                  }
                  c.subText = parts.join('\n\n');
                  chrome.storage.local.set({ ce_claude_context: c });
                }
              }
              statusEl.textContent = 'AI is grading…';
              const response = await new Promise(resolve => chrome.runtime.sendMessage(
                { type: 'GENERATE', payload: { messages: [{ role: 'user', content: buildPrompt(c, criteriaText) }], max_tokens: 1500, model: gradingModel } },
                resolve
              ));
              if (response?.error) throw new Error(response.error);
              const text = response?.content?.[0]?.text || '';
              if (!text) throw new Error('Empty response — check API key in Settings');
              const p = ceSgParseAi(text);
              scoreInput.value = p.score;
              draftInput.value = p.comments;
              if (p.teacherCheck) { teacherBox.textContent = `⚠ Teacher check: ${p.teacherCheck}`; teacherBox.style.display = 'block'; }
              statusEl.textContent = p.score ? `✓ Suggested score: ${p.score}` : '✓ Done — review and insert';
            } catch(e) {
              statusEl.textContent = '⚠ ' + (e.message || 'Grading failed');
            } finally {
              runBtn.disabled = false;
            }
          });

          // Score row with its own insert button
          const scoreFgrp = document.createElement('div');
          scoreFgrp.className = 'ce-sg-fgrp';
          const scoreLbl = document.createElement('label');
          scoreLbl.className = 'ce-sg-flabel';
          scoreLbl.textContent = 'Suggested Score';
          const scoreRow = document.createElement('div');
          scoreRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
          scoreInput.style.cssText = 'width:110px;flex-shrink:0;';
          const insertScoreBtn = mkAbtn('↪ Insert Score', 'ce-sg-abtn-success');
          insertScoreBtn.addEventListener('click', () => { if (scoreInput.value.trim()) ceSgInsertGrade(scoreInput.value.trim()); });
          scoreRow.append(scoreInput, insertScoreBtn);
          scoreFgrp.append(scoreLbl, scoreRow);

          // Feedback with its own insert button below
          const feedFgrp = document.createElement('div');
          feedFgrp.className = 'ce-sg-fgrp-grow';
          const feedLbl = document.createElement('label');
          feedLbl.className = 'ce-sg-flabel';
          feedLbl.textContent = 'Draft Feedback';
          draftInput.style.cssText = 'flex:1;min-height:120px;';
          const insertCommentBtn = mkAbtn('↪ Insert Comment', 'ce-sg-abtn-success');
          insertCommentBtn.style.alignSelf = 'flex-start';
          insertCommentBtn.addEventListener('click', () => { if (draftInput.value.trim()) ceSgInsertComment(draftInput.value.trim(), false); });
          feedFgrp.append(feedLbl, draftInput, insertCommentBtn);

          body.append(runRow, scoreFgrp, feedFgrp, teacherBox);

          const closeBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          closeBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('🎓', 'AI Grade'), body, mkFooter(closeBtn));

        } else if (mode === 'criteria') {
          criteriaBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-lg');

          const savedRaw = state.stored.ce_criteria?.[criteriaKey];
          const saved = (savedRaw && typeof savedRaw === 'object') ? savedRaw : {};

          // Left column: assignment setup
          const pointsInput = document.createElement('input');
          pointsInput.className = 'ce-sg-input';
          pointsInput.type = 'number';
          pointsInput.min = '0';
          pointsInput.placeholder = 'e.g. 100';
          pointsInput.value = saved.pointsPossible || '';
          pointsInput.addEventListener('change', () => saveCriteriaField({ pointsPossible: pointsInput.value }));

          const diffSelect = document.createElement('select');
          diffSelect.className = 'ce-sg-select';
          [['standard','Standard'],['easy','Easy'],['challenging','Challenging'],['advanced','Advanced']].forEach(([val, lbl]) => {
            const o = document.createElement('option');
            o.value = val; o.textContent = lbl;
            o.selected = (saved.difficulty || 'standard') === val;
            diffSelect.appendChild(o);
          });
          diffSelect.addEventListener('change', () => saveCriteriaField({ difficulty: diffSelect.value }));

          const sugInput = document.createElement('textarea');
          sugInput.className = 'ce-sg-textarea';
          sugInput.placeholder = 'Phrases and comments the AI should work into feedback (e.g. "Great thesis", "Cite your sources")…';
          sugInput.value = saved.suggestedComments || '';
          sugInput.addEventListener('input', () => saveCriteriaField({ suggestedComments: sugInput.value }));

          const leftCol = document.createElement('div');
          leftCol.className = 'ce-sg-mcol';
          leftCol.append(mkFgrp('Points Possible', pointsInput, false), mkFgrp('Difficulty', diffSelect, false), mkFgrp('Suggested Comments', sugInput, true));

          // Right column: AI content
          const rubricInput = document.createElement('textarea');
          rubricInput.className = 'ce-sg-textarea';
          rubricInput.placeholder = 'Paste the assignment rubric or grading criteria here…';
          rubricInput.value = saved.rubric || '';
          rubricInput.addEventListener('input', () => saveCriteriaField({ rubric: rubricInput.value }));

          const answerKeyInput = document.createElement('textarea');
          answerKeyInput.className = 'ce-sg-textarea';
          answerKeyInput.placeholder = 'Paste an answer key or model response for the AI to compare against…';
          answerKeyInput.value = saved.answerKey || '';
          answerKeyInput.addEventListener('input', () => saveCriteriaField({ answerKey: answerKeyInput.value }));

          const aiNotesInput = document.createElement('textarea');
          aiNotesInput.className = 'ce-sg-textarea';
          aiNotesInput.placeholder = 'Special instructions for the AI: tone, what to focus on, partial credit rules, what to ignore…';
          aiNotesInput.value = saved.aiNotes || '';
          aiNotesInput.addEventListener('input', () => saveCriteriaField({ aiNotes: aiNotesInput.value }));

          const rightCol = document.createElement('div');
          rightCol.className = 'ce-sg-mcol';
          rightCol.append(mkFgrp('Rubric', rubricInput, true), mkFgrp('Answer Key', answerKeyInput, true), mkFgrp('Notes for AI', aiNotesInput, true));

          const split = document.createElement('div');
          split.className = 'ce-sg-mbody-split';
          split.append(leftCol, rightCol);

          const doneBtn = mkAbtn('Done', 'ce-sg-abtn-primary');
          doneBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('📋', 'Grading Criteria'), split, mkFooter(doneBtn));

        } else if (mode === 'comments') {
          commentsBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-md');

          function parseSnippets() {
            return (snippetEdit.value || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
          }
          function saveSnippets(arr) {
            snippetEdit.value = arr.join('\n\n');
            ceSgStorageSet({ ce_sg_comment_snippets: snippetEdit.value, ce_sg_snippet_ver: SNIPPET_VER });
          }

          const listBody = document.createElement('div');
          listBody.className = 'ce-sg-mbody';
          listBody.style.gap = '8px';

          function renderComments() {
            listBody.innerHTML = '';
            const snippets = parseSnippets();
            if (!snippets.length) {
              const empty = document.createElement('div');
              empty.className = 'ce-sg-status-text';
              empty.style.cssText = 'text-align:center;padding:32px 0;';
              empty.textContent = 'No saved comments yet. Click Add Comment to create one.';
              listBody.appendChild(empty);
              return;
            }
            snippets.forEach((text, idx) => {
              const card = document.createElement('div');
              card.style.cssText = 'border:1px solid #e8eaec;border-radius:4px;background:#fff;padding:12px;display:flex;flex-direction:column;gap:8px;';

              const preview = document.createElement('div');
              preview.style.cssText = 'font-size:13px;color:#2D3B45;line-height:1.5;';
              preview.textContent = text;

              const actions = document.createElement('div');
              actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

              function smBtn(label, cls) {
                const b = mkAbtn(label, cls);
                b.style.cssText += 'height:28px;font-size:12px;padding:0 12px;';
                return b;
              }

              const insBtn = smBtn('↪ Insert', 'ce-sg-abtn-success');
              insBtn.addEventListener('click', () => ceSgInsertComment(text, true));

              const editBtn = smBtn('Edit', 'ce-sg-abtn-secondary');
              editBtn.addEventListener('click', () => {
                card.innerHTML = '';
                const ta = document.createElement('textarea');
                ta.className = 'ce-sg-textarea';
                ta.style.minHeight = '80px';
                ta.value = text;
                const saveBtn = smBtn('Save', 'ce-sg-abtn-primary');
                saveBtn.addEventListener('click', () => {
                  const updated = parseSnippets();
                  updated[idx] = ta.value.trim();
                  saveSnippets(updated.filter(Boolean));
                  renderComments();
                });
                const cancelEditBtn = smBtn('Cancel', 'ce-sg-abtn-secondary');
                cancelEditBtn.addEventListener('click', renderComments);
                const editActions = document.createElement('div');
                editActions.style.cssText = 'display:flex;gap:6px;';
                editActions.append(saveBtn, cancelEditBtn);
                card.append(ta, editActions);
              });

              const delBtn = smBtn('Delete', 'ce-sg-abtn-secondary');
              delBtn.style.marginLeft = 'auto';
              delBtn.style.color = '#C0392B';
              delBtn.style.borderColor = '#C0392B';
              delBtn.addEventListener('click', () => {
                const updated = parseSnippets();
                updated.splice(idx, 1);
                saveSnippets(updated);
                renderComments();
              });

              actions.append(insBtn, editBtn, delBtn);
              card.append(preview, actions);
              listBody.appendChild(card);
            });
          }

          renderComments();

          const closeBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          closeBtn.addEventListener('click', closeDrawer);
          const addBtn = mkAbtn('+ Add Comment', 'ce-sg-abtn-primary');
          addBtn.addEventListener('click', () => {
            const newCard = document.createElement('div');
            newCard.style.cssText = 'border:1px solid #0770B8;border-radius:4px;background:#f0f6ff;padding:12px;display:flex;flex-direction:column;gap:8px;';
            const ta = document.createElement('textarea');
            ta.className = 'ce-sg-textarea';
            ta.style.minHeight = '80px';
            ta.placeholder = 'Type your reusable comment here…';
            function smBtn2(label, cls) { const b = mkAbtn(label, cls); b.style.cssText += 'height:28px;font-size:12px;padding:0 12px;'; return b; }
            const saveBtn = smBtn2('Save', 'ce-sg-abtn-primary');
            saveBtn.addEventListener('click', () => {
              if (ta.value.trim()) saveSnippets([...parseSnippets(), ta.value.trim()]);
              renderComments();
            });
            const cancelAddBtn = smBtn2('Cancel', 'ce-sg-abtn-secondary');
            cancelAddBtn.addEventListener('click', renderComments);
            const addActions = document.createElement('div');
            addActions.style.cssText = 'display:flex;gap:6px;';
            addActions.append(saveBtn, cancelAddBtn);
            newCard.append(ta, addActions);
            listBody.appendChild(newCard);
            ta.focus();
          });
          const resetBtn = mkAbtn('Reset to Defaults', 'ce-sg-abtn-secondary');
          resetBtn.style.marginRight = 'auto';
          resetBtn.addEventListener('click', () => {
            if (confirm('Replace all current snippets with the default set? This cannot be undone.')) {
              saveSnippets(CE_DEFAULT_SNIPPETS);
              renderComments();
            }
          });

          drawer.append(makeModalHeader('💬', 'Comment Snippets'), listBody, mkFooter(resetBtn, closeBtn, addBtn));

        } else if (mode === 'audit') {
          auditBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-xl');
          const auditContainer = document.createElement('div');
          auditContainer.style.cssText = 'flex:1;min-height:0;overflow:auto;';
          const cancelBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          cancelBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('🔍', 'Cheating Detection'), auditContainer, mkFooter(cancelBtn));
          setTimeout(() => {
            const { courseId: aCid, assignmentId: aAid } = getSpeedGraderUrlParts();
            const assignName = document.querySelector('#assignment_title a, .assignment-title, [data-testid="assignment-title"]')?.textContent?.trim() || '';
            document.dispatchEvent(new CustomEvent('ce-render-audit', { detail: { container: auditContainer, courseId: aCid, assignmentId: aAid, assignmentName: assignName } }));
          }, 0);
        }
      }

      queueBtn.addEventListener('click', () => showDrawer('needs'));
      aiBtn.addEventListener('click', () => showDrawer('ai'));
      criteriaBtn.addEventListener('click', () => showDrawer('criteria'));
      commentsBtn.addEventListener('click', () => showDrawer('comments'));
      auditBtn.addEventListener('click', () => showDrawer('audit'));

      async function loadQueue(showInDrawer) {
        if (!courseId) return;
        if (showInDrawer) {
          refreshQueueBtn.disabled = true;
          queueStatus.textContent = 'Loading assignments...';
          queueList.innerHTML = '';
        }
        try {
          const assignments = await ceSgCanvasGet(`/api/v1/courses/${courseId}/assignments?order_by=due_at&per_page=100`);
          const needing = (assignments || []).filter(a => Number(a.needs_grading_count || 0) > 0);
          setQueueBadge(needing.length);
          if (showInDrawer) {
            queueStatus.textContent = needing.length ? `${needing.length} assignments need grading.` : 'All caught up — no submissions awaiting grades.';
            needing.slice(0, 40).forEach(a => {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'ce-sg-qitem';
              const name = document.createElement('span');
              name.style.cssText = 'flex:1;text-align:left;';
              name.textContent = a.name;
              const badge = document.createElement('span');
              badge.className = 'ce-sg-qbadge';
              badge.textContent = a.needs_grading_count;
              b.append(name, badge);
              b.addEventListener('click', () => { location.href = `${location.origin}/courses/${courseId}/gradebook/speed_grader?assignment_id=${a.id}`; });
              queueList.appendChild(b);
            });
          }
        } catch (e) {
          if (showInDrawer) queueStatus.textContent = e.message || 'Could not load list.';
        } finally {
          if (showInDrawer) refreshQueueBtn.disabled = false;
        }
      }

      refreshQueueBtn.addEventListener('click', () => loadQueue(true));

      document.body.insertBefore(tab, document.body.firstChild);
      document.body.insertBefore(bar, tab);
      setTimeout(() => loadQueue(false), 2000);
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
