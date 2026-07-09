(function () {
  'use strict';

  const STORAGE_KEY = 'ce_canvas_token';
  const controls = new Set();
  const indicators = new Set();

  function styles() {
    if (document.getElementById('ce-canvas-token-styles')) return;
    const style = document.createElement('style');
    style.id = 'ce-canvas-token-styles';
    style.textContent = `
      .ce-token-card{font-family:-apple-system,BlinkMacSystemFont,"Lato","Segoe UI",sans-serif;border:1px solid #C7CDD1;border-radius:8px;background:#fff;padding:14px;color:#2D3B45}
      .ce-token-card *{box-sizing:border-box}.ce-token-title{font-size:14px;font-weight:700;margin:0 0 4px}.ce-token-copy{font-size:12px;line-height:1.55;color:#4B5563;margin:0 0 10px}
      .ce-token-alert{display:none;padding:9px 10px;margin:0 0 10px;border:1px solid #FCA5A5;border-radius:6px;background:#FEF2F2;color:#991B1B;font-size:12px;font-weight:650;line-height:1.45}
      .ce-token-card.ce-token-missing .ce-token-alert{display:block}.ce-token-label{display:block;font-size:12px;font-weight:700;margin-bottom:4px}
      .ce-token-needed{position:relative!important}.ce-token-needed::after{content:"";position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:#EF4444;border:2px solid #fff;box-shadow:0 0 0 1px rgba(127,29,29,.25)}
      .ce-token-input-row{display:flex;gap:6px}.ce-token-input{min-width:0;flex:1;height:36px;padding:7px 10px;border:1px solid #C7CDD1;border-radius:4px;background:#fff;color:#2D3B45;font:13px inherit}
      .ce-token-input:focus{outline:0;border-color:#0770B8;box-shadow:0 0 0 2px rgba(7,112,184,.12)}.ce-token-show,.ce-token-save{height:36px;padding:0 11px;border-radius:4px;font:700 12px inherit;cursor:pointer}
      .ce-token-show{border:1px solid #C7CDD1;background:#F5F5F5;color:#2D3B45}.ce-token-save{border:1px solid #0770B8;background:#0770B8;color:#fff}.ce-token-status{min-height:17px;margin-top:6px;color:#127A1B;font-size:12px;font-weight:650}
      .ce-token-help{border:none;background:none;color:#0770B8;font:700 11px inherit;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function readToken() {
    return new Promise(resolve => chrome.storage.local.get(STORAGE_KEY, result => resolve(result[STORAGE_KEY] || '')));
  }

  function updateControl(control, token, preserveFocusedInput) {
    const missing = !token;
    control.element.classList.toggle('ce-token-missing', missing);
    if (control.alert) control.alert.textContent = missing
      ? 'Canvas API token not set. Canvas Enhancer tools that read or update course data may not work until you add it.'
      : '';
    if (control.input && (!preserveFocusedInput || document.activeElement !== control.input)) control.input.value = token;
  }

  function refreshAll(token) {
    controls.forEach(control => updateControl(control, token, true));
    indicators.forEach(element => {
      element.classList.toggle('ce-token-needed', !token);
      element.title = !token ? 'Canvas API token not set — open Settings to add it' : (element.dataset.ceTokenTitle || element.title);
    });
    document.dispatchEvent(new CustomEvent('ce-canvas-token-status', { detail: { configured: Boolean(token) } }));
  }

  function mk(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  function createControl(options = {}) {
    styles();
    const element = mk('section', 'ce-token-card');
    if (options.compact) element.classList.add('ce-token-compact');

    // ── CONFIGURED VIEW ────────────────────────────────────────────────────────
    const configuredView = mk('div', '', { style: 'display:none;' });

    const configStatusRow = mk('div', '', { style: 'display:flex;align-items:center;justify-content:space-between;' });
    const configStatusText = mk('div', '', { style: 'font-size:13px;font-weight:700;' });
    const editBtn = mk('button', 'ce-token-help', { type: 'button' }); editBtn.textContent = 'Edit';
    configStatusRow.append(configStatusText, editBtn);

    const configInfo = mk('div', '', { style: 'font-size:12px;color:#4B5563;margin-top:4px;' });
    configuredView.append(configStatusRow, configInfo);

    // ── SETUP FORM ─────────────────────────────────────────────────────────────
    const setupForm = mk('div', '');

    const titleEl = mk('div', 'ce-token-title'); titleEl.textContent = 'Canvas API Token';
    const copyEl  = mk('p',   'ce-token-copy');  copyEl.textContent  = 'One shared token is used by every Canvas Enhancer toolbar. Save it here once and it appears in all other settings screens.';
    const alertEl = mk('div', 'ce-token-alert'); alertEl.setAttribute('role', 'alert');

    const tokenLabelRow = mk('div', '', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;' });
    const tokenLabel = mk('label', 'ce-token-label', { style: 'margin:0;' }); tokenLabel.textContent = 'Access token';
    const helpBtn = mk('button', 'ce-token-help', { type: 'button' }); helpBtn.textContent = '? Help';
    tokenLabelRow.append(tokenLabel, helpBtn);

    const tokenRow = mk('div', 'ce-token-input-row');
    const tokenInput = mk('input', 'ce-token-input', { type: 'password', autocomplete: 'off', placeholder: 'Paste your Canvas access token', ariaLabel: 'Canvas API access token' });
    const showBtn = mk('button', 'ce-token-show', { type: 'button' }); showBtn.textContent = 'Show';
    tokenRow.append(tokenInput, showBtn);

    const nameLabel = mk('label', 'ce-token-label', { style: 'margin-top:10px;' }); nameLabel.textContent = 'Full name';
    const nameRow = mk('div', 'ce-token-input-row');
    const nameInput = mk('input', 'ce-token-input', { type: 'text', autocomplete: 'off', placeholder: 'e.g. Jane Smith', ariaLabel: 'Full name' });
    nameInput.value = options.name || '';
    nameRow.append(nameInput);

    const emailLabel = mk('label', 'ce-token-label', { style: 'margin-top:10px;' }); emailLabel.textContent = 'School email';
    const emailRow = mk('div', 'ce-token-input-row');
    const emailInput = mk('input', 'ce-token-input', { type: 'email', autocomplete: 'off', placeholder: 'jane@school.edu', ariaLabel: 'School email' });
    emailInput.value = options.email || '';
    emailRow.append(emailInput);

    const setupBtn = mk('button', 'ce-token-save', { type: 'button', style: 'margin-top:10px;width:100%;' }); setupBtn.textContent = 'Setup';
    const statusEl = mk('div', 'ce-token-status'); statusEl.setAttribute('aria-live', 'polite');

    setupForm.append(titleEl, copyEl, alertEl, tokenLabelRow, tokenRow, nameLabel, nameRow, emailLabel, emailRow, setupBtn, statusEl);
    element.append(configuredView, setupForm);

    const control = { element, input: tokenInput, nameInput, emailInput, alert: alertEl, status: statusEl };
    controls.add(control);

    function showConfigured() {
      const invalid = options.tokenValid === false;
      configStatusText.style.color = invalid ? '#B91C1C' : '#127A1B';
      configStatusText.textContent  = invalid ? '⚠ Token invalid or expired' : '✓ Token connected';
      const parts = [options.name || nameInput.value, options.email || emailInput.value].filter(Boolean);
      configInfo.textContent = parts.join(' · ');
      configuredView.style.display = '';
      setupForm.style.display = 'none';
      element.classList.remove('ce-token-missing');
    }

    function showSetup() {
      configuredView.style.display = 'none';
      setupForm.style.display = '';
      if (options.tokenValid === false) {
        alertEl.textContent = 'Your Canvas token is invalid or expired. Paste a new one below.';
        element.classList.add('ce-token-missing');
      }
    }

    helpBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('ce-open-help', { detail: 'settings' }));
    });

    editBtn.addEventListener('click', showSetup);

    showBtn.addEventListener('click', () => {
      const showing = tokenInput.type === 'text';
      tokenInput.type = showing ? 'password' : 'text';
      showBtn.textContent = showing ? 'Show' : 'Hide';
    });

    setupBtn.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      const name  = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      if (!token) { statusEl.style.color = '#991B1B'; statusEl.textContent = 'Paste your Canvas access token first.'; return; }
      if (!name)  { statusEl.style.color = '#991B1B'; statusEl.textContent = 'Enter your full name.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { statusEl.style.color = '#991B1B'; statusEl.textContent = 'Enter a valid school email address.'; return; }
      setupBtn.disabled = true;
      statusEl.style.color = '#6B7280';
      statusEl.textContent = 'Saving…';
      await new Promise(resolve => chrome.storage.local.set({ [STORAGE_KEY]: token }, resolve));
      refreshAll(token);
      try {
        if (typeof options.onSetup === 'function') await options.onSetup(token, name, email);
        options.tokenValid = true;
        options.name  = name;
        options.email = email;
        showConfigured();
      } catch (err) {
        statusEl.style.color = '#991B1B';
        statusEl.textContent = err?.message || 'Token saved, but registration failed.';
        setupBtn.disabled = false;
        setTimeout(() => { statusEl.textContent = ''; }, 5000);
        return;
      }
      setupBtn.disabled = false;
    });

    readToken().then(token => {
      const isConfigured = !!token && !!options.email && options.tokenValid !== false;
      if (isConfigured) {
        showConfigured();
      } else {
        updateControl(control, token, false);
        if (options.tokenValid === false) showSetup();
      }
    });

    return element;
  }

  function bindIndicator(element) {
    if (!element) return;
    styles();
    element.dataset.ceTokenTitle = element.title || 'Settings';
    indicators.add(element);
    readToken().then(token => refreshAll(token));
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) refreshAll(changes[STORAGE_KEY].newValue || '');
  });

  globalThis.CECanvasToken = { STORAGE_KEY, createControl, readToken, bindIndicator };
})();
