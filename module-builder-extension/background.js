// Canvas AI Module Builder — background service worker
// Proxies calls to Anthropic and Unsplash. Content scripts can't reliably make
// cross-origin fetches themselves under Manifest V3 (subject to the page's
// CSP/CORS) — the background service worker isn't, as long as the target
// origin is listed in host_permissions.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CMB_CLAUDE') {
    handleClaude(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'CMB_UNSPLASH_SEARCH') {
    handleUnsplashSearch(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'CMB_UNSPLASH_SEARCH_MULTI') {
    handleUnsplashSearchMulti(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'CMB_UNSPLASH_DOWNLOAD') {
    handleUnsplashDownload(msg.payload).then(sendResponse).catch(() => sendResponse({}));
    return true;
  }
  if (msg.type === 'CMB_YOUTUBE_SEARCH') {
    handleYoutubeSearch(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
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

async function handleUnsplashSearch({ unsplashKey, keyword }) {
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

async function handleUnsplashSearchMulti({ unsplashKey, keyword, count }) {
  const perPage = Math.min(Math.max(count || 9, 1), 30);
  const res = await fetch(`https://api.unsplash.com/search/photos?per_page=${perPage}&query=${encodeURIComponent(keyword)}`, {
    headers: { 'Authorization': `Client-ID ${unsplashKey}`, 'Accept-Version': 'v1' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.errors?.join(', ') || `HTTP ${res.status}`);
  return {
    results: (data.results || []).map(photo => ({
      url: photo.urls.regular,
      thumbUrl: photo.urls.thumb,
      name: photo.user.name,
      profile: `${photo.user.links.html}?utm_source=canvas_module_builder&utm_medium=referral`,
      downloadLocation: photo.links.download_location,
    })),
  };
}

async function handleUnsplashDownload({ unsplashKey, location }) {
  if (!location) return {};
  try { await fetch(location, { headers: { 'Authorization': `Client-ID ${unsplashKey}` } }); } catch { /* fire-and-forget */ }
  return {};
}

async function handleYoutubeSearch({ youtubeKey, query }) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=strict&maxResults=12&q=${encodeURIComponent(query)}&key=${youtubeKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json().catch(() => ({}));
  if (!searchRes.ok) throw new Error(searchData?.error?.message || `HTTP ${searchRes.status}`);
  const items = (searchData.items || []).filter(i => i.id && i.id.videoId);
  if (!items.length) return { results: [] };

  // Second call for durations — search.list doesn't include contentDetails.
  const ids = items.map(i => i.id.videoId).join(',');
  const durRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${youtubeKey}`);
  const durData = await durRes.json().catch(() => ({}));
  const durations = {};
  (durData.items || []).forEach(v => { durations[v.id] = v.contentDetails?.duration || ''; });

  return {
    results: items.map(i => ({
      videoId: i.id.videoId,
      title: i.snippet.title,
      channel: i.snippet.channelTitle,
      thumbnail: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url || '',
      publishedAt: i.snippet.publishedAt,
      duration: durations[i.id.videoId] || '',
    })),
  };
}
