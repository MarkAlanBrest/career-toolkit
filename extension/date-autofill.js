(async function () {
  'use strict';

  if (!await globalThis.CEEntitlements?.has('teaching')) return;

  const STORAGE_KEY = 'ce_date_autofill';
  const BAR_ID      = 'ce-date-autofill-bar';

  // Only run on assignment edit / new-assignment pages
  if (!/\/assignments\/(new|\d+\/edit)/.test(location.pathname)) return;

  // ── Date field discovery ──────────────────────────────────────────────────────
  // Canvas uses different DOM depending on version.
  // Classic Canvas has #due_at / #unlock_at / #lock_at.
  // New (React) Canvas uses data-testid or aria-label attributes.

  function findInput(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getDueInput() {
    return findInput([
      '#due_at',
      'input[aria-label="Due Date"]',
      'input[data-testid="due-date-input"]',
      '.DueDateCalendarRow input[type="text"]:first-of-type',
      'input[placeholder*="Due" i]',
    ]);
  }

  function getAvailableFromInput() {
    return findInput([
      '#unlock_at',
      'input[aria-label="Available from Date"]',
      'input[aria-label*="Available from" i]',
      'input[data-testid="available-from-input"]',
      'input[placeholder*="Available from" i]',
    ]);
  }

  function getUntilInput() {
    return findInput([
      '#lock_at',
      'input[aria-label="Until Date"]',
      'input[aria-label*="Until" i]',
      'input[data-testid="until-date-input"]',
      'input[placeholder*="Until" i]',
    ]);
  }

  // ── Injection anchor ──────────────────────────────────────────────────────────
  // Find a reliable place to inject the bar — walk up from the due date field
  // and look for a section/fieldset/div that wraps all three date rows.

  function findAnchor() {
    const due = getDueInput();
    if (!due) return null;

    // Classic Canvas: #due_at is inside .date_field_container inside a section/fieldset
    const knownContainers = [
      '#due_date_overrides_container',
      '#due_at_row',
      '.ContainerDueDate',
      '.DueDateCalendarRow',
      '.assignment_dates',
    ];
    for (const sel of knownContainers) {
      const el = document.querySelector(sel);
      if (el?.parentElement) return { parent: el.parentElement, before: el };
    }

    // Fallback: walk up from the due input to a labelled section
    let el = due.parentElement;
    for (let i = 0; i < 10; i++) {
      if (!el || el === document.body) break;
      const tag = el.tagName.toLowerCase();
      if (tag === 'fieldset' || tag === 'section') {
        return { parent: el.parentElement, before: el };
      }
      const cls = (el.className || '').toLowerCase();
      const id  = (el.id || '').toLowerCase();
      if (cls.includes('date') || cls.includes('due') || id.includes('date') || id.includes('due')) {
        return { parent: el.parentElement, before: el };
      }
      el = el.parentElement;
    }

    // Last resort: insert right before the due input's grandparent
    const gp = due.parentElement?.parentElement;
    if (gp?.parentElement) return { parent: gp.parentElement, before: gp };
    return null;
  }

  // ── React-aware value setter ──────────────────────────────────────────────────

  function setReactValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, value);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  }

  function formatDate(date) {
    // "Jan 15, 2024" — what Canvas date pickers accept when typed
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function shiftDays(date, delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d;
  }

  // ── Auto-fill ─────────────────────────────────────────────────────────────────

  function applyAutofill(settings, statusEl) {
    if (!settings.enabled) return;
    const due = getDueInput();
    if (!due?.value?.trim()) return;

    const dueDate = new Date(due.value);
    if (isNaN(dueDate.getTime())) return;

    let filled = 0;

    const avail = getAvailableFromInput();
    if (avail && settings.daysBefore > 0) {
      setReactValue(avail, formatDate(shiftDays(dueDate, -settings.daysBefore)));
      filled++;
    }

    const until = getUntilInput();
    if (until && settings.daysAfter > 0) {
      setReactValue(until, formatDate(shiftDays(dueDate, settings.daysAfter)));
      filled++;
    }

    if (statusEl) {
      statusEl.textContent = filled ? `${filled} date${filled > 1 ? 's' : ''} auto-filled ✓` : 'Could not find date fields to fill';
      statusEl.style.color = filled ? '#166534' : '#991B1B';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
    }
  }

  // ── Build and inject the bar ──────────────────────────────────────────────────

  function injectBar(settings) {
    if (document.getElementById(BAR_ID)) return;

    const anchor = findAnchor();
    if (!anchor) {
      console.warn('[CE] Date auto-fill: could not find assignment date section to inject into.');
      return;
    }

    const numStyle = 'width:46px;padding:3px 6px;text-align:center;border:1px solid #c7cdd1;border-radius:3px;font-size:13px;font-family:inherit;margin:0 2px;';

    const bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'flex-wrap:wrap', 'gap:10px',
      'padding:8px 14px', 'margin-bottom:12px',
      'background:#f0f7ff', 'border:1px solid #b8d4f0', 'border-radius:4px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:13px', 'color:#2d3b45', 'box-sizing:border-box',
    ].join(';');

    bar.innerHTML = `
      <span style="font-weight:700;color:#0770a3;white-space:nowrap;">✦ CE Date Auto-fill</span>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
        <input type="checkbox" id="${BAR_ID}-enabled" ${settings.enabled ? 'checked' : ''}>
        Enabled
      </label>
      <span style="display:flex;align-items:center;gap:4px;white-space:nowrap;">
        Opens <input type="number" id="${BAR_ID}-before" min="0" max="365"
          value="${settings.daysBefore}" style="${numStyle}" ${!settings.enabled ? 'disabled' : ''}> days before
      </span>
      <span style="display:flex;align-items:center;gap:4px;white-space:nowrap;">
        Locks <input type="number" id="${BAR_ID}-after" min="0" max="365"
          value="${settings.daysAfter}" style="${numStyle}" ${!settings.enabled ? 'disabled' : ''}> days after
      </span>
      <span id="${BAR_ID}-status" style="font-size:11px;font-weight:600;"></span>
    `;

    anchor.parent.insertBefore(bar, anchor.before);

    const enabledCb = document.getElementById(`${BAR_ID}-enabled`);
    const beforeInp = document.getElementById(`${BAR_ID}-before`);
    const afterInp  = document.getElementById(`${BAR_ID}-after`);
    const statusEl  = document.getElementById(`${BAR_ID}-status`);

    function save() {
      chrome.storage.local.set({ [STORAGE_KEY]: { enabled: settings.enabled, daysBefore: settings.daysBefore, daysAfter: settings.daysAfter } });
    }

    enabledCb.addEventListener('change', () => {
      settings.enabled = enabledCb.checked;
      beforeInp.disabled = !settings.enabled;
      afterInp.disabled  = !settings.enabled;
      save();
    });

    beforeInp.addEventListener('change', () => {
      settings.daysBefore = Math.max(0, parseInt(beforeInp.value, 10) || 0);
      beforeInp.value = settings.daysBefore;
      save();
    });

    afterInp.addEventListener('change', () => {
      settings.daysAfter = Math.max(0, parseInt(afterInp.value, 10) || 0);
      afterInp.value = settings.daysAfter;
      save();
    });

    // Attach listeners to the due date field
    function wireDueListener() {
      const due = getDueInput();
      if (!due || due._ceListened) return;
      due._ceListened = true;
      due.addEventListener('change', () => applyAutofill(settings, statusEl));
      due.addEventListener('blur',   () => applyAutofill(settings, statusEl));
    }

    wireDueListener();
    // Re-attach if Canvas re-renders the form
    new MutationObserver(wireDueListener).observe(anchor.parent, { childList: true, subtree: true });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────

  chrome.storage.local.get(STORAGE_KEY, (stored) => {
    const settings = Object.assign({ enabled: true, daysBefore: 2, daysAfter: 2 }, stored[STORAGE_KEY] || {});

    // Try immediately (classic Canvas is synchronous)
    if (getDueInput()) {
      injectBar(settings);
      return;
    }

    // Otherwise wait for React to render the form
    let attempts = 0;
    const observer = new MutationObserver(() => {
      if (getDueInput() && !document.getElementById(BAR_ID)) {
        injectBar(settings);
      }
      if (++attempts > 200) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
