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

async function getInstallId() {
  const stored = await chrome.storage.local.get('ce_install_id');
  if (stored.ce_install_id) return stored.ce_install_id;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ ce_install_id: id });
  return id;
}

// Returns the Canvas-based account ID (userId@domain) when available, falls back to device UUID.
// The Canvas ID is the same for a teacher on any device or browser session.
async function getAccountId() {
  const stored = await chrome.storage.local.get(['ce_canvas_account_id', 'ce_install_id']);
  if (stored.ce_canvas_account_id) return stored.ce_canvas_account_id;
  return getInstallId();
}

async function getAccountToken() {
  const stored = await chrome.storage.local.get('ce_account_token');
  if (stored.ce_account_token) return stored.ce_account_token;
  const token = crypto.randomUUID();
  await chrome.storage.local.set({ ce_account_token: token });
  return token;
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
      const [licenseKeys, accountId, accountToken] = await Promise.all([getLicenseKeys(), getAccountId(), getAccountToken()]);
      console.log('[CE-BG] STREAM_GENERATE received. model:', model, 'license present:', !!licenseKeys.length, 'msg count:', messages?.length);

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens, model, usageType: usageType || (model?.includes('haiku') ? 'teaching' : 'creation'), licenseKeys, accountId, accountToken }),
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
      const STREAM_TIMEOUT_MS = 30000;
      let timeoutId;
      const abortController = new AbortController();
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error('Generation timed out — the server took too long to respond. Please try again.'));
        }, STREAM_TIMEOUT_MS);
      });

      try {
      while (true) {
        const { done, value } = await Promise.race([
          reader.read(),
          timeoutPromise.then(() => { throw new Error('unreachable'); }),
        ]);
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
      } finally {
        clearTimeout(timeoutId);
        reader.cancel().catch(() => {});
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
  if (msg.type === 'AI_CREDIT_STATUS') {
    handleCreditStatus().then(sendResponse).catch(err => sendResponse({ error: err.message }));
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
  if (msg.type === 'UNINSTALL_SELF') {
    chrome.management.uninstallSelf({ showConfirmDialog: false });
    return false;
  }
  if (msg.type === 'SET_CANVAS_IDENTITY') {
    const { canvasUserId, canvasDomain } = msg.payload || {};
    if (canvasUserId && canvasDomain) {
      const canvasAccountId = `${canvasUserId}@${canvasDomain}`;
      chrome.storage.local.set({ ce_canvas_account_id: canvasAccountId });
    }
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'REFRESH_CONFIG') {
    chrome.storage.local.remove(CONFIG_CACHE_KEY, () => {
      fetchRemoteConfig().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    });
    return true;
  }
  if (msg.type === 'CMB_CLAUDE') {
    handleCmbClaude(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'CMB_UNSPLASH_SEARCH') {
    handleCmbUnsplashSearch(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'CMB_UNSPLASH_DOWNLOAD') {
    handleCmbUnsplashDownload(msg.payload).then(sendResponse).catch(() => sendResponse({}));
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

async function handleCreditStatus() {
  const [accountId, accountToken] = await Promise.all([getAccountId(), getAccountToken()]);
  const res = await fetch(`${API_BASE}/api/credits/status?accountId=${encodeURIComponent(accountId)}&accountToken=${encodeURIComponent(accountToken)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Could not load AI credits.');
  return { ...data, accountToken };
}


async function handleGenerate(payload) {
  const { messages, max_tokens, model, usageType } = payload;
  const [licenseKeys, accountId, accountToken] = await Promise.all([getLicenseKeys(), getAccountId(), getAccountToken()]);

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens, model, usageType: usageType || (model?.includes('haiku') ? 'teaching' : 'creation'), licenseKeys, accountId, accountToken }),
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
    try { data = JSON.parse(text); } catch { throw new Error(`Could not reach the file URL — the extension may need additional host permissions for this domain (or the server returned an unexpected response: ${res.status})`); }
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
  try { data = JSON.parse(text); } catch { throw new Error(`Could not reach the file URL — the extension may need additional host permissions for this domain (or the server returned an unexpected response: ${res.status})`); }
  if (!res.ok) throw new Error(data?.error || `Parse error ${res.status}`);
  return data;
}

// ── AI MODULE BUILDER (bring-your-own Claude/Unsplash key) ────────────────
// Content scripts can't reliably make cross-origin fetches themselves under
// Manifest V3 (subject to the page's CSP/CORS) — proxy through here instead,
// same as the other API calls above.
async function handleCmbClaude({ apiKey, model, max_tokens, messages }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens, messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return { text: data?.content?.[0]?.text || '' };
}

async function handleCmbUnsplashSearch({ unsplashKey, keyword }) {
  const res = await fetch(`https://api.unsplash.com/search/photos?per_page=1&query=${encodeURIComponent(keyword)}`, {
    headers: { 'Authorization': `Client-ID ${unsplashKey}`, 'Accept-Version': 'v1' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.errors?.join(', ') || `HTTP ${res.status}`);
  const photo = data.results && data.results[0];
  if (!photo) throw new Error(`No results for "${keyword}"`);
  return {
    url: photo.urls.regular,
    name: photo.user.name,
    profile: `${photo.user.links.html}?utm_source=canvas_module_builder&utm_medium=referral`,
    downloadLocation: photo.links.download_location,
  };
}

async function handleCmbUnsplashDownload({ unsplashKey, location }) {
  if (!location) return {};
  try { await fetch(location, { headers: { 'Authorization': `Client-ID ${unsplashKey}` } }); } catch { /* fire-and-forget */ }
  return {};
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
