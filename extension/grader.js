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

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function getUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const m = window.location.pathname.match(/\/courses\/(\d+)/);
      return { courseId: m?.[1] || '', assignmentId: params.get('assignment_id') || '', studentId: params.get('student_id') || '' };
    }

    function loadSettings(courseId, assignmentId) {
      const all = GM_getValue('ce_grader_settings', {});
      return all[`${courseId}_${assignmentId}`] || {
        totalPoints: 100, rubricText: '', answerKey: '',
        gradingIntensity: 'balanced', feedbackTone: 'encouraging',
        acceptIntent: true, partialCredit: true, customInstructions: '',
      };
    }

    function saveSettings(courseId, assignmentId, assignmentName, settings) {
      const all = GM_getValue('ce_grader_settings', {});
      all[`${courseId}_${assignmentId}`] = { ...settings, _name: assignmentName };
      GM_setValue('ce_grader_settings', all);
    }

    async function canvasApi(url) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${sg.token}`, 'Accept': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errors?.[0]?.message || `Canvas API error ${res.status}`);
      return data;
    }

    function feedbackKey(courseId, assignmentId, studentId) {
      return `ce_fb_${courseId}_${assignmentId}_${studentId}`;
    }

    // ── STATE ─────────────────────────────────────────────────────────────────
    const { courseId: _cid, assignmentId: _aid } = getUrlParts();
    const sg = {
      token:        GM_getValue('ce_canvas_token', ''),
      view:         'main',   // main | settings | token_setup
      open:         false,
      floating:     false,
      courseId:     _cid,
      assignmentId: _aid,
      assignmentName: '',
      settings:     loadSettings(_cid, _aid),
      settingsDraft: null,
      studentId:    '',
      studentName:  '',
      subStatus:    'idle',   // idle | loading | ready | nosubmission | error
      subText:      '',
      subError:     '',
      attachments:  [],
      grade:        '',
      comment:      '',
    };

    // ── FETCH SUBMISSION ──────────────────────────────────────────────────────
    async function fetchSubmission() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      if (!studentId || !sg.token || !courseId || !assignmentId) return;
      sg.studentId = studentId; sg.subText = ''; sg.subStatus = 'loading';
      sg.attachments = []; sg.grade = ''; sg.comment = '';
      render();

      const key = feedbackKey(courseId, assignmentId, studentId);
      const saved = await new Promise(r => chrome.storage.local.get(key, r));
      if (saved[key]) { sg.grade = saved[key].grade || ''; sg.comment = saved[key].comment || ''; }

      try {
        const nameEl = document.querySelector('#student_carousel_name, .student_selection option:checked, #students_selectmenu-button .ui-selectmenu-text');
        if (nameEl) sg.studentName = nameEl.textContent.trim().replace(/\s*\(.*\)$/, '');
        else {
          try {
            const u = await canvasApi(`${window.location.origin}/api/v1/users/${studentId}/profile`);
            sg.studentName = u.name || u.short_name || '';
          } catch(_) {}
        }

        if (!sg.assignmentName) {
          try {
            const a = await canvasApi(`${window.location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}`);
            sg.assignmentName = a.name || '';
          } catch(_) {}
        }

        const sub = await canvasApi(`${window.location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}?include[]=attachments`);
        if (!sub.submission_type) { sg.subStatus = 'nosubmission'; render(); return; }

        if (sub.submission_type === 'online_text_entry' && sub.body) {
          const tmp = document.createElement('div'); tmp.innerHTML = sub.body;
          sg.subText = (tmp.textContent || tmp.innerText || '').trim();
          sg.subStatus = 'ready';
        } else if (sub.submission_type === 'online_upload' && sub.attachments?.length) {
          sg.attachments = sub.attachments.map(att => ({
            id: att.id,
            filename: decodeURIComponent((att.filename || att.display_name || 'file').replace(/\+/g, ' ')),
            mimeType: att['content-type'] || att.content_type || '',
            url: att.url || att.preview_url || '',
          }));
          sg.subText = `[File upload: ${sg.attachments.map(a => a.filename).join(', ')}]`;
          sg.subStatus = 'ready';
        } else if (sub.submission_type === 'online_url') {
          sg.subText = `[URL: ${sub.url}]`;
          sg.subStatus = 'ready';
        } else {
          sg.subStatus = 'error';
          sg.subError = 'Submission type not supported — paste text below';
        }
        render();
        saveClaudeContext('grade');
      } catch(e) {
        sg.subStatus = 'error'; sg.subError = e.message || 'Failed to load submission'; render();
      }
    }

    function saveFeedback() {
      const { courseId, assignmentId } = getUrlParts();
      chrome.storage.local.set({ [feedbackKey(courseId, assignmentId, sg.studentId)]: { grade: sg.grade, comment: sg.comment, ts: Date.now() } });
    }

    function insertIntoSpeedGrader() {
      if (sg.comment) {
        const box = document.querySelector(
          '#speed_grader_comment_textarea, #speedgrader_textarea, ' +
          'textarea[name="comment[text_comment]"], #comment_textarea, ' +
          'textarea[aria-label*="comment" i], textarea[placeholder*="comment" i]'
        );
        if (box) {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          setter.call(box, sg.comment);
          box.dispatchEvent(new Event('input', { bubbles: true }));
          box.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (sg.grade) {
        const gradeEl = document.querySelector(
          '#student_grading_value, input.grading-box-number, ' +
          'input[data-testid="student-grades-input"], input[aria-label="Grade"], input[placeholder="–"]'
        );
        if (gradeEl) {
          gradeEl.value = String(sg.grade);
          gradeEl.dispatchEvent(new Event('input', { bubbles: true }));
          gradeEl.dispatchEvent(new Event('change', { bubbles: true }));
          gradeEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
        }
      }
    }

    function saveClaudeContext(mode) {
      chrome.storage.local.set({
        ce_claude_context: {
          studentId: sg.studentId, studentName: sg.studentName,
          courseId: sg.courseId, assignmentId: sg.assignmentId, assignmentName: sg.assignmentName,
          settings: sg.settings, attachments: sg.attachments, subText: sg.subText,
          token: sg.token, mode: mode || 'grade', timestamp: Date.now(),
        },
      });
    }

    function openInClaude(mode) {
      saveClaudeContext(mode || 'grade');
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

    // ── RENDER ────────────────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.id = 'ce-ai-grader';
    container.style.cssText = 'width:100%;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;overflow-y:auto;box-sizing:border-box;';

    function render() {
      container.innerHTML = '';
      const body = document.createElement('div');
      body.style.cssText = 'padding:16px;';
      if (!sg.token || sg.view === 'token_setup') body.appendChild(renderTokenSetup());
      else if (sg.view === 'settings')             body.appendChild(renderSettings());
      else                                         body.appendChild(renderMain());
      container.appendChild(body);
    }

    // Canvas-native UI helpers
    function mkLabel(text, noTopMargin) {
      const l = document.createElement('div');
      l.style.cssText = `font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;${noTopMargin ? '' : 'margin-top:14px;'}`;
      l.textContent = text; return l;
    }

    function mkInput(type, placeholder, value) {
      const i = document.createElement('input');
      i.type = type; i.placeholder = placeholder || '';
      if (value !== undefined) i.value = value;
      i.style.cssText = 'width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #c7cdd1;border-radius:3px;font-size:13px;font-family:inherit;color:#2d3b45;background:#fff;';
      return i;
    }

    function mkTextarea(placeholder, value, rows) {
      const ta = document.createElement('textarea');
      ta.placeholder = placeholder || ''; ta.value = value || '';
      ta.style.cssText = `width:100%;box-sizing:border-box;height:${(rows || 4) * 22}px;padding:7px 10px;border:1px solid #c7cdd1;border-radius:3px;font-size:13px;font-family:inherit;color:#2d3b45;resize:vertical;line-height:1.5;`;
      return ta;
    }

    function mkBtn(label, css) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = `width:100%;padding:8px 12px;border-radius:3px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:none;box-sizing:border-box;${css}`;
      return b;
    }

    function mkSelect(options, val) {
      const sel = document.createElement('select');
      sel.style.cssText = 'width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #c7cdd1;border-radius:3px;font-size:13px;font-family:inherit;background:#fff;color:#2d3b45;';
      options.forEach(([v, l]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = l;
        if (v === val) o.selected = true; sel.appendChild(o);
      });
      return sel;
    }

    function mkDivider() {
      const d = document.createElement('div');
      d.style.cssText = 'border-top:1px solid #e5e7eb;margin:16px 0 2px 0;';
      return d;
    }

    // ── MAIN VIEW ─────────────────────────────────────────────────────────────
    function renderMain() {
      const w = document.createElement('div');

      // Title row
      const hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
      const title = document.createElement('span');
      title.style.cssText = 'font-size:15px;font-weight:700;color:#2d3b45;';
      title.textContent = '✦ AI Grader';
      const gearBtn = document.createElement('button'); gearBtn.type = 'button';
      gearBtn.textContent = '⚙ Criteria';
      gearBtn.style.cssText = 'background:none;border:1px solid #c7cdd1;border-radius:3px;font-size:11px;color:#6b7280;cursor:pointer;padding:3px 8px;font-family:inherit;';
      gearBtn.onclick = () => { sg.settingsDraft = { ...sg.settings }; sg.view = 'settings'; render(); };
      hdr.appendChild(title); hdr.appendChild(gearBtn); w.appendChild(hdr);

      // Criteria badge
      const st = sg.settings;
      const hasCriteria = !!(st.rubricText || st.answerKey || st.customInstructions);
      const badge = document.createElement('div');
      badge.style.cssText = `font-size:11px;padding:3px 8px;border-radius:3px;margin-bottom:12px;display:inline-block;${hasCriteria ? 'background:#e6f4ea;color:#127a1b;' : 'background:#fef9e7;color:#856404;'}`;
      badge.textContent = hasCriteria ? `${st.totalPoints} pts · ${st.gradingIntensity}` : 'No grading criteria — click ⚙ Criteria';
      w.appendChild(badge);

      // Student
      if (sg.studentName) {
        w.appendChild(mkLabel('Student', true));
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:15px;font-weight:600;color:#2d3b45;margin-top:2px;';
        nameEl.textContent = sg.studentName;
        w.appendChild(nameEl);
      }

      // Submission
      w.appendChild(mkLabel('Submission'));
      const subCard = document.createElement('div');
      subCard.style.cssText = 'border:1px solid #e5e7eb;border-radius:4px;padding:8px 10px;font-size:12px;background:#f9fafb;color:#6b7280;line-height:1.5;';
      if (sg.subStatus === 'idle')         { subCard.textContent = 'Select a student to load their submission'; }
      else if (sg.subStatus === 'loading') { subCard.textContent = 'Loading…'; }
      else if (sg.subStatus === 'nosubmission') { subCard.textContent = 'No submission yet'; }
      else if (sg.subStatus === 'error')   {
        subCard.textContent = sg.subError;
        subCard.style.cssText += 'color:#c0392b;background:#fef2f2;border-color:#fca5a5;';
      } else if (sg.subStatus === 'ready') {
        if (sg.attachments.length) {
          subCard.textContent = `✓ ${sg.attachments.length} file${sg.attachments.length > 1 ? 's' : ''}: ${sg.attachments.map(a => a.filename).join(', ')}`;
        } else {
          subCard.textContent = `✓ Text · ${sg.subText.split(/\s+/).filter(Boolean).length} words`;
        }
        subCard.style.cssText += 'color:#127a1b;background:#f0fdf4;border-color:#bbf7d0;';
      }
      w.appendChild(subCard);

      // Grade
      w.appendChild(mkDivider());
      w.appendChild(mkLabel('Grade'));
      const gradeRow = document.createElement('div');
      gradeRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
      const gradeInp = mkInput('number', '0', sg.grade);
      gradeInp.min = '0'; gradeInp.max = String(st.totalPoints || 100); gradeInp.step = '0.5';
      gradeInp.style.cssText += 'width:72px;font-size:18px;font-weight:700;text-align:center;';
      gradeInp.oninput = () => { sg.grade = gradeInp.value; saveFeedback(); };
      const ptsLbl = document.createElement('span');
      ptsLbl.style.cssText = 'font-size:14px;color:#6b7280;';
      ptsLbl.textContent = `/ ${st.totalPoints || 100} pts`;
      gradeRow.appendChild(gradeInp); gradeRow.appendChild(ptsLbl);
      w.appendChild(gradeRow);

      // Comments
      w.appendChild(mkLabel('Comments'));
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:#9ca3af;margin-bottom:5px;';
      hint.textContent = 'Paste from Claude — auto-saves & inserts into SpeedGrader';
      w.appendChild(hint);
      const commentTa = mkTextarea('Paste Claude\'s feedback here…', sg.comment, 7);
      commentTa.oninput = () => { sg.comment = commentTa.value; saveFeedback(); };
      commentTa.addEventListener('paste', () => {
        setTimeout(() => { sg.comment = commentTa.value; saveFeedback(); insertIntoSpeedGrader(); }, 0);
      });
      w.appendChild(commentTa);

      w.appendChild(mkDivider());

      if (sg.comment.trim() || sg.grade) {
        const insBtn = mkBtn('↵ Insert into SpeedGrader', 'background:#2d3b45;color:#fff;margin-bottom:6px;');
        insBtn.onclick = () => insertIntoSpeedGrader();
        w.appendChild(insBtn);
      }

      if (sg.subStatus === 'ready' || sg.subText.trim()) {
        const claudeBtn = mkBtn('✦ Open in Claude', 'background:#0770B8;color:#fff;');
        claudeBtn.onclick = () => openInClaude('grade');
        w.appendChild(claudeBtn);
      }

      const tokenLink = document.createElement('div');
      tokenLink.style.cssText = 'font-size:11px;color:#c7cdd1;text-align:center;margin-top:14px;cursor:pointer;';
      tokenLink.textContent = sg.token ? '🔑 Change Canvas API token' : '🔑 Set Canvas API token';
      tokenLink.onmouseenter = () => { tokenLink.style.color = '#6b7280'; };
      tokenLink.onmouseleave = () => { tokenLink.style.color = '#c7cdd1'; };
      tokenLink.onclick = () => { sg.view = 'token_setup'; render(); };
      w.appendChild(tokenLink);

      return w;
    }

    // ── SETTINGS VIEW ─────────────────────────────────────────────────────────
    function renderSettings() {
      const w = document.createElement('div');
      const d = sg.settingsDraft || { ...sg.settings };

      const backBtn = document.createElement('button'); backBtn.type = 'button'; backBtn.textContent = '← Back';
      backBtn.style.cssText = 'background:none;border:none;color:#0770B8;font-size:13px;cursor:pointer;padding:0 0 12px 0;font-family:inherit;font-weight:600;display:block;';
      backBtn.onclick = () => { sg.view = 'main'; render(); };
      w.appendChild(backBtn);

      const title = document.createElement('div');
      title.style.cssText = 'font-size:15px;font-weight:700;color:#2d3b45;margin-bottom:2px;';
      title.textContent = 'Grading Criteria';
      w.appendChild(title);
      if (sg.assignmentName) {
        const sub = document.createElement('div');
        sub.style.cssText = 'font-size:11px;color:#6b7280;margin-bottom:12px;';
        sub.textContent = sg.assignmentName; w.appendChild(sub);
      }

      w.appendChild(mkLabel('Total Points', true));
      const ptsInp = mkInput('number', '100', String(d.totalPoints || 100));
      ptsInp.oninput = () => { d.totalPoints = parseInt(ptsInp.value) || 100; };
      w.appendChild(ptsInp);

      w.appendChild(mkLabel('Grading Style'));
      const intSel = mkSelect([
        ['lenient', 'Lenient — benefit of the doubt'],
        ['balanced', 'Balanced — fair and consistent'],
        ['strict', 'Strict — hold to high standards'],
      ], d.gradingIntensity || 'balanced');
      intSel.onchange = () => { d.gradingIntensity = intSel.value; };
      w.appendChild(intSel);

      w.appendChild(mkLabel('Feedback Tone'));
      const toneSel = mkSelect([
        ['encouraging', 'Encouraging — warm, start with positives'],
        ['neutral', 'Neutral — objective and professional'],
        ['direct', 'Direct — concise, focus on improvements'],
      ], d.feedbackTone || 'encouraging');
      toneSel.onchange = () => { d.feedbackTone = toneSel.value; };
      w.appendChild(toneSel);

      // Toggles
      const addToggle = (label, key) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:10px;';
        const lbl = document.createElement('span'); lbl.style.cssText = 'font-size:12px;color:#374151;'; lbl.textContent = label;
        const sw = document.createElement('button'); sw.type = 'button';
        sw.style.cssText = `width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;background:${d[key] ? '#0770B8' : '#d1d5db'};position:relative;flex-shrink:0;`;
        sw.innerHTML = `<span style="position:absolute;top:2px;left:${d[key] ? '18px' : '2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:left .15s;"></span>`;
        sw.onclick = () => { d[key] = !d[key]; sg.settingsDraft = d; render(); };
        row.appendChild(lbl); row.appendChild(sw); w.appendChild(row);
      };
      addToggle('Accept intent (credit correct meaning)', 'acceptIntent');
      addToggle('Allow partial credit', 'partialCredit');

      w.appendChild(mkLabel('Rubric / Grading Criteria'));
      const rubHint = document.createElement('div');
      rubHint.style.cssText = 'font-size:11px;color:#9ca3af;margin-bottom:4px;';
      rubHint.textContent = 'Or click "Build with Claude" below — Claude will ask questions and generate this for you';
      w.appendChild(rubHint);
      const rubTa = mkTextarea('e.g.\n- Clear thesis: 20 pts\n- Supporting evidence: 30 pts\n- Grammar: 10 pts', d.rubricText || '', 5);
      rubTa.oninput = () => { d.rubricText = rubTa.value; };
      w.appendChild(rubTa);

      w.appendChild(mkLabel('Answer Key (optional)'));
      const akTa = mkTextarea('Correct answers or key points to look for…', d.answerKey || '', 3);
      akTa.oninput = () => { d.answerKey = akTa.value; };
      w.appendChild(akTa);

      w.appendChild(mkLabel('Additional Instructions (optional)'));
      const ciTa = mkTextarea('Any other grading notes…', d.customInstructions || '', 2);
      ciTa.oninput = () => { d.customInstructions = ciTa.value; };
      w.appendChild(ciTa);

      // Import from Claude paste area
      w.appendChild(mkDivider());
      const importHdr = document.createElement('div');
      importHdr.style.cssText = 'font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;';
      importHdr.textContent = 'Paste criteria from Claude to auto-fill:';
      w.appendChild(importHdr);
      const importTa = mkTextarea('Paste Claude\'s ---GRADING CRITERIA--- block here…', '', 3);
      importTa.addEventListener('paste', () => {
        setTimeout(() => {
          const parsed = parseCriteriaBlock(importTa.value);
          if (parsed) {
            Object.assign(d, parsed);
            sg.settingsDraft = d;
            render();
          }
        }, 0);
      });
      w.appendChild(importTa);

      w.appendChild(mkDivider());

      const saveBtn = mkBtn('Save Criteria', 'background:#0770B8;color:#fff;');
      saveBtn.onclick = () => {
        sg.settings = { ...d };
        saveSettings(sg.courseId, sg.assignmentId, sg.assignmentName, sg.settings);
        sg.view = 'main'; render();
      };
      w.appendChild(saveBtn);

      const buildBtn = mkBtn('✦ Build Criteria with Claude', 'background:#f5f5f5;color:#2d3b45;border:1px solid #c7cdd1;margin-top:6px;');
      buildBtn.onclick = () => {
        sg.settings = { ...d };
        saveSettings(sg.courseId, sg.assignmentId, sg.assignmentName, sg.settings);
        openInClaude('criteria');
      };
      w.appendChild(buildBtn);
      const buildHint = document.createElement('div');
      buildHint.style.cssText = 'font-size:11px;color:#9ca3af;text-align:center;margin-top:5px;';
      buildHint.textContent = 'Claude will ask questions then output a criteria block to paste above';
      w.appendChild(buildHint);

      return w;
    }

    function parseCriteriaBlock(text) {
      if (!text.includes('GRADING CRITERIA')) return null;
      const result = {};
      const totalMatch = text.match(/TOTAL POINTS:\s*(\d+)/i);
      if (totalMatch) result.totalPoints = parseInt(totalMatch[1]);
      const styleMatch = text.match(/GRADING STYLE:\s*(\w+)/i);
      if (styleMatch && ['lenient', 'balanced', 'strict'].includes(styleMatch[1].toLowerCase()))
        result.gradingIntensity = styleMatch[1].toLowerCase();
      const toneMatch = text.match(/FEEDBACK TONE:\s*(\w+)/i);
      if (toneMatch && ['encouraging', 'neutral', 'direct'].includes(toneMatch[1].toLowerCase()))
        result.feedbackTone = toneMatch[1].toLowerCase();
      const rubricMatch = text.match(/RUBRIC:\s*([\s\S]+?)(?:ANSWER KEY:|INSTRUCTIONS:|---END)/i);
      if (rubricMatch) result.rubricText = rubricMatch[1].trim();
      const akMatch = text.match(/ANSWER KEY:\s*([\s\S]+?)(?:INSTRUCTIONS:|---END)/i);
      if (akMatch && akMatch[1].trim().toLowerCase() !== 'none') result.answerKey = akMatch[1].trim();
      const instrMatch = text.match(/INSTRUCTIONS:\s*([\s\S]+?)---END/i);
      if (instrMatch && instrMatch[1].trim().toLowerCase() !== 'none') result.customInstructions = instrMatch[1].trim();
      return result;
    }

    // ── TOKEN SETUP ───────────────────────────────────────────────────────────
    function renderTokenSetup() {
      const isReplace = !!sg.token;
      const w = document.createElement('div');

      if (isReplace) {
        const back = document.createElement('button'); back.type = 'button'; back.textContent = '← Back';
        back.style.cssText = 'background:none;border:none;color:#0770B8;font-size:13px;cursor:pointer;padding:0 0 12px 0;font-family:inherit;font-weight:600;display:block;';
        back.onclick = () => { sg.view = 'main'; render(); };
        w.appendChild(back);
      }

      const title = document.createElement('div');
      title.style.cssText = 'font-size:15px;font-weight:700;color:#2d3b45;margin-bottom:10px;';
      title.textContent = isReplace ? 'Replace Canvas API Token' : 'Connect Canvas API';
      w.appendChild(title);

      if (!isReplace) {
        const steps = ['Click your name → Account → Settings', 'Scroll to "Approved Integrations"', 'Click + New Access Token → copy it', 'Paste it below'];
        const ol = document.createElement('ol');
        ol.style.cssText = 'color:#6b7280;font-size:12px;padding-left:16px;margin:0 0 12px 0;line-height:1.9;';
        steps.forEach(s => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
        w.appendChild(ol);
      } else {
        const cur = document.createElement('div');
        cur.style.cssText = 'font-size:11px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;border-radius:3px;padding:5px 8px;margin-bottom:8px;font-family:monospace;';
        cur.textContent = 'Current: ' + sg.token.slice(0, 6) + '••••••••' + sg.token.slice(-4);
        w.appendChild(cur);
      }

      const inp = mkInput('password', 'Paste token here…');
      inp.style.marginBottom = '8px';
      w.appendChild(inp);

      const saveBtn = mkBtn(isReplace ? 'Update Token' : 'Save & Connect', 'background:#0770B8;color:#fff;');
      saveBtn.onclick = () => {
        const v = inp.value.trim(); if (!v) return;
        sg.token = v; GM_setValue('ce_canvas_token', v);
        sg.view = 'main';
        const { courseId, assignmentId } = getUrlParts();
        sg.settings = loadSettings(courseId, assignmentId);
        render();
        if (sg.subStatus === 'idle') fetchSubmission();
      };
      w.appendChild(saveBtn);

      return w;
    }

    // ── TOGGLE (floating fallback) ────────────────────────────────────────────
    let _msgBtnEl = null;

    function positionToggle() {
      const msgBtn = document.querySelector(
        '#message_student_link, a.message_student_link, button.message_student_link, ' +
        '[data-testid="message-student-button"], [data-testid="send_message_student"], ' +
        'button[aria-label="Send message to student"], a[aria-label="Send message to student"]'
      );
      if (!msgBtn) return false;
      const r = msgBtn.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      if (!_msgBtnEl) {
        _msgBtnEl = msgBtn;
        msgBtn.style.setProperty('visibility', 'hidden', 'important');
        msgBtn.style.setProperty('pointer-events', 'none', 'important');
      }
      toggleBtn.style.cssText = [
        'position:fixed',
        `top:${Math.round(r.top)}px`, `left:${Math.round(r.left)}px`,
        `width:${Math.round(r.width)}px`, `height:${Math.round(r.height)}px`,
        'background:#0770B8', 'color:#fff', 'border:none', 'border-radius:4px',
        'cursor:pointer', 'z-index:99999',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'font-size:13px', 'font-weight:700',
        'display:flex', 'align-items:center', 'justify-content:center',
        'white-space:nowrap', 'box-sizing:border-box',
      ].join(';');
      return true;
    }

    function showToggle() { if (_msgBtnEl) positionToggle(); else toggleBtn.style.display = 'block'; }
    function hideToggle() { toggleBtn.style.display = 'none'; }

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ce-ai-grader-toggle';
    toggleBtn.innerHTML = '<span style="font-size:15px;line-height:1;">✦</span><span>AI Grader</span>';
    toggleBtn.style.cssText = 'position:fixed;top:118px;right:18px;z-index:99999;display:flex;align-items:center;gap:7px;min-width:112px;justify-content:center;padding:9px 13px;border:none;border-radius:4px;background:#0770B8;color:#fff;font:600 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;white-space:nowrap;';
    toggleBtn.onclick = () => {
      sg.open = !sg.open;
      container.style.display = sg.open ? 'block' : 'none';
      if (sg.open) hideToggle(); else showToggle();
      if (sg.open && sg.token && sg.subStatus === 'idle') fetchSubmission(); else render();
    };

    window.__cesGraderToggle = () => {
      sg.open = !sg.open;
      container.style.display = sg.open ? 'block' : 'none';
      if (sg.floating && !document.getElementById('ce-toolbar')) toggleBtn.style.display = sg.open ? 'none' : 'block';
      if (sg.open && sg.token && sg.subStatus === 'idle') fetchSubmission(); else render();
    };

    // ── INJECT ────────────────────────────────────────────────────────────────
    function findSidebar() {
      return (
        document.querySelector('#rightside_inner') ||
        document.querySelector('#right_side') ||
        document.querySelector('#right-side') ||
        document.querySelector('#grading_box_holder') ||
        document.querySelector('#speedgrader_sidebar') ||
        document.querySelector('#speedgrader_textarea')?.closest('#right_side,#rightside,#right-side,[id*="right"],form') ||
        document.querySelector('#speedgrader_textarea')?.parentElement
      );
    }

    function inject() {
      if (document.getElementById('ce-ai-grader')) return;
      const { courseId, assignmentId } = getUrlParts();
      sg.courseId = courseId; sg.assignmentId = assignmentId;
      sg.settings = loadSettings(courseId, assignmentId);

      const sidebar = findSidebar();
      if (sidebar) {
        sg.floating = false; sg.open = true;
        container.style.cssText = 'width:100%;min-height:100%;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;overflow-y:auto;box-sizing:border-box;';
        sidebar.insertBefore(container, sidebar.firstChild);
        render();
        if (sg.token) fetchSubmission();
      } else {
        sg.floating = true; sg.open = false;
        container.style.cssText = 'display:none;position:fixed;right:0;top:52px;bottom:0;width:340px;z-index:99998;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;overflow-y:auto;';
        document.body.appendChild(container);
        if (!document.getElementById('ce-ai-grader-toggle')) document.body.appendChild(toggleBtn);
        render();
        if (!_msgBtnEl) {
          let _tries = 0;
          const _poll = setInterval(() => { if (positionToggle() || ++_tries > 30) clearInterval(_poll); }, 300);
          window.addEventListener('resize', positionToggle);
        }
      }
    }

    // ── NAVIGATION TRACKING ───────────────────────────────────────────────────
    let sgLastStudentId    = getUrlParts().studentId;
    let sgLastAssignmentId = getUrlParts().assignmentId;

    function onNavChange() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      const assignmentChanged = assignmentId && assignmentId !== sgLastAssignmentId;
      const studentChanged    = studentId    && studentId    !== sgLastStudentId;
      if (!assignmentChanged && !studentChanged) return;
      if (assignmentChanged) {
        sgLastAssignmentId = assignmentId;
        sg.courseId = courseId; sg.assignmentId = assignmentId; sg.assignmentName = '';
        sg.settings = loadSettings(courseId, assignmentId);
      }
      sgLastStudentId = studentId;
      sg.subText = ''; sg.subStatus = 'idle'; sg.studentName = ''; sg.attachments = []; sg.grade = ''; sg.comment = '';
      if (sg.token && (!sg.floating || sg.open)) fetchSubmission(); else render();
    }

    const _origPushState    = history.pushState.bind(history);
    const _origReplaceState = history.replaceState.bind(history);
    history.pushState    = function(...a) { _origPushState(...a);    setTimeout(onNavChange, 100); };
    history.replaceState = function(...a) { _origReplaceState(...a); setTimeout(onNavChange, 100); };
    window.addEventListener('popstate',   () => setTimeout(onNavChange, 100));
    window.addEventListener('hashchange', () => setTimeout(onNavChange, 100));
    setInterval(onNavChange, 1200);

    const _nameEl = document.querySelector('#student_carousel_name, #students_selectmenu-button');
    if (_nameEl) new MutationObserver(() => setTimeout(onNavChange, 200)).observe(_nameEl, { childList: true, subtree: true, characterData: true });

    inject();
    new MutationObserver(() => { if (!document.getElementById('ce-ai-grader')) inject(); })
      .observe(document.body, { childList: true, subtree: true });
    let _pc = 0;
    const _poll = setInterval(() => {
      if (document.getElementById('ce-ai-grader') || _pc++ > 30) { clearInterval(_poll); return; }
      inject();
    }, 500);

  } catch(e) { /* don't crash SpeedGrader */ }
})();
