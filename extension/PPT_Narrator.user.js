// ==UserScript==
// @name         PPT Narrator
// @namespace    https://github.com/MarkAlanBrest/career-toolkit
// @version      1.1.0
// @description  Turns each slide's speaker notes into a narration MP3, packaged as a zip for you to insert into each slide yourself in PowerPoint
// @match        https://career-toolkit-ruby.vercel.app/ppt-narrator*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @connect      api.openai.com
// @connect      api.anthropic.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (window.__PPT_NARRATOR__) return;
  window.__PPT_NARRATOR__ = true;

  const OPENAI_KEY_STORE = 'ppt_narrator_openai_key';
  const ANTHROPIC_KEY_STORE = 'ppt_narrator_anthropic_key';
  const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

  // ═══════════════════════════════════════════════════════════
  // GM_xmlhttpRequest PROMISE WRAPPER
  // ═══════════════════════════════════════════════════════════
  function gmRequest(opts) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: opts.url,
        headers: opts.headers || {},
        data: opts.data,
        responseType: opts.responseType || 'text',
        onload: (resp) => resolve(resp),
        onerror: () => reject(new Error('Network request failed: ' + opts.url)),
        ontimeout: () => reject(new Error('Request timed out: ' + opts.url)),
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PPTX HELPERS — reads speaker notes only. This deliberately does NOT modify the .pptx's
  // internal XML — an earlier version tried to embed audio directly with auto-play/auto-advance
  // timing, but that hand-crafted OOXML produced a file PowerPoint reported as damaged.
  // Generating audio only (see UI below) avoids that risk entirely.
  // ═══════════════════════════════════════════════════════════
  const REL_TYPE_NOTES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide';

  function decodeXmlEntities(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }

  async function readText(zip, path) {
    const file = zip.file(path);
    if (!file) return null;
    return file.async('string');
  }

  function listSlidePaths(zip) {
    const paths = [];
    zip.forEach((relPath) => {
      if (/^ppt\/slides\/slide\d+\.xml$/.test(relPath)) paths.push(relPath);
    });
    paths.sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml$/)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml$/)[1], 10);
      return na - nb;
    });
    return paths;
  }

  function slideNumberFromPath(slidePath) {
    return parseInt(slidePath.match(/slide(\d+)\.xml$/)[1], 10);
  }

  function relsPathFor(slidePath) {
    const parts = slidePath.split('/');
    const filename = parts.pop();
    return [...parts, '_rels', `${filename}.rels`].join('/');
  }

  async function getRelationships(zip, relsPath) {
    const xml = await readText(zip, relsPath);
    if (!xml) return [];
    const rels = [];
    const re = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/g;
    let m;
    while ((m = re.exec(xml))) rels.push({ id: m[1], type: m[2], target: m[3] });
    return rels;
  }

  function resolveRelTarget(slidePath, target) {
    const stack = slidePath.split('/').slice(0, -1);
    for (const part of target.split('/')) {
      if (part === '..') stack.pop();
      else if (part !== '.') stack.push(part);
    }
    return stack.join('/');
  }

  async function getSlideNotesText(zip, slidePath) {
    const rels = await getRelationships(zip, relsPathFor(slidePath));
    const notesRel = rels.find(r => r.type === REL_TYPE_NOTES);
    if (!notesRel) return '';
    const notesPath = resolveRelTarget(slidePath, notesRel.target);
    const xml = await readText(zip, notesPath);
    if (!xml) return '';
    const paragraphs = [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map(pMatch =>
      [...pMatch[1].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(t => decodeXmlEntities(t[1])).join('')
    );
    return paragraphs.filter(p => p.trim()).join('\n').trim();
  }

  // ═══════════════════════════════════════════════════════════
  // AI CALLS — direct from the browser via GM_xmlhttpRequest (bypasses CORS entirely, unlike
  // a plain page fetch()).
  // ═══════════════════════════════════════════════════════════
  async function polishNarration(rawNotes, apiKey) {
    if (!apiKey) return rawNotes;
    try {
      const resp = await gmRequest({
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        data: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: 'Rewrite these presentation speaker notes into natural, spoken narration for a slide, as if a presenter were reading them aloud. Keep the same information, facts, and order — do not add anything new, and do not add a greeting or sign-off. Return ONLY the narration text, no preamble, no quotes around it.\n\nSpeaker notes:\n' + rawNotes,
          }],
        }),
      });
      if (resp.status < 200 || resp.status >= 300) return rawNotes;
      const data = JSON.parse(resp.responseText);
      const text = data?.content?.[0]?.text;
      return typeof text === 'string' && text.trim() ? text.trim() : rawNotes;
    } catch {
      return rawNotes;
    }
  }

  async function generateTTS(text, voice, apiKey) {
    if (!apiKey) throw new Error('No OpenAI API key provided.');
    const resp = await gmRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/audio/speech',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      data: JSON.stringify({ model: 'tts-1', voice, input: text, response_format: 'mp3' }),
      responseType: 'arraybuffer',
    });
    if (resp.status < 200 || resp.status >= 300) {
      let msg = `OpenAI TTS failed (HTTP ${resp.status})`;
      try { msg += ': ' + JSON.parse(resp.responseText)?.error?.message; } catch {}
      throw new Error(msg);
    }
    return resp.response; // ArrayBuffer
  }

  // Native browser API — no library needed to measure MP3 duration.
  async function getAudioDurationSeconds(arrayBuffer) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      return audioBuffer.duration;
    } finally {
      ctx.close();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════
  const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  const navy = '#1E293B', blue = '#1E4D8C', border = '#E2E8F0', muted = '#64748B', green = '#15803D', red = '#DC2626';

  function el(tag, style, html) {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildUI() {
    document.title = 'PPT Narrator';
    document.body.innerHTML = '';
    document.body.style.cssText = `margin:0;background:#F8FAFC;font-family:${font};`;

    const topbar = el('div', `background:${navy};color:#fff;padding:0 24px;min-height:56px;display:flex;align-items:center;font-weight:700;font-size:15px;`, 'PPT Narrator <span style="font-weight:400;font-size:12px;color:#94A3B8;margin-left:10px;">— running as a Tampermonkey script, 100% local</span>');

    const card = el('div', `background:#fff;border-radius:12px;border:1px solid ${border};padding:20px;margin-bottom:16px;`);
    card.innerHTML = `
      <div style="font-weight:700;font-size:16px;color:${navy};margin-bottom:6px;">Turn speaker notes into narration</div>
      <div style="font-size:13px;color:${muted};line-height:1.5;margin-bottom:18px;">
        Choose a .pptx. Each slide's speaker notes are converted to a narration MP3, and all of them download together as one zip, named by slide number (<code>Slide 01.mp3</code>, <code>Slide 02.mp3</code>, ...). Insert each one into its matching slide yourself in PowerPoint (<strong>Insert &gt; Audio</strong>). Everything happens in this browser tab — nothing is uploaded anywhere except directly to OpenAI/Anthropic, and your original .pptx is never modified.
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">OpenAI API Key</label>
        <input id="pn-openai-key" type="password" placeholder="sk-..." style="width:100%;padding:9px 12px;border:1px solid ${border};border-radius:8px;font-size:13px;font-family:${font};color:${navy};outline:none;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Anthropic API Key <span style="text-transform:none;font-weight:400;">(for polishing notes into natural narration)</span></label>
        <input id="pn-anthropic-key" type="password" placeholder="sk-ant-..." style="width:100%;padding:9px 12px;border:1px solid ${border};border-radius:8px;font-size:13px;font-family:${font};color:${navy};outline:none;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">PowerPoint file</label>
        <input id="pn-file" type="file" accept=".pptx" style="font-size:13px;font-family:${font};">
        <div id="pn-file-info" style="font-size:12px;color:${muted};margin-top:6px;"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;">
        <div style="flex:1;min-width:160px;">
          <label style="display:block;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Voice</label>
          <select id="pn-voice" style="width:100%;padding:8px 10px;border:1px solid ${border};border-radius:8px;font-size:13px;font-family:${font};color:${navy};background:#fff;">
            ${VOICES.map(v => `<option value="${v}">${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:200px;display:flex;align-items:flex-end;">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:${navy};cursor:pointer;">
            <input id="pn-polish" type="checkbox" checked> Polish notes into natural spoken narration
          </label>
        </div>
      </div>
      <div id="pn-error" style="display:none;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:10px 12px;font-size:13px;color:${red};margin-bottom:14px;"></div>
      <button id="pn-generate" style="background:${blue};color:#fff;border:none;border-radius:999px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;">Generate Narration Audio</button>
      <div id="pn-stage" style="font-size:12px;color:${muted};margin-top:10px;"></div>
    `;

    const resultsCard = el('div', `background:#fff;border-radius:12px;border:1px solid ${border};padding:20px;display:none;`);
    resultsCard.id = 'pn-results-card';

    const container = el('div', 'max-width:640px;margin:32px auto;padding:0 16px 40px;');
    container.append(card, resultsCard);

    document.body.append(topbar, container);

    // Restore saved keys
    const openaiInput = document.getElementById('pn-openai-key');
    const anthropicInput = document.getElementById('pn-anthropic-key');
    openaiInput.value = GM_getValue(OPENAI_KEY_STORE, '');
    anthropicInput.value = GM_getValue(ANTHROPIC_KEY_STORE, '');
    openaiInput.addEventListener('change', () => GM_setValue(OPENAI_KEY_STORE, openaiInput.value.trim()));
    anthropicInput.addEventListener('change', () => GM_setValue(ANTHROPIC_KEY_STORE, anthropicInput.value.trim()));

    let selectedFile = null;
    document.getElementById('pn-file').addEventListener('change', (e) => {
      const f = e.target.files[0];
      const infoEl = document.getElementById('pn-file-info');
      if (!f) { selectedFile = null; infoEl.textContent = ''; return; }
      if (!/\.pptx$/i.test(f.name)) {
        showError('Please choose a .pptx file.');
        selectedFile = null; infoEl.textContent = '';
        return;
      }
      selectedFile = f;
      infoEl.textContent = `${f.name} — ${(f.size / 1024 / 1024).toFixed(1)} MB`;
      hideError();
    });

    function showError(msg) {
      const errEl = document.getElementById('pn-error');
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
    function hideError() {
      document.getElementById('pn-error').style.display = 'none';
    }
    function setStage(text) {
      document.getElementById('pn-stage').textContent = text;
    }
    function renderResults(results) {
      const rc = document.getElementById('pn-results-card');
      rc.style.display = 'block';
      rc.innerHTML = `<div style="font-weight:700;font-size:14px;color:${navy};margin-bottom:10px;">Per-slide results</div>`
        + `<div style="display:flex;flex-direction:column;gap:6px;">`
        + results.map(r => {
          const ok = r.status.startsWith('ready');
          const skipped = r.status.startsWith('skipped');
          const color = ok ? green : skipped ? muted : red;
          return `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:6px 0;border-bottom:1px solid ${border};">`
            + `<span style="color:${navy};font-weight:600;">Slide ${r.slide}</span><span style="color:${color};">${r.status}</span></div>`;
        }).join('')
        + `</div>`;
    }

    document.getElementById('pn-generate').addEventListener('click', async () => {
      hideError();
      document.getElementById('pn-results-card').style.display = 'none';
      const openaiKey = openaiInput.value.trim();
      const anthropicKey = anthropicInput.value.trim();
      const voice = document.getElementById('pn-voice').value;
      const polish = document.getElementById('pn-polish').checked;
      const btn = document.getElementById('pn-generate');

      if (!selectedFile) { showError('Choose a .pptx file first.'); return; }
      if (!openaiKey) { showError('Enter your OpenAI API key first.'); return; }
      if (polish && !anthropicKey) { showError('Enter your Anthropic API key, or uncheck "Polish notes."'); return; }

      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';

      try {
        setStage('Reading file…');
        const fileBuffer = await selectedFile.arrayBuffer();
        let zip;
        try {
          zip = await JSZip.loadAsync(fileBuffer);
        } catch {
          throw new Error('Could not read this file — is it a valid .pptx?');
        }

        const slidePaths = listSlidePaths(zip);
        if (!slidePaths.length) throw new Error('No slides found in this file.');

        const outZip = new JSZip();
        const results = [];
        let anyAudio = false;

        for (let i = 0; i < slidePaths.length; i++) {
          const slidePath = slidePaths[i];
          const slideNumber = slideNumberFromPath(slidePath);
          setStage(`Processing slide ${i + 1} of ${slidePaths.length}…`);
          const rawNotes = (await getSlideNotesText(zip, slidePath)).trim();
          if (!rawNotes) { results.push({ slide: slideNumber, status: 'skipped — no speaker notes' }); continue; }
          try {
            const narration = polish ? await polishNarration(rawNotes, anthropicKey) : rawNotes;
            const audioArrayBuffer = await generateTTS(narration, voice, openaiKey);
            const duration = await getAudioDurationSeconds(audioArrayBuffer).catch(() => null);
            const paddedNum = String(slideNumber).padStart(2, '0');
            outZip.file(`Slide ${paddedNum}.mp3`, audioArrayBuffer);
            anyAudio = true;
            results.push({ slide: slideNumber, status: duration ? `ready — ${duration.toFixed(1)}s` : 'ready' });
          } catch (err) {
            results.push({ slide: slideNumber, status: `failed — ${err.message}` });
          }
          renderResults(results);
        }

        if (!anyAudio) throw new Error('No narration audio was generated — none of the slides had speaker notes.');

        setStage('Building zip…');
        const outBlob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const url = URL.createObjectURL(outBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFile.name.replace(/\.pptx$/i, '') + '-narration-audio.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStage('Done — audio files downloaded as a zip. Insert each into its matching slide in PowerPoint (Insert > Audio).');
      } catch (err) {
        showError(err.message || 'Something went wrong.');
        setStage('');
      } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    });
  }

  buildUI();
})();
