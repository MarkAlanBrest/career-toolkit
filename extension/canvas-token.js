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
      .ce-token-steps{margin:10px 0 0;padding:10px 12px 10px 28px;border-radius:6px;background:#EFF6FF;color:#1E3A5F;font-size:12px;line-height:1.55}.ce-token-steps li{margin:2px 0}.ce-token-privacy{margin-top:8px;font-size:11px;line-height:1.45;color:#6B7280}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function readToken() {
    return new Promise(resolve => chrome.storage.local.get(STORAGE_KEY, result => resolve(result[STORAGE_KEY] || '')));
  }

  function updateControl(control, token, preserveFocusedInput) {
    const missing = !token;
    control.element.classList.toggle('ce-token-missing', missing);
    control.alert.textContent = missing
      ? 'Canvas API token not set. Canvas Enhancer tools that read or update course data may not work until you add it.'
      : '';
    if (!preserveFocusedInput || document.activeElement !== control.input) control.input.value = token;
  }

  function refreshAll(token) {
    controls.forEach(control => updateControl(control, token, true));
    indicators.forEach(element => {
      element.classList.toggle('ce-token-needed', !token);
      element.title = !token ? 'Canvas API token not set — open Settings to add it' : (element.dataset.ceTokenTitle || element.title);
    });
    document.dispatchEvent(new CustomEvent('ce-canvas-token-status', { detail: { configured: Boolean(token) } }));
  }

  function createControl(options = {}) {
    styles();
    const element = document.createElement('section');
    element.className = 'ce-token-card ce-token-missing';
    element.innerHTML = `
      <div class="ce-token-title">Canvas API Token</div>
      <p class="ce-token-copy">One shared token is used by every Canvas Enhancer toolbar. Save it here once and it appears in all other settings screens.</p>
      <div class="ce-token-alert" role="alert"></div>
      <label class="ce-token-label">Access token</label>
      <div class="ce-token-input-row">
        <input class="ce-token-input" type="password" autocomplete="off" placeholder="Paste your Canvas access token" aria-label="Canvas API access token">
        <button class="ce-token-show" type="button">Show</button>
      </div>
      <label class="ce-token-label" style="margin-top:10px;">School email</label>
      <div class="ce-token-input-row">
        <input class="ce-token-input ce-token-email" type="email" autocomplete="off" placeholder="jane@school.edu" aria-label="School email">
      </div>
      <button class="ce-token-save" type="button" style="margin-top:10px;width:100%;">Setup</button>
      <div class="ce-token-status" aria-live="polite"></div>
      <ol class="ce-token-steps">
        <li>In Canvas, select <strong>Account</strong> in the global navigation, then <strong>Settings</strong>.</li>
        <li>Scroll to <strong>Approved Integrations</strong> and select <strong>+ New Access Token</strong>.</li>
        <li>Enter a purpose such as “Canvas Enhancer.” Add an expiration date if your school requires one, then select <strong>Generate Token</strong>.</li>
        <li>Copy the token immediately—Canvas may show it only once—paste it above, add your school email if you'd like to receive credits from your admin, and select <strong>Setup</strong>.</li>
      </ol>
      <div class="ce-token-privacy">Treat this token like a password. It is stored only in this browser’s extension storage. If your school disables access tokens or you do not see “New Access Token,” contact your Canvas administrator.</div>
    `;
    if (options.compact) element.classList.add('ce-token-compact');

    const control = {
      element,
      input: element.querySelector('.ce-token-input'),
      emailInput: element.querySelector('.ce-token-email'),
      alert: element.querySelector('.ce-token-alert'),
      status: element.querySelector('.ce-token-status'),
    };
    controls.add(control);
    control.emailInput.value = options.email || '';

    element.querySelector('.ce-token-show').addEventListener('click', event => {
      const showing = control.input.type === 'text';
      control.input.type = showing ? 'password' : 'text';
      event.currentTarget.textContent = showing ? 'Show' : 'Hide';
    });

    const setupBtn = element.querySelector('.ce-token-save');
    setupBtn.addEventListener('click', async () => {
      const token = control.input.value.trim();
      const email = control.emailInput.value.trim().toLowerCase();
      if (!token) {
        control.status.style.color = '#991B1B';
        control.status.textContent = 'Paste your Canvas access token first.';
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        control.status.style.color = '#991B1B';
        control.status.textContent = 'Enter a valid email address, or leave it blank.';
        return;
      }
      setupBtn.disabled = true;
      control.status.style.color = '#6B7280';
      control.status.textContent = 'Saving…';
      await new Promise(resolve => chrome.storage.local.set({ [STORAGE_KEY]: token }, resolve));
      refreshAll(token);
      try {
        if (typeof options.onSetup === 'function') await options.onSetup(token, email);
        control.status.style.color = '#127A1B';
        control.status.textContent = email ? `✓ Token saved and registered as ${email}.` : '✓ Token saved.';
      } catch (err) {
        control.status.style.color = '#991B1B';
        control.status.textContent = err?.message || 'Token saved, but registration failed.';
      } finally {
        setupBtn.disabled = false;
        setTimeout(() => { control.status.textContent = ''; }, 5000);
      }
    });

    readToken().then(token => updateControl(control, token, false));
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
