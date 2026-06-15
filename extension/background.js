// Canvas Enhancer — background service worker
// Handles cross-origin requests that content scripts cannot make directly.

const API_BASE = 'https://career-toolkit-ruby.vercel.app';

// Keep service worker alive during long AI requests
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'ce-keepalive') port.onDisconnect.addListener(() => {});
  if (port.name === 'ce-stream') handleStreamPort(port);
});

async function handleStreamPort(port) {
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'STREAM_GENERATE') return;
    try {
      const { messages, max_tokens, model } = msg.payload;
      const stored = await chrome.storage.local.get('ce_license_key');
      const licenseKey = stored.ce_license_key || '';
      console.log('[CE-BG] STREAM_GENERATE received. model:', model, 'licenseKey present:', !!licenseKey, 'msg count:', messages?.length);

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens, model, licenseKey }),
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
  if (msg.type === 'CANVAS_API') {
    handleCanvasApi(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'PARSE_FILE') {
    handleParseFile(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'OPEN_CLAUDE_SPLIT') {
    handleOpenClaudeSplit(msg.payload, sender).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleOpenClaudeSplit({ url, screenWidth, screenHeight, screenTop, screenLeft }, sender) {
  const sl = screenLeft || 0;
  const st = screenTop  || 0;

  // AI chat gets a fixed 420px, Canvas gets everything else
  const aiW     = 420;
  const canvasW = screenWidth - aiW;

  // Resize the Canvas window to the left side
  const canvasWindowId = sender?.tab?.windowId;
  if (canvasWindowId) {
    await chrome.windows.update(canvasWindowId, {
      state:  'normal',
      left:   sl,
      top:    st,
      width:  canvasW,
      height: screenHeight,
    });
  }

  // Open AI chat on the right side
  await chrome.windows.create({
    url:    url || 'https://claude.ai/new',
    left:   sl + canvasW,
    top:    st,
    width:  aiW,
    height: screenHeight,
    type:   'normal',
  });
}

async function handleGenerate(payload) {
  const { messages, max_tokens, model } = payload;

  const stored = await chrome.storage.local.get('ce_license_key');
  const licenseKey = stored.ce_license_key || '';

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens, model, licenseKey }),
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas API error ${res.status}`);
  }
  return data;
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
