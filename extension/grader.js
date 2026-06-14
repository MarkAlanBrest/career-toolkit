(async function () {
  'use strict';
  try {
    // Only runs on SpeedGrader pages
    if (!/speed_grader/.test(window.location.href)) return;

  // Storage shim — pre-load keys used by the grader
  const _store = await new Promise(resolve =>
    chrome.storage.local.get(['ce_canvas_token', 'ce_grader_settings'], resolve)
  );
  function GM_getValue(key, def) { return _store[key] ?? def; }
  function GM_setValue(key, val) {
    _store[key] = val;
    chrome.storage.local.set({ [key]: val });
  }

  async function ceCanvasApi(url) {
    const token = GM_getValue('ce_canvas_token', '');
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas API error ${res.status}`);
    return data;
  }

  function showNotice(msg) {
    let n = document.getElementById('ce-notice');
    if (!n) { n = document.createElement('div'); n.id = 'ce-notice'; document.body.appendChild(n); }
    n.textContent = msg; n.classList.add('ce-notice-show');
    setTimeout(() => n.classList.remove('ce-notice-show'), 3000);
  }

  // ── GRADER SETTINGS HELPERS ────────────────────────────────────────────────────
  function sgLoadSettings(courseId, assignmentId) {
    const all = GM_getValue('ce_grader_settings', {});
    return all[`${courseId}_${assignmentId}`] || {
      totalPoints: 100, rubricText: '', answerKey: '',
      gradingIntensity: 'balanced', feedbackTone: 'encouraging',
      acceptIntent: true, partialCredit: true, customInstructions: '',
    };
  }
  function sgSaveSettings(courseId, assignmentId, name, settings) {
    const all = GM_getValue('ce_grader_settings', {});
    all[`${courseId}_${assignmentId}`] = { ...settings, _name: name };
    GM_setValue('ce_grader_settings', all);
  }

  // ── SPEEDGRADER AI GRADER ─────────────────────────────────────────────────────
  function showSpeedGraderPanel() {
    const sg = {
      token: GM_getValue('ce_canvas_token', ''),
      view: 'grade',   // grade | settings | token_setup
      floating: false,
      open: false,
      // assignment context (from URL)
      courseId:     '',
      assignmentId: '',
      assignmentName: '',
      // settings (loaded from storage per assignment)
      settings: { totalPoints:100, rubricText:'', answerKey:'', gradingIntensity:'balanced', feedbackTone:'encouraging', acceptIntent:true, partialCredit:true, customInstructions:'' },
      settingsDraft: null,
      // student & submission
      studentId:   '',
      studentName: '',
      subStatus:   'idle',  // idle | loading | ready | nosubmission | error
      subText:     '',
      subError:    '',
      attachments: [],
      promptText: '',
      aiResponseText: '',
      streamStatus: 'idle',  // idle | parsing | streaming | done | error
      streamText: '',
      streamError: '',
      // grading
      result:  null,  // { score, total, feedback }
    };

    // ── URL HELPERS ────────────────────────────────────────────────────────────
    function getUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const m = window.location.pathname.match(/\/courses\/(\d+)/);
      return { courseId: m?.[1]||'', assignmentId: params.get('assignment_id')||'', studentId: params.get('student_id')||'' };
    }

    function loadAssignmentSettings() {
      const { courseId, assignmentId } = getUrlParts();
      sg.courseId = courseId; sg.assignmentId = assignmentId;
      if (courseId && assignmentId) sg.settings = sgLoadSettings(courseId, assignmentId);
    }

    // ── FETCH SUBMISSION ───────────────────────────────────────────────────────
    async function fetchSubmission() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      if (!studentId || !sg.token || !courseId || !assignmentId) return;
      sg.studentId = studentId; sg.subText = ''; sg.subStatus = 'loading'; sg.result = null; sg.attachments = []; sg.promptText = ''; sg.aiResponseText = ''; sg.streamStatus = 'idle'; sg.streamText = ''; sg.streamError = '';
      render();
      try {
        const nameEl = document.querySelector('#student_carousel_name, .student_selection option:checked, #students_selectmenu-button .ui-selectmenu-text');
        if (nameEl) { sg.studentName = nameEl.textContent.trim().replace(/\s*\(.*\)$/, ''); }
        else { try { const u = await ceCanvasApi(`${window.location.origin}/api/v1/users/${studentId}/profile`); sg.studentName = u.name || u.short_name || ''; } catch(_) {} }

        if (!sg.assignmentName) {
          try { const a = await ceCanvasApi(`${window.location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}`); sg.assignmentName = a.name || ''; } catch(_) {}
        }

        const sub = await ceCanvasApi(`${window.location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}?include[]=attachments`);
        if (!sub.submission_type) { sg.subStatus = 'nosubmission'; render(); return; }

        if (sub.submission_type === 'online_text_entry' && sub.body) {
          const tmp = document.createElement('div'); tmp.innerHTML = sub.body;
          sg.subText = (tmp.textContent || tmp.innerText || '').trim();
          sg.subStatus = 'ready'; render();
        } else if (sub.submission_type === 'online_upload' && sub.attachments?.length) {
          sg.attachments = sub.attachments.map(att => ({
            id: att.id,
            filename: decodeURIComponent((att.filename || att.display_name || 'submission file').replace(/\+/g, ' ')),
            mimeType: att['content-type'] || att.content_type || '',
            url: att.url || att.preview_url || '',
          }));
          sg.subText = `[File upload submission: ${sg.attachments.map(a => a.filename).join(', ')}]`;
          sg.subStatus = 'ready'; render();
        } else if (sub.submission_type === 'online_url') {
          sg.subText = `[URL submission: ${sub.url}]`; sg.subStatus = 'ready'; render();
        } else {
          sg.subStatus = 'error'; sg.subError = 'Submission type not supported — paste text below'; render();
        }
      } catch(e) {
        sg.subStatus = 'error'; sg.subError = e.message || 'Failed to load submission'; render();
      }
    }

    // External AI grading workflow
    function buildExternalPrompt() {
      const st = sg.settings;
      const total = st.totalPoints || 100;
      const firstName = sg.studentName ? sg.studentName.split(' ')[0] : 'the student';
      const intensityMap = {
        lenient:  'Be generous. Give benefit of the doubt. Focus on what the student did well.',
        balanced: 'Grade fairly. Acknowledge strengths and note specific weaknesses.',
        strict:   'Hold students to high standards. Be thorough in identifying errors.',
      };
      const toneMap = {
        encouraging: 'Start with positives, then constructive feedback. Be warm and supportive.',
        neutral:     'Be objective and professional.',
        direct:      'Be concise and direct. Focus on what needs improvement.',
      };

      let prompt = `You are an expert teacher grading a student assignment.\nStudent: ${sg.studentName || 'Student'}\n`;
      if (sg.assignmentName) prompt += `Assignment: ${sg.assignmentName}\n`;
      prompt += `\nGRADING APPROACH: ${intensityMap[st.gradingIntensity] || intensityMap.balanced}\n`;
      prompt += `FEEDBACK TONE: ${toneMap[st.feedbackTone] || toneMap.encouraging}\n`;
      if (st.acceptIntent)  prompt += `ACCEPT INTENT: Give credit if the student conveys the correct meaning even if wording differs.\n`;
      if (st.partialCredit) prompt += `PARTIAL CREDIT: Award partial credit for partially correct answers.\n`;
      prompt += `\nTOTAL POINTS: ${total}\n\n`;
      if (st.rubricText)         prompt += `RUBRIC / GRADING CRITERIA:\n${st.rubricText}\n\n`;
      if (st.answerKey)          prompt += `ANSWER KEY:\n${st.answerKey}\n\n`;
      if (st.customInstructions) prompt += `ADDITIONAL INSTRUCTIONS:\n${st.customInstructions}\n\n`;

      prompt += `STUDENT SUBMISSION:\n${sg.subText.slice(0, 18000)}\n\n`;

      prompt += `Grade this submission. DO NOT penalize for things not in the rubric.\n\n`;
      prompt += `Respond in EXACTLY this format - no other text:\nSCORE: [number]/${total}\nFEEDBACK:\n- TEACHER CHECK: [list the specific items the teacher must manually verify, if any]\n- [Address ${firstName} by name, summarize overall performance]\n- [Specific finding on a rubric criterion - what was present or missing]\n- [Another criterion or area for improvement]\n\nRules: first bullet MUST start with TEACHER CHECK:. Use 3-5 bullets total.`;
      return prompt;
    }

    async function parseAttachmentsToText() {
      const results = [];
      for (const att of sg.attachments) {
        const res = await new Promise(resolve =>
          chrome.runtime.sendMessage({ type: 'PARSE_FILE', payload: { fileUrl: att.url, token: sg.token, filename: att.filename, mimeType: att.mimeType } }, resolve)
        );
        if (res?.error) throw new Error(res.error);
        results.push(`[${att.filename}]\n${res?.text || '(no text extracted)'}`);
      }
      return results.join('\n\n');
    }

    async function gradeWithClaude() {
      if (sg.attachments.length && sg.subText.startsWith('[File upload')) {
        sg.streamStatus = 'parsing'; sg.streamText = ''; render();
        try {
          const parsed = await parseAttachmentsToText();
          if (parsed) sg.subText = parsed;
        } catch(e) {
          sg.streamStatus = 'error'; sg.streamError = 'Could not read file: ' + e.message; render(); return;
        }
      }
      sg.promptText = buildExternalPrompt();
      sg.streamStatus = 'streaming'; sg.streamText = ''; sg.result = null; render();

      const port = chrome.runtime.connect({ name: 'ce-stream' });
      port.postMessage({ type: 'STREAM_GENERATE', payload: {
        messages: [{ role: 'user', content: sg.promptText }],
        max_tokens: 1024,
        model: 'claude-sonnet-4-6',
      }});

      port.onMessage.addListener(msg => {
        if (msg.type === 'chunk') {
          sg.streamText += msg.text;
          render();
        } else if (msg.type === 'done') {
          sg.streamStatus = 'done';
          parseExternalAiResponse(sg.streamText);
          port.disconnect();
        } else if (msg.type === 'error') {
          sg.streamStatus = 'error'; sg.streamError = msg.error || 'Unknown error'; render();
          port.disconnect();
        }
      });

      port.onDisconnect.addListener(() => {
        if (sg.streamStatus === 'streaming') {
          sg.streamStatus = 'error'; sg.streamError = 'Connection lost'; render();
        }
      });
    }

    async function downloadAttachment(att) {
      if (!att || !att.url) { showNotice('No file URL found'); return; }
      try {
        const res = await fetch(att.url, sg.token ? { headers: { 'Authorization': `Bearer ${sg.token}` } } : {});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = att.filename || 'submission-file';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showNotice('Submission file downloaded');
      } catch(e) {
        try { window.open(att.url, '_blank', 'noopener,noreferrer'); } catch(_) {}
        showNotice('Could not download file: ' + (e.message || 'unknown error'));
      }
    }

    function parseExternalAiResponse(text) {
      const fallbackTotal = sg.settings.totalPoints || 100;
      const raw = String(text || '').trim();
      const scoreMatch = raw.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i);
      const feedbackMatch = raw.match(/FEEDBACK:\s*([\s\S]+)/i);
      sg.result = {
        score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
        total: scoreMatch ? parseFloat(scoreMatch[2]) : fallbackTotal,
        feedback: feedbackMatch ? feedbackMatch[1].trim() : raw,
      };
      sg.aiResponseText = raw;
      render();
    }
    // ── RENDER ─────────────────────────────────────────────────────────────────
    const graderStyle = document.createElement('style');
    graderStyle.textContent = '@keyframes ce-pulse{0%,100%{opacity:1}50%{opacity:.2}}';
    document.head.appendChild(graderStyle);

    const container = document.createElement('div');
    container.id = 'ce-ai-grader';
    container.style.cssText = 'width:100%;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;overflow:hidden;';

    function render() {
      container.innerHTML = '';
      const hdr = document.createElement('div');
      hdr.style.cssText = 'background:#2d3b45;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;';
      const htitle = document.createElement('span');
      htitle.style.cssText = 'font-weight:700;font-size:13px;';
      htitle.textContent = sg.view === 'settings' ? 'Grading Settings' : 'AI Grading Prompt';
      hdr.appendChild(htitle);
      const hdrRight = document.createElement('div'); hdrRight.style.cssText = 'display:flex;align-items:center;gap:4px;';
      if (sg.view === 'grade' && sg.token) {
        const sBtn = document.createElement('button'); sBtn.textContent = '⚙'; sBtn.type='button';
        sBtn.title = 'Assignment settings';
        sBtn.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;font-size:13px;padding:2px 7px;border-radius:3px;cursor:pointer;';
        sBtn.onclick = () => { sg.settingsDraft = {...sg.settings}; sg.view='settings'; render(); };
        hdrRight.appendChild(sBtn);
        const kBtn = document.createElement('button'); kBtn.textContent = '🔑'; kBtn.type='button';
        kBtn.title = 'Change Canvas API token';
        kBtn.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;font-size:13px;padding:2px 7px;border-radius:3px;cursor:pointer;';
        kBtn.onclick = () => { sg.view='token_setup'; render(); };
        hdrRight.appendChild(kBtn);
      }
      if (sg.floating) {
        const xBtn = document.createElement('button'); xBtn.textContent = '✕'; xBtn.type='button';
        xBtn.style.cssText = 'background:rgba(255,255,255,.15);border:none;color:#fff;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:3px;line-height:1;';
        xBtn.onclick = () => { sg.open=false; container.style.display='none'; showToggle(); };
        hdrRight.appendChild(xBtn);
      }
      hdr.appendChild(hdrRight);
      container.appendChild(hdr);
      const body = document.createElement('div'); body.style.cssText = 'padding:14px 12px;';
      if (!sg.token || sg.view === 'token_setup') body.appendChild(renderTokenSetup());
      else if (sg.view === 'settings')            body.appendChild(renderSettings());
      else                                        body.appendChild(renderGrade());
      container.appendChild(body);
    }

    function mkBtn(label, css) {
      const b = document.createElement('button'); b.type='button'; b.textContent=label;
      b.style.cssText = `width:100%;padding:7px 10px;border-radius:3px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:none;box-sizing:border-box;${css}`;
      return b;
    }

    // ── TOKEN SETUP VIEW ───────────────────────────────────────────────────────
    function renderTokenSetup() {
      const isReplace = !!sg.token;
      const w = document.createElement('div');
      const title = document.createElement('div'); title.style.cssText='font-weight:600;color:#2d3b45;margin-bottom:6px;';
      title.textContent = isReplace ? 'Replace Canvas API Token' : 'Connect Canvas to get started'; w.appendChild(title);
      if (isReplace) {
        const cur = document.createElement('div'); cur.style.cssText='font-size:11px;color:#6b7280;background:#f9fafb;padding:5px 8px;border-radius:3px;margin-bottom:8px;font-family:monospace;';
        cur.textContent = 'Current: ' + sg.token.slice(0,6) + '••••••••' + sg.token.slice(-4); w.appendChild(cur);
      } else {
        const steps = ['Click your name → Account → Settings','Scroll to "Approved Integrations"','Click + New Access Token → copy it','Paste it below'];
        const ol = document.createElement('ol'); ol.style.cssText='color:#6b7280;font-size:12px;padding-left:16px;margin:0 0 8px 0;line-height:1.9;';
        steps.forEach(s=>{ const li=document.createElement('li'); li.textContent=s; ol.appendChild(li); }); w.appendChild(ol);
      }
      const inp=document.createElement('input'); inp.type='password'; inp.placeholder='Paste new token here…';
      inp.style.cssText='width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;margin-bottom:6px;font-family:inherit;';
      w.appendChild(inp);
      const save=mkBtn(isReplace ? 'Update Token' : 'Save & Connect','background:#0770B8;color:#fff;');
      save.onclick=()=>{ const v=inp.value.trim(); if(!v) return; sg.token=v; GM_setValue('ce_canvas_token',v); sg.view='grade'; loadAssignmentSettings(); render(); if(sg.subStatus==='idle') fetchSubmission(); };
      w.appendChild(save);
      if (isReplace) {
        const cancel=mkBtn('Cancel','background:#f0f0f0;color:#374151;margin-top:4px;');
        cancel.onclick=()=>{ sg.view='grade'; render(); }; w.appendChild(cancel);
      }
      return w;
    }

    // ── SETTINGS VIEW ──────────────────────────────────────────────────────────
    function renderSettings() {
      const w = document.createElement('div'); w.style.cssText='display:flex;flex-direction:column;gap:8px;';
      const d = sg.settingsDraft;
      if (sg.assignmentName) {
        const nb=document.createElement('div'); nb.style.cssText='font-size:11px;color:#6b7280;margin-bottom:2px;';
        nb.textContent=`Assignment: ${sg.assignmentName}`; w.appendChild(nb);
      }
      function mkLabel(txt) { const l=document.createElement('div'); l.style.cssText='font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;'; l.textContent=txt; return l; }
      function mkTextarea(val, placeholder, rows) {
        const ta=document.createElement('textarea'); ta.value=val; ta.placeholder=placeholder;
        ta.style.cssText=`width:100%;box-sizing:border-box;height:${(rows||3)*22}px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;resize:vertical;font-family:inherit;line-height:1.5;`;
        return ta;
      }
      function mkSelect(options, val) {
        const sel=document.createElement('select'); sel.style.cssText='width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;font-family:inherit;background:#fff;';
        options.forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; if(v===val) o.selected=true; sel.appendChild(o); });
        return sel;
      }
      function mkToggle(label, val, onChange) {
        const row=document.createElement('div'); row.style.cssText='display:flex;align-items:center;justify-content:space-between;';
        const lbl=document.createElement('span'); lbl.style.cssText='font-size:12px;color:#374151;'; lbl.textContent=label; row.appendChild(lbl);
        const sw=document.createElement('button'); sw.type='button';
        sw.style.cssText=`width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;background:${val?'#0770B8':'#d1d5db'};position:relative;flex-shrink:0;`;
        sw.innerHTML=`<span style="position:absolute;top:2px;left:${val?'18px':'2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:left .15s;"></span>`;
        sw.onclick=()=>onChange(!val);
        row.appendChild(sw); return row;
      }

      w.appendChild(mkLabel('Total Points'));
      const ptsInp=document.createElement('input'); ptsInp.type='number'; ptsInp.min='1'; ptsInp.max='1000'; ptsInp.value=d.totalPoints||100;
      ptsInp.style.cssText='width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;font-family:inherit;';
      ptsInp.oninput=()=>{ d.totalPoints=parseInt(ptsInp.value)||100; }; w.appendChild(ptsInp);

      w.appendChild(mkLabel('Grading Intensity'));
      const intSel=mkSelect([['lenient','Lenient — benefit of the doubt'],['balanced','Balanced — fair and consistent'],['strict','Strict — hold to high standards']],d.gradingIntensity||'balanced');
      intSel.onchange=()=>{ d.gradingIntensity=intSel.value; }; w.appendChild(intSel);

      w.appendChild(mkLabel('Feedback Tone'));
      const toneSel=mkSelect([['encouraging','Encouraging — lead with positives'],['neutral','Neutral — objective and professional'],['direct','Direct — concise, focus on improvements']],d.feedbackTone||'encouraging');
      toneSel.onchange=()=>{ d.feedbackTone=toneSel.value; }; w.appendChild(toneSel);

      w.appendChild(mkLabel('Rubric / Grading Criteria'));
      const rubHint=document.createElement('div'); rubHint.style.cssText='font-size:11px;color:#9ca3af;margin-bottom:3px;'; rubHint.textContent='List criteria and point values. Saved per assignment.'; w.appendChild(rubHint);
      const rubTa=mkTextarea(d.rubricText||'','e.g.\n- Clear thesis: 20 pts\n- Evidence: 30 pts\n- Grammar: 10 pts',5);
      rubTa.oninput=()=>{ d.rubricText=rubTa.value; }; w.appendChild(rubTa);

      w.appendChild(mkLabel('Answer Key (optional)'));
      const akTa=mkTextarea(d.answerKey||'','Correct answers or key points the submission should contain.',4);
      akTa.oninput=()=>{ d.answerKey=akTa.value; }; w.appendChild(akTa);

      w.appendChild(mkToggle('Accept intent (credit correct meaning)', d.acceptIntent, v=>{ d.acceptIntent=v; sg.settingsDraft=d; render(); }));
      w.appendChild(mkToggle('Allow partial credit', d.partialCredit, v=>{ d.partialCredit=v; sg.settingsDraft=d; render(); }));

      w.appendChild(mkLabel('Additional AI Instructions (optional)'));
      const ciTa=mkTextarea(d.customInstructions||'','Any other instructions for the AI chat...',2);
      ciTa.oninput=()=>{ d.customInstructions=ciTa.value; }; w.appendChild(ciTa);

      const saveBtn=mkBtn('Save Settings','background:#0770B8;color:#fff;margin-top:4px;');
      saveBtn.onclick=()=>{
        sg.settings={...d};
        sgSaveSettings(sg.courseId, sg.assignmentId, sg.assignmentName, sg.settings);
        sg.view='grade'; render(); showNotice('Settings saved!');
      };
      w.appendChild(saveBtn);
      const cancelBtn=mkBtn('Cancel','background:#f0f0f0;color:#374151;margin-top:4px;');
      cancelBtn.onclick=()=>{ sg.view='grade'; render(); }; w.appendChild(cancelBtn);

      // ── BACKUP / RESTORE ──────────────────────────────────────────────────
      const sep=document.createElement('div'); sep.style.cssText='border-top:1px solid #e5e7eb;margin-top:10px;padding-top:8px;';
      sep.appendChild(mkLabel('Backup & Restore'));

      const exportBtn=mkBtn('⬇ Export all assignment settings','background:#f5f5f5;color:#374151;font-weight:400;margin-top:4px;');
      exportBtn.onclick=()=>{
        const data=GM_getValue('ce_grader_settings',{});
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob); const a=document.createElement('a');
        a.href=url; a.download='grader-settings-backup.json'; a.click(); URL.revokeObjectURL(url);
      };
      sep.appendChild(exportBtn);

      let importOpen=false;
      const importBtn=mkBtn('⬆ Import backup','background:#f5f5f5;color:#374151;font-weight:400;margin-top:4px;');
      const importTa=document.createElement('textarea'); importTa.placeholder='Paste exported JSON here…';
      importTa.style.cssText='display:none;width:100%;box-sizing:border-box;height:60px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:11px;resize:vertical;font-family:monospace;margin-top:4px;';
      const confirmBtn=mkBtn('✓ Confirm import (overwrites all)','display:none;background:#dc2626;color:#fff;font-weight:600;margin-top:4px;');
      confirmBtn.style.display='none';
      importBtn.onclick=()=>{
        importOpen=!importOpen;
        importTa.style.display=importOpen?'block':'none';
        confirmBtn.style.display=importOpen?'block':'none';
      };
      confirmBtn.onclick=()=>{
        try {
          const parsed=JSON.parse(importTa.value);
          GM_setValue('ce_grader_settings',parsed);
          loadAssignmentSettings();
          showNotice('Settings restored!');
          importOpen=false; importTa.style.display='none'; confirmBtn.style.display='none'; importTa.value='';
        } catch(_) { showNotice('Invalid JSON — check the file and try again'); }
      };
      sep.appendChild(importBtn); sep.appendChild(importTa); sep.appendChild(confirmBtn);
      w.appendChild(sep);
      return w;
    }

    // ── GRADE VIEW ─────────────────────────────────────────────────────────────
    function renderGrade() {
      const w = document.createElement('div'); w.style.cssText='display:flex;flex-direction:column;gap:6px;';
      const st = sg.settings;
      const hasCriteria = !!(st.rubricText || st.answerKey || st.customInstructions);
      const badge = document.createElement('div');
      badge.style.cssText = `font-size:11px;padding:5px 8px;border-radius:3px;margin-bottom:2px;${hasCriteria?'background:#e6f4ea;color:#127a1b;':'background:#fef9e7;color:#856404;'}`;
      badge.textContent = hasCriteria
        ? `${st.totalPoints} pts - ${st.gradingIntensity} - Rubric set`
        : `No rubric set - click settings to add grading criteria`;
      w.appendChild(badge);

      if (sg.result) { renderResult(w); return w; }

      if (sg.studentName) {
        const sn=document.createElement('div'); sn.style.cssText='font-weight:600;color:#2d3b45;font-size:13px;';
        sn.textContent=`Student: ${sg.studentName}`; w.appendChild(sn);
      }

      if (sg.subStatus==='loading') {
        const ld=document.createElement('div'); ld.style.cssText='font-size:12px;color:#9ca3af;'; ld.textContent='Loading submission...'; w.appendChild(ld); return w;
      }
      if (sg.subStatus==='nosubmission') {
        const nd=document.createElement('div'); nd.style.cssText='font-size:12px;color:#9ca3af;font-style:italic;'; nd.textContent='No submission yet.'; w.appendChild(nd); return w;
      }
      if (sg.subStatus==='error') {
        const ed=document.createElement('div'); ed.style.cssText='font-size:12px;color:#c0392b;margin-bottom:4px;'; ed.textContent=sg.subError; w.appendChild(ed);
      }
      if (sg.subStatus==='ready') {
        const words=sg.subText.split(/\s+/).filter(Boolean).length;
        const rd=document.createElement('div'); rd.style.cssText='font-size:12px;color:#127a1b;display:flex;align-items:center;justify-content:space-between;';
        const rdLbl=document.createElement('span'); rdLbl.textContent=sg.attachments.length ? `Submission file - ${sg.attachments.length} attachment${sg.attachments.length === 1 ? '' : 's'}` : `Submission - ${words} words`;
        const rdToggle=document.createElement('button'); rdToggle.type='button'; rdToggle.textContent='view';
        rdToggle.style.cssText='background:none;border:none;color:#127a1b;text-decoration:underline;font-size:11px;cursor:pointer;padding:0;font-family:inherit;';
        const rdPrev=document.createElement('textarea'); rdPrev.readOnly=true; rdPrev.value=sg.subText;
        rdPrev.style.cssText='display:none;width:100%;box-sizing:border-box;height:90px;font-size:10px;font-family:monospace;border:1px solid #c7cdd1;border-radius:3px;padding:4px 6px;resize:vertical;color:#374151;background:#f9fafb;margin-top:3px;';
        let subVis=false; rdToggle.onclick=()=>{ subVis=!subVis; rdPrev.style.display=subVis?'block':'none'; rdToggle.textContent=subVis?'hide':'view'; };
        rd.appendChild(rdLbl); rd.appendChild(rdToggle); w.appendChild(rd); w.appendChild(rdPrev);
        if (sg.attachments.length) {
          sg.attachments.forEach(att => {
            const fileBtn = mkBtn(`Download ${att.filename}`, 'background:#f5f5f5;color:#2d3b45;border:1px solid #c7cdd1;margin-top:3px;font-weight:500;');
            fileBtn.onclick = () => downloadAttachment(att);
            w.appendChild(fileBtn);
          });
        }
      }

      if (!sg.subText.trim()) {
        const lbl=document.createElement('div'); lbl.style.cssText='font-size:11px;color:#6b7280;margin-bottom:3px;'; lbl.textContent='Paste submission text:'; w.appendChild(lbl);
        const ta=document.createElement('textarea'); ta.placeholder='Paste student response here...';
        ta.style.cssText='width:100%;box-sizing:border-box;height:72px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;resize:vertical;font-family:inherit;';
        ta.oninput=()=>{ sg.subText=ta.value; }; w.appendChild(ta);
      }

      if (sg.subText.trim() || sg.subStatus==='error') {
        if (sg.streamStatus === 'idle') {
          const gradeBtn = mkBtn('✦ Grade with Claude', 'background:#0770B8;color:#fff;margin-top:4px;font-size:14px;padding:10px;');
          gradeBtn.onclick = () => gradeWithClaude();
          w.appendChild(gradeBtn);
        }

        if (sg.streamStatus !== 'idle') {
          const chatBox = document.createElement('div');
          chatBox.style.cssText = 'margin-top:8px;border:1px solid #bfdbfe;border-radius:6px;overflow:hidden;background:#fff;';

          const chatHdr = document.createElement('div');
          chatHdr.style.cssText = 'background:#dbeafe;padding:6px 10px;font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;justify-content:space-between;';
          const hdrLeft = document.createElement('span'); hdrLeft.textContent = 'Claude';
          chatHdr.appendChild(hdrLeft);
          if (sg.streamStatus === 'streaming' || sg.streamStatus === 'parsing') {
            const dot = document.createElement('span');
            dot.style.cssText = 'width:8px;height:8px;background:#1d4ed8;border-radius:50%;display:inline-block;animation:ce-pulse .9s ease-in-out infinite;flex-shrink:0;';
            chatHdr.appendChild(dot);
          }
          chatBox.appendChild(chatHdr);

          const chatBody = document.createElement('div');
          chatBody.style.cssText = 'padding:10px;font-size:12px;line-height:1.65;color:#374151;max-height:260px;overflow-y:auto;white-space:pre-wrap;font-family:inherit;';
          chatBody.textContent = sg.streamStatus === 'parsing'
            ? 'Reading submission file…'
            : (sg.streamText || 'Thinking…');
          chatBox.appendChild(chatBody);
          w.appendChild(chatBox);
          setTimeout(() => { chatBody.scrollTop = chatBody.scrollHeight; }, 0);

          if (sg.streamStatus === 'error') {
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'font-size:12px;color:#c0392b;margin-top:6px;';
            errDiv.textContent = sg.streamError || 'Something went wrong';
            w.appendChild(errDiv);
            const retryBtn = mkBtn('Retry', 'background:#f5f5f5;color:#2d3b45;border:1px solid #c7cdd1;margin-top:4px;');
            retryBtn.onclick = () => { sg.streamStatus = 'idle'; render(); };
            w.appendChild(retryBtn);
          }
        }
      }
      return w;
    }
    function renderResult(w) {
      const r = sg.result;

      if (sg.streamText) {
        const rawToggle = document.createElement('button'); rawToggle.type = 'button';
        rawToggle.style.cssText = 'background:none;border:none;color:#6b7280;font-size:11px;cursor:pointer;padding:0 0 6px 0;text-decoration:underline;font-family:inherit;display:block;';
        rawToggle.textContent = 'View full Claude response';
        let rawVisible = false;
        const rawDiv = document.createElement('div');
        rawDiv.style.cssText = 'display:none;font-size:11px;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:8px;max-height:120px;overflow-y:auto;white-space:pre-wrap;margin-bottom:8px;font-family:monospace;';
        rawDiv.textContent = sg.streamText;
        rawToggle.onclick = () => { rawVisible = !rawVisible; rawDiv.style.display = rawVisible ? 'block' : 'none'; rawToggle.textContent = rawVisible ? 'Hide Claude response' : 'View full Claude response'; };
        w.appendChild(rawToggle); w.appendChild(rawDiv);
      }

      const allLines = r.feedback.split('\n');
      const warnLines = allLines.filter(l => /^[-*]?\s*(TEACHER CHECK|WARN|WARNING|⚠)/i.test(l.trim()));
      const feedLines = allLines.filter(l => !/^[-*]?\s*(TEACHER CHECK|WARN|WARNING|⚠)/i.test(l.trim()) && l.trim()).join('\n');

      if (warnLines.length) {
        const warn = document.createElement('div');
        warn.style.cssText = 'background:#fef2f2;border:1px solid #fca5a5;border-radius:4px;padding:7px 10px;margin-bottom:8px;font-size:11px;color:#b91c1c;line-height:1.5;';
        warn.textContent = warnLines.map(l => l.replace(/^[-•*]\s*/, '').trim()).join('\n');
        w.appendChild(warn);
      }

      const scoreRow = document.createElement('div'); scoreRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;background:#f0f7ff;border-radius:4px;padding:7px 10px;';
      const scoreLabel = document.createElement('span'); scoreLabel.style.cssText='font-size:12px;font-weight:700;color:#0770B8;white-space:nowrap;'; scoreLabel.textContent='Score:'; scoreRow.appendChild(scoreLabel);
      const scoreInp = document.createElement('input'); scoreInp.type='number'; scoreInp.min='0'; scoreInp.max=String(r.total); scoreInp.step='0.5';
      scoreInp.value = r.score !== null ? String(r.score) : '';
      scoreInp.style.cssText='width:60px;padding:4px 6px;border:1px solid #bfdbfe;border-radius:3px;font-size:16px;font-weight:700;color:#0770B8;text-align:center;font-family:inherit;background:#fff;';
      scoreInp.oninput=()=>{ r.score=parseFloat(scoreInp.value)||0; };
      const scoreSep = document.createElement('span'); scoreSep.style.cssText='font-size:16px;font-weight:700;color:#0770B8;'; scoreSep.textContent=` / ${r.total}`;
      scoreRow.appendChild(scoreInp); scoreRow.appendChild(scoreSep); w.appendChild(scoreRow);

      const lbl=document.createElement('div'); lbl.style.cssText='font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;'; lbl.textContent='Student comment (editable)'; w.appendChild(lbl);
      const ta=document.createElement('textarea'); ta.value=feedLines;
      ta.style.cssText='width:100%;box-sizing:border-box;height:130px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;resize:vertical;font-family:inherit;line-height:1.6;';
      ta.oninput=()=>{ r._editedFeedback=ta.value; }; w.appendChild(ta);

      const copyCommentBtn = mkBtn('⎘ Copy Comment', 'background:#059669;color:#fff;font-size:14px;padding:10px;margin-top:6px;');
      copyCommentBtn.onclick = () => {
        const text = r._editedFeedback !== undefined ? r._editedFeedback : feedLines;
        navigator.clipboard.writeText(text).then(() => showNotice('Comment copied!'));
      };
      w.appendChild(copyCommentBtn);

      const ins=mkBtn('↵ Insert comment & grade','background:#0770B8;color:#fff;margin-top:4px;');
      ins.onclick=()=>{
        const commentText = r._editedFeedback !== undefined ? r._editedFeedback : feedLines;
        const box = document.querySelector(
          '#speed_grader_comment_textarea, #speedgrader_textarea, ' +
          'textarea[name="comment[text_comment]"], #grading_comment, ' +
          '#comment_textarea, .submission-comment-form textarea, ' +
          'textarea[aria-label*="comment" i], textarea[placeholder*="comment" i], ' +
          '.grading_comment textarea'
        );
        if (box) {
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          nativeSetter.call(box, commentText);
          box.dispatchEvent(new Event('input',{bubbles:true}));
          box.dispatchEvent(new Event('change',{bubbles:true}));
          box.focus();
        } else { navigator.clipboard.writeText(commentText).then(()=>{}); }
        const gradeInput = document.querySelector(
          '#student_grading_value, #grading-box-extended, ' +
          'input.grading-box-number, input[data-testid="student-grades-input"], ' +
          'input[aria-label="Grade"], input[aria-label="grade"], ' +
          '.react-grade-input input, #submission_details .grade input, ' +
          'input[placeholder="–"]'
        );
        if (gradeInput && r.score !== null) {
          gradeInput.value = String(r.score);
          gradeInput.dispatchEvent(new Event('input',{bubbles:true}));
          gradeInput.dispatchEvent(new Event('change',{bubbles:true}));
          gradeInput.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter'}));
          showNotice(box ? 'Comment & grade inserted!' : 'Grade inserted — comment copied to clipboard');
        } else {
          showNotice(box ? 'Comment inserted!' : 'Copied to clipboard');
        }
      };
      w.appendChild(ins);
      const again=mkBtn('Start over','background:#f5f5f5;color:#2d3b45;margin-top:4px;');
      again.style.border='1px solid #c7cdd1'; again.onclick=()=>{ sg.result=null; render(); }; w.appendChild(again);
    }

    // ── TOGGLE (floating mode) ─────────────────────────────────────────────────
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
        'background:#2d3b45', 'color:#fff', 'border:none', 'border-radius:4px',
        'cursor:pointer', 'z-index:99999',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'font-size:13px', 'font-weight:700',
        'display:flex', 'align-items:center', 'justify-content:center',
        'white-space:nowrap', 'box-sizing:border-box',
      ].join(';');
      return true;
    }

    function showToggle() {
      if (_msgBtnEl) positionToggle(); else toggleBtn.style.display = 'block';
    }

    function hideToggle() { toggleBtn.style.display = 'none'; }

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ce-ai-grader-toggle';
    toggleBtn.innerHTML = '<span style="font-size:16px;line-height:1;">✦</span><span>AI Prompt</span>';
    toggleBtn.style.cssText = 'position:fixed;top:118px;right:18px;z-index:99999;display:flex;align-items:center;gap:7px;min-width:112px;justify-content:center;padding:9px 13px;border:none;border-radius:8px;background:#2d3b45;color:#fff;font:600 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.22);cursor:pointer;white-space:nowrap;';
    toggleBtn.onclick=()=>{ sg.open=!sg.open; container.style.display=sg.open?'block':'none'; if(sg.open) hideToggle(); else showToggle(); if(sg.open&&sg.token&&sg.subStatus==='idle') fetchSubmission(); else render(); };

    // Toolbar button (ce-grader-btn in content.js) calls this when the toolbar is present
    window.__cesGraderToggle = () => {
      sg.open = !sg.open;
      container.style.display = sg.open ? 'block' : 'none';
      if (sg.floating && !document.getElementById('ce-toolbar')) toggleBtn.style.display = sg.open ? 'none' : 'block';
      if (sg.open && sg.token && sg.subStatus === 'idle') fetchSubmission(); else render();
    };

    // ── INJECT ─────────────────────────────────────────────────────────────────
    function findSidebar() {
      return (
        document.querySelector('#rightside_inner') ||
        document.querySelector('#right_side')       ||
        document.querySelector('#right-side')       ||
        document.querySelector('#grading_box_holder') ||
        document.querySelector('#speedgrader_sidebar') ||
        document.querySelector('#speedgrader_textarea')?.closest('#right_side,#rightside,#right-side,[id*="right"],form') ||
        document.querySelector('#speedgrader_textarea')?.parentElement
      );
    }

    function inject() {
      if (document.getElementById('ce-ai-grader')) return;
      loadAssignmentSettings();
      sg.floating=true;
      sg.open=false;
      container.style.cssText='display:none;position:fixed;right:0;top:52px;bottom:0;width:340px;z-index:99998;box-shadow:-4px 0 24px rgba(0,0,0,.3);background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;overflow-y:auto;';
      document.body.appendChild(container);
      if (!document.getElementById('ce-ai-grader-toggle')) document.body.appendChild(toggleBtn);
      render();
      // Overlay the Canvas "Message Student" button once it renders
      if (!_msgBtnEl) {
        let _tries = 0;
        const _poll = setInterval(() => { if (positionToggle() || ++_tries > 30) clearInterval(_poll); }, 300);
        window.addEventListener('resize', positionToggle);
      }
    }

    // ── NAVIGATION TRACKING ────────────────────────────────────────────────────
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
        sg.settings = sgLoadSettings(courseId, assignmentId);
      }
      sgLastStudentId = studentId;
      sg.result = null; sg.subText = ''; sg.subStatus = 'idle'; sg.studentName = ''; sg.attachments = []; sg.promptText = ''; sg.aiResponseText = '';
      if (sg.token && (!sg.floating || sg.open)) fetchSubmission(); else render();
    }

    const _origPushState    = history.pushState.bind(history);
    const _origReplaceState = history.replaceState.bind(history);
    history.pushState    = function(...a) { _origPushState(...a);    setTimeout(onNavChange, 100); };
    history.replaceState = function(...a) { _origReplaceState(...a); setTimeout(onNavChange, 100); };
    window.addEventListener('popstate',   () => setTimeout(onNavChange, 100));
    window.addEventListener('hashchange', () => setTimeout(onNavChange, 100));

    setInterval(onNavChange, 1200);

    const _sgNameEl = document.querySelector('#student_carousel_name, #students_selectmenu-button');
    if (_sgNameEl) new MutationObserver(()=>setTimeout(onNavChange,200)).observe(_sgNameEl,{childList:true,subtree:true,characterData:true});

    inject();
    new MutationObserver(() => { if (!document.getElementById('ce-ai-grader')) inject(); })
      .observe(document.body, { childList: true, subtree: true });
    let _sgPollCount = 0;
    const _sgPoll = setInterval(() => {
      if (document.getElementById('ce-ai-grader') || _sgPollCount++ > 30) { clearInterval(_sgPoll); return; }
      inject();
    }, 500);
  }

  showSpeedGraderPanel();
  } catch (err) {
    console.error('Canvas Enhancer error in grader script:', err);
  }
})();
