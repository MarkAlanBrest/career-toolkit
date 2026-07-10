// Shared page-building building blocks — ported from extension/Canvas_Content_Studio.user.js's
// BAKED_COMPONENTS/ICONS/CB_THEMES/COLORS so the Course Builder's WYSIWYG editor reuses the same
// proven component library and templating scheme ({{P}}/{{L}}/{{SIZE}}/{{FONT}}/{{WIDTH}}/{{ALIGN}}/{{VPAD}})
// instead of inventing a parallel one.

export type ColorPair = { name: string; p: string; l: string };
export const COLORS: ColorPair[] = [
  { name: 'Ocean Blue', p: '#0770B8', l: '#e3f2fd' },
  { name: 'Forest Green', p: '#2e7d32', l: '#e8f5e9' },
  { name: 'Crimson', p: '#b71c1c', l: '#fce4ec' },
  { name: 'Purple', p: '#6a1b9a', l: '#f3e5f5' },
  { name: 'Orange', p: '#e65100', l: '#fff3e0' },
  { name: 'Teal', p: '#00695c', l: '#e0f2f1' },
  { name: 'Slate', p: '#37474f', l: '#f5f5f5' },
  { name: 'Gold', p: '#f9a825', l: '#fffde7' },
];

export const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
export const FONTS = ['inherit', 'Georgia,serif', 'Arial,sans-serif', '"Trebuchet MS",sans-serif', '"Courier New",monospace'];

export const ICONS: Record<string, string[]> = {
  Education: ['📚', '📖', '✏️', '🎓', '🏫', '📝', '📐', '🔬', '🧪', '🧮', '🗂', '📋', '🖊', '📏', '🗒', '💻', '🖥', '⌨', '🖱', '📡', '🔭', '🧬', '🧫', '🧲', '⚗', '🏛', '📜', '🗺', '🧭', '🎒', '🖼', '🖋', '📌', '🗝', '🔍'],
  Time: ['⏰', '📅', '⏱', '🗓', '📆', '🕐', '🕑', '🕔', '🕗', '🕙', '⌛', '⏳', '🕛', '🕧', '⌚', '⏲', '🔔', '📬', '🔁', '🔄', '⏯', '⏮', '⏭', '⏩', '⏪', '⏫', '⏬', '🔛', '🔜', '🔚', '🔙', '▶', '⏸', '⏹'],
  Status: ['✅', '❌', '⚠️', '🚫', '❓', '❗', '💡', '🔔', '🔕', '💯', '🔒', '🔓', '🔑', '⭐', '🌟', '🆕', '🆗', '🆘', '🆙', '🔴', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔺', '🔻', '📌', '📍', '🚩', '🏁', '🔖', '💬', '🗯', '💭', '✔', '✗', 'ℹ'],
  People: ['👤', '👥', '🧑‍🏫', '🧑‍🎓', '👩‍💼', '👨‍💻', '🤝', '👋', '🙋', '🙌', '👏', '💪', '🧠', '👁', '👂', '🫀', '🤲', '☝', '✌', '🤞', '👍', '👎', '🫶', '🙏', '✊', '👊'],
  Files: ['📁', '📂', '📄', '📊', '📈', '📉', '💾', '📎', '🔗', '🗃', '🗄', '📦', '📥', '📤', '📧', '📨', '📩', '🗑', '🗞', '📰', '📃', '📑', '📒', '📓', '📔', '📕', '📗', '📘', '📙', '✂', '🖨'],
  Symbols: ['⭐', '🏆', '🎯', '💡', '🔑', '🎉', '✨', '🚀', '💎', '🔥', '⚡', '🌈', '🎨', '🎵', '🎤', '🏅', '🥇', '🎖', '🏵', '🎗', '🎀', '🎁', '💝', '💠', '🔮', '🪄', '✴', '❇', '🌀', '💫', '🪐', '🌐', '☀', '🌙', '🌊', '🍀'],
  Arrows: ['→', '←', '↑', '↓', '↔', '↕', '↗', '↘', '↙', '↖', '➡', '⬅', '⬆', '⬇', '↩', '↪', '⇒', '⇐', '➤', '▶', '◀', '▲', '▼'],
  Shapes: ['■', '□', '▪', '▫', '◼', '◻', '▲', '△', '◆', '◇', '●', '○', '★', '☆', '⬛', '⬜', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪'],
  Math: ['➕', '➖', '✖️', '➗', '±', '=', '≠', '≈', '≤', '≥', '²', '³', '√', '%', 'π', 'Σ', 'Δ', 'Ω', '∞', '½', '¼', '¾'],
};

export type ComponentItem = {
  label: string;
  props?: ('color' | 'size' | 'font' | 'width' | 'align' | 'vpad')[];
  html?: string;
  generate?: keyof typeof GENERATORS;
  fields?: { id: string; label: string; type: 'number' | 'select'; default: string | number; min?: number; max?: number; options?: string[] }[];
};
export type ComponentCategory = { label: string; icon: string; items: ComponentItem[] };

export const GENERATORS = {
  checklist(p: Record<string, string>) {
    const n = Math.min(Math.max(parseInt(p.n) || 5, 2), 30);
    return `<ul style="list-style:none;padding:0;margin:1em 0;">` +
      Array.from({ length: n }, (_, i) => `<li style="padding:6px 0;border-bottom:1px solid #f0f0f0;">☐ Item ${i + 1}</li>`).join('') +
      `</ul>`;
  },
  steps(p: Record<string, string>) {
    const n = Math.min(Math.max(parseInt(p.n) || 4, 2), 20);
    return `<ul style="list-style:none;padding:0;margin:1em 0;">` +
      Array.from({ length: n }, (_, i) => `<li style="padding:6px 0;"><strong>Step ${i + 1}:</strong> Description here.</li>`).join('') +
      `</ul>`;
  },
  columns(p: Record<string, string>) {
    const parts = (p.split || '50/50').split('/').map(Number);
    const cells = parts.map(w => `<td style="width:${w}%;padding:12px;vertical-align:top;border:1px solid #ddd;">Content here.</td>`).join('');
    return `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><tr>${cells}</tr></table>`;
  },
  cards(p: Record<string, string>) {
    const rows = Math.min(Math.max(parseInt(p.rows) || 2, 1), 6);
    const cols = Math.min(Math.max(parseInt(p.cols) || 3, 1), 6);
    const style = p.cardStyle || 'shadow';
    const pad = p.padding || '16px';
    const gap = parseInt(p.gap) || 12;
    const minH = p.minH || '200px';
    const color = p.color || '#0770B8';
    const pct = (100 / cols).toFixed(2);
    let css;
    switch (style) {
      case 'bordered': css = `background:#fff;border:1px solid ${color};border-radius:8px;`; break;
      case 'outlined': css = `background:#fff;border:2px solid ${color};border-radius:8px;`; break;
      case 'filled': css = `background:${color};color:#fff;border-radius:8px;`; break;
      case 'minimal': css = `background:#f9f9f9;border-left:3px solid ${color};border-radius:0 4px 4px 0;`; break;
      default: css = `background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12);border-top:3px solid ${color};`;
    }
    const cell = `<td style="${css}padding:${pad};min-height:${minH};vertical-align:top;width:${pct}%;box-sizing:border-box;">Content here.</td>`;
    let html = `<table style="width:100%;border-collapse:separate;border-spacing:${gap}px;margin:1em 0;table-layout:fixed;">`;
    for (let r = 0; r < rows; r++) html += `<tr>${Array(cols).fill(cell).join('')}</tr>`;
    html += `</table>`;
    return html;
  },
};

export const COMPONENTS: Record<string, ComponentCategory> = {
  headers: {
    label: 'Headers', icon: 'H', items: [
      { label: 'Section banner', props: ['color', 'size', 'font', 'width', 'align', 'vpad'], html: `<div style="background:{{L}};border-left:5px solid {{P}};padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;color:#1a1a1a;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>` },
      { label: 'Solid banner', props: ['color', 'size', 'font', 'width', 'align', 'vpad'], html: `<div style="background:{{P}};color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>` },
      { label: 'Underline header', props: ['color', 'size', 'font', 'width', 'align', 'vpad'], html: `<h2 style="border-bottom:2px solid {{P}};padding:{{VPAD}} 0 4px;color:{{P}};font-size:{{SIZE}};font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</h2>` },
    ],
  },
  callouts: {
    label: 'Callouts', icon: '📌', items: [
      { label: 'Tip', props: ['size', 'font', 'width', 'vpad'], html: `<div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#2e7d32;">💡 Tip</strong><br>Add your tip here.</div>` },
      { label: 'Warning', props: ['size', 'font', 'width', 'vpad'], html: `<div style="background:#fff3e0;border-left:5px solid #e65100;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#e65100;">⚠️ Warning</strong><br>Add your warning here.</div>` },
      { label: 'Important', props: ['size', 'font', 'width', 'vpad'], html: `<div style="background:#fce4ec;border-left:5px solid #b71c1c;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#b71c1c;">❗ Important</strong><br>Add your note here.</div>` },
      { label: 'Note', props: ['size', 'font', 'width', 'vpad'], html: `<div style="background:#e3f2fd;border-left:5px solid #1565c0;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#1565c0;">📝 Note</strong><br>Add your note here.</div>` },
      { label: 'Success', props: ['size', 'font', 'width', 'vpad'], html: `<div style="background:#e8f5e9;border-left:5px solid #1b5e20;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#1b5e20;">✅ Success</strong><br>Add your success message here.</div>` },
    ],
  },
  lists: {
    label: 'Lists', icon: '☑', items: [
      { label: 'Checklist', generate: 'checklist', fields: [{ id: 'n', label: 'Items', type: 'number', default: 5, min: 2, max: 30 }] },
      { label: 'Steps', generate: 'steps', fields: [{ id: 'n', label: 'Steps', type: 'number', default: 4, min: 2, max: 20 }] },
      { label: 'Progress tracker', props: ['color', 'size', 'font', 'width'], html: `<div style="margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:{{P}};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">1</span><span>Step one</span></div><div style="display:flex;align-items:center;gap:8px;"><span style="background:#ccc;color:#333;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">2</span><span style="color:#999;">Step two</span></div></div>` },
    ],
  },
  layouts: {
    label: 'Layouts', icon: '⊞', items: [
      { label: 'Custom columns', generate: 'columns', fields: [{ id: 'split', label: 'Split', type: 'select', options: ['50/50', '67/33', '33/67', '33/33/33', '25/75', '75/25'], default: '50/50' }] },
      { label: 'Two columns', props: ['size', 'font', 'width'], html: `<table style="width:{{WIDTH}};border-collapse:collapse;margin:1em 0;"><tr><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column one content here.</td><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column two content here.</td></tr></table>` },
      { label: 'Collapsible', props: ['color', 'size', 'font', 'width'], html: `<details open style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><summary style="font-weight:bold;cursor:pointer;color:{{P}};">Click to expand ▾</summary><div style="margin-top:12px;padding:10px 12px;">Hidden content goes here.</div></details>` },
    ],
  },
  cards: {
    label: 'Cards', icon: '▭', items: [
      {
        label: 'Card grid', generate: 'cards', fields: [
          { id: 'cols', label: 'Columns', type: 'number', default: 3, min: 1, max: 6 },
          { id: 'rows', label: 'Rows', type: 'number', default: 2, min: 1, max: 6 },
          { id: 'cardStyle', label: 'Style', type: 'select', default: 'shadow', options: ['shadow', 'bordered', 'outlined', 'filled', 'minimal'] },
        ],
      },
      { label: 'Pull quote', props: ['color', 'size', 'font', 'width'], html: `<blockquote style="border-left:4px solid {{P}};margin:1em 0;padding:14px 18px;background:{{L}};font-style:italic;color:#333;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};border-radius:0 6px 6px 0;">"Add your quote or key point here."<br><cite style="font-style:normal;font-size:.85em;color:#666;margin-top:8px;display:block;">— Source</cite></blockquote>` },
      { label: 'Button link', props: ['color', 'size', 'font', 'align'], html: `<p style="margin:1em 0;text-align:{{ALIGN}};"><a href="#" style="display:inline-block;background:{{P}};color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:{{FONT}};font-size:{{SIZE}};">Button Label</a></p>` },
    ],
  },
  dividers: {
    label: 'Dividers', icon: '—', items: [
      { label: 'Simple line', props: ['color'], html: `<hr style="border:none;border-top:1px solid {{P}};margin:1em 0;">` },
      { label: 'Colored bar', props: ['color'], html: `<hr style="border:none;height:4px;background:{{P}};margin:1em 0;">` },
    ],
  },
};

export function applyProps(html: string, props: { color?: ColorPair; font?: string; size?: string; width?: string; align?: string; vpad?: string }): string {
  const c = props.color || COLORS[0];
  return html
    .replace(/\{\{P\}\}/g, c.p)
    .replace(/\{\{L\}\}/g, c.l)
    .replace(/\{\{FONT\}\}/g, props.font || 'inherit')
    .replace(/\{\{SIZE\}\}/g, props.size || '14px')
    .replace(/\{\{WIDTH\}\}/g, props.width || '100%')
    .replace(/\{\{ALIGN\}\}/g, props.align || 'left')
    .replace(/\{\{VPAD\}\}/g, props.vpad || '12px');
}

export type ThemeDef = { name: string; primary: string; secondary: string; bg: string; headerBg: string; text: string };
export const THEMES: Record<string, ThemeDef> = {
  ocean: { name: '🔵 Ocean', primary: '#0770B8', secondary: '#38bdf8', bg: '#f0f7ff', headerBg: '#dbeafe', text: '#111827' },
  forest: { name: '🌲 Forest', primary: '#166534', secondary: '#15803d', bg: '#f0fdf4', headerBg: '#dcfce7', text: '#14532d' },
  sunset: { name: '🌅 Sunset', primary: '#c2410c', secondary: '#e11d48', bg: '#fff7ed', headerBg: '#ffedd5', text: '#431407' },
  academic: { name: '🎓 Academic', primary: '#1e3a8a', secondary: '#b45309', bg: '#f8fafc', headerBg: '#dbeafe', text: '#172554' },
  minimal: { name: '□ Minimal', primary: '#334155', secondary: '#64748b', bg: '#ffffff', headerBg: '#f8fafc', text: '#0f172a' },
};

export type ReadyMadePage = { key: string; label: string; description: string; html: (title: string) => string };
export const READY_MADE_PAGES: ReadyMadePage[] = [
  {
    key: 'welcome', label: 'Welcome Page', description: 'Course intro banner + what-to-expect list',
    html: (title) => `<div style="background:#1e3a5f;padding:28px 32px;border-bottom:3px solid #2f6fb0;"><h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;margin:0;">${title}</h1></div><div style="max-width:860px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;"><p style="font-size:14px;line-height:1.7;color:#334155;">Welcome! Here's what to expect in this course.</p><ul style="font-size:14px;line-height:1.8;color:#334155;"><li>Weekly modules with readings and activities</li><li>Regular check-in quizzes</li><li>A final project</li></ul></div>`,
  },
  {
    key: 'lesson', label: 'Lesson Page', description: 'Header + two content sections + tip callout',
    html: (title) => `<div style="background:#1e3a5f;padding:28px 32px;border-bottom:3px solid #2f6fb0;"><h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;margin:0;">${title}</h1></div><div style="max-width:860px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;"><h2 style="font-family:Georgia,serif;font-size:19px;color:#1e3a5f;border-bottom:1px solid #cbd5e1;padding-bottom:6px;">Overview</h2><p style="font-size:14px;line-height:1.7;color:#334155;">Introduce the topic here.</p><h2 style="font-family:Georgia,serif;font-size:19px;color:#1e3a5f;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin-top:24px;">Key Concepts</h2><p style="font-size:14px;line-height:1.7;color:#334155;">Explain the main ideas here.</p><div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:12px 16px;margin:1em 0;border-radius:0 4px 4px 0;"><strong style="color:#2e7d32;">💡 Tip</strong><br>Add a helpful tip here.</div></div>`,
  },
  {
    key: 'faq', label: 'FAQ Page', description: 'Header + a few collapsible Q&A entries',
    html: (title) => `<div style="background:#1e3a5f;padding:28px 32px;border-bottom:3px solid #2f6fb0;"><h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;margin:0;">${title}</h1></div><div style="max-width:860px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;">${[1, 2, 3].map(n => `<details style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin-bottom:8px;"><summary style="font-weight:bold;cursor:pointer;color:#0770B8;">Question ${n}?</summary><div style="margin-top:10px;color:#334155;">Answer ${n}.</div></details>`).join('')}</div>`,
  },
];
