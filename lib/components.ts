export type Component = {
  label: string;
  html: string;
};

export type ComponentLibrary = Record<string, Component[]>;

const COMPONENTS: ComponentLibrary = {
  Dividers: [
    {
      label: 'Simple line',
      html: `<hr style="border:none;border-top:1px solid #c7cdd1;margin:16px 0;" />`,
    },
    {
      label: 'Bold line',
      html: `<hr style="border:none;border-top:3px solid #2d3b45;margin:16px 0;" />`,
    },
    {
      label: 'Dashed line',
      html: `<hr style="border:none;border-top:2px dashed #c7cdd1;margin:16px 0;" />`,
    },
    {
      label: 'Double line',
      html: `<div style="border-top:3px double #c7cdd1;margin:16px 0;"></div>`,
    },
    {
      label: 'Colored bar',
      html: `<hr style="border:none;border-top:4px solid #0770a3;margin:16px 0;" />`,
    },
    {
      label: 'Gradient bar',
      html: `<div style="height:4px;background:linear-gradient(to right,#0770a3,#2d3b45);border-radius:2px;margin:16px 0;"></div>`,
    },
  ],

  Headers: [
    {
      label: 'Section banner',
      html: `<div style="background:#2d3b45;color:#fff;padding:12px 18px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">Section Title</div>`,
    },
    {
      label: 'Accent bar',
      html: `<div style="border-left:5px solid #0770a3;padding:6px 14px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;color:#2d3b45;margin:12px 0;">Section Title</div>`,
    },
    {
      label: 'Underline header',
      html: `<div style="font-family:Lato,sans-serif;font-size:20px;font-weight:700;color:#2d3b45;padding-bottom:6px;border-bottom:2px solid #0770a3;margin:12px 0;">Section Title</div>`,
    },
    {
      label: 'Blue banner',
      html: `<div style="background:#0770a3;color:#fff;padding:12px 18px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">Section Title</div>`,
    },
    {
      label: 'Gradient banner',
      html: `<div style="background:linear-gradient(135deg,#0770a3,#2d3b45);color:#fff;padding:14px 20px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">Section Title</div>`,
    },
    {
      label: 'Warning banner',
      html: `<div style="background:#c03;color:#fff;padding:12px 18px;border-radius:4px;font-family:Lato,sans-serif;font-size:18px;font-weight:700;margin:12px 0;">⚠ Important Notice</div>`,
    },
  ],

  Callouts: [
    {
      label: 'Tip',
      html: `<div style="background:#e8f4fb;border-left:4px solid #0770a3;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#0770a3;">💡 Tip</strong><br/>Add your tip text here.</div>`,
    },
    {
      label: 'Warning',
      html: `<div style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#b45309;">⚠ Warning</strong><br/>Add your warning text here.</div>`,
    },
    {
      label: 'Important',
      html: `<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#dc2626;">❗ Important</strong><br/>Add your important text here.</div>`,
    },
    {
      label: 'Note',
      html: `<div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#16a34a;">📝 Note</strong><br/>Add your note text here.</div>`,
    },
    {
      label: 'Do Not',
      html: `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:4px;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#dc2626;">🚫 Do Not</strong><br/>Add your restriction text here.</div>`,
    },
    {
      label: 'Success',
      html: `<div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#16a34a;">✅ Success</strong><br/>Add your success message here.</div>`,
    },
    {
      label: 'Did You Know',
      html: `<div style="background:#faf5ff;border-left:4px solid #7c3aed;border-radius:0 4px 4px 0;padding:12px 16px;margin:12px 0;font-family:Lato,sans-serif;"><strong style="color:#7c3aed;">🔍 Did You Know?</strong><br/>Add your fun fact here.</div>`,
    },
  ],

  Lists: [
    {
      label: 'Checklist',
      html: `<ul style="list-style:none;padding-left:0;margin:12px 0;font-family:Lato,sans-serif;"><li style="padding:5px 0;">✅ &nbsp;First item</li><li style="padding:5px 0;">✅ &nbsp;Second item</li><li style="padding:5px 0;">✅ &nbsp;Third item</li></ul>`,
    },
    {
      label: 'Numbered steps',
      html: `<ol style="margin:12px 0;padding-left:24px;font-family:Lato,sans-serif;"><li style="padding:5px 0;">First step description</li><li style="padding:5px 0;">Second step description</li><li style="padding:5px 0;">Third step description</li></ol>`,
    },
    {
      label: 'Badge labels',
      html: `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;font-family:Lato,sans-serif;"><span style="background:#0770a3;color:#fff;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">Label One</span><span style="background:#2d3b45;color:#fff;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">Label Two</span><span style="background:#16a34a;color:#fff;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">Label Three</span></div>`,
    },
    {
      label: 'Progress tracker',
      html: `<div style="margin:12px 0;font-family:Lato,sans-serif;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div style="width:28px;height:28px;border-radius:50%;background:#0770a3;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">1</div><span>Step one description</span></div><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div style="width:28px;height:28px;border-radius:50%;background:#0770a3;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">2</div><span>Step two description</span></div><div style="display:flex;align-items:center;gap:10px;"><div style="width:28px;height:28px;border-radius:50%;background:#c7cdd1;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">3</div><span style="color:#9da7ae;">Step three description</span></div></div>`,
    },
  ],

  Layouts: [
    {
      label: 'Two columns',
      html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0;font-family:Lato,sans-serif;"><div style="background:#f5f5f5;border-radius:4px;padding:14px;"><strong>Column One</strong><br/>Add content here.</div><div style="background:#f5f5f5;border-radius:4px;padding:14px;"><strong>Column Two</strong><br/>Add content here.</div></div>`,
    },
    {
      label: 'Three columns',
      html: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:12px 0;font-family:Lato,sans-serif;"><div style="background:#f5f5f5;border-radius:4px;padding:12px;"><strong>Column One</strong><br/>Content here.</div><div style="background:#f5f5f5;border-radius:4px;padding:12px;"><strong>Column Two</strong><br/>Content here.</div><div style="background:#f5f5f5;border-radius:4px;padding:12px;"><strong>Column Three</strong><br/>Content here.</div></div>`,
    },
    {
      label: 'Image + text card',
      html: `<div style="display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:start;background:#fff;border:1px solid #c7cdd1;border-radius:6px;padding:16px;margin:12px 0;font-family:Lato,sans-serif;"><div style="background:#e8eaec;border-radius:4px;height:120px;display:flex;align-items:center;justify-content:center;color:#9da7ae;font-size:13px;">Image</div><div><strong style="font-size:16px;">Card Title</strong><p style="margin:6px 0 0;color:#444;">Add your description text here.</p></div></div>`,
    },
    {
      label: 'Collapsible section',
      html: `<details style="border:1px solid #c7cdd1;border-radius:4px;padding:0;margin:12px 0;font-family:Lato,sans-serif;"><summary style="background:#f5f5f5;padding:12px 16px;cursor:pointer;font-weight:600;border-radius:4px;list-style:none;display:flex;align-items:center;justify-content:space-between;">Section Title ▾</summary><div style="padding:14px 16px;">Add your content here.</div></details>`,
    },
  ],

  Cards: [
    {
      label: 'Icon feature card',
      html: `<div style="display:flex;align-items:flex-start;gap:14px;background:#f0f8ff;border:1px solid #c7d8e8;border-radius:6px;padding:16px;margin:12px 0;font-family:Lato,sans-serif;"><div style="font-size:28px;flex-shrink:0;">🎯</div><div><strong style="font-size:15px;color:#2d3b45;">Feature Title</strong><p style="margin:6px 0 0;color:#444;font-size:14px;">Add your feature description here.</p></div></div>`,
    },
    {
      label: 'Pull quote',
      html: `<blockquote style="border-left:5px solid #0770a3;margin:16px 0;padding:12px 20px;background:#f0f8ff;border-radius:0 6px 6px 0;font-family:Lato,sans-serif;font-size:17px;font-style:italic;color:#2d3b45;">"Add your pull quote text here."</blockquote>`,
    },
    {
      label: 'Button link',
      html: `<p style="margin:12px 0;"><a href="#" style="display:inline-block;background:#0770a3;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-family:Lato,sans-serif;font-size:14px;font-weight:700;">Button Label</a></p>`,
    },
    {
      label: 'Styled table',
      html: `<table style="width:100%;border-collapse:collapse;font-family:Lato,sans-serif;margin:12px 0;"><thead><tr style="background:#2d3b45;color:#fff;"><th style="padding:10px 14px;text-align:left;">Column A</th><th style="padding:10px 14px;text-align:left;">Column B</th><th style="padding:10px 14px;text-align:left;">Column C</th></tr></thead><tbody><tr style="background:#fff;"><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 1, A</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 1, B</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 1, C</td></tr><tr style="background:#f9fafb;"><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 2, A</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 2, B</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;">Row 2, C</td></tr></tbody></table>`,
    },
    {
      label: 'Rubric / grading box',
      html: `<div style="border:2px solid #2d3b45;border-radius:6px;overflow:hidden;font-family:Lato,sans-serif;margin:12px 0;"><div style="background:#2d3b45;color:#fff;padding:10px 16px;font-weight:700;font-size:15px;">Grading Rubric</div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f0f2f4;"><th style="padding:8px 12px;text-align:left;border-bottom:1px solid #c7cdd1;font-size:13px;">Criteria</th><th style="padding:8px 12px;text-align:center;border-bottom:1px solid #c7cdd1;font-size:13px;width:80px;">Points</th></tr></thead><tbody><tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Criterion 1</td><td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">25</td></tr><tr style="background:#f9fafb;"><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Criterion 2</td><td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">25</td></tr><tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Criterion 3</td><td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">50</td></tr><tr style="background:#2d3b45;color:#fff;"><td style="padding:8px 12px;font-weight:700;">Total</td><td style="padding:8px 12px;text-align:center;font-weight:700;">100</td></tr></tbody></table></div>`,
    },
  ],

  Media: [
    {
      label: 'Video embed',
      html: `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:6px;margin:12px 0;"><iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`,
    },
    {
      label: 'Resource link list',
      html: `<div style="background:#f5f5f5;border-radius:6px;padding:14px 18px;margin:12px 0;font-family:Lato,sans-serif;"><div style="font-weight:700;color:#2d3b45;margin-bottom:10px;">📎 Resources</div><ul style="list-style:none;padding:0;margin:0;"><li style="padding:5px 0;"><a href="#" style="color:#0770a3;text-decoration:none;font-size:14px;">🔗 Resource One</a></li><li style="padding:5px 0;"><a href="#" style="color:#0770a3;text-decoration:none;font-size:14px;">🔗 Resource Two</a></li><li style="padding:5px 0;"><a href="#" style="color:#0770a3;text-decoration:none;font-size:14px;">🔗 Resource Three</a></li></ul></div>`,
    },
  ],

  Templates: [
    {
      label: 'Weekly Lesson',
      html: `<div style="font-family:Lato,sans-serif;max-width:800px;"><div style="background:#2d3b45;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700;">📅 Weekly Lesson Plan</div><div style="border:1px solid #c7cdd1;border-top:none;border-radius:0 0 6px 6px;padding:18px 20px;"><div style="background:#e8f4fb;border-left:4px solid #0770a3;padding:10px 14px;border-radius:0 4px 4px 0;margin-bottom:16px;"><strong>🎯 Learning Objective:</strong> Add your objective here.</div><strong style="color:#2d3b45;">📖 This Week's Topics</strong><ul style="margin:8px 0 16px;padding-left:20px;"><li style="padding:3px 0;">Topic one</li><li style="padding:3px 0;">Topic two</li><li style="padding:3px 0;">Topic three</li></ul><strong style="color:#2d3b45;">📝 Assignments Due</strong><ul style="margin:8px 0 16px;padding-left:20px;"><li style="padding:3px 0;">Assignment one — Due: Monday</li><li style="padding:3px 0;">Assignment two — Due: Friday</li></ul><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 14px;border-radius:0 4px 4px 0;"><strong>💡 Tip for this week:</strong> Add your tip here.</div></div></div>`,
    },
    {
      label: 'Assignment Brief',
      html: `<div style="font-family:Lato,sans-serif;max-width:800px;"><div style="background:#0770a3;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700;">📋 Assignment Brief</div><div style="border:1px solid #c7cdd1;border-top:none;border-radius:0 0 6px 6px;padding:18px 20px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;"><div style="background:#f5f5f5;border-radius:4px;padding:10px 14px;"><strong>Due Date:</strong><br/>Add date</div><div style="background:#f5f5f5;border-radius:4px;padding:10px 14px;"><strong>Points:</strong><br/>100</div></div><strong style="color:#2d3b45;">📌 Overview</strong><p style="margin:8px 0 16px;color:#444;">Add your assignment description here.</p><strong style="color:#2d3b45;">✅ Requirements</strong><ul style="margin:8px 0 16px;padding-left:20px;"><li style="padding:3px 0;">Requirement one</li><li style="padding:3px 0;">Requirement two</li><li style="padding:3px 0;">Requirement three</li></ul><div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:0 4px 4px 0;"><strong>⚠ Reminder:</strong> Add submission instructions here.</div></div></div>`,
    },
    {
      label: 'Lab Instructions',
      html: `<div style="font-family:Lato,sans-serif;max-width:800px;"><div style="background:#16a34a;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700;">🔬 Lab Instructions</div><div style="border:1px solid #c7cdd1;border-top:none;border-radius:0 0 6px 6px;padding:18px 20px;"><div style="background:#fef2f2;border-left:4px solid #dc2626;padding:10px 14px;border-radius:0 4px 4px 0;margin-bottom:16px;"><strong style="color:#dc2626;">🚫 Safety First:</strong> Add safety instructions here.</div><strong style="color:#2d3b45;">🧪 Materials Needed</strong><ul style="margin:8px 0 16px;padding-left:20px;"><li style="padding:3px 0;">Material one</li><li style="padding:3px 0;">Material two</li></ul><strong style="color:#2d3b45;">📋 Procedure</strong><ol style="margin:8px 0 16px;padding-left:20px;"><li style="padding:4px 0;">Step one</li><li style="padding:4px 0;">Step two</li><li style="padding:4px 0;">Step three</li></ol><strong style="color:#2d3b45;">📝 Questions to Answer</strong><ol style="margin:8px 0 0;padding-left:20px;"><li style="padding:4px 0;">Question one?</li><li style="padding:4px 0;">Question two?</li></ol></div></div>`,
    },
  ],
};

export default COMPONENTS;
