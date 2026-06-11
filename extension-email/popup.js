(async function () {
  const btn    = document.getElementById('open-btn');
  const status = document.getElementById('status');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isCanvas = tab?.url && /\.(instructure|canvas|canvaslms)\.com/.test(tab.url);

  if (!isCanvas) {
    btn.disabled = true;
    btn.textContent = 'Open on Canvas Page';
    status.textContent = 'Navigate to Canvas first, then click the button again.';
    status.classList.add('error');
    return;
  }

  status.textContent = 'Ready — click to open on the current Canvas page.';

  btn.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { type: 'CES_OPEN' }, response => {
      if (chrome.runtime.lastError) {
        // Content script not yet loaded — inject it
        status.textContent = 'Loading… try clicking again in a moment.';
      }
    });
    window.close();
  });
})();
