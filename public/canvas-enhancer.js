/**
 * Canvas Enhancer — canvas-enhancer.js
 * Host this file at the root of your Vercel project.
 * Update this file to push changes to all users instantly.
 * Version: 1.0
 */

(function () {
  'use strict';

  // ─── Component Definitions ───────────────────────────────────────────────────

  const COMPONENTS = {
    dividers: {
      label: 'Dividers',
      icon: '—',
      items: [
        { label: 'Simple line',   html: `<hr style="border:none;border-top:1px solid #ccc;margin:1em 0;">` },
        { label: 'Bold line',     html: `<hr style="border:none;border-top:3px solid #333;margin:1em 0;">` },
        { label: 'Dashed line',   html: `<hr style="border:none;border-top:2px dashed #999;margin:1em 0;">` },
        { label: 'Double line',   html: `<hr style="border:none;border-top:4px double #555;margin:1em 0;">` },
        { label: 'Colored bar',   html: `<hr style="border:none;height:4px;background:#0770B8;margin:1em 0;">` },
        { label: 'Gradient bar',  html: `<hr style="border:none;height:4px;background:linear-gradient(to right,#0770B8,#4db6f0);margin:1em 0;">` },
      ]
    },
    headers: {
      label: 'Headers',
      icon: 'H',
      items: [
        { label: 'Section banner',   html: `<div style="background:#f0f4f8;border-left:5px solid #0770B8;padding:12px 16px;margin:1em 0;font-size:1.1em;font-weight:bold;color:#1a1a1a;">Section Title</div>` },
        { label: 'Accent bar',       html: `<div style="border-bottom:3px solid #0770B8;padding-bottom:6px;margin:1em 0;font-size:1.2em;font-weight:bold;color:#1a1a1a;">Section Title</div>` },
        { label: 'Underline header', html: `<h2 style="border-bottom:2px solid #ccc;padding-bottom:4px;color:#1a1a1a;">Section Title</h2>` },
        { label: 'Blue banner',      html: `<div style="background:#0770B8;color:#fff;padding:12px 16px;margin:1em 0;font-size:1.1em;font-weight:bold;border-radius:4px;">Section Title</div>` },
        { label: 'Gradient banner',  html: `<div style="background:linear-gradient(to right,#0770B8,#4db6f0);color:#fff;padding:12px 16px;margin:1em 0;font-size:1.1em;font-weight:bold;border-radius:4px;">Section Title</div>` },
        { label: 'Warning banner',   html: `<div style="background:#7B1900;color:#fff;padding:12px 16px;margin:1em 0;font-size:1.1em;font-weight:bold;border-radius:4px;">⚠ Important Notice</div>` },
      ]
    },
    callouts: {
      label: 'Callouts',
      icon: '📌',
      items: [
        { label: 'Tip',          html: `<div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#2e7d32;">💡 Tip</strong><br>Add your tip here.</div>` },
        { label: 'Warning',      html: `<div style="background:#fff3e0;border-left:5px solid #e65100;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#e65100;">⚠️ Warning</strong><br>Add your warning here.</div>` },
        { label: 'Important',    html: `<div style="background:#fce4ec;border-left:5px solid #b71c1c;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#b71c1c;">❗ Important</strong><br>Add your note here.</div>` },
        { label: 'Note',         html: `<div style="background:#e3f2fd;border-left:5px solid #1565c0;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#1565c0;">📝 Note</strong><br>Add your note here.</div>` },
        { label: 'Do Not',       html: `<div style="background:#f3e5f5;border-left:5px solid #6a1b9a;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#6a1b9a;">🚫 Do Not</strong><br>Describe what to avoid here.</div>` },
        { label: 'Success',      html: `<div style="background:#e8f5e9;border-left:5px solid #1b5e20;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#1b5e20;">✅ Success</strong><br>Add your success message here.</div>` },
        { label: 'Did You Know', html: `<div style="background:#fffde7;border-left:5px solid #f9a825;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#f57f17;">🤔 Did You Know?</strong><br>Add your fun fact here.</div>` },
      ]
    },
    lists: {
      label: 'Lists',
      icon: '☑',
      items: [
        { label: 'Checklist',        html: `<ul style="list-style:none;padding:0;margin:1em 0;"><li style="padding:6px 0;">☐ Item one</li><li style="padding:6px 0;">☐ Item two</li><li style="padding:6px 0;">☐ Item three</li></ul>` },
        { label: 'Numbered steps',   html: `<ol style="padding-left:1.5em;margin:1em 0;"><li style="padding:6px 0;"><strong>Step 1:</strong> Description here.</li><li style="padding:6px 0;"><strong>Step 2:</strong> Description here.</li><li style="padding:6px 0;"><strong>Step 3:</strong> Description here.</li></ol>` },
        { label: 'Badge labels',     html: `<p style="margin:1em 0;"><span style="background:#0770B8;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;margin-right:6px;">Label A</span><span style="background:#2e7d32;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;margin-right:6px;">Label B</span><span style="background:#e65100;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;">Label C</span></p>` },
        { label: 'Progress tracker', html: `<div style="margin:1em 0;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:#0770B8;color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;">1</span> <span>Step one</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:#0770B8;color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;">2</span> <span>Step two</span></div><div style="display:flex;align-items:center;gap:8px;"><span style="background:#ccc;color:#333;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;">3</span> <span style="color:#999;">Step three</span></div></div>` },
      ]
    },
    layouts: {
      label: 'Layouts',
      icon: '⊞',
      items: [
        { label: 'Two columns',         html: `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><tr><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;">Column one content here.</td><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;">Column two content here.</td></tr></table>` },
        { label: 'Three columns',       html: `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><tr><td style="width:33%;padding:12px;vertical-align:top;border:1px solid #ddd;">Column one.</td><td style="width:33%;padding:12px;vertical-align:top;border:1px solid #ddd;">Column two.</td><td style="width:34%;padding:12px;vertical-align:top;border:1px solid #ddd;">Column three.</td></tr></table>` },
        { label: 'Image + text card',   html: `<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;border-radius:4px;margin:1em 0;overflow:hidden;"><tr><td style="width:200px;background:#e0e0e0;padding:16px;text-align:center;color:#666;vertical-align:middle;">[Image]</td><td style="padding:16px;vertical-align:top;"><strong>Card Title</strong><br><br>Card description goes here. Add your content.</td></tr></table>` },
        { label: 'Collapsible section', html: `<details style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin:1em 0;"><summary style="font-weight:bold;cursor:pointer;color:#0770B8;">Click to expand</summary><div style="margin-top:12px;">Hidden content goes here.</div></details>` },
      ]
    },
    cards: {
      label: 'Cards',
      icon: '▭',
      items: [
        { label: 'Icon feature card',    html: `<div style="border:1px solid #ddd;border-radius:6px;padding:16px;margin:1em 0;text-align:center;"><div style="font-size:2em;margin-bottom:8px;">⭐</div><strong>Feature Title</strong><br><span style="color:#666;font-size:.9em;">Description of this feature or topic.</span></div>` },
        { label: 'Pull quote',           html: `<blockquote style="border-left:4px solid #0770B8;margin:1em 0;padding:12px 16px;background:#f0f4f8;font-style:italic;color:#333;">"Add your quote or key point here."<br><cite style="font-style:normal;font-size:.85em;color:#666;">— Source</cite></blockquote>` },
        { label: 'Button link',          html: `<p style="margin:1em 0;"><a href="#" style="display:inline-block;background:#0770B8;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:bold;">Button Label</a></p>` },
        { label: 'Styled table',         html: `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><thead><tr style="background:#0770B8;color:#fff;"><th style="padding:10px 12px;text-align:left;">Column A</th><th style="padding:10px 12px;text-align:left;">Column B</th><th style="padding:10px 12px;text-align:left;">Column C</th></tr></thead><tbody><tr style="background:#f9f9f9;"><td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td></tr><tr><td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td></tr></tbody></table>` },
        { label: 'Rubric / grading box', html: `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><thead><tr style="background:#333;color:#fff;"><th style="padding:10px 12px;text-align:left;">Criteria</th><th style="padding:10px 12px;text-align:center;">Excellent (4)</th><th style="padding:10px 12px;text-align:center;">Good (3)</th><th style="padding:10px 12px;text-align:center;">Needs Work (2)</th><th style="padding:10px 12px;text-align:center;">Incomplete (1)</th></tr></thead><tbody><tr style="background:#f9f9f9;"><td style="padding:9px 12px;border-bottom:1px solid #eee;font-weight:bold;">Criterion 1</td><td style="padding:9px 12px;border-bottom:1px solid #eee;text-align:center;">Description</td><td style="padding:9px 12px;border-bottom:1px solid #eee;text-align:center;">Description</td><td style="padding:9px 12px;border-bottom:1px solid #eee;text-align:center;">Description</td><td style="padding:9px 12px;border-bottom:1px solid #eee;text-align:center;">Description</td></tr></tbody></table>` },
      ]
    },
    media: {
      label: 'Media',
      icon: '▶',
      items: [
        { label: 'Video embed',        html: `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1em 0;border-radius:4px;background:#000;"><iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>` },
        { label: 'Resource link list', html: `<div style="background:#f0f4f8;border-radius:4px;padding:16px;margin:1em 0;"><strong style="display:block;margin-bottom:10px;">📚 Resources</strong><ul style="margin:0;padding-left:1.5em;"><li style="margin-bottom:6px;"><a href="#">Resource title one</a></li><li style="margin-bottom:6px;"><a href="#">Resource title two</a></li><li><a href="#">Resource title three</a></li></ul></div>` },
      ]
    },
    templates: {
      label: 'Templates',
      icon: '📄',
      items: [
        { label: 'Weekly Lesson',    html: `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;"><div style="background:#0770B8;color:#fff;padding:16px 20px;border-radius:4px 4px 0 0;"><strong style="font-size:1.2em;">Week [#] — Lesson Title</strong></div><div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 4px 4px;"><div style="background:#e3f2fd;border-left:4px solid #0770B8;padding:10px 14px;margin-bottom:16px;"><strong>🎯 Objectives</strong><br>By the end of this lesson, students will be able to:<br><ul style="margin:8px 0 0 0;"><li>Objective one</li><li>Objective two</li></ul></div><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><strong>📖 Content</strong><p>Lesson content goes here.</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><strong>📝 Assignment</strong><p>Assignment details go here.</p></div></div>` },
        { label: 'Assignment Brief', html: `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;border:1px solid #ddd;border-radius:4px;overflow:hidden;"><div style="background:#333;color:#fff;padding:16px 20px;"><strong style="font-size:1.2em;">Assignment Title</strong><br><span style="font-size:.85em;opacity:.8;">Due: [Date] &nbsp;|&nbsp; Points: [#]</span></div><div style="padding:20px;"><p><strong>Overview</strong><br>Brief description of what students will do.</p><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><p><strong>Instructions</strong></p><ol><li>Step one</li><li>Step two</li><li>Step three</li></ol><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><p><strong>Submission</strong><br>Describe how students should submit their work.</p></div></div>` },
        { label: 'Lab Instructions', html: `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;border:1px solid #ddd;border-radius:4px;overflow:hidden;"><div style="background:#1b5e20;color:#fff;padding:16px 20px;"><strong style="font-size:1.2em;">🔬 Lab: [Title]</strong></div><div style="padding:20px;"><div style="background:#fff3e0;border-left:4px solid #e65100;padding:10px 14px;margin-bottom:16px;"><strong>⚠️ Safety</strong><br>List safety requirements here.</div><p><strong>Materials Needed</strong></p><ul><li>Item one</li><li>Item two</li></ul><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><p><strong>Procedure</strong></p><ol><li>Step one</li><li>Step two</li><li>Step three</li></ol><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><p><strong>Questions / Reflection</strong></p><ol><li>Question one</li><li>Question two</li></ol></div></div>` },
      ]
    }
  };

  // ─── Inject Toolbar ──────────────────────────────────────────────────────────

  function buildToolbar() {
    if (document.getElementById('ce-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'ce-toolbar';

    Object.entries(COMPONENTS).forEach(([, cat]) => {
      const wrap = document.createElement('div');
      wrap.className = 'ce-group';

      const btn = document.createElement('button');
      btn.className = 'ce-btn';
      btn.type = 'button';
      btn.innerHTML = `<span class="ce-icon">${cat.icon}</span>${cat.label}`;
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');

      const panel = document.createElement('div');
      panel.className = 'ce-panel';
      panel.setAttribute('role', 'menu');

      cat.items.forEach(item => {
        const entry = document.createElement('button');
        entry.className = 'ce-item';
        entry.type = 'button';
        entry.textContent = item.label;
        entry.setAttribute('role', 'menuitem');
        entry.addEventListener('click', (e) => {
          e.stopPropagation();
          insertHTML(item.html);
          closeAllPanels();
        });
        panel.appendChild(entry);
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = panel.classList.contains('ce-open');
        closeAllPanels();
        if (!isOpen) {
          panel.classList.add('ce-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });

      wrap.appendChild(btn);
      wrap.appendChild(panel);
      bar.appendChild(wrap);
    });

    document.addEventListener('click', closeAllPanels);

    const rce = document.querySelector('.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce');
    if (rce) {
      rce.parentNode.insertBefore(bar, rce);
    } else {
      document.body.appendChild(bar);
    }
  }

  function closeAllPanels() {
    document.querySelectorAll('.ce-panel.ce-open').forEach(p => p.classList.remove('ce-open'));
    document.querySelectorAll('.ce-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  // ─── Insert HTML into Canvas Editor ─────────────────────────────────────────

  function insertHTML(html) {
    if (window.tinymce && tinymce.activeEditor) {
      tinymce.activeEditor.insertContent(html);
      return;
    }

    const frames = document.querySelectorAll('iframe.tox-edit-area__iframe');
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument;
        if (!doc) continue;
        const body = doc.querySelector('body#tinymce');
        if (body) {
          doc.execCommand('insertHTML', false, html);
          return;
        }
      } catch (e) { /* cross-origin, skip */ }
    }

    navigator.clipboard.writeText(html).then(() => {
      showNotice('HTML copied to clipboard — paste into the editor.');
    });
  }

  function showNotice(msg) {
    let n = document.getElementById('ce-notice');
    if (!n) {
      n = document.createElement('div');
      n.id = 'ce-notice';
      document.body.appendChild(n);
    }
    n.textContent = msg;
    n.classList.add('ce-notice-show');
    setTimeout(() => n.classList.remove('ce-notice-show'), 3000);
  }

  // ─── Watch for editor to appear (SPA navigation) ─────────────────────────────

  new MutationObserver(() => {
    if (document.querySelector('.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce')
        && !document.getElementById('ce-toolbar')) {
      buildToolbar();
    }
  }).observe(document.body, { childList: true, subtree: true });

  if (document.querySelector('.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce')) {
    buildToolbar();
  }

})();
