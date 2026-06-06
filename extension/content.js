(() => {
  'use strict';

  const TRIAL_DAYS = 14;
  const UPGRADE_URL = 'https://canvasenhancer.com/upgrade';

  // ── Component library ────────────────────────────────────────────────────────

  const COMPONENTS = {
    Dividers: [
      {
        label: 'Simple line',
        pro: true,
        html: () => `<hr style="border:none;border-top:1px solid #c7cdd1;margin:16px 0;" />`
      },
      {
        label: 'Bold line',
        pro: true,
        html: () => `<hr style="border:none;border-top:3px solid #2d3b45;margin:16px 0;" />`
      },
      {
        label: 'Dashed line',
        pro: true,
        html: () => `<hr style="border:none;border-top:2px dashed #c7cdd1;margin:16px 0;" />`
      },
      {
        label: 'Double line',
        pro: true,
        html: () => `<div style="border-top:3px double #c7cdd1;margin:16px 0;"></div>`
      },
      {
        label: 'Colored bar',
        pro: true,
        html: () => `<hr style="border:none;border-top:4px solid #0770a3;margin:16px 0;" />`
      },
      {
        label: 'Gradient bar',
        pro: true,
        html: () => `<div style="height:4px;background:linear-gradient(to right,#0770a3,#2d3b45);border-radius:2px;margin:16px 0;"></div>`
      }
    ],
    Headers: [
      {
        label: 'Section banner',
        pro: true,
        html: () => `<div style="background:#2d3b45;color:#fff;padding:12px 18px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">Section Title</div>`
      },
      {
        label: 'Accent bar',
        pro: true,
        html: () => `<div style="border-left:5px solid #0770a3;padding:6px 14px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;color:#2d3b45;margin:12px 0;">Section Title</div>`
      },
      {
        label: 'Underline header',
        pro: true,
        html: () => `<div style="font-family:Lato,sans-serif;font-size:20px;font-weight:700;color:#2d3b45;padding-bottom:6px;border-bottom:2px solid #0770a3;margin:12px 0;">Section Title</div>`
      },
      {
        label: 'Blue banner',
        pro: true,
        html: () => `<div style="background:#0770a3;color:#fff;padding:12px 18px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">Section Title</div>`
      },
      {
        label: 'Gradient banner',
        pro: true,
        html: () => `<div style="background:linear-gradient(135deg,#0770a3,#2d3b45);color:#fff;padding:14px 20px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">Section Title</div>`
      },
      {
        label: 'Warning banner',
        pro: true,
        html: () => `<div style="background:#c03;color:#fff;padding:12px 18px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">⚠ Important Notice</div>`
      }
    ],
    Callouts: [
      {
        label: 'Tip',
        pro: true,
        html: () => `<div style="background:#e8f4fb;border-left:4px solid #0770a3;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#0770a3;">💡 Tip</strong><br/>Add your tip text here.</div>`
      },
      {
        label: 'Warning',
        pro: true,
        html: () => `<div style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#b45309;">⚠ Warning</strong><br/>Add your warning text here.</div>`
      },
      {
        label: 'Important',
        pro: true,
        html: () => `<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#dc2626;">❗ Important</strong><br/>Add your important text here.</div>`
      },
      {
        label: 'Note',
        pro: true,
        html: () => `<div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#16a34a;">📝 Note</strong><br/>Add your note text here.</div>`
      },
      {
        label: 'Do Not',
        pro: true,
        html: () => `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:4px;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#dc2626;">🚫 Do Not</strong><br/>Add your restriction text here.</div>`
      },
      {
        label: 'Success',
        pro: true,
        html: () => `<div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#16a34a;">✅ Success</strong><br/>Add your success message here.</div>`
      },
      {
        label: 'Did You Know',
        pro: true,
        html: () => `<div style="background:#faf5ff;border-left:4px solid #7c3aed;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#7c3aed;">🔍 Did You Know?</strong><br/>Add your fun fact here.</div>`
      }
    ],
    Lists: [
      {
        label: 'Checklist',
        pro: true,
        html: () => `<ul style="list-style:none;padding-left:0;margin:12px 0;font-family:Lato,sans-serif;">
  <li style="padding:5px 0;">✅ &nbsp;First item</li>
  <li style="padding:5px 0;">✅ &nbsp;Second item</li>
  <li style="padding:5px 0;">✅ &nbsp;Third item</li>
</ul>`
      },
      {
        label: 'Numbered steps',
        pro: true,
        html: () => `<ol style="margin:12px 0;padding-left:24px;font-family:Lato,sans-serif;">
  <li style="padding:5px 0;font-weight:600;"><span style="font-weight:400;">First step description</span></li>
  <li style="padding:5px 0;font-weight:600;"><span style="font-weight:400;">Second step description</span></li>
  <li style="padding:5px 0;font-weight:600;"><span style="font-weight:400;">Third step description</span></li>
</ol>`
      },
      {
        label: 'Badge labels',
        pro: true,
        html: () => `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;font-family:Lato,sans-serif;">
  <span style="background:#0770a3;color:#fff;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">Label One</span>
  <span style="background:#2d3b45;color:#fff;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">Label Two</span>
  <span style="background:#16a34a;color:#fff;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">Label Three</span>
</div>`
      },
      {
        label: 'Progress tracker',
        pro: true,
        html: () => `<div style="margin:12px 0;font-family:Lato,sans-serif;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
    <div style="width:28px;height:28px;border-radius:50%;background:#0770a3;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">1</div>
    <span>Step one description</span>
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
    <div style="width:28px;height:28px;border-radius:50%;background:#0770a3;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">2</div>
    <span>Step two description</span>
  </div>
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="width:28px;height:28px;border-radius:50%;background:#c7cdd1;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">3</div>
    <span style="color:#9da7ae;">Step three description</span>
  </div>
</div>`
      }
    ],
    Layouts: [
      {
        label: 'Two columns',
        pro: true,
        html: () => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0;font-family:Lato,sans-serif;">
  <div style="background:#f5f5f5;border-radius:4px;padding:14px;">
    <strong>Column One</strong><br/>Add content here.
  </div>
  <div style="background:#f5f5f5;border-radius:4px;padding:14px;">
    <strong>Column Two</strong><br/>Add content here.
  </div>
</div>`
      },
      {
        label: 'Three columns',
        pro: true,
        html: () => `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:12px 0;font-family:Lato,sans-serif;">
  <div style="background:#f5f5f5;border-radius:4px;padding:12px;"><strong>Column One</strong><br/>Content here.</div>
  <div style="background:#f5f5f5;border-radius:4px;padding:12px;"><strong>Column Two</strong><br/>Content here.</div>
  <div style="background:#f5f5f5;border-radius:4px;padding:12px;"><strong>Column Three</strong><br/>Content here.</div>
</div>`
      },
      {
        label: 'Image + text card',
        pro: true,
        html: () => `<div style="display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:start;background:#fff;border:1px solid #c7cdd1;border-radius:6px;padding:16px;margin:12px 0;font-family:Lato,sans-serif;">
  <div style="background:#e8eaec;border-radius:4px;height:120px;display:flex;align-items:center;justify-content:center;color:#9da7ae;font-size:13px;">Image</div>
  <div><strong style="font-size:16px;">Card Title</strong><p style="margin:6px 0 0;color:#444;">Add your description text here.</p></div>
</div>`
      },
      {
        label: 'Collapsible section',
        pro: true,
        html: () => `<details style="border:1px solid #c7cdd1;border-radius:4px;padding:0;margin:12px 0;font-family:Lato,sans-serif;">
  <summary style="background:#f5f5f5;padding:12px 16px;cursor:pointer;font-weight:600;border-radius:4px;list-style:none;display:flex;align-items:center;justify-content:space-between;">
    Section Title ▾
  </summary>
  <div style="padding:14px 16px;">Add your content here.</div>
</details>`
      }
    ],
    Cards: [
      {
        label: 'Icon feature card',
        pro: true,
        html: () => `<div style="display:flex;align-items:flex-start;gap:14px;background:#f0f8ff;border:1px solid #c7d8e8;border-radius:6px;padding:16px;margin:12px 0;font-family:Lato,sans-serif;">
  <div style="font-size:28px;flex-shrink:0;">🎯</div>
  <div><strong style="font-size:15px;color:#2d3b45;">Feature Title</strong><p style="margin:6px 0 0;color:#444;font-size:14px;">Add your feature description here.</p></div>
</div>`
      },
      {
        label: 'Pull quote',
        pro: true,
        html: () => `<blockquote style="border-left:5px solid #0770a3;margin:16px 0;padding:12px 20px;background:#f0f8ff;border-radius:0 6px 6px 0;font-family:Lato,sans-serif;font-size:17px;font-style:italic;color:#2d3b45;">
  "Add your pull quote text here."
</blockquote>`
      },
      {
        label: 'Button link',
        pro: true,
        html: () => `<p style="margin:12px 0;"><a href="#" style="display:inline-block;background:#0770a3;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-family:Lato,sans-serif;font-size:14px;font-weight:700;">Button Label</a></p>`
      },
      {
        label: 'Styled table',
        pro: true,
        html: () => `<table style="width:100%;border-collapse:collapse;font-family:Lato,sans-serif;margin:12px 0;">
  <thead>
    <tr style="background:#2d3b45;color:#fff;">
      <th style="padding:10px 14px;text-align:left;">Column A</th>
      <th style="padding:10px 14px;text-align:left;">Column B</th>
      <th style="padding:10px 14px;text-align:left;">Column C</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#fff;">
      <td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 1, A</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 1, B</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 1, C</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 2, A</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 2, B</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 2, C</td>
    </tr>
  </tbody>
</table>`
      },
      {
        label: 'Rubric / grading box',
        pro: true,
        html: () => `<div style="border:2px solid #2d3b45;border-radius:6px;overflow:hidden;font-family:Lato,sans-serif;margin:12px 0;">
  <div style="background:#2d3b45;color:#fff;padding:10px 16px;font-weight:700;font-size:15px;">Grading Rubric</div>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f0f2f4;">
        <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #c7cdd1;font-size:13px;">Criteria</th>
        <th style="padding:8px 12px;text-align:center;border-bottom:1px solid #c7cdd1;font-size:13px;width:80px;">Points</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Criterion 1</td><td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">25</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Criterion 2</td><td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">25</td></tr>
      <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Criterion 3</td><td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">50</td></tr>
      <tr style="background:#2d3b45;color:#fff;"><td style="padding:8px 12px;font-weight:700;">Total</td><td style="padding:8px 12px;text-align:center;font-weight:700;">100</td></tr>
    </tbody>
  </table>
</div>`
      }
    ],
    Media: [
      {
        label: 'Video embed',
        pro: true,
        html: () => `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:6px;margin:12px 0;">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
</div>`
      },
      {
        label: 'Resource link list',
        pro: true,
        html: () => `<div style="background:#f5f5f5;border-radius:6px;padding:14px 18px;margin:12px 0;font-family:Lato,sans-serif;">
  <div style="font-weight:700;color:#2d3b45;margin-bottom:10px;">📎 Resources</div>
  <ul style="list-style:none;padding:0;margin:0;">
    <li style="padding:5px 0;"><a href="#" style="color:#0770a3;text-decoration:none;font-size:14px;">🔗 Resource One</a></li>
    <li style="padding:5px 0;"><a href="#" style="color:#0770a3;text-decoration:none;font-size:14px;">🔗 Resource Two</a></li>
    <li style="padding:5px 0;"><a href="#" style="color:#0770a3;text-decoration:none;font-size:14px;">🔗 Resource Three</a></li>
  </ul>
</div>`
      }
    ],
    Templates: [
      {
        label: 'Weekly Lesson',
        pro: true,
        html: () => `<div style="font-family:Lato,sans-serif;max-width:800px;">
  <div style="background:#2d3b45;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700;">📅 Weekly Lesson Plan</div>
  <div style="border:1px solid #c7cdd1;border-top:none;border-radius:0 0 6px 6px;padding:18px 20px;">
    <div style="background:#e8f4fb;border-left:4px solid #0770a3;padding:10px 14px;border-radius:0 4px 4px 0;margin-bottom:16px;"><strong>🎯 Learning Objective:</strong> Add your objective here.</div>
    <strong style="color:#2d3b45;">📖 This Week's Topics</strong>
    <ul style="margin:8px 0 16px;padding-left:20px;">
      <li style="padding:3px 0;">Topic one</li>
      <li style="padding:3px 0;">Topic two</li>
      <li style="padding:3px 0;">Topic three</li>
    </ul>
    <strong style="color:#2d3b45;">📝 Assignments Due</strong>
    <ul style="margin:8px 0 16px;padding-left:20px;">
      <li style="padding:3px 0;">Assignment one — Due: Monday</li>
      <li style="padding:3px 0;">Assignment two — Due: Friday</li>
    </ul>
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 14px;border-radius:0 4px 4px 0;"><strong>💡 Tip for this week:</strong> Add your tip here.</div>
  </div>
</div>`
      },
      {
        label: 'Assignment Brief',
        pro: true,
        html: () => `<div style="font-family:Lato,sans-serif;max-width:800px;">
  <div style="background:#0770a3;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700;">📋 Assignment Brief</div>
  <div style="border:1px solid #c7cdd1;border-top:none;border-radius:0 0 6px 6px;padding:18px 20px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div style="background:#f5f5f5;border-radius:4px;padding:10px 14px;"><strong>Due Date:</strong><br/>Add date</div>
      <div style="background:#f5f5f5;border-radius:4px;padding:10px 14px;"><strong>Points:</strong><br/>100</div>
    </div>
    <strong style="color:#2d3b45;">📌 Overview</strong>
    <p style="margin:8px 0 16px;color:#444;">Add your assignment description here.</p>
    <strong style="color:#2d3b45;">✅ Requirements</strong>
    <ul style="margin:8px 0 16px;padding-left:20px;">
      <li style="padding:3px 0;">Requirement one</li>
      <li style="padding:3px 0;">Requirement two</li>
      <li style="padding:3px 0;">Requirement three</li>
    </ul>
    <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:0 4px 4px 0;"><strong>⚠ Reminder:</strong> Add submission instructions here.</div>
  </div>
</div>`
      },
      {
        label: 'Lab Instructions',
        pro: true,
        html: () => `<div style="font-family:Lato,sans-serif;max-width:800px;">
  <div style="background:#16a34a;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700;">🔬 Lab Instructions</div>
  <div style="border:1px solid #c7cdd1;border-top:none;border-radius:0 0 6px 6px;padding:18px 20px;">
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:10px 14px;border-radius:0 4px 4px 0;margin-bottom:16px;"><strong style="color:#dc2626;">🚫 Safety First:</strong> Add safety instructions here.</div>
    <strong style="color:#2d3b45;">🧪 Materials Needed</strong>
    <ul style="margin:8px 0 16px;padding-left:20px;">
      <li style="padding:3px 0;">Material one</li>
      <li style="padding:3px 0;">Material two</li>
    </ul>
    <strong style="color:#2d3b45;">📋 Procedure</strong>
    <ol style="margin:8px 0 16px;padding-left:20px;">
      <li style="padding:4px 0;">Step one</li>
      <li style="padding:4px 0;">Step two</li>
      <li style="padding:4px 0;">Step three</li>
    </ol>
    <strong style="color:#2d3b45;">📝 Questions to Answer</strong>
    <ol style="margin:8px 0 0;padding-left:20px;">
      <li style="padding:4px 0;">Question one?</li>
      <li style="padding:4px 0;">Question two?</li>
    </ol>
  </div>
</div>`
      }
    ]
  };

  // ── Trial / license state ─────────────────────────────────────────────────────

  let state = { trialDaysLeft: TRIAL_DAYS, licenseValid: false };

  async function loadState() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['installDate', 'licenseValid', 'licenseKey'], data => {
        if (!data.installDate) {
          const now = Date.now();
          chrome.storage.sync.set({ installDate: now });
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

  function isProUnlocked() {
    return state.licenseValid || state.trialDaysLeft > 0;
  }

  // ── Insert HTML into TinyMCE ─────────────────────────────────────────────────

  function insertHTML(html) {
    if (window.tinymce && tinymce.activeEditor) {
      tinymce.activeEditor.insertContent(html);
      return;
    }
    // Fallback: find the iframe body and insert via execCommand
    const frame = document.querySelector('.tox-edit-area__iframe');
    if (frame && frame.contentDocument) {
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

  function buildToolbar() {
    const bar = document.createElement('div');
    bar.id = 'ce-toolbar';

    const label = document.createElement('span');
    label.className = 'ce-label';
    label.textContent = 'Canvas Enhancer';
    bar.appendChild(label);

    const sep = document.createElement('div');
    sep.className = 'ce-divider-sep';
    bar.appendChild(sep);

    Object.entries(COMPONENTS).forEach(([category, items]) => {
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
        const proUnlocked = isProUnlocked();

        if (item.pro && !proUnlocked) {
          li.classList.add('ce-pro-locked');
          li.innerHTML = `${item.label}<span class="ce-pro-badge">Pro</span>`;
          li.title = 'Upgrade to Pro to unlock';
        } else {
          li.textContent = item.label;
          if (item.pro) {
            const badge = document.createElement('span');
            badge.className = 'ce-pro-badge';
            badge.textContent = 'Pro';
            li.appendChild(badge);
          }
          li.addEventListener('click', e => {
            e.stopPropagation();
            insertHTML(item.html());
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

    // Trial badge / upgrade button
    const rightSep = document.createElement('div');
    rightSep.className = 'ce-divider-sep';
    rightSep.style.marginLeft = 'auto';
    bar.appendChild(rightSep);

    if (!state.licenseValid) {
      if (state.trialDaysLeft > 0) {
        const badge = document.createElement('span');
        badge.className = 'ce-trial-badge';
        badge.textContent = `Trial: ${state.trialDaysLeft}d left`;
        bar.appendChild(badge);
      } else {
        const badge = document.createElement('span');
        badge.className = 'ce-trial-badge';
        badge.classList.add('ce-trial-expired');
        badge.textContent = 'Trial expired';
        bar.appendChild(badge);
      }
      const upBtn = document.createElement('a');
      upBtn.className = 'ce-upgrade-btn';
      upBtn.href = UPGRADE_URL;
      upBtn.target = '_blank';
      upBtn.rel = 'noopener';
      upBtn.textContent = 'Upgrade — $5/mo';
      bar.appendChild(upBtn);
    }

    // Close dropdowns on outside click
    document.addEventListener('click', closeAllDropdowns);

    return bar;
  }

  // ── Editor injection ──────────────────────────────────────────────────────────

  function injectToolbar() {
    if (document.getElementById('ce-toolbar')) return;

    const editor = document.querySelector('.tox.tox-tinymce');
    if (!editor) return;

    const toolbar = buildToolbar();
    editor.insertAdjacentElement('afterend', toolbar);
  }

  async function init() {
    await loadState();

    // Try immediately
    injectToolbar();

    // Retry a few times for slow-loading editors
    [500, 1000, 2000, 3500].forEach(ms => setTimeout(injectToolbar, ms));

    // Watch for dynamically loaded editors
    const observer = new MutationObserver(() => injectToolbar());
    observer.observe(document.body, { childList: true, subtree: true });

    // Clean up toolbar when editor is removed
    new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.removedNodes) {
          if (node.nodeType === 1 && (node.classList.contains('tox-tinymce') || node.querySelector?.('.tox-tinymce'))) {
            const tb = document.getElementById('ce-toolbar');
            if (tb) tb.remove();
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
