(() => {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────────
  // UPDATE this URL after deploying to Vercel or your custom domain.
  const API_BASE = 'https://YOUR-PROJECT.vercel.app';

  const TRIAL_DAYS = 14;
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  // ── State ─────────────────────────────────────────────────────────────────────
  let state = { trialDaysLeft: TRIAL_DAYS, licenseValid: false };
  let components = null; // fetched from server

  // ── License / trial ───────────────────────────────────────────────────────────
  async function loadState() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['installDate', 'licenseValid'], data => {
        if (!data.installDate) {
          chrome.storage.sync.set({ installDate: Date.now() });
          state.trialDaysLeft = TRIAL_DAYS;
        } else {
          const elapsed = Math.floor((Date.now() - data.installDate) / 86400000);
          state.trialDaysLeft = Math.max(0, TRIAL_DAYS - elapsed);
        }
        state.licenseValid = !!data.licenseValid;
        resolve();
      });
    });
  }

  function isUnlocked() {
    return state.licenseValid || state.trialDaysLeft > 0;
  }

  // ── Component fetching with cache ─────────────────────────────────────────────
  async function fetchComponents() {
    return new Promise(resolve => {
      chrome.storage.local.get(['components', 'componentsCachedAt'], async data => {
        const age = Date.now() - (data.componentsCachedAt ?? 0);
        if (data.components && age < CACHE_TTL_MS) {
          resolve(data.components);
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/api/components`);
          if (!res.ok) throw new Error('fetch failed');
          const json = await res.json();
          chrome.storage.local.set({ components: json, componentsCachedAt: Date.now() });
          resolve(json);
        } catch {
          // Offline or server down — use stale cache if available, else null
          resolve(data.components ?? null);
        }
      });
    });
  }

  // ── Insert into TinyMCE ───────────────────────────────────────────────────────
  function insertHTML(html) {
    if (window.tinymce && tinymce.activeEditor) {
      tinymce.activeEditor.insertContent(html);
      return;
    }
    const frame = document.querySelector('.tox-edit-area__iframe');
    if (frame?.contentDocument) {
      frame.contentDocument.execCommand('insertHTML', false, html);
    }
  }

  // ── Toolbar DOM ───────────────────────────────────────────────────────────────
  let activeDropdown = null;

  function closeAllDropdowns() {
    if (activeDropdown) {
      activeDropdown.classList.remove('ce-open');
      activeDropdown = null;
    }
  }

  function buildToolbar(library) {
    const bar = document.createElement('div');
    bar.id = 'ce-toolbar';

    const label = document.createElement('span');
    label.className = 'ce-label';
    label.textContent = 'Canvas Enhancer';
    bar.appendChild(label);

    const sep = document.createElement('div');
    sep.className = 'ce-divider-sep';
    bar.appendChild(sep);

    if (!library) {
      const err = document.createElement('span');
      err.style.cssText = 'font-size:12px;color:#9da7ae;padding:0 8px;';
      err.textContent = 'Components unavailable — check your connection.';
      bar.appendChild(err);
    } else {
      const unlocked = isUnlocked();

      Object.entries(library).forEach(([category, items]) => {
        const wrap = document.createElement('div');
        wrap.className = 'ce-dropdown-wrap';

        const btn = document.createElement('button');
        btn.className = 'ce-btn';
        btn.type = 'button';
        btn.innerHTML = `${category} <span class="ce-caret">▾</span>`;

        const dropdown = document.createElement('div');
        dropdown.className = 'ce-dropdown';

        items.forEach(item => {
          const li = document.createElement('div');
          li.className = 'ce-dropdown-item';

          if (!unlocked) {
            li.classList.add('ce-pro-locked');
            li.textContent = item.label;
            li.title = 'Start your free trial to unlock all components';
          } else {
            li.textContent = item.label;
            li.addEventListener('click', e => {
              e.stopPropagation();
              insertHTML(item.html);
              closeAllDropdowns();
            });
          }
          dropdown.appendChild(li);
        });

        btn.addEventListener('click', e => {
          e.stopPropagation();
          const isOpen = dropdown.classList.contains('ce-open');
          closeAllDropdowns();
          if (!isOpen) {
            dropdown.classList.add('ce-open');
            activeDropdown = dropdown;
          }
        });

        wrap.appendChild(btn);
        wrap.appendChild(dropdown);
        bar.appendChild(wrap);
      });
    }

    // Trial / upgrade status
    const rightSep = document.createElement('div');
    rightSep.className = 'ce-divider-sep';
    rightSep.style.marginLeft = 'auto';
    bar.appendChild(rightSep);

    if (!state.licenseValid) {
      const badge = document.createElement('span');
      badge.className = 'ce-trial-badge' + (state.trialDaysLeft === 0 ? ' ce-trial-expired' : '');
      badge.textContent = state.trialDaysLeft > 0
        ? `Trial: ${state.trialDaysLeft}d left`
        : 'Trial expired';
      bar.appendChild(badge);

      const upBtn = document.createElement('a');
      upBtn.className = 'ce-upgrade-btn';
      upBtn.href = `${API_BASE}/#pricing`;
      upBtn.target = '_blank';
      upBtn.rel = 'noopener';
      upBtn.textContent = 'Upgrade — $5/mo';
      bar.appendChild(upBtn);
    }

    document.addEventListener('click', closeAllDropdowns);
    return bar;
  }

  // ── Editor injection ──────────────────────────────────────────────────────────
  function injectToolbar() {
    if (document.getElementById('ce-toolbar')) return;
    const editor = document.querySelector('.tox.tox-tinymce');
    if (!editor) return;
    editor.insertAdjacentElement('afterend', buildToolbar(components));
  }

  // Watch for editor removal to clean up the toolbar
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        if (node.nodeType === 1 && (node.classList?.contains('tox-tinymce') || node.querySelector?.('.tox-tinymce'))) {
          document.getElementById('ce-toolbar')?.remove();
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ── Init ──────────────────────────────────────────────────────────────────────
  async function init() {
    await loadState();
    components = await fetchComponents();

    injectToolbar();
    [500, 1000, 2000, 3500].forEach(ms => setTimeout(injectToolbar, ms));

    new MutationObserver(() => injectToolbar())
      .observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
