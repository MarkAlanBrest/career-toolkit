(() => {
  'use strict';

  const ALLOWED_PREFIXES = ['ce_', 'ces_', 'canvas_'];
  const SENSITIVE_KEYS = new Set(['ce_canvas_token', 'ce_license_key', 'ce_license_keys', 'ce_claude_context']);
  const TRANSIENT_KEYS = new Set(['ces_compose_pending', 'ce_quiz_settings']);

  function storageGetAll() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, values => {
        const err = chrome.runtime.lastError;
        if (err) reject(err); else resolve(values || {});
      });
    });
  }

  function storageSet(values) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        const err = chrome.runtime.lastError;
        if (err) reject(err); else resolve();
      });
    });
  }

  function isExtensionKey(key) {
    return ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix));
  }

  async function createBackup(includeSensitive = false) {
    const all = await storageGetAll();
    const data = {};
    Object.entries(all).forEach(([key, value]) => {
      if (!isExtensionKey(key) || TRANSIENT_KEYS.has(key)) return;
      if (!includeSensitive && SENSITIVE_KEYS.has(key)) return;
      data[key] = value;
    });
    return {
      format: 'canvas-enhancer-backup',
      schemaVersion: 1,
      extensionVersion: chrome.runtime.getManifest().version,
      createdAt: new Date().toISOString(),
      includesSensitiveData: includeSensitive,
      data,
    };
  }

  async function downloadBackup(includeSensitive = false) {
    const backup = await createBackup(includeSensitive);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `canvas-enhancer-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return Object.keys(backup.data).length;
  }

  async function restoreFile(file) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.format !== 'canvas-enhancer-backup' || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      throw new Error('This is not a valid Canvas Enhancer backup file.');
    }
    const safeData = {};
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (isExtensionKey(key) && !TRANSIENT_KEYS.has(key)) safeData[key] = value;
    });
    const count = Object.keys(safeData).length;
    if (!count) throw new Error('The backup does not contain any restorable Canvas Enhancer data.');
    await storageSet(safeData);
    return count;
  }

  function createSection(options = {}) {
    const accent = options.accent || '#0770B8';
    const section = document.createElement('section');
    section.style.cssText = 'display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid #E2E8F0;border-radius:9px;background:#F8FAFC;box-sizing:border-box;';

    const heading = document.createElement('div');
    heading.innerHTML = '<div style="font-size:13px;font-weight:750;color:#172A36;margin-bottom:3px;">Backup &amp; Restore</div><div style="font-size:11px;color:#64748B;line-height:1.45;">Save all Canvas Enhancer preferences, templates, criteria, schedules, notes, and other stored app data to one file.</div>';

    const sensitiveLabel = document.createElement('label');
    sensitiveLabel.style.cssText = 'display:flex;align-items:flex-start;gap:7px;font-size:11px;color:#64748B;cursor:pointer;line-height:1.35;';
    const sensitive = document.createElement('input');
    sensitive.type = 'checkbox'; sensitive.style.cssText = `margin-top:1px;accent-color:${accent};`;
    const sensitiveText = document.createElement('span');
    sensitiveText.textContent = 'Include Canvas token and license key (keep the backup file private).';
    sensitiveLabel.append(sensitive, sensitiveText);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    const buttonStyle = 'flex:1;min-width:130px;height:36px;padding:0 12px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;';
    const backupBtn = document.createElement('button');
    backupBtn.type = 'button'; backupBtn.textContent = '↓ Download Backup';
    backupBtn.style.cssText = `${buttonStyle}border:0;background:${accent};color:#fff;`;
    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button'; restoreBtn.textContent = '↑ Restore Backup';
    restoreBtn.style.cssText = `${buttonStyle}border:1px solid #CBD5E1;background:#fff;color:#334155;`;
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.style.display = 'none';
    const status = document.createElement('div');
    status.style.cssText = 'min-height:15px;font-size:11px;color:#64748B;line-height:1.35;';

    backupBtn.addEventListener('click', async () => {
      backupBtn.disabled = true; status.style.color = '#64748B'; status.textContent = 'Creating backup…';
      try {
        const count = await downloadBackup(sensitive.checked);
        status.style.color = '#15803D'; status.textContent = `✓ Backup downloaded (${count} saved items).`;
      } catch (error) {
        status.style.color = '#B91C1C'; status.textContent = error.message || 'Backup failed.';
      } finally { backupBtn.disabled = false; }
    });

    restoreBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (!confirm('Restore this backup? Matching saved settings and app data will be overwritten.')) return;
      restoreBtn.disabled = true; status.style.color = '#64748B'; status.textContent = 'Restoring backup…';
      try {
        const count = await restoreFile(file);
        status.style.color = '#15803D'; status.textContent = `✓ Restored ${count} saved items. Reload Canvas to apply everything.`;
      } catch (error) {
        status.style.color = '#B91C1C'; status.textContent = error.message || 'Restore failed.';
      } finally { restoreBtn.disabled = false; }
    });

    actions.append(backupBtn, restoreBtn);
    section.append(heading, sensitiveLabel, actions, fileInput, status);
    return section;
  }

  const TOOLS = [
    { id: 'message-pulse',     label: 'Message Pulse',     keys: ['ces_templates','ces_quick_messages','ces_automations','ces_send_settings','ces_automation_logs'] },
    { id: 'assignment-pulse',  label: 'Assignment Pulse',  keys: ['canvas_scheduler_settings_v1'] },
    { id: 'announcements',     label: 'Announcements',     keys: ['ce_announcements'] },
    { id: 'grader',            label: 'Grader',            keys: ['ce_grader_settings','ce_grader_filter_published','ce_grader_filter_dashboard'] },
  ];

  async function downloadToolBackup(tool) {
    const all = await storageGetAll();
    const data = {};
    for (const key of tool.keys) { if (key in all) data[key] = all[key]; }
    if (!Object.keys(data).length) throw new Error(`No saved data found for ${tool.label}.`);
    const backup = { format: 'canvas-enhancer-backup', schemaVersion: 1, tool: tool.id, extensionVersion: chrome.runtime.getManifest().version, createdAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ce-${tool.id}-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return Object.keys(data).length;
  }

  async function restoreToolFile(file, tool) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.format !== 'canvas-enhancer-backup' || !parsed.data) throw new Error('Not a valid Canvas Enhancer backup file.');
    const safeData = {};
    const allowedKeys = new Set(tool.keys);
    for (const [key, value] of Object.entries(parsed.data)) {
      if (allowedKeys.has(key)) safeData[key] = value;
    }
    if (!Object.keys(safeData).length) throw new Error(`This backup does not contain ${tool.label} data.`);
    await storageSet(safeData);
    return Object.keys(safeData).length;
  }

  function createToolSection(options = {}) {
    const accent = options.accent || '#0770B8';
    const section = document.createElement('div');
    section.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    const heading = document.createElement('div');
    heading.innerHTML = `<div style="font-size:15px;font-weight:700;color:#172A36;margin-bottom:3px;">Tool Backups</div><div style="font-size:12px;color:#64748B;line-height:1.45;">Back up or restore saved data for individual tools — templates, schedules, criteria, and settings.</div>`;
    section.appendChild(heading);

    for (const tool of TOOLS) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;box-sizing:border-box;';

      const name = document.createElement('span');
      name.style.cssText = 'font-size:13px;font-weight:600;color:#172A36;flex:1;min-width:0;';
      name.textContent = tool.label;

      const status = document.createElement('span');
      status.style.cssText = 'font-size:11px;color:#64748B;flex:1;min-width:0;text-align:center;';

      const btnStyle = 'padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;';

      const backupBtn = document.createElement('button');
      backupBtn.type = 'button'; backupBtn.textContent = '↓ Backup';
      backupBtn.style.cssText = `${btnStyle}border:0;background:${accent};color:#fff;`;

      const restoreBtn = document.createElement('button');
      restoreBtn.type = 'button'; restoreBtn.textContent = '↑ Restore';
      restoreBtn.style.cssText = `${btnStyle}border:1px solid #CBD5E1;background:#fff;color:#334155;`;

      const fileInput = document.createElement('input');
      fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.style.display = 'none';

      backupBtn.addEventListener('click', async () => {
        backupBtn.disabled = true; status.style.color = '#64748B'; status.textContent = 'Saving…';
        try {
          const count = await downloadToolBackup(tool);
          status.style.color = '#15803D'; status.textContent = `✓ ${count} item${count !== 1 ? 's' : ''} backed up`;
        } catch (e) { status.style.color = '#B91C1C'; status.textContent = e.message || 'Backup failed.'; }
        finally { backupBtn.disabled = false; setTimeout(() => { status.textContent = ''; }, 3500); }
      });

      restoreBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0]; fileInput.value = '';
        if (!file) return;
        if (!confirm(`Restore ${tool.label} data? Existing ${tool.label} settings will be overwritten.`)) return;
        restoreBtn.disabled = true; status.style.color = '#64748B'; status.textContent = 'Restoring…';
        try {
          const count = await restoreToolFile(file, tool);
          status.style.color = '#15803D'; status.textContent = `✓ Restored. Reload Canvas to apply.`;
        } catch (e) { status.style.color = '#B91C1C'; status.textContent = e.message || 'Restore failed.'; }
        finally { restoreBtn.disabled = false; setTimeout(() => { status.textContent = ''; }, 4000); }
      });

      row.append(name, status, backupBtn, restoreBtn, fileInput);
      section.appendChild(row);
    }

    return section;
  }

  globalThis.CEDataBackup = { createBackup, downloadBackup, restoreFile, createSection, createToolSection };
})();
