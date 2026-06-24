// Canvas Enhancer — background service worker
// Handles cross-origin requests that content scripts cannot make directly.

const API_BASE = 'https://career-toolkit-ruby.vercel.app';

// True when loaded as an unpacked extension (no update_url = not from Web Store)
const DEV_MODE = !chrome.runtime.getManifest().update_url;

async function getLicenseKeys() {
  const stored = await chrome.storage.local.get(['ce_license_keys', 'ce_license_key']);
  if (Array.isArray(stored.ce_license_keys) && stored.ce_license_keys.length) return stored.ce_license_keys;
  return String(stored.ce_license_key || '').split(/[\n,]+/).map(key => key.trim()).filter(Boolean);
}

// ── REMOTE CONFIG ─────────────────────────────────────────────────────────────
const CONFIG_URL      = 'https://canvasenhancer.com/extension-config.json';
const CONFIG_CACHE_KEY = 'ce_remote_config';
const CONFIG_TTL_MS   = 6 * 60 * 60 * 1000; // re-fetch every 6 hours

async function fetchRemoteConfig() {
  try {
    const stored = await chrome.storage.local.get(CONFIG_CACHE_KEY);
    const cached = stored[CONFIG_CACHE_KEY];
    if (cached?.fetchedAt && (Date.now() - cached.fetchedAt) < CONFIG_TTL_MS) return;
    const res = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const config = await res.json();
    await chrome.storage.local.set({ [CONFIG_CACHE_KEY]: { ...config, fetchedAt: Date.now() } });
    console.log('[CE] Remote config refreshed, version:', config.version);
  } catch { /* network unavailable — content scripts fall back to built-in defaults */ }
}

chrome.runtime.onInstalled.addListener(fetchRemoteConfig);
chrome.runtime.onStartup.addListener(fetchRemoteConfig);

// Keep service worker alive during long AI requests
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'ce-keepalive') port.onDisconnect.addListener(() => {});
  if (port.name === 'ce-stream') handleStreamPort(port);
});

async function handleStreamPort(port) {
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'STREAM_GENERATE') return;
    try {
      const { messages, max_tokens, model, usageType } = msg.payload;
      const licenseKeys = await getLicenseKeys();
      console.log('[CE-BG] STREAM_GENERATE received. model:', model, 'license present:', !!licenseKeys.length, 'msg count:', messages?.length);

      if (DEV_MODE) {
        port.postMessage({ type: 'chunk', text: '<div style="padding:24px;font-family:Arial,sans-serif;background:#f0f7ff;border:2px dashed #0770B8;border-radius:8px;"><h2 style="color:#0770B8;margin:0 0 10px;">Dev Mode — Placeholder Output</h2><p style="color:#374151;margin:0;">Running as unpacked extension. AI generation is bypassed in dev mode — deploy to production or install from the store to use live AI.</p></div>' });
        port.postMessage({ type: 'done' });
        return;
      }

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens, model, usageType: usageType || (model?.includes('haiku') ? 'teaching' : 'creation'), licenseKeys }),
      });

      console.log('[CE-BG] fetch response status:', res.status, res.ok ? 'OK' : 'FAILED');
      if (!res.ok) {
        let errData; try { errData = await res.json(); } catch { errData = {}; }
        console.error('[CE-BG] API error:', errData);
        port.postMessage({ type: 'error', error: errData?.error || `HTTP ${res.status}` });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawBody = '';
      let gotChunks = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const decoded = decoder.decode(value, { stream: true });
        rawBody += decoded;
        buffer += decoded;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              port.postMessage({ type: 'chunk', text: evt.delta.text });
              gotChunks = true;
            }
          } catch { }
        }
      }

      // Fallback: if no SSE chunks arrived the endpoint returned plain JSON
      if (!gotChunks) {
        try {
          const data = JSON.parse(rawBody.trim());
          const text = data?.content?.[0]?.text || '';
          console.log('[CE-BG] JSON fallback, text length:', text.length);
          if (text) port.postMessage({ type: 'chunk', text });
        } catch(e) {
          console.warn('[CE-BG] JSON fallback parse failed:', e.message, 'rawBody[:200]:', rawBody.slice(0,200));
        }
      }

      port.postMessage({ type: 'done' });
    } catch(e) {
      try { port.postMessage({ type: 'error', error: e.message }); } catch { }
    }
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GENERATE') {
    handleGenerate(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'LICENSE_STATUS') {
    handleLicenseStatus(msg.payload).then(sendResponse).catch(err => sendResponse({ valid: false, error: err.message }));
    return true;
  }
  if (msg.type === 'CREATE_CREDIT_CHECKOUT') {
    handleCreditCheckout(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'CANVAS_API') {
    handleCanvasApi(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'PARSE_FILE') {
    handleParseFile(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'WEB_SEARCH') {
    handleWebSearch(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'OPEN_CLAUDE_SPLIT') {
    handleOpenClaudeSplit(msg.payload, sender).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'UNINSTALL_SELF') {
    chrome.management.uninstallSelf({ showConfirmDialog: false });
    return false;
  }
  if (msg.type === 'REFRESH_CONFIG') {
    chrome.storage.local.remove(CONFIG_CACHE_KEY, () => {
      fetchRemoteConfig().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    });
    return true;
  }
});

async function handleLicenseStatus({ licenseKeys, licenseKey, force } = {}) {
  if (DEV_MODE) {
    return { valid: true, dev: true, packages: { creation_tools: { valid: true }, quiz_tools: { valid: true }, grader: { valid: true }, scheduler: { valid: true } } };
  }
  const keys = licenseKeys || (licenseKey ? [licenseKey] : await getLicenseKeys());
  const res = await fetch(`${API_BASE}/api/validate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys, force: force === true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function handleCreditCheckout({ pack, licenseKeys }) {
  const res = await fetch(`${API_BASE}/api/credits/checkout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKeys: licenseKeys || await getLicenseKeys(), pack }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data?.error || 'Could not open checkout.');
  await chrome.tabs.create({ url: data.url });
  return { ok: true };
}

async function handleOpenClaudeSplit({ url, screenWidth, screenHeight, screenTop, screenLeft }, sender) {
  const sl  = screenLeft || 0;
  const st  = screenTop  || 0;
  const aiW = 460;
  const edgeGap = 32;

  // Open AI chat as a narrow companion window on the right.
  await chrome.windows.create({
    url:    url || 'https://claude.ai/new',
    left:   sl + screenWidth - aiW - edgeGap,
    top:    st + 8,
    width:  aiW,
    height: screenHeight - 16,
    type:   'normal',
  });
}

async function handleGenerate(payload) {
  const { messages, max_tokens, model, usageType } = payload;
  const licenseKeys = await getLicenseKeys();

  if (DEV_MODE) {
    return { content: [{ text: '<div style="padding:24px;font-family:Arial,sans-serif;background:#f0f7ff;border:2px dashed #0770B8;border-radius:8px;"><h2 style="color:#0770B8;margin:0 0 10px;">Dev Mode — Placeholder Output</h2><p style="color:#374151;margin:0 0 8px;">Running as unpacked extension. AI generation is bypassed in dev mode — deploy to production or install from the store to use live AI.</p><p style="color:#6b7280;font-size:13px;margin:0;">Content would appear here in production.</p></div>' }] };
  }

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens, model, usageType: usageType || (model?.includes('haiku') ? 'teaching' : 'creation'), licenseKeys }),
  });

  if (!res.ok) {
    let errData;
    try { errData = await res.json(); } catch { errData = {}; }
    throw new Error(errData?.error || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let rawBody = '';
  let fullText = '';
  let gotChunks = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const decoded = decoder.decode(value, { stream: true });
    rawBody += decoded;
    buffer  += decoded;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const evt = JSON.parse(raw);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          fullText += evt.delta.text;
          gotChunks = true;
        }
      } catch { }
    }
  }

  // Fallback: endpoint returned plain JSON instead of SSE
  if (!gotChunks) {
    try {
      const data = JSON.parse(rawBody.trim());
      fullText = data?.content?.[0]?.text || '';
    } catch { }
  }

  return { content: [{ type: 'text', text: fullText }] };
}

async function handleCanvasApi({ url, token, method, body }) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method:  method || 'GET',
    headers,
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let errMsg = `Canvas API error ${res.status}`;
    try { const d = await res.json(); errMsg = d?.errors?.[0]?.message || d?.message || errMsg; } catch(_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

async function handleParseFile({ b64, fileUrl, token, filename, mimeType }) {
  if (!b64 && fileUrl) {
    // Send the URL to Vercel and let it fetch the file server-side.
    // Canvas download URLs include a verifier token so Vercel can fetch without auth.
    // This avoids sending a large base64 body from the extension → no 413.
    let res = await fetch(`${API_BASE}/api/parse-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, token, filename, mimeType }),
    });

    // Vercel returned 400 = old deployment that doesn't support fileUrl yet.
    // Fall back: fetch the file here in the extension and send as base64.
    // Canvas URLs with verifier tokens can be fetched without auth; if Canvas
    // redirects to S3 we need https://*.amazonaws.com/* in host_permissions
    // (added to manifest.json — reload the extension if you haven't already).
    if (res.status === 400) {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const fileRes = await fetch(fileUrl, { headers, redirect: 'follow' });
        if (!fileRes.ok) throw new Error(`Could not fetch file: HTTP ${fileRes.status}`);
        const buf = await fileRes.arrayBuffer();
        if (buf.byteLength > 3.5 * 1024 * 1024) {
          throw new Error(`File too large (${Math.round(buf.byteLength / 1024 / 1024)} MB) — deploy the latest Vercel update to grade files this size`);
        }
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const fallbackB64 = btoa(bin);
        res = await fetch(`${API_BASE}/api/parse-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ b64: fallbackB64, filename, mimeType }),
        });
      } catch (e) {
        if (e.message.includes('too large') || e.message.includes('Could not fetch')) throw e;
        // fetch itself threw (e.g. permission denied) — surface original 400
      }
    }

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Server error ${res.status} — make sure the latest version is deployed to Vercel`); }
    if (!res.ok) throw new Error(data?.error || `Parse error ${res.status}`);
    return data;
  }

  // b64 provided directly
  const res = await fetch(`${API_BASE}/api/parse-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ b64, filename, mimeType }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Server error ${res.status} — make sure the latest version is deployed to Vercel`); }
  if (!res.ok) throw new Error(data?.error || `Parse error ${res.status}`);
  return data;
}

async function handleWebSearch({ queries }) {
  const res = await fetch(`${API_BASE}/api/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });
  if (res.status === 404) {
    throw new Error('Web search is not deployed yet. Deploy the latest Vercel site, then add a search API key.');
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Search server error ${res.status}`); }
  if (!res.ok) throw new Error(data?.error || `Search error ${res.status}`);
  return data;
}
