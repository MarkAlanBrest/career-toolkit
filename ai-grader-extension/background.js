// AI Grader for Canvas — background service worker
// Proxies calls to Anthropic. Content scripts can't reliably make
// cross-origin fetches themselves under Manifest V3 (subject to the page's
// CSP/CORS) — the background service worker isn't, as long as the target
// origin is listed in host_permissions.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CMB_CLAUDE') {
    handleClaude(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleClaude({ apiKey, model, max_tokens, messages }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens, messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return { text: data?.content?.[0]?.text || '' };
}
