// Canvas Enhancer — background service worker
// Handles cross-origin requests that content scripts cannot make directly.

const API_BASE = 'https://career-toolkit-ruby.vercel.app';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GENERATE') {
    handleGenerate(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true; // keep message channel open for async response
  }
  if (msg.type === 'CANVAS_API') {
    handleCanvasApi(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'PARSE_FILE') {
    handleParseFile(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleGenerate(payload) {
  const { messages, max_tokens, model } = payload;

  const stored = await chrome.storage.local.get('ce_license_key');
  const licenseKey = stored.ce_license_key || '';

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens, model, licenseKey }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}

async function handleCanvasApi({ url, token }) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas API error ${res.status}`);
  }
  return data;
}

async function handleParseFile({ b64, fileUrl, token, filename, mimeType }) {
  let base64 = b64;

  // If given a Canvas file URL + token, fetch the file here (token stays in browser)
  if (!base64 && fileUrl && token) {
    const fileRes = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!fileRes.ok) throw new Error(`Could not fetch file: HTTP ${fileRes.status}`);
    const buffer = await fileRes.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    base64 = btoa(bin);
  }

  const res = await fetch(`${API_BASE}/api/parse-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ b64: base64, filename, mimeType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Parse error ${res.status}`);
  return data;
}
