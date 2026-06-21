(async function () {
  'use strict';
  try {
    if (!/speed_grader/.test(window.location.href)) return;

    // ── STORAGE SHIM ──────────────────────────────────────────────────────────
    const _store = await new Promise(resolve =>
      chrome.storage.local.get(['ce_canvas_token', 'ce_grader_settings', 'ce_grading_model', 'ce_grader_filter_published', 'ce_grader_filter_dashboard', 'ce_teacher_name'], resolve)
    );
    function GM_getValue(key, def) { return _store[key] ?? def; }
    function GM_setValue(key, val) { _store[key] = val; chrome.storage.local.set({ [key]: val }); }

    function getToken() { return GM_getValue('ce_canvas_token', ''); }
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

    function ceContextAlive() {
      try { return !!chrome.runtime?.id; } catch(_) { return false; }
    }

    function ceSendMessage(payload) {
      return new Promise((resolve, reject) => {
        if (!ceContextAlive()) { reject(new Error('reload-needed')); return; }
        try {
          chrome.runtime.sendMessage(payload, response => {
            if (chrome.runtime.lastError) {
              reject(new Error('reload-needed'));
            } else {
              resolve(response);
            }
          });
        } catch(_) {
          reject(new Error('reload-needed'));
        }
      });
    }

    function ceShowReloadBanner() {
      if (document.getElementById('ce-reload-banner')) return;
      const banner = document.createElement('div');
      banner.id = 'ce-reload-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#B45309;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;font-weight:600;padding:10px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.25);';
      const msg = document.createElement('span');
      msg.style.flex = '1';
      msg.textContent = '⚠ Canvas Enhancer was updated or reloaded. Refresh the page to continue grading.';
      const btn = document.createElement('button');
      btn.textContent = 'Reload Page';
      btn.style.cssText = 'padding:5px 14px;background:#fff;color:#B45309;border:none;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;';
      btn.addEventListener('click', () => location.reload());
      banner.append(msg, btn);
      document.body.prepend(banner);
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
        #ce-sg-toolbar { position:relative; width:100%; height:52px; z-index:2147483640; overflow:visible; isolation:isolate; border-bottom:1px solid #0F1D25; background:#172A36; color:#fff; font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif; box-sizing:border-box; box-shadow:0 2px 8px rgba(0,0,0,.22); }
        #ce-sg-toolbar.ce-sg-collapsed { display:none !important; }
        #ce-sg-toolbar * { box-sizing:border-box; }
        .ce-sg-mainbar { height:100%; display:flex; align-items:center; gap:6px; padding:0 14px 0 88px; overflow:visible; }
        .ce-sg-brand { flex-shrink:0; height:38px; border-right:1px solid rgba(255,255,255,.14); color:#fff; display:flex; align-items:center; gap:9px; padding:0 14px 0 8px; white-space:nowrap; margin-right:4px; }
        .ce-sg-brand-mark { width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#3B82F6,#14B8A6);display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(20,184,166,.25); }
        .ce-sg-brand-copy { display:flex;flex-direction:column;align-items:flex-start;line-height:1.05; }
        .ce-sg-brand-copy strong { font-size:12px;letter-spacing:.2px; }
        .ce-sg-brand-copy small { font-size:9px;color:rgba(255,255,255,.5);font-weight:600;margin-top:3px;letter-spacing:.2px; }
        .ce-sg-btn { height:34px; padding:0 12px; flex-shrink:0; border:1px solid transparent; border-radius:7px; background:transparent; color:rgba(255,255,255,.78); cursor:pointer; font-family:inherit; font-size:12px; font-weight:650; letter-spacing:.1px; white-space:nowrap; transition:background .12s,color .12s,border-color .12s; position:relative; }
        .ce-sg-badge { position:absolute;top:3px;right:3px;background:#e53e3e;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:1px 4px;line-height:1.3;display:none;pointer-events:none; }
        .ce-sg-btn-label { display:block; font-size:12px; font-weight:700; letter-spacing:.2px; color:inherit; pointer-events:none; }
        .ce-sg-btn:hover { background:rgba(255,255,255,.1); color:#fff; }
        .ce-sg-btn-primary { background:rgba(59,130,246,.24) !important; border-color:rgba(96,165,250,.35) !important; color:#fff !important; }
        .ce-sg-menu-wrap { position:relative;z-index:2;flex-shrink:0; }
        .ce-sg-menu { display:none;position:absolute;left:0;top:40px;z-index:2147483642;width:210px;padding:7px;background:#fff;border:1px solid #E2E8F0;border-radius:10px;box-shadow:0 12px 30px rgba(15,23,42,.22); }
        .ce-sg-menu.ce-open { display:flex;flex-direction:column;gap:2px; }
        .ce-sg-menu-item { width:100%;display:flex;align-items:center;gap:10px;padding:10px 11px;border:0;border-radius:7px;background:transparent;color:#334155;font:650 12px/1.2 inherit;text-align:left;cursor:pointer; }
        .ce-sg-menu-item:hover { background:#F1F5F9;color:#0F172A; }
        .ce-sg-menu-item span:first-child { width:20px;text-align:center;font-size:14px; }
        .ce-sg-collapse { margin-left:auto; }
        #ce-sg-tab { position:relative; margin-left:auto; z-index:10; width:148px; height:28px; border:1px solid #0F1D25; border-top:none; border-radius:0 0 0 7px; background:#172A36; box-shadow:0 2px 8px rgba(0,0,0,.22); color:#fff; font:700 11px/1 inherit; cursor:pointer; display:none; align-items:center; justify-content:center; }
        .ce-sg-drawer { display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:2147483638; border-radius:8px; background:#fff; box-shadow:0 24px 64px rgba(0,0,0,.32),0 0 0 1px rgba(0,0,0,0.08); flex-direction:column; overflow:hidden; }
        .ce-sg-drawer.ce-open { display:flex; }
        .ce-sz-sm { width:min(520px,calc(100vw - 48px)); max-height:min(480px,calc(100vh - 80px)); }
        .ce-sz-md { width:min(720px,calc(100vw - 48px)); max-height:min(560px,calc(100vh - 80px)); }
        .ce-sz-lg { width:min(900px,calc(100vw - 48px)); max-height:min(640px,calc(100vh - 80px)); }
        .ce-sz-xl { width:min(980px,calc(100vw - 48px)); max-height:min(740px,calc(100vh - 60px)); }
        .ce-sg-mhdr { flex-shrink:0; min-height:48px; background:#1B303D; display:flex; align-items:center; padding:0 16px; gap:10px; }
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
      brand.innerHTML = '<span class="ce-sg-brand-mark">◆</span><span class="ce-sg-brand-copy"><strong>Grading Pulse</strong><small>SPEEDGRADER WORKFLOW</small></span>';
      const gradingWrap = document.createElement('div');
      gradingWrap.className = 'ce-sg-menu-wrap';
      const gradingBtn = ceSgToolbarButton('✏️ Grading  ▾', false);
      const queueBadge = document.createElement('span');
      queueBadge.className = 'ce-sg-badge';
      gradingBtn.appendChild(queueBadge);
      function setQueueBadge(count) {
        if (count > 0) { queueBadge.textContent = String(count); queueBadge.style.display = 'inline-block'; }
        else { queueBadge.style.display = 'none'; }
      }
      const gradingMenu = document.createElement('div');
      gradingMenu.className = 'ce-sg-menu';
      function gradingMenuItem(icon, label) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ce-sg-menu-item';
        b.innerHTML = '<span>' + icon + '</span><span>' + label + '</span>';
        return b;
      }
      const queueBtn = gradingMenuItem('✏️', 'Grade Queue');
      const aiBtn = gradingMenuItem('✨', 'AI Grade');
      const criteriaBtn = gradingMenuItem('🎯', 'Criteria');
      gradingMenu.append(queueBtn, aiBtn, criteriaBtn);
      gradingWrap.append(gradingBtn, gradingMenu);
      const commentsBtn = ceSgToolbarButton('💬 Comments', false);
      const auditBtn = ceSgToolbarButton('🔎 Audit', false);
      const settingsBtn = ceSgToolbarButton('⚙ Settings', false);
      const collapseBtn = ceSgToolbarButton('— Hide', false);
      collapseBtn.classList.add('ce-sg-collapse');
      main.append(brand, gradingWrap, commentsBtn, auditBtn, settingsBtn, collapseBtn);
      bar.appendChild(main);

      const drawer = document.createElement('div');
      drawer.className = 'ce-sg-drawer';
      bar.appendChild(drawer);

      const tab = document.createElement('button');
      tab.id = 'ce-sg-tab';
      tab.type = 'button';
      tab.textContent = 'Grading Pulse  ▾';
      document.body.classList.add('ce-sg-toolbar-open');

      function setToolbarOpen(open) {
        bar.classList.toggle('ce-sg-collapsed', !open);
        tab.style.display = open ? 'none' : 'flex';
        document.body.classList.toggle('ce-sg-toolbar-open', open);
        if (!open) {
          drawer.classList.remove('ce-open');
          gradingMenu.classList.remove('ce-open');
          [gradingBtn, commentsBtn, auditBtn, settingsBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
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
        gradingMenu.classList.remove('ce-open');
        [gradingBtn, commentsBtn, auditBtn, settingsBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));
      }

      function makeModalHeader(icon, title, subtitle, subtitleId, description) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;';

        const hdr = document.createElement('div');
        hdr.className = 'ce-sg-mhdr';
        const ico = document.createElement('span');
        ico.className = 'ce-sg-mhdr-icon';
        ico.textContent = icon;
        const ttlWrap = document.createElement('span');
        ttlWrap.className = 'ce-sg-mhdr-title';
        ttlWrap.style.cssText = 'display:flex;flex-direction:column;justify-content:center;min-width:0;';
        const ttl = document.createElement('span');
        ttl.textContent = title;
        ttlWrap.appendChild(ttl);
        if (subtitle !== undefined) {
          const sub = document.createElement('span');
          sub.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.6);font-weight:400;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          sub.textContent = subtitle;
          if (subtitleId) sub.id = subtitleId;
          ttlWrap.appendChild(sub);
        }

        if (description) {
          const descPanel = document.createElement('div');
          descPanel.style.cssText = 'display:none;padding:10px 14px 11px;background:#EBF4FF;border-bottom:2px solid #B3D4F5;font-size:12px;color:#1a407a;line-height:1.6;';
          descPanel.textContent = description;

          const helpBtn = document.createElement('button');
          helpBtn.type = 'button';
          helpBtn.textContent = '?';
          helpBtn.title = 'What does this do?';
          helpBtn.style.cssText = 'width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.55);background:transparent;color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;padding:0;margin-right:2px;transition:background .12s,color .12s;';
          let helpOpen = false;
          helpBtn.addEventListener('click', () => {
            helpOpen = !helpOpen;
            descPanel.style.display = helpOpen ? 'block' : 'none';
            helpBtn.style.background = helpOpen ? 'rgba(255,255,255,0.25)' : 'transparent';
            helpBtn.style.color = helpOpen ? '#fff' : 'rgba(255,255,255,0.85)';
          });
          hdr.append(ico, ttlWrap, helpBtn);
          wrap.appendChild(descPanel); // prepend so it shows below hdr when inserted before hdr
          // reorder: hdr first, descPanel second
          wrap.insertBefore(hdr, wrap.firstChild);
        } else {
          hdr.append(ico, ttlWrap);
          wrap.appendChild(hdr);
        }

        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'ce-sg-mhdr-close';
        x.textContent = '×';
        x.title = 'Close';
        x.addEventListener('click', closeDrawer);
        hdr.appendChild(x);
        return wrap;
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
        gradingMenu.classList.remove('ce-open');
        [gradingBtn, commentsBtn, auditBtn, settingsBtn].forEach(b => b.classList.remove('ce-sg-btn-primary'));

        if (mode === 'needs') {
          gradingBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-sm');

          const filterRow = document.createElement('div');
          filterRow.style.cssText = 'display:flex;gap:16px;padding:8px 4px 6px;border-bottom:1px solid #eee;margin-bottom:4px;flex-shrink:0;';

          if (!document.getElementById('ce-filter-check-style')) {
            const s = document.createElement('style');
            s.id = 'ce-filter-check-style';
            s.textContent = '.ce-filter-check-label { font-size:12px !important; color:#333 !important; display:inline !important; visibility:visible !important; opacity:1 !important; margin-left:4px !important; }';
            document.head.appendChild(s);
          }

          const mkFilterCheck = (label, key) => {
            const wrap = document.createElement('label');
            wrap.style.cssText = 'display:inline-flex;align-items:center;cursor:pointer;user-select:none;white-space:nowrap;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = _store[key] !== false;
            cb.addEventListener('change', () => { GM_setValue(key, cb.checked); loadQueue(true); });
            const txt = document.createElement('span');
            txt.className = 'ce-filter-check-label';
            txt.textContent = label;
            wrap.append(cb, txt);
            return wrap;
          };

          filterRow.append(
            mkFilterCheck('Published only', 'ce_grader_filter_published'),
            mkFilterCheck('Dashboard only', 'ce_grader_filter_dashboard')
          );

          const body = document.createElement('div');
          body.className = 'ce-sg-mbody';
          body.append(filterRow, queueStatus, queueList);
          const cancelBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          cancelBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('📬', 'Needs Graded', undefined, undefined, 'This is your grading to-do list. It pulls every ungraded student submission from all your active Canvas courses and puts them in one place — no more clicking through course after course trying to remember who still needs feedback. Each entry shows the student\'s name and assignment. Click any name and you land directly on that student\'s submission in SpeedGrader, ready to grade. The "Published Only" filter hides courses that are still in draft. "Dashboard Only" limits the list to courses pinned on your Canvas home screen — useful if you teach many courses but only want to see the active ones.'), body, mkFooter(cancelBtn, refreshQueueBtn));
          loadQueue(true);

        } else if (mode === 'ai') {
          gradingBtn.classList.add('ce-sg-btn-primary');
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
                        const info = await ceSendMessage(
                          { type: 'CANVAS_API', payload: { url: `${c.canvasOrigin}/api/v1/files/${att.id}`, token: c.token } }
                        );
                        if (info?.url) url = info.url;
                      } catch(_) {}
                    }
                    const res = await ceSendMessage(
                      { type: 'PARSE_FILE', payload: { fileUrl: url, token: c.token, filename: att.filename, mimeType: att.mimeType } }
                    );
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
              const noCriteria = !criteriaText?.trim();
              const response = await ceSendMessage(
                { type: 'GENERATE', payload: { messages: [{ role: 'user', content: buildPrompt(c, criteriaText) }], max_tokens: 1500, model: gradingModel } }
              );
              if (response?.error) throw new Error(response.error);
              const text = response?.content?.[0]?.text || '';
              if (!text) throw new Error('Empty response — check API key in Settings');
              const p = ceSgParseAi(text);
              scoreInput.value = p.score;
              draftInput.value = p.comments;
              if (p.teacherCheck) { teacherBox.textContent = `⚠ Teacher check: ${p.teacherCheck}`; teacherBox.style.display = 'block'; }
              if (noCriteria) {
                statusEl.textContent = '⚠ No grading criteria set — AI used its own judgment. Add a rubric in the Criteria tab for consistent results.';
                statusEl.style.color = '#b45309';
              } else {
                statusEl.textContent = p.score ? `✓ Suggested score: ${p.score}` : '✓ Done — review and insert';
                statusEl.style.color = '';
              }
            } catch(e) {
              if (e.message === 'reload-needed') {
                ceShowReloadBanner();
                statusEl.textContent = '⚠ Extension was reloaded — please refresh the page.';
              } else {
                statusEl.textContent = '⚠ ' + (e.message || 'Grading failed');
              }
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
          drawer.append(makeModalHeader('🎓', 'AI Grade', ctx.studentName || '', 'ce-ai-grade-name-sub', 'This is the core of the Grader Toolbar. Click "Grade This Assignment" and the AI reads the student\'s full submission, applies the rubric and grading rules you set up in the Criteria tab, and drafts a score and a personalized feedback comment — in seconds. You are always in control: review what the AI suggests, edit anything you want to change, then click "Insert Score" and "Insert Comment" to push the results into Canvas SpeedGrader. The AI is a first draft, not a final grade. It handles the repetitive work — reading through long submissions, checking rubric points, writing structured feedback — so you can focus on the judgment calls that only a teacher can make. For best results, fill in the Grading Criteria tab before you start grading.'), body, mkFooter(closeBtn));

        } else if (mode === 'criteria') {
          gradingBtn.classList.add('ce-sg-btn-primary');
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
          drawer.append(makeModalHeader('📋', 'Grading Criteria', ctx.assignmentName || '', undefined, 'This is where you teach the AI how to grade your assignment. Without this, the AI makes its best guess — but with it, it grades exactly the way you would. Paste your rubric in the Rubric field and the AI will evaluate every student against each criterion. Add an Answer Key if there is a correct response to compare against. Use "Notes for AI" for anything special: partial credit rules, tone of feedback, what to overlook, or what to focus on. The Points Possible field helps the AI suggest a score on the right scale. Everything you enter here is saved for this specific assignment — set it up once before your first grading session and it is ready every time you come back to this assignment all semester long.'), split, mkFooter(doneBtn));

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

          drawer.append(makeModalHeader('💬', 'Comment Snippets', undefined, undefined, 'Every teacher has feedback they write over and over — "Great thesis statement," "Cite your sources," "See me for extra help." This panel lets you save those phrases once and insert them into Canvas with a single click, right inside SpeedGrader. Use it alongside AI grading to add your personal touch to the AI\'s draft, or use it on its own to speed up manual grading. Click "+ Add Comment" to save a new phrase. Click "Insert" next to any snippet to paste it into the Canvas comment box. Click "Edit" to update the wording at any time. If you want to start fresh, "Reset to Defaults" restores the built-in starter set of common teacher feedback phrases.'), listBody, mkFooter(resetBtn, closeBtn, addBtn));

        } else if (mode === 'audit') {
          auditBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-xl');
          const auditContainer = document.createElement('div');
          auditContainer.style.cssText = 'flex:1;min-height:0;overflow:auto;';
          const cancelBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          cancelBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('🔍', 'Cheating Detection', undefined, undefined, 'This tool does not accuse anyone of cheating — that is your job. What it does is analyze the Canvas data for this assignment and flag patterns that a teacher would want to know about. It checks whether two students\' written submissions share an unusually high amount of identical phrasing. It looks at whether multiple students submitted at almost exactly the same time or uploaded files with the same filename. For quizzes, it checks whether a student left the browser tab repeatedly during the test, finished suspiciously fast while scoring high, or whether two students picked the same wrong answers on multiple questions. Any check that does not apply to this type of assignment is hidden automatically — you only see what is relevant. If something is flagged, click "Open full report" for the details, or use the Print button to generate a formal timestamped report you can save as a PDF. Every finding requires your professional judgment before any action is taken.'), auditContainer, mkFooter(cancelBtn));
          setTimeout(() => {
            const { courseId: aCid, assignmentId: aAid } = getSpeedGraderUrlParts();
            const assignName = document.querySelector('#assignment_title a, .assignment-title, [data-testid="assignment-title"]')?.textContent?.trim() || '';
            document.dispatchEvent(new CustomEvent('ce-render-audit', { detail: { container: auditContainer, courseId: aCid, assignmentId: aAid, assignmentName: assignName } }));
            // If hub.js never responds (e.g. Canvas guard blocked it), show an error after 4 s
            setTimeout(() => {
              if (!auditContainer.children.length) {
                auditContainer.innerHTML = '<div style="padding:24px;font-size:13px;color:#B91C1C;">Audit could not connect to the Canvas Enhancer hub. Try reloading the page — if the problem persists, reload the extension at edge://extensions.</div>';
              }
            }, 4000);
          }, 0);

        } else if (mode === 'settings') {
          settingsBtn.classList.add('ce-sg-btn-primary');
          drawer.classList.add('ce-sz-sm');

          const body = document.createElement('div');
          body.className = 'ce-sg-mbody';

          const saveBtn = mkAbtn('Save Settings', 'ce-sg-abtn-primary');
          const saveMsg = document.createElement('div');
          saveMsg.className = 'ce-sg-status-text';
          saveMsg.style.cssText += ';text-align:center;color:#127A1B;';
          const cancelBtn = mkAbtn('Close', 'ce-sg-abtn-secondary');
          cancelBtn.addEventListener('click', closeDrawer);
          drawer.append(makeModalHeader('⚙️', 'Settings', undefined, undefined, 'Three things to set up before you start grading. First, your Canvas API Token — this is a private key that lets the Grader Toolbar read your students\' submissions and assignment data directly from Canvas. Without it, AI grading and the Needs Graded list will not work. To get one, go to Canvas → your account name → Settings → scroll to "Approved Integrations" → click "+ New Access Token." Copy it and paste it here. Second, your Teacher Name — this appears as a personal closing at the end of every AI-generated comment, so feedback reads like it came from you, not a machine. Third, the AI Model — Standard is fast and accurate for most assignments. High Quality takes a few seconds longer but produces noticeably better feedback for complex essays or detailed rubrics. Click "Save Settings" when you are done.'), body, mkFooter(cancelBtn, saveBtn));

          (async () => {
            const stored = await ceSgStorageGet(['ce_canvas_token', 'ce_teacher_name', 'ce_license_key']);

            function mkSettingsInput(type, value, placeholder) {
              const inp = document.createElement('input');
              inp.type = type;
              inp.className = 'ce-sg-input';
              inp.value = value || '';
              inp.placeholder = placeholder || '';
              return inp;
            }
            function mkSettingsHint(text) {
              const h = document.createElement('div');
              h.style.cssText = 'font-size:11px;color:#6B7280;margin-top:3px;';
              h.textContent = text;
              return h;
            }
            function mkSettingsFgrp(labelText, control, hint) {
              const wrap = document.createElement('div');
              wrap.className = 'ce-sg-fgrp';
              const lbl = document.createElement('label');
              lbl.className = 'ce-sg-flabel';
              lbl.textContent = labelText;
              wrap.append(lbl, control);
              if (hint) wrap.appendChild(mkSettingsHint(hint));
              return wrap;
            }

            const tokenInp   = mkSettingsInput('password', stored.ce_canvas_token, 'Paste your Canvas token');
            const nameInp    = mkSettingsInput('text',     stored.ce_teacher_name,  'Your display name');
            const licenseInp = mkSettingsInput('text',     stored.ce_license_key,   'Enter your license key');

            const divider = document.createElement('hr');
            divider.style.cssText = 'border:none;border-top:1px solid #e8eaec;margin:4px 0;';

            const updateBtn = mkAbtn('Check for Updates', 'ce-sg-abtn-secondary');
            updateBtn.style.cssText += ';width:100%;justify-content:center;';
            updateBtn.addEventListener('click', async () => {
              updateBtn.disabled = true;
              updateBtn.textContent = 'Checking…';
              try {
                const { status } = await chrome.runtime.requestUpdateCheck();
                if (status === 'update_available') {
                  updateBtn.textContent = 'Update available — click to apply';
                  updateBtn.disabled = false;
                  updateBtn.addEventListener('click', () => chrome.runtime.reload(), { once: true });
                } else {
                  updateBtn.textContent = status === 'no_update' ? '✓ Already up to date' : 'Try again later';
                  setTimeout(() => { updateBtn.textContent = 'Check for Updates'; updateBtn.disabled = false; }, 2500);
                }
              } catch (_) {
                updateBtn.textContent = 'Check for Updates';
                updateBtn.disabled = false;
              }
            });

            const uninstallBtn = mkAbtn('Uninstall Canvas Enhancer Grader…', 'ce-sg-abtn-secondary');
            uninstallBtn.style.cssText += ';width:100%;justify-content:center;color:#DC2626;border-color:#DC2626;';
            uninstallBtn.addEventListener('mouseenter', () => { uninstallBtn.style.background = '#FEF2F2'; });
            uninstallBtn.addEventListener('mouseleave', () => { uninstallBtn.style.background = ''; });
            uninstallBtn.addEventListener('click', () => {
              if (confirm('Remove Canvas Enhancer Grader from your browser? This will delete all saved settings and criteria.')) {
                chrome.runtime.sendMessage({ type: 'UNINSTALL_SELF' });
              }
            });

            body.append(
              mkSettingsFgrp('Canvas API Token', tokenInp, 'Canvas → Account → Settings → New Access Token'),
              mkSettingsFgrp('Teacher Name',     nameInp),
              mkSettingsFgrp('License Key',      licenseInp),
              saveMsg,
              divider,
              ...(globalThis.CEDataBackup ? [globalThis.CEDataBackup.createSection({ accent:'#0770B8' })] : []),
              updateBtn,
              uninstallBtn,
            );

            saveBtn.addEventListener('click', () => {
              const values = {
                ce_canvas_token: tokenInp.value.trim(),
                ce_teacher_name: nameInp.value.trim(),
                ce_license_key:  licenseInp.value.trim(),
              };
              ceSgStorageSet(values);
              Object.assign(_store, values);
              saveMsg.textContent = '✓ Saved';
              setTimeout(() => { saveMsg.textContent = ''; }, 2500);
            });
          })();

        }
      }

      gradingBtn.addEventListener('click', e => {
        e.stopPropagation();
        gradingMenu.classList.toggle('ce-open');
      });
      gradingMenu.addEventListener('click', e => e.stopPropagation());
      document.addEventListener('click', () => gradingMenu.classList.remove('ce-open'));
      queueBtn.addEventListener('click', () => showDrawer('needs'));
      aiBtn.addEventListener('click', () => showDrawer('ai'));
      criteriaBtn.addEventListener('click', () => showDrawer('criteria'));
      commentsBtn.addEventListener('click', () => showDrawer('comments'));
      auditBtn.addEventListener('click', () => showDrawer('audit'));
      settingsBtn.addEventListener('click', () => showDrawer('settings'));

      function renderCourseSection(courseLabel, submissions, assignmentMap, cid) {
        const grouped = {};
        submissions.forEach(s => {
          const aid = String(s.assignment_id);
          if (assignmentMap[aid]) {
            if (!grouped[aid]) grouped[aid] = [];
            grouped[aid].push(s);
          }
        });
        if (!Object.keys(grouped).length) return;

        const courseHeader = document.createElement('div');
        courseHeader.style.cssText = 'font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;padding:10px 4px 2px;';
        courseHeader.textContent = courseLabel;
        queueList.appendChild(courseHeader);

        Object.values(assignmentMap)
          .filter(a => grouped[String(a.id)])
          .forEach(a => {
            const aid = String(a.id);
            const aHeader = document.createElement('div');
            aHeader.style.cssText = 'font-size:12px;font-weight:600;color:#555;padding:4px 4px 2px 8px;';
            aHeader.textContent = a.name;
            queueList.appendChild(aHeader);

            grouped[aid].forEach(sub => {
              const studentName = sub.user?.sortable_name || sub.user?.name || `Student ${sub.user_id}`;
              const row = document.createElement('button');
              row.type = 'button';
              row.className = 'ce-sg-qitem';
              row.style.paddingLeft = '20px';
              row.textContent = studentName;
              row.addEventListener('click', () => {
                location.href = `${location.origin}/courses/${cid}/gradebook/speed_grader?assignment_id=${aid}&student_id=${sub.user_id}`;
              });
              queueList.appendChild(row);
            });
          });
      }

      async function fetchCourseQueue(cid) {
        const [assignments, submissions] = await Promise.all([
          ceSgCanvasGet(`/api/v1/courses/${cid}/assignments?order_by=due_at&per_page=100`),
          ceSgCanvasGet(`/api/v1/courses/${cid}/students/submissions?student_ids[]=all&per_page=100&include[]=user`),
        ]);
        const needingAssignments = (assignments || []).filter(a => Number(a.needs_grading_count || 0) > 0);
        const needingIds = new Set(needingAssignments.map(a => String(a.id)));
        const assignmentMap = Object.fromEntries(needingAssignments.map(a => [String(a.id), a]));
        const subs = (submissions || []).filter(s => needingIds.has(String(s.assignment_id)) && s.workflow_state === 'submitted' && !/^test student$/i.test(s.user?.name || ''));
        return { assignmentMap, subs };
      }

      async function loadQueue(showInDrawer) {
        if (!courseId) return;
        if (showInDrawer) {
          refreshQueueBtn.disabled = true;
          queueStatus.textContent = 'Loading...';
          queueList.innerHTML = '';
        }
        try {
          const { assignmentMap: currentMap, subs: currentSubs } = await fetchCourseQueue(courseId);
          setQueueBadge(currentSubs.length);

          if (showInDrawer) {
            renderCourseSection('This Course', currentSubs, currentMap, courseId);

            const allCourses = await ceSgCanvasGet(`/api/v1/courses?enrollment_type=teacher&per_page=100`);
            let otherCourses = (allCourses || []).filter(c => String(c.id) !== String(courseId));

            if (_store.ce_grader_filter_published !== false) {
              otherCourses = otherCourses.filter(c => c.workflow_state === 'available');
            }
            if (_store.ce_grader_filter_dashboard !== false) {
              const favCourses = await ceSgCanvasGet('/api/v1/users/self/favorites/courses?per_page=100');
              const favIds = new Set((favCourses || []).map(c => String(c.id)));
              otherCourses = otherCourses.filter(c => favIds.has(String(c.id)));
            }

            const otherResults = await Promise.all(
              otherCourses.slice(0, 10).map(async c => {
                try {
                  const { assignmentMap, subs } = await fetchCourseQueue(c.id);
                  return { course: c, assignmentMap, subs };
                } catch { return { course: c, assignmentMap: {}, subs: [] }; }
              })
            );

            let otherTotal = 0;
            otherResults.forEach(({ course, assignmentMap, subs }) => {
              otherTotal += subs.length;
              renderCourseSection(course.name, subs, assignmentMap, course.id);
            });

            const total = currentSubs.length + otherTotal;
            setQueueBadge(total);
            queueStatus.textContent = total
              ? `${total} student${total !== 1 ? 's' : ''} need grading across all courses.`
              : 'All caught up — nothing needs grading.';
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
    if (!getToken()) return;

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
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Accept': 'application/json' },
      });
      if (!res.ok) {
        let errMsg = `Canvas API ${res.status}`;
        try { const d = await res.json(); errMsg = d?.errors?.[0]?.message || errMsg; } catch(_) {}
        throw new Error(errMsg);
      }
      return res.json();
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
      token: getToken(),
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
        token: getToken(),
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
    let _grading         = false;

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
      fetchSubmission().then(newCtx => {
        if (!newCtx) return;
        const nameSub = document.getElementById('ce-ai-grade-name-sub');
        if (nameSub) nameSub.textContent = newCtx.studentName || '';
      });
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
    const PROMPT_SUBMISSION_CHARS = 80000;   // ~60 pages (product cap)
    const PROMPT_HEAD_CHARS = 56000;
    const PROMPT_TAIL_CHARS = 22000;

    function submissionForPrompt(text) {
      const value = String(text || '(no submission)');
      if (value.length <= PROMPT_SUBMISSION_CHARS) return value;
      const head = value.slice(0, PROMPT_HEAD_CHARS).trimEnd();
      const tail = value.slice(-PROMPT_TAIL_CHARS).trimStart();
      const omitted = value.length - head.length - tail.length;
      return [
        `[Submission exceeds 60-page limit — ${omitted.toLocaleString()} characters omitted from the middle]`,
        '',
        '[Beginning]',
        head,
        '',
        '[End]',
        tail,
      ].join('\n');
    }

    function buildPrompt(c, criteria) {
      const tot         = parseInt(criteria?.match(/Points Possible:\s*(\d+)/i)?.[1] || '100', 10);
      const fn          = c?.studentName?.split(' ')[0] || 'the student';
      const teacherName = GM_getValue('ce_teacher_name', '').trim();
      const closing     = teacherName ? `\n${teacherName}` : '';
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
- [Begin with "${fn}," and give an overall summary]
- [Specific finding]
- [Another finding]
- [End the final bullet with a closing line: "${closing || 'Your Teacher'}"]

Use 3-5 bullets. First must be TEACHER CHECK. Last bullet must end with the closing.`;
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
