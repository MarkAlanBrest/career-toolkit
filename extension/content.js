(async function () {
  'use strict';

  // ── STORAGE SHIM ─────────────────────────────────────────────────────────────
  // Pre-load all keys used by this script so GM_getValue/GM_setValue work sync.
  const STORAGE_KEYS = ['ce_components','ce_version','ce_license_key','ce_canvas_token','ce_grader_settings'];
  const _store = await new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEYS, resolve);
  });
  function GM_getValue(key, def) { return _store[key] ?? def; }
  function GM_setValue(key, val) {
    _store[key] = val;
    chrome.storage.local.set({ [key]: val });
  }

  // ── AI GENERATE (via background service worker) ───────────────────────────────
  function ceGenerate(payload) {
    return new Promise((resolve, reject) => {
      // Hold an open port so the MV3 service worker isn't terminated mid-request
      let port;
      try { port = chrome.runtime.connect({ name: 'ce-keepalive' }); } catch(e) {}
      chrome.runtime.sendMessage({ type: 'GENERATE', payload }, res => {
        try { port?.disconnect(); } catch(e) {}
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (res?.error) return reject(new Error(res.error));
        resolve(res);
      });
    });
  }

  async function ceCanvasApi(url) {
    // Canvas API is same-origin — fetch directly from the content script, no background worker needed
    const token = GM_getValue('ce_canvas_token', '');
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || `Canvas API error ${res.status}`);
    return data;
  }

  async function ceParseFile(b64, filename, mimeType, fileUrl) {
    let base64 = b64;
    // If given a Canvas file URL, fetch it directly from the content script (same-origin on Canvas)
    if (!base64 && fileUrl) {
      const token = GM_getValue('ce_canvas_token', '');
      const fileRes = await fetch(fileUrl, token ? { headers: { 'Authorization': `Bearer ${token}` } } : {});
      if (!fileRes.ok) throw new Error(`Could not download file: HTTP ${fileRes.status}`);
      const buffer = await fileRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      base64 = btoa(bin);
    }
    // POST directly to Vercel — bypasses background service worker entirely
    const res = await fetch('https://career-toolkit-ruby.vercel.app/api/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b64: base64, filename, mimeType }),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Server error ${res.status} — deploy the latest version to Vercel first`); }
    if (!res.ok) throw new Error(data?.error || `Parse error ${res.status}`);
    return data;
  }

  const BAKED_VERSION = '2.4';
  const COMPONENTS_URL = 'https://career-toolkit-ruby.vercel.app/components.json';

  // ── THEME COLORS ─────────────────────────────────────────────────────────────
  const COLORS = [
    { name:'Ocean Blue',   p:'#0770B8', l:'#e3f2fd' },
    { name:'Forest Green', p:'#2e7d32', l:'#e8f5e9' },
    { name:'Crimson',      p:'#b71c1c', l:'#fce4ec' },
    { name:'Purple',       p:'#6a1b9a', l:'#f3e5f5' },
    { name:'Orange',       p:'#e65100', l:'#fff3e0' },
    { name:'Teal',         p:'#00695c', l:'#e0f2f1' },
    { name:'Slate',        p:'#37474f', l:'#f5f5f5' },
    { name:'Gold',         p:'#f9a825', l:'#fffde7' },
    { name:'Dark',         p:'#212121', l:'#f5f5f5' },
  ];

  // ── FONT OPTIONS ──────────────────────────────────────────────────────────────
  const FONT_FAMILIES = [
    { label:'Default (Arial)',  value:'Arial, sans-serif' },
    { label:'Georgia',          value:'Georgia, serif' },
    { label:'Trebuchet',        value:'"Trebuchet MS", sans-serif' },
    { label:'Verdana',          value:'Verdana, sans-serif' },
    { label:'Times New Roman',  value:'"Times New Roman", serif' },
    { label:'Monospace',        value:'"Courier New", monospace' },
  ];

  const FONT_SIZES = ['10px','12px','14px','16px','18px','20px','24px','28px','32px','36px','48px'];

  // ── ICONS ────────────────────────────────────────────────────────────────────
  const ICONS = {
    Education: ['📚','📖','✏️','🎓','🏫','📝','📐','🔬','🧪','🧮','🗂','📋','🖊','📏','🗒','💻','🖥','⌨','🖱','📡','🔭','🧬','🧫','🧲','⚗','🏛','📜','🗺','🧭','🎒','🖼','🖋','📌','🗝','🔍'],
    Time:      ['⏰','📅','⏱','🗓','📆','🕐','🕑','🕔','🕗','🕙','⌛','⏳','🕛','🕧','⌚','⏲','🔔','📬','🔁','🔄','⏯','⏮','⏭','⏩','⏪','⏫','⏬','🔛','🔜','🔚','🔙','▶','⏸','⏹'],
    Status:    ['✅','❌','⚠️','🚫','❓','❗','💡','🔔','🔕','💯','🔒','🔓','🔑','⭐','🌟','🆕','🆗','🆘','🆙','🔴','🟡','🟢','🔵','🟣','⚫','⚪','🔺','🔻','📌','📍','🚩','🏁','🔖','💬','🗯','💭','✔','✗','ℹ'],
    People:    ['👤','👥','🧑‍🏫','🧑‍🎓','👩‍💼','👨‍💻','🤝','👋','🙋','🙌','👏','💪','🧠','👁','👂','🫀','🤲','☝','✌','🤞','👍','👎','🫶','🙏','✊','👊','🤜','🤛','🫱','🫲','👨‍👩‍👧','👨‍👩‍👦','🧑‍🤝‍🧑'],
    Files:     ['📁','📂','📄','📊','📈','📉','💾','📎','🔗','📌','📍','🗃','🗄','📦','📥','📤','📧','📨','📩','🗑','🗞','📰','📃','📑','📒','📓','📔','📕','📗','📘','📙','🗒','📐','✂','🖨'],
    Symbols:   ['⭐','🏆','🎯','💡','🔑','🎉','✨','🚀','💎','🔥','⚡','🌈','🎨','🎵','🎤','🏅','🥇','🎖','🏵','🎗','🎀','🎁','💝','💠','🔮','🪄','✴','❇','🌀','💫','🪐','🌐','☀','🌙','🌊','🍀'],
    Arrows:    ['→','←','↑','↓','↔','↕','↗','↘','↙','↖','➡','⬅','⬆','⬇','↩','↪','↺','↻','⇒','⇐','⇑','⇓','⇔','⇕','➤','➥','➦','⇧','⇩','⇦','▶','◀','▲','▼','⟵','⟶','⟷','⤴','⤵','↬'],
    Shapes:    ['■','□','▪','▫','◼','◻','▲','△','▶','▷','◀','◁','◆','◇','●','○','◉','◎','★','☆','⬛','⬜','⬡','⬢','⬣','🔶','🔷','🔸','🔹','🔺','🔻','🟥','🟧','🟨','🟩','🟦','🟪','⚫','⚪','🔘','🔲','🔳','▰','▱'],
    Math:      ['➕','➖','✖️','➗','±','=','≠','≈','≡','<','>','≤','≥','∝',
                '²','³','⁴','ⁿ','√','∛','∜','%','‰',
                'π','Σ','Δ','Ω','θ','φ','λ','μ','α','β','γ','ε','ρ','σ',
                '∞','∫','∂','∇','∴','∵','∀','∃',
                '∈','∉','⊂','⊃','⊆','⊇','∪','∩','∅',
                '→','←','↔','⇒','⇐','⇔',
                '°','′','″','∠','⊥','∥','≅','∼',
                '½','⅓','¼','¾','⅔','⅛','⅜','⅝','⅞'],
  };

  // ── NAV LINKS ────────────────────────────────────────────────────────────────

  // ── GENERATORS ───────────────────────────────────────────────────────────────
  const GENERATORS = {
    checklist(p) {
      const n = Math.min(Math.max(parseInt(p.n)||5,2),30);
      return `<ul style="list-style:none;padding:0;margin:1em 0;">`
        + Array.from({length:n},(_,i)=>`<li style="padding:6px 0;border-bottom:1px solid #f0f0f0;">☐ Item ${i+1}</li>`).join('')
        + `</ul>`;
    },
    steps(p) {
      const n = Math.min(Math.max(parseInt(p.n)||4,2),20);
      return `<ul style="list-style:none;padding:0;margin:1em 0;">`
        + Array.from({length:n},(_,i)=>`<li style="padding:6px 0;"><strong>Step ${i+1}:</strong> Description here.</li>`).join('')
        + `</ul>`;
    },
    table(p) {
      const rows=Math.min(Math.max(parseInt(p.rows)||3,1),15);
      const cols=Math.min(Math.max(parseInt(p.cols)||3,2),8);
      const color=p.color||'#0770B8';
      const hdrs=Array.from({length:cols},(_,i)=>`<th style="padding:10px 12px;text-align:left;">Column ${String.fromCharCode(65+i)}</th>`).join('');
      const dataRows=Array.from({length:rows},(_,r)=>{
        const cells=Array.from({length:cols},()=>`<td style="padding:9px 12px;border-bottom:1px solid #eee;">Data</td>`).join('');
        return `<tr${r%2===0?' style="background:#f9f9f9;"':''}>${cells}</tr>`;
      }).join('');
      return `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><thead><tr style="background:${color};color:#fff;">${hdrs}</tr></thead><tbody>${dataRows}</tbody></table>`;
    },
    faq(p) {
      const n=Math.min(Math.max(parseInt(p.n)||4,2),15);
      const color=p.color||'#0770B8';
      return `<div style="margin:1em 0;">`
        + Array.from({length:n},(_,i)=>`<details style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin-bottom:4px;"><summary style="font-weight:bold;cursor:pointer;color:${color};">Question ${i+1}?</summary><div style="margin-top:10px;">Answer ${i+1}.</div></details>`).join('')
        + `</div>`;
    },
    schedule(p) {
      const weeks=Math.min(Math.max(parseInt(p.weeks)||8,2),30);
      const color=p.color||'#0770B8';
      const rows=Array.from({length:weeks},(_,i)=>`<tr${i%2===0?' style="background:#f9f9f9;"':''}><td style="padding:9px 12px;border-bottom:1px solid #eee;font-weight:bold;">${i+1}</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Topic here</td><td style="padding:9px 12px;border-bottom:1px solid #eee;">Assignment here</td></tr>`).join('');
      return `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><thead><tr style="background:${color};color:#fff;"><th style="padding:10px 12px;text-align:left;">Week</th><th style="padding:10px 12px;text-align:left;">Topic</th><th style="padding:10px 12px;text-align:left;">Due</th></tr></thead><tbody>${rows}</tbody></table>`;
    },
    columns(p) {
      const parts=(p.split||'50/50').split('/').map(Number);
      const cells=parts.map(w=>`<td style="width:${w}%;padding:12px;vertical-align:top;border:1px solid #ddd;">Content here.</td>`).join('');
      return `<table style="width:100%;border-collapse:collapse;margin:1em 0;"><tr>${cells}</tr></table>`;
    },
    cards(p) {
      const rows  = Math.min(Math.max(parseInt(p.rows)||2,1),6);
      const cols  = Math.min(Math.max(parseInt(p.cols)||3,1),6);
      const style = p.cardStyle || 'shadow';
      const pad   = p.padding   || '16px';
      const gap   = parseInt(p.gap)||12;
      const minH  = p.minH      || '200px';
      const color = p.color     || '#0770B8';
      const bg    = p.bgcolor   || '';
      const pct   = (100/cols).toFixed(2);
      let css;
      switch(style) {
        case 'shadow':   css=`background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12);border-top:3px solid ${color};`; break;
        case 'bordered': css=`background:#fff;border:1px solid ${color};border-radius:8px;`; break;
        case 'outlined': css=`background:#fff;border:2px solid ${color};border-radius:8px;`; break;
        case 'filled':   css=`background:${color};color:#fff;border-radius:8px;`; break;
        case 'minimal':  css=`background:#f9f9f9;border-left:3px solid ${color};border-radius:0 4px 4px 0;`; break;
        default:         css=`background:#fff;border:1px solid ${color};border-radius:8px;`;
      }
      const containerStyle = bg
        ? `width:100%;border-collapse:separate;border-spacing:${gap}px;margin:1em 0;table-layout:fixed;background:${bg};padding:${Math.ceil(gap/2)}px;border-radius:8px;box-sizing:border-box;`
        : `width:100%;border-collapse:separate;border-spacing:${gap}px;margin:1em 0;table-layout:fixed;`;
      const cell = `<td style="${css}padding:${pad};min-height:${minH};vertical-align:top;width:${pct}%;box-sizing:border-box;">Content here.</td>`;
      let html = `<table style="${containerStyle}">`;
      for(let r=0;r<rows;r++) html+=`<tr>${Array(cols).fill(cell).join('')}</tr>`;
      html+=`</table>`;
      return html;
    },
  };

  // ── COMPONENTS ────────────────────────────────────────────────────────────────
  const BAKED_COMPONENTS = {
    dividers:{label:'Dividers',icon:'—',items:[
      {label:'Simple line',   props:['color'], html:`<hr style="border:none;border-top:1px solid {{P}};margin:1em 0;">`},
      {label:'Bold line',     props:['color'], html:`<hr style="border:none;border-top:3px solid {{P}};margin:1em 0;">`},
      {label:'Dashed line',   props:['color'], html:`<hr style="border:none;border-top:2px dashed {{P}};margin:1em 0;">`},
      {label:'Double line',   props:['color'], html:`<hr style="border:none;border-top:4px double {{P}};margin:1em 0;">`},
      {label:'Colored bar',   props:['color'], html:`<hr style="border:none;height:4px;background:{{P}};margin:1em 0;">`},
      {label:'Gradient bar',  props:['color'], html:`<hr style="border:none;height:4px;background:linear-gradient(to right,{{P}},{{P}}55);margin:1em 0;">`},
    ]},
    headers:{label:'Headers',icon:'H',items:[
      {label:'Section banner',   props:['color','size','font','width','align','vpad'], html:`<div style="background:{{L}};border-left:5px solid {{P}};padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;color:#1a1a1a;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>`},
      {label:'Solid banner',     props:['color','size','font','width','align','vpad'], html:`<div style="background:{{P}};color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>`},
      {label:'Gradient banner',  pro:true, props:['color','size','font','width','align','vpad'], html:`<div style="background:linear-gradient(to right,{{P}},{{P}}99);color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>`},
      {label:'Underline header', props:['color','size','font','width','align','vpad'], html:`<h2 style="border-bottom:2px solid {{P}};padding:{{VPAD}} 0 4px;color:{{P}};font-size:{{SIZE}};font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</h2>`},
      {label:'Dark banner',      pro:true, props:['size','font','width','align','vpad'],         html:`<div style="background:#212121;color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">Section Title</div>`},
      {label:'Warning banner',   pro:true, props:['size','font','width','align','vpad'],         html:`<div style="background:#7B1900;color:#fff;padding:{{VPAD}} 16px;margin:1em 0;font-size:{{SIZE}};font-weight:bold;border-radius:4px;font-family:{{FONT}};text-align:{{ALIGN}};width:{{WIDTH}};">⚠ Important Notice</div>`},
    ]},
    callouts:{label:'Callouts',icon:'📌',items:[
      {label:'Tip',          props:['size','font','width','vpad'], html:`<div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#2e7d32;">💡 Tip</strong><br>Add your tip here.</div>`},
      {label:'Warning',      props:['size','font','width','vpad'], html:`<div style="background:#fff3e0;border-left:5px solid #e65100;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#e65100;">⚠️ Warning</strong><br>Add your warning here.</div>`},
      {label:'Important',    props:['size','font','width','vpad'], html:`<div style="background:#fce4ec;border-left:5px solid #b71c1c;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#b71c1c;">❗ Important</strong><br>Add your note here.</div>`},
      {label:'Note',         props:['size','font','width','vpad'], html:`<div style="background:#e3f2fd;border-left:5px solid #1565c0;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#1565c0;">📝 Note</strong><br>Add your note here.</div>`},
      {label:'Custom',       pro:true, props:['color','size','font','width','vpad'], html:`<div style="background:{{L}};border-left:5px solid {{P}};padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:{{P}};">📌 Callout</strong><br>Add your content here.</div>`},
      {label:'Did You Know', pro:true, props:['size','font','width','vpad'], html:`<div style="background:#fffde7;border-left:5px solid #f9a825;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#f57f17;">🤔 Did You Know?</strong><br>Add your fun fact here.</div>`},
      {label:'Do Not',       pro:true, props:['size','font','width','vpad'], html:`<div style="background:#f3e5f5;border-left:5px solid #6a1b9a;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#6a1b9a;">🚫 Do Not</strong><br>Describe what to avoid here.</div>`},
      {label:'Success',      pro:true, props:['size','font','width','vpad'], html:`<div style="background:#e8f5e9;border-left:5px solid #1b5e20;padding:{{VPAD}} 16px;margin:1em 0;border-radius:0 4px 4px 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><strong style="color:#1b5e20;">✅ Success</strong><br>Add your success message here.</div>`},
    ]},
    lists:{label:'Lists',icon:'☑',items:[
      {label:'Checklist', props:['size','width'], generate:'checklist', fields:[{id:'n',label:'Items',type:'number',default:5,min:2,max:30}]},
      {label:'Steps',     props:['size','width'], generate:'steps',     fields:[{id:'n',label:'Steps',type:'number',default:4,min:2,max:20}]},
      {label:'Icon list ✅',   pro:true, props:['size','font','width'], html:`<ul style="list-style:none;padding:0;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span>✅</span><span>Item one</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span>✅</span><span>Item two</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;"><span>✅</span><span>Item three</span></li></ul>`},
      {label:'Icon list ▶',   pro:true, props:['color','size','font','width'], html:`<ul style="list-style:none;padding:0;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};">▶</span><span>Item one</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};">▶</span><span>Item two</span></li><li style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;"><span style="color:{{P}};">▶</span><span>Item three</span></li></ul>`},
      {label:'Badge labels',    pro:true, props:['color','size','font'], html:`<p style="margin:1em 0;font-size:{{SIZE}};"><span style="background:{{P}};color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;margin-right:6px;font-family:{{FONT}};">Label A</span><span style="background:#2e7d32;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;margin-right:6px;">Label B</span><span style="background:#e65100;color:#fff;padding:3px 10px;border-radius:12px;font-size:.85em;">Label C</span></p>`},
      {label:'Progress tracker',props:['color','size','font','width'], html:`<div style="margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:{{P}};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">1</span><span>Step one</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:{{P}};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">2</span><span>Step two</span></div><div style="display:flex;align-items:center;gap:8px;"><span style="background:#ccc;color:#333;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8em;font-weight:bold;flex-shrink:0;">3</span><span style="color:#999;">Step three</span></div></div>`},
    ]},
    layouts:{label:'Layouts',icon:'⊞',items:[
      {label:'Custom columns', pro:true, props:['size','font','width'], generate:'columns', fields:[{id:'split',label:'Split',type:'select',options:['50/50','67/33','33/67','33/33/33','25/75','75/25'],default:'50/50'}]},
      {label:'Two columns',   props:['size','font','width'], html:`<table style="width:{{WIDTH}};border-collapse:collapse;margin:1em 0;"><tr><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column one content here.</td><td style="width:50%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column two content here.</td></tr></table>`},
      {label:'Three columns', props:['size','font','width'], html:`<table style="width:{{WIDTH}};border-collapse:collapse;margin:1em 0;"><tr><td style="width:33%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column one.</td><td style="width:33%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column two.</td><td style="width:34%;padding:12px;vertical-align:top;border:1px solid #ddd;font-family:{{FONT}};font-size:{{SIZE}};">Column three.</td></tr></table>`},
      {label:'Image + text',  pro:true, props:['size','font','width'], html:`<table style="width:{{WIDTH}};border-collapse:collapse;border:1px solid #ddd;margin:1em 0;"><tr><td style="width:200px;background:#e0e0e0;padding:16px;text-align:center;color:#666;vertical-align:middle;">[Image]</td><td style="padding:16px;vertical-align:top;font-family:{{FONT}};font-size:{{SIZE}};"><strong>Card Title</strong><br><br>Card description goes here.</td></tr></table>`},
      {label:'Collapsible',   pro:true, props:['color','size','font','width'], html:`<details open style="border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin:1em 0;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};"><summary style="font-weight:bold;cursor:pointer;color:{{P}};">Click to expand ▾</summary><div style="margin-top:12px;padding:10px 12px;border:2px dashed #ccc;border-radius:4px;min-height:48px;cursor:text;">Hidden content goes here.</div></details>`},
    ]},
    cards:{label:'Cards',icon:'▭',items:[
      {label:'Card grid', props:['color','bgcolor'], generate:'cards', fields:[
        {id:'cols',      label:'Columns', type:'number', default:3,  min:1, max:6},
        {id:'rows',      label:'Rows',    type:'number', default:2,  min:1, max:6},
        {id:'cardStyle', label:'Style',   type:'select', default:'shadow',  options:['shadow','bordered','outlined','filled','minimal']},
        {id:'minH',      label:'Height',  type:'select', default:'200px',   options:['120px','160px','200px','250px','300px','400px']},
        {id:'padding',   label:'Padding', type:'select', default:'16px',    options:['8px','12px','16px','24px','32px']},
        {id:'gap',       label:'Gap',     type:'select', default:'12',      options:['4','8','12','16','24']},
      ]},
      {label:'Instructor Bio',  pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:18px 20px;"><strong style="font-size:1.15em;display:block;">Instructor Name</strong><span style="opacity:.85;font-size:.9em;">Course Title · Department</span></div><div style="padding:18px 20px;display:flex;gap:16px;align-items:flex-start;"><div style="min-width:72px;height:72px;background:#e8e8e8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2em;flex-shrink:0;">👤</div><div><p style="margin:0 0 10px;">Brief bio or welcome statement. Share your background, research interests, or why you love this subject.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.9em;color:#555;"><span>📧 email@university.edu</span><span>📍 Office: Bldg 000</span><span>⏰ Hours: Mon/Wed 2–4pm</span><span>📞 (000) 000-0000</span></div></div></div></div>`},
      {label:'Tips',            pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">💡 Tips for Success</strong></div><div style="padding:16px 18px;"><ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};font-size:1.1em;flex-shrink:0;">✓</span><span><strong>Stay organized.</strong> Keep track of due dates and set reminders early.</span></li><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span style="color:{{P}};font-size:1.1em;flex-shrink:0;">✓</span><span><strong>Ask questions.</strong> There are no silly questions — reach out early and often.</span></li><li style="display:flex;gap:10px;padding:8px 0;"><span style="color:{{P}};font-size:1.1em;flex-shrink:0;">✓</span><span><strong>Participate.</strong> Engage with your classmates and share your perspective.</span></li></ul></div></div>`},
      {label:'Welcome',         pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:linear-gradient(135deg,{{P}},{{P}}bb);color:#fff;padding:22px 24px;"><strong style="font-size:1.3em;display:block;margin-bottom:4px;">Welcome to [Course Name]!</strong><span style="opacity:.85;font-size:.92em;">We're glad you're here.</span></div><div style="padding:18px 20px;"><p style="margin:0 0 12px;">Hello and welcome! I'm [Your Name] and I'm thrilled to have you in this course. This semester we'll explore [topic] together and I'm excited for the journey ahead.</p><p style="margin:0;color:#555;font-size:.9em;">Feel free to reach out any time — my door (and inbox) is always open.</p></div></div>`},
      {label:'Office Hours',    pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">⏰ Office Hours</strong></div><div style="padding:16px 18px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-weight:bold;width:140px;">Monday</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;">2:00 – 4:00 PM · Room 000</td></tr><tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-weight:bold;">Wednesday</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;">2:00 – 4:00 PM · Room 000</td></tr><tr><td style="padding:7px 0;font-weight:bold;">By Appointment</td><td style="padding:7px 0;">Email to schedule a Zoom or in-person meeting</td></tr></table></div></div>`},
      {label:'Due Date',        pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">📅 Important Dates</strong></div><div style="padding:16px 18px;"><div style="display:flex;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><div style="background:{{P}};color:#fff;border-radius:6px;padding:8px 12px;text-align:center;min-width:52px;flex-shrink:0;"><div style="font-size:1.3em;font-weight:bold;line-height:1;">01</div><div style="font-size:.7em;text-transform:uppercase;opacity:.9;">Month</div></div><div><strong style="display:block;">Assignment Name</strong><span style="font-size:.85em;color:#666;">Due by 11:59 PM — Submit via Canvas</span></div></div><div style="display:flex;align-items:center;gap:14px;padding:8px 0;"><div style="background:{{P}};color:#fff;border-radius:6px;padding:8px 12px;text-align:center;min-width:52px;flex-shrink:0;"><div style="font-size:1.3em;font-weight:bold;line-height:1;">15</div><div style="font-size:.7em;text-transform:uppercase;opacity:.9;">Month</div></div><div><strong style="display:block;">Final Project</strong><span style="font-size:.85em;color:#666;">Due by 11:59 PM — Submit via Canvas</span></div></div></div></div>`},
      {label:'Course Policies', pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">📋 Course Policies</strong></div><div style="padding:16px 18px;"><ul style="list-style:none;padding:0;margin:0;"><li style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><strong>Late Work:</strong> Policy description here.</li><li style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><strong>Attendance:</strong> Policy description here.</li><li style="padding:8px 0;border-bottom:1px solid #f0f0f0;"><strong>Academic Integrity:</strong> Policy description here.</li><li style="padding:8px 0;"><strong>Communication:</strong> Expect a response within 24–48 hours via Canvas Inbox.</li></ul></div></div>`},
      {label:'Grading Breakdown',pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">📊 Grading Breakdown</strong></div><div style="padding:0 18px 14px;"><table style="width:100%;border-collapse:collapse;margin-top:4px;"><thead><tr style="border-bottom:2px solid #eee;"><th style="padding:10px 8px 8px 0;text-align:left;color:#555;font-size:.9em;">Category</th><th style="padding:10px 8px 8px;text-align:center;color:#555;font-size:.9em;">Weight</th><th style="padding:10px 0 8px 8px;text-align:center;color:#555;font-size:.9em;">Points</th></tr></thead><tbody><tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 8px 8px 0;">Assignments</td><td style="padding:8px;text-align:center;">40%</td><td style="padding:8px 0 8px 8px;text-align:center;">400</td></tr><tr style="border-bottom:1px solid #f0f0f0;background:#f9f9f9;"><td style="padding:8px 8px 8px 0;">Quizzes</td><td style="padding:8px;text-align:center;">30%</td><td style="padding:8px 0 8px 8px;text-align:center;">300</td></tr><tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 8px 8px 0;">Participation</td><td style="padding:8px;text-align:center;">20%</td><td style="padding:8px 0 8px 8px;text-align:center;">200</td></tr><tr style="font-weight:bold;background:#f0f4f8;"><td style="padding:8px 8px 8px 0;">Final Exam</td><td style="padding:8px;text-align:center;">10%</td><td style="padding:8px 0 8px 8px;text-align:center;">100</td></tr></tbody></table></div></div>`},
      {label:'Submit Checklist', pro:true, props:['color','size','font','width'], html:`<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:1em 0;width:{{WIDTH}};font-family:{{FONT}};font-size:{{SIZE}};box-shadow:0 2px 8px rgba(0,0,0,.08);"><div style="background:{{P}};color:#fff;padding:14px 18px;"><strong style="font-size:1.05em;">✅ Before You Submit</strong></div><div style="padding:16px 18px;"><ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement one — describe what to check here.</span></li><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement two — describe what to check here.</span></li><li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement three — describe what to check here.</span></li><li style="display:flex;gap:10px;padding:8px 0;align-items:center;"><span style="color:{{P}};font-size:1.2em;">☐</span><span>Requirement four — describe what to check here.</span></li></ul></div></div>`},
      {label:'Pull quote',      props:['color','size','font','width'], html:`<blockquote style="border-left:4px solid {{P}};margin:1em 0;padding:14px 18px;background:{{L}};font-style:italic;color:#333;font-family:{{FONT}};font-size:{{SIZE}};width:{{WIDTH}};border-radius:0 6px 6px 0;">"Add your quote or key point here."<br><cite style="font-style:normal;font-size:.85em;color:#666;margin-top:8px;display:block;">— Source</cite></blockquote>`},
      {label:'Button link',     props:['color','size','font','align'], html:`<p style="margin:1em 0;text-align:{{ALIGN}};"><a href="#" style="display:inline-block;background:{{P}};color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:{{FONT}};font-size:{{SIZE}};">Button Label</a></p>`},
    ]},
  };

  // ── STATE ─────────────────────────────────────────────────────────────────────
  let COMPONENTS = BAKED_COMPONENTS;
  let pendingItem = null;

  // ── SELF-UPDATE ───────────────────────────────────────────────────────────────
  function loadComponents() {
    try {
      const cached = GM_getValue('ce_components', null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parseFloat(parsed.version) > parseFloat(BAKED_VERSION)) {
          COMPONENTS = { ...parsed.components, navigation: BAKED_COMPONENTS.navigation };
        }
      }
    } catch(e) {}
    fetch(COMPONENTS_URL + '?v=' + Date.now())
      .then(r => r.json())
      .then(data => {
        const curVer = parseFloat(GM_getValue('ce_version', BAKED_VERSION));
        if (parseFloat(data.version) > curVer) {
          GM_setValue('ce_components', JSON.stringify(data));
          GM_setValue('ce_version', data.version);
          COMPONENTS = { ...data.components, navigation: BAKED_COMPONENTS.navigation };
          const t = document.getElementById('ce-toolbar');
          if (t) { t.remove(); buildToolbar(); }
        }
      })
      .catch(() => {});
  }

  // ── CSS ───────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #ce-toolbar {
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important;
      font-size:14px !important; background:#fff !important;
      border:none !important; border-bottom:1px solid #c7cdd1 !important;
      border-radius:0 !important; box-shadow:none !important;
      position:relative !important; z-index:9000 !important; user-select:none !important;
    }
    #ce-row-top {
      display:flex; align-items:center; gap:2px;
      padding:4px 8px 4px 26px; border-bottom:1px solid #e8e8e8; flex-wrap:wrap;
    }
    #ce-row-bottom {
      display:flex; align-items:center; gap:2px;
      padding:4px 8px 4px 26px; flex-wrap:wrap;
    }
    #ce-row-props {
      display:none; align-items:center; gap:8px; flex-wrap:wrap;
      padding:8px 12px; border-top:1px solid #e0e0e0;
      background:#fff; border-bottom:2px solid #0770B8;
    }
    #ce-row-props.open { display:flex; }
    #ce-props-label {
      font-size:11px; font-weight:700; color:#0770B8;
      text-transform:uppercase; letter-spacing:.06em; white-space:nowrap;
      padding-right:4px; border-right:1px solid #ddd; margin-right:4px;
    }
    #ce-props-insert {
      margin-left:auto; padding:6px 18px; background:#0770B8;
      color:#fff; border:none; border-radius:4px; cursor:pointer;
      font-size:13px; font-weight:600; font-family:inherit;
      white-space:nowrap; transition:background .15s;
    }
    #ce-props-insert:hover { background:#055b9a; }
    #ce-props-cancel {
      padding:6px 12px; background:#fff; color:#666;
      border:1px solid #ccc; border-radius:4px; cursor:pointer;
      font-size:13px; font-family:inherit; transition:background .15s;
    }
    #ce-props-cancel:hover { background:#f5f5f5; }
    .ce-prop {
      display:flex; align-items:center; gap:5px;
      font-size:12px; color:#555;
    }
    .ce-prop label { white-space:nowrap; font-size:11px; color:#888; }
    .ce-prop input[type=number] {
      width:52px; padding:4px 6px; border:1px solid #ccc; border-radius:3px;
      font-size:12px; font-family:inherit;
    }
    .ce-prop select {
      padding:4px 6px; border:1px solid #ccc; border-radius:3px;
      font-size:12px; font-family:inherit; background:#fff;
    }
    .ce-prop-swatches { display:flex; gap:4px; align-items:center; flex-wrap:wrap; }
    .ce-prop-swatch {
      width:22px; height:22px; border-radius:4px;
      border:2px solid transparent; cursor:pointer; padding:0;
      transition:border-color .1s, transform .1s; flex-shrink:0;
    }
    .ce-prop-swatch:hover { transform:scale(1.15); }
    .ce-prop-swatch.active { border-color:#333 !important; box-shadow:0 0 0 1px #fff inset; }
    .ce-prop-sep { width:1px; height:20px; background:#e0e0e0; flex-shrink:0; }
    .ce-sep { width:1px; height:18px; background:#e8e8e8; margin:0 4px; flex-shrink:0; }
    #ce-toolbar .ce-group { position:relative; }
    #ce-toolbar .ce-btn {
      display:flex !important; align-items:center !important; gap:5px !important;
      background:transparent !important; border:none !important; border-radius:3px !important;
      box-shadow:none !important; padding:5px 8px !important; cursor:pointer !important;
      font-size:14px !important; color:#2d3b45 !important;
      white-space:nowrap !important; transition:background .1s !important; font-family:inherit !important;
      outline:none !important; text-decoration:none !important;
    }
    #ce-toolbar .ce-btn:hover, #ce-toolbar .ce-btn.ce-open { background:#e8e8e8 !important; color:#2d3b45 !important; border:none !important; box-shadow:none !important; }
    .ce-icon { font-style:normal; font-size:14px; }
    .ce-panel {
      display:none; position:absolute; top:calc(100% + 4px); left:0;
      background:#fff; border:1px solid #ddd; border-radius:4px;
      box-shadow:0 4px 12px rgba(0,0,0,.12); min-width:180px;
      z-index:9999; overflow:hidden;
    }
    .ce-panel.ce-open { display:block; }
    .ce-item {
      display:block; width:100%; text-align:left; background:none;
      border:none; border-bottom:1px solid #f0f0f0;
      padding:9px 14px; font-size:13px; color:#222;
      cursor:pointer; transition:background .1s; font-family:inherit;
    }
    .ce-item:last-child { border-bottom:none; }
    .ce-item:hover { background:#f0f0f0; color:#2d3b45; }
    .ce-icon-panel { min-width:300px; padding:0; }
    .ce-icon-tabs { display:flex; border-bottom:1px solid #eee; }
    .ce-icon-tab {
      flex:1; padding:7px 4px; border:none; background:none;
      cursor:pointer; font-size:11px; color:#666;
      border-bottom:2px solid transparent; font-family:inherit;
    }
    .ce-icon-tab.ce-active { color:#0770B8; border-bottom-color:#0770B8; }
    .ce-icon-grid {
      display:grid; grid-template-columns:repeat(8,1fr);
      gap:2px; padding:8px; max-height:200px; overflow-y:auto;
    }
    .ce-icon-btn {
      border:none; background:none; cursor:pointer;
      font-size:18px; padding:4px; border-radius:3px; line-height:1; transition:background .1s;
    }
    .ce-icon-btn:hover { background:#e8f0fb; }
    .ce-res-item {
      display:flex; align-items:center; gap:10px;
      padding:10px 14px; text-decoration:none; color:#222;
      border-bottom:1px solid #f0f0f0; font-size:13px; transition:background .1s;
    }
    .ce-res-item:last-child { border-bottom:none; }
    .ce-res-item:hover { background:#e8f0fb; color:#0770B8; }
    #ce-dialog-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,.4);
      z-index:99999; display:flex; align-items:center; justify-content:center;
    }
    #ce-dialog {
      background:#fff; border-radius:6px; padding:24px;
      box-shadow:0 8px 32px rgba(0,0,0,.2);
      min-width:360px; max-width:90vw; max-height:85vh; overflow-y:auto;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    }
    #ce-dialog h3 { margin:0 0 16px; font-size:16px; color:#1a1a1a; }
    #ce-dialog label {
      display:block; font-size:12px; font-weight:600; color:#555;
      text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px;
    }
    #ce-dialog input[type=text], #ce-dialog input[type=number],
    #ce-dialog textarea, #ce-dialog select {
      width:100%; box-sizing:border-box; border:1px solid #ccc;
      border-radius:4px; padding:8px 10px; font-size:14px;
      margin-bottom:14px; font-family:inherit;
    }
    .ce-dlg-swatches { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
    .ce-dlg-swatch {
      width:28px; height:28px; border-radius:50%;
      border:3px solid transparent; cursor:pointer; padding:0;
      transition:border-color .1s,transform .1s;
    }
    .ce-dlg-swatch:hover { transform:scale(1.1); }
    .ce-dlg-swatch.ce-active { border-color:#333; }
    .ce-dlg-btns { display:flex; justify-content:flex-end; gap:8px; margin-top:4px; }
    .ce-dlg-btns button {
      padding:9px 20px; border-radius:4px; border:1px solid #ccc;
      cursor:pointer; font-size:14px; font-family:inherit; background:#f5f5f5; color:#333;
    }
    .ce-dlg-btns .ce-confirm { background:#0770B8; color:#fff; border-color:#0770B8; }
    .ce-dlg-btns .ce-confirm:hover { background:#055b9a; }
    .ce-size-pills { display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap; }
    .ce-size-pill {
      border:2px solid #ddd; border-radius:20px; padding:5px 14px;
      cursor:pointer; font-size:13px; background:#fff; font-family:inherit;
    }
    .ce-size-pill.ce-active { border-color:#0770B8; background:#e3f2fd; color:#0770B8; }
    .ce-nav-links { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:16px; }
    .ce-nav-link-item {
      display:flex; align-items:center; gap:8px;
      padding:7px 10px; border:1px solid #eee; border-radius:4px;
      cursor:pointer; font-size:13px; user-select:none;
    }
    .ce-nav-link-item:hover { background:#f0f4f8; border-color:#ccc; }
    .ce-nav-link-item input[type=checkbox] { cursor:pointer; accent-color:#0770B8; width:15px; height:15px; }
    .ce-style-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
    .ce-style-opt {
      border:2px solid #ddd; border-radius:6px; padding:10px 6px;
      cursor:pointer; text-align:center; background:#fff; transition:border-color .15s; font-family:inherit;
    }
    .ce-style-opt:hover { border-color:#aaa; }
    .ce-style-opt.ce-active { border-color:#0770B8; background:#e3f2fd; }
    .ce-style-preview { font-size:16px; margin-bottom:4px; }
    #ce-notice {
      position:fixed; bottom:20px; left:50%;
      transform:translateX(-50%) translateY(60px);
      background:#333; color:#fff; padding:10px 20px; border-radius:4px; font-size:13px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      opacity:0; transition:opacity .2s,transform .2s; z-index:999999; pointer-events:none;
    }
    #ce-notice.ce-notice-show { opacity:1; transform:translateX(-50%) translateY(0); }
  `;
  document.head.appendChild(style);

  // ── UTILITIES ─────────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function insertHTML(html) {
    if (window.tinymce && tinymce.activeEditor) {
      const ed = tinymce.activeEditor;
      const sid = 'ce-cur-' + Date.now();
      ed.insertContent(html + `<p id="${sid}"><br data-mce-bogus="1"></p>`);
      const target = ed.dom.get(sid);
      if (target) { ed.selection.setCursorLocation(target, 0); ed.dom.setAttrib(target, 'id', null); }
      return;
    }
    const frames = document.querySelectorAll('iframe.tox-edit-area__iframe');
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument;
        if (doc && doc.querySelector('body#tinymce')) { doc.execCommand('insertHTML',false,html + '<p><br></p>'); return; }
      } catch(e) {}
    }
    navigator.clipboard.writeText(html).then(() => showNotice('HTML copied — paste into editor'));
  }

  function showNotice(msg) {
    let n = document.getElementById('ce-notice');
    if (!n) { n = document.createElement('div'); n.id = 'ce-notice'; document.body.appendChild(n); }
    n.textContent = msg; n.classList.add('ce-notice-show');
    setTimeout(() => n.classList.remove('ce-notice-show'), 3000);
  }

  function closeAllPanels() {
    document.querySelectorAll('.ce-panel.ce-open').forEach(p => p.classList.remove('ce-open'));
    document.querySelectorAll('.ce-btn.ce-open').forEach(b => b.classList.remove('ce-open'));
  }

  // ── PROPERTIES ROW ────────────────────────────────────────────────────────────
  function applyProps(html, props) {
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

  function makePropSep() {
    const d = document.createElement('div'); d.className = 'ce-prop-sep'; return d;
  }

  function closePropsRow(rowProps) {
    rowProps.classList.remove('open'); rowProps.innerHTML = ''; pendingItem = null;
  }

  function buildPropsRow(rowProps, item, onInsert) {
    rowProps.innerHTML = '';
    const show = new Set(item.props || ['color','size','font','width','align']);
    const props = { color:COLORS[0], font:'inherit', size:'14px', width:'100%', align:'left', vpad:'12px' };

    const lbl = document.createElement('span');
    lbl.id = 'ce-props-label'; lbl.textContent = item.label;
    rowProps.appendChild(lbl);

    let first = true;
    function sep() { if (!first) rowProps.appendChild(makePropSep()); first = false; }

    if (show.has('color')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const cl = document.createElement('label'); cl.textContent = 'Color:'; wrap.appendChild(cl);
      const sw = document.createElement('div'); sw.className = 'ce-prop-swatches';
      COLORS.forEach(c => {
        const b = document.createElement('button'); b.type='button';
        b.className = 'ce-prop-swatch' + (c===props.color?' active':'');
        b.style.background = c.p; b.title = c.name;
        b.onclick = () => { props.color=c; sw.querySelectorAll('.ce-prop-swatch').forEach(s=>s.classList.remove('active')); b.classList.add('active'); };
        sw.appendChild(b);
      });
      wrap.appendChild(sw); rowProps.appendChild(wrap);
    }

    if (show.has('bgcolor')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const cl = document.createElement('label'); cl.textContent = 'Container BG:'; wrap.appendChild(cl);
      const sw = document.createElement('div'); sw.className = 'ce-prop-swatches';
      props.bgcolor = null;
      const noneBtn = document.createElement('button'); noneBtn.type='button';
      noneBtn.className = 'ce-prop-swatch active';
      noneBtn.style.background = 'linear-gradient(135deg,#fff 50%,#ccc 50%)';
      noneBtn.title = 'None';
      noneBtn.onclick = () => { props.bgcolor=null; sw.querySelectorAll('.ce-prop-swatch').forEach(s=>s.classList.remove('active')); noneBtn.classList.add('active'); if(rowProps._refreshPreview) rowProps._refreshPreview(); };
      sw.appendChild(noneBtn);
      COLORS.forEach(c => {
        const b = document.createElement('button'); b.type='button';
        b.className = 'ce-prop-swatch';
        b.style.background = c.l; b.title = c.name;
        b.onclick = () => { props.bgcolor=c.l; sw.querySelectorAll('.ce-prop-swatch').forEach(s=>s.classList.remove('active')); b.classList.add('active'); if(rowProps._refreshPreview) rowProps._refreshPreview(); };
        sw.appendChild(b);
      });
      wrap.appendChild(sw); rowProps.appendChild(wrap);
    }

    if (show.has('width')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const wl = document.createElement('label'); wl.textContent = 'Width:'; wrap.appendChild(wl);
      const sel = document.createElement('select');
      ['100%','90%','75%','66%','50%','400px','500px','600px','700px'].forEach(w => {
        const o = document.createElement('option'); o.value=w; o.textContent=w; sel.appendChild(o);
      });
      sel.value = '100%'; sel.onchange = () => { props.width = sel.value; };
      wrap.appendChild(sel); rowProps.appendChild(wrap);
    }

    if (show.has('align')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const al = document.createElement('label'); al.textContent = 'Align:'; wrap.appendChild(al);
      const alignWrap = document.createElement('div'); alignWrap.style.cssText='display:flex;gap:3px;';
      [['left','⫷'],['center','≡'],['right','⫸']].forEach(([val, icon]) => {
        const b = document.createElement('button'); b.type='button';
        b.title = val.charAt(0).toUpperCase()+val.slice(1);
        b.style.cssText = 'padding:3px 7px;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;background:'+(val==='left'?'#e8f0fb':'#fff')+';';
        b.textContent = icon;
        b.onclick = () => {
          props.align = val;
          alignWrap.querySelectorAll('button').forEach(x => x.style.background='#fff');
          b.style.background='#e8f0fb';
        };
        alignWrap.appendChild(b);
      });
      wrap.appendChild(alignWrap); rowProps.appendChild(wrap);
    }

    if (show.has('size')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const sl = document.createElement('label'); sl.textContent = 'Size:'; wrap.appendChild(sl);
      const sel = document.createElement('select');
      FONT_SIZES.forEach(s => { const o=document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); });
      sel.value='14px'; sel.onchange = () => { props.size = sel.value; };
      wrap.appendChild(sel); rowProps.appendChild(wrap);
    }

    if (show.has('font')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const fl = document.createElement('label'); fl.textContent = 'Font:'; wrap.appendChild(fl);
      const sel = document.createElement('select');
      FONT_FAMILIES.forEach(f => { const o=document.createElement('option'); o.value=f.value; o.textContent=f.label; o.style.fontFamily=f.value; sel.appendChild(o); });
      sel.onchange = () => { props.font = sel.value; };
      wrap.appendChild(sel); rowProps.appendChild(wrap);
    }

    if (show.has('vpad')) {
      sep();
      const wrap = document.createElement('div'); wrap.className = 'ce-prop';
      const vl = document.createElement('label'); vl.textContent = 'Height:'; wrap.appendChild(vl);
      const sel = document.createElement('select');
      [['S','8px'],['M','12px'],['L','24px'],['XL','40px']].forEach(([label,val]) => {
        const o = document.createElement('option'); o.value=val; o.textContent=label; sel.appendChild(o);
      });
      sel.value = '12px'; sel.onchange = () => { props.vpad = sel.value; };
      wrap.appendChild(sel); rowProps.appendChild(wrap);
    }

    if (item.fields && item.fields.length) {
      sep();
      item.fields.forEach(field => {
        const wrap = document.createElement('div'); wrap.className = 'ce-prop';
        const fl = document.createElement('label'); fl.textContent = field.label+':'; wrap.appendChild(fl);
        if (field.type === 'select') {
          const sel = document.createElement('select');
          (field.options||[]).forEach(opt => { const o=document.createElement('option'); o.value=opt; o.textContent=opt; sel.appendChild(o); });
          if (field.default) sel.value = field.default;
          sel.onchange = () => { props[field.id]=sel.value; if(rowProps._refreshPreview) rowProps._refreshPreview(); };
          props[field.id] = field.default || (field.options||[])[0];
          wrap.appendChild(sel);
        } else {
          const inp = document.createElement('input');
          inp.type = field.type||'text'; inp.value = field.default!==undefined?field.default:'';
          if (field.min!==undefined) inp.min=field.min;
          if (field.max!==undefined) inp.max=field.max;
          inp.oninput = () => { props[field.id]=inp.value; if(rowProps._refreshPreview) rowProps._refreshPreview(); };
          props[field.id] = field.default!==undefined?String(field.default):'';
          wrap.appendChild(inp);
        }
        rowProps.appendChild(wrap);
      });
    }

    if (item.generate === 'cards') {
      sep();
      const previewWrap = document.createElement('div'); previewWrap.className = 'ce-prop';
      const pl = document.createElement('label'); pl.textContent = 'Preview:'; previewWrap.appendChild(pl);
      const grid = document.createElement('div'); grid.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
      function refreshPreview() {
        const r = Math.min(parseInt(props.rows)||2, 6);
        const c = Math.min(parseInt(props.cols)||3, 6);
        const s = props.cardStyle || 'shadow';
        const col = (props.color || COLORS[0]).p || '#0770B8';
        const bgc = props.bgcolor || '';
        grid.innerHTML = '';
        grid.style.cssText = `display:flex;flex-direction:column;gap:3px;padding:3px;border-radius:3px;${bgc?'background:'+bgc+';':''}`;
        for (let row=0; row<Math.min(r,4); row++) {
          const rowDiv = document.createElement('div'); rowDiv.style.cssText='display:flex;gap:3px;';
          for (let ci=0; ci<Math.min(c,5); ci++) {
            const cell = document.createElement('div');
            let cs = 'width:18px;height:28px;border-radius:3px;box-sizing:border-box;flex-shrink:0;';
            if (s==='shadow')        cs += `background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);border-top:2px solid ${col};`;
            else if (s==='bordered') cs += `background:#fff;border:1px solid ${col};`;
            else if (s==='outlined') cs += `background:#fff;border:2px solid ${col};`;
            else if (s==='filled')   cs += `background:${col};`;
            else                     cs += `background:#f0f0f0;border-left:2px solid ${col};`;
            cell.style.cssText = cs;
            rowDiv.appendChild(cell);
          }
          if (c>5) { const m=document.createElement('span'); m.textContent='…'; m.style.cssText='font-size:10px;line-height:28px;color:#888;'; rowDiv.appendChild(m); }
          grid.appendChild(rowDiv);
        }
        if (r>4) { const m=document.createElement('div'); m.textContent='…'; m.style.cssText='font-size:10px;color:#888;text-align:center;'; grid.appendChild(m); }
        const lbl2=document.createElement('div'); lbl2.style.cssText='font-size:10px;color:#666;margin-top:2px;';
        lbl2.textContent=`${r}×${c} = ${r*c} cards`; grid.appendChild(lbl2);
      }
      refreshPreview();
      rowProps._refreshPreview = refreshPreview;
      previewWrap.appendChild(grid); rowProps.appendChild(previewWrap);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'ce-props-cancel'; cancelBtn.textContent = '✕ Cancel';
    cancelBtn.onclick = () => closePropsRow(rowProps);
    rowProps.appendChild(cancelBtn);

    const insertBtn = document.createElement('button');
    insertBtn.id = 'ce-props-insert'; insertBtn.textContent = 'Insert ↵';
    insertBtn.onclick = () => { closePropsRow(rowProps); onInsert(props); };
    rowProps.appendChild(insertBtn);

    rowProps.classList.add('open');
  }

  // ── ITEM CLICK HANDLER ────────────────────────────────────────────────────────
  function handleItemClick(item, rowProps) {
    closeAllPanels();

    if (item.html === 'VIDEO_DIALOG') { buildVideoPropsRow(rowProps); return; }

    pendingItem = item;

    buildPropsRow(rowProps, item, (props) => {
      if (item.generate) {
        const genProps = { ...props, color: props.color.p, n: props.n, rows: props.rows, cols: props.cols, weeks: props.weeks, split: props.split };
        let html = GENERATORS[item.generate](genProps);
        if (props.width && props.width !== '100%') {
          html = `<div style="width:${props.width};">${html}</div>`;
        }
        insertHTML(html);
      } else {
        insertHTML(applyProps(item.html, props));
      }
    });
  }

  // ── VIDEO DIALOG ──────────────────────────────────────────────────────────────
  function getEmbedUrl(url) {
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
    return null;
  }

  function showVideoDialog() {
    const overlay = document.createElement('div'); overlay.id = 'ce-dialog-overlay';
    const dlg = document.createElement('div'); dlg.id = 'ce-dialog';
    const h3 = document.createElement('h3'); h3.textContent = '🎬 Insert Video'; dlg.appendChild(h3);
    const lbl1 = document.createElement('label'); lbl1.textContent = 'YouTube or Vimeo URL'; dlg.appendChild(lbl1);
    const urlInput = document.createElement('input');
    urlInput.type = 'text'; urlInput.placeholder = 'https://www.youtube.com/watch?v=...'; dlg.appendChild(urlInput);
    const lbl2 = document.createElement('label'); lbl2.textContent = 'Size'; dlg.appendChild(lbl2);
    const pills = document.createElement('div'); pills.className = 'ce-size-pills';
    const SIZES = [{label:'Small',pb:'45%'},{label:'Medium',pb:'56.25%'},{label:'Large',pb:'66%'}];
    let chosenSize = SIZES[1];
    SIZES.forEach(s => {
      const pill = document.createElement('button'); pill.type='button';
      pill.className = 'ce-size-pill'+(s===chosenSize?' ce-active':''); pill.textContent=s.label;
      pill.onclick = () => { chosenSize=s; pills.querySelectorAll('.ce-size-pill').forEach(p=>p.classList.remove('ce-active')); pill.classList.add('ce-active'); };
      pills.appendChild(pill);
    });
    dlg.appendChild(pills);
    const btns = document.createElement('div'); btns.className='ce-dlg-btns';
    const cancelBtn = document.createElement('button'); cancelBtn.textContent='Cancel'; cancelBtn.onclick=()=>overlay.remove();
    const okBtn = document.createElement('button'); okBtn.textContent='Insert'; okBtn.className='ce-confirm';
    okBtn.onclick = () => {
      const url = urlInput.value.trim();
      if (!url) { showNotice('Enter a video URL'); return; }
      const embedUrl = getEmbedUrl(url);
      if (!embedUrl) { showNotice('Unsupported URL — use YouTube or Vimeo'); return; }
      overlay.remove();
      insertHTML(`<div style="position:relative;padding-bottom:${chosenSize.pb};height:0;overflow:hidden;margin:1em 0;border-radius:4px;background:#000;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`);
    };
    btns.appendChild(cancelBtn); btns.appendChild(okBtn); dlg.appendChild(btns);
    overlay.appendChild(dlg); document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });
    overlay.addEventListener('keydown', e => { if (e.key==='Escape') overlay.remove(); if (e.key==='Enter') okBtn.click(); });
    setTimeout(() => urlInput.focus(), 50);
  }

  // ── ICON / RESOURCE / AI PANELS ───────────────────────────────────────────────
  function buildIconPanel(rowProps) {
    const panel=document.createElement('div'); panel.className='ce-icon-panel';
    const tabs=document.createElement('div'); tabs.className='ce-icon-tabs';
    const grid=document.createElement('div'); grid.className='ce-icon-grid';
    const cats=Object.keys(ICONS); let activeTab=cats[0];
    function renderGrid(cat){
      grid.innerHTML='';
      ICONS[cat].forEach(icon=>{
        const btn=document.createElement('button'); btn.className='ce-icon-btn'; btn.type='button'; btn.textContent=icon; btn.title=icon;
        btn.onclick=()=>{closeAllPanels();buildIconPropsRow(rowProps,icon);};
        grid.appendChild(btn);
      });
    }
    cats.forEach(cat=>{
      const tab=document.createElement('button'); tab.className='ce-icon-tab'+(cat===activeTab?' ce-active':''); tab.type='button'; tab.textContent=cat;
      tab.onclick=(e)=>{e.stopPropagation();activeTab=cat;tabs.querySelectorAll('.ce-icon-tab').forEach(t=>t.classList.remove('ce-active'));tab.classList.add('ce-active');renderGrid(cat);};
      tabs.appendChild(tab);
    });
    renderGrid(activeTab); panel.appendChild(tabs); panel.appendChild(grid);
    return panel;
  }

  function buildIconPropsRow(rowProps, icon) {
    rowProps.innerHTML = '';
    let iconSize = '1em';
    const lbl=document.createElement('span'); lbl.id='ce-props-label'; lbl.textContent=icon+' Icon'; rowProps.appendChild(lbl);
    rowProps.appendChild(makePropSep());
    const wrap=document.createElement('div'); wrap.className='ce-prop';
    const sl=document.createElement('label'); sl.textContent='Size:'; wrap.appendChild(sl);
    const sizeWrap=document.createElement('div'); sizeWrap.style.cssText='display:flex;gap:3px;';
    [{label:'S',val:'1em'},{label:'M',val:'1.5em'},{label:'L',val:'2em'},{label:'XL',val:'3em'}].forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=s.label;
      b.style.cssText='padding:3px 8px;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;background:'+(s.val===iconSize?'#e8f0fb':'#fff')+';font-family:inherit;';
      b.onclick=()=>{iconSize=s.val;sizeWrap.querySelectorAll('button').forEach(x=>x.style.background='#fff');b.style.background='#e8f0fb';};
      sizeWrap.appendChild(b);
    });
    wrap.appendChild(sizeWrap); rowProps.appendChild(wrap);
    const cancelBtn=document.createElement('button'); cancelBtn.id='ce-props-cancel'; cancelBtn.textContent='✕ Cancel';
    cancelBtn.onclick=()=>closePropsRow(rowProps); rowProps.appendChild(cancelBtn);
    const insertBtn=document.createElement('button'); insertBtn.id='ce-props-insert'; insertBtn.textContent='Insert ↵';
    insertBtn.onclick=()=>{closePropsRow(rowProps);insertHTML(`<span style="font-size:${iconSize};">${icon}</span>`);};
    rowProps.appendChild(insertBtn);
    rowProps.classList.add('open');
  }

  function buildVideoPropsRow(rowProps) {
    rowProps.innerHTML = '';
    let videoPb = '56.25%';
    const lbl=document.createElement('span'); lbl.id='ce-props-label'; lbl.textContent='🎬 Video'; rowProps.appendChild(lbl);
    rowProps.appendChild(makePropSep());
    const wrap1=document.createElement('div'); wrap1.className='ce-prop';
    const ul=document.createElement('label'); ul.textContent='URL:'; wrap1.appendChild(ul);
    const urlInput=document.createElement('input'); urlInput.type='text'; urlInput.placeholder='YouTube or Vimeo URL';
    urlInput.style.cssText='width:280px;padding:4px 8px;border:1px solid #ccc;border-radius:3px;font-size:12px;font-family:inherit;';
    wrap1.appendChild(urlInput); rowProps.appendChild(wrap1);
    rowProps.appendChild(makePropSep());
    const wrap2=document.createElement('div'); wrap2.className='ce-prop';
    const sl=document.createElement('label'); sl.textContent='Size:'; wrap2.appendChild(sl);
    const sizeWrap=document.createElement('div'); sizeWrap.style.cssText='display:flex;gap:3px;';
    [{label:'Small',val:'45%'},{label:'Medium',val:'56.25%'},{label:'Large',val:'66%'}].forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=s.label;
      b.style.cssText='padding:3px 8px;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:11px;background:'+(s.val===videoPb?'#e8f0fb':'#fff')+';font-family:inherit;';
      b.onclick=()=>{videoPb=s.val;sizeWrap.querySelectorAll('button').forEach(x=>x.style.background='#fff');b.style.background='#e8f0fb';};
      sizeWrap.appendChild(b);
    });
    wrap2.appendChild(sizeWrap); rowProps.appendChild(wrap2);
    const cancelBtn=document.createElement('button'); cancelBtn.id='ce-props-cancel'; cancelBtn.textContent='✕ Cancel';
    cancelBtn.onclick=()=>closePropsRow(rowProps); rowProps.appendChild(cancelBtn);
    const insertBtn=document.createElement('button'); insertBtn.id='ce-props-insert'; insertBtn.textContent='Insert ↵';
    insertBtn.onclick=()=>{
      const url=urlInput.value.trim();
      if(!url){showNotice('Enter a video URL');return;}
      const embedUrl=getEmbedUrl(url);
      if(!embedUrl){showNotice('Unsupported URL — use YouTube or Vimeo');return;}
      closePropsRow(rowProps);
      insertHTML(`<div style="position:relative;padding-bottom:${videoPb};height:0;overflow:hidden;margin:1em 0;border-radius:4px;background:#000;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`);
    };
    rowProps.appendChild(insertBtn);
    rowProps.classList.add('open');
    setTimeout(()=>urlInput.focus(),50);
  }

  function buildResourcesPanel() {
    const panel=document.createElement('div');
    [{icon:'🖼',label:'Unsplash — Free Photos',url:'https://unsplash.com'},{icon:'📷',label:'Pexels — Free Stock',url:'https://pexels.com'},{icon:'🎨',label:'Pixabay — Images & Video',url:'https://pixabay.com'},{icon:'🔣',label:'Flaticon — Icons',url:'https://flaticon.com'},{icon:'🎬',label:'Coverr — Free Video',url:'https://coverr.co'},{icon:'✏️',label:'Canva — Design Tool',url:'https://canva.com'},{icon:'🔤',label:'Google Fonts',url:'https://fonts.google.com'}].forEach(r=>{
      const a=document.createElement('a'); a.className='ce-res-item'; a.href=r.url; a.target='_blank'; a.rel='noopener noreferrer';
      a.innerHTML=`<span style="font-size:1.2em;">${r.icon}</span>${r.label}`; panel.appendChild(a);
    });
    return panel;
  }

  const CB_THEMES = {
    pastel: { name:'🌸 Pastel',  primary:'#7c3aed', secondary:'#a78bfa', bg:'#faf5ff', headerBg:'#ede9fe', accent:'#8b5cf6', text:'#1e1b4b', cardBg:'#f5f3ff', border:'#c4b5fd' },
    bold:   { name:'⚡ Bold',    primary:'#dc2626', secondary:'#f97316', bg:'#fff7ed', headerBg:'#fee2e2', accent:'#ea580c', text:'#1c1917', cardBg:'#fff1f2', border:'#fca5a5' },
    ocean:  { name:'🔵 Ocean',   primary:'#0770B8', secondary:'#38bdf8', bg:'#f0f7ff', headerBg:'#dbeafe', accent:'#3b82f6', text:'#111827', cardBg:'#eff6ff', border:'#bfdbfe' },
    earth:  { name:'🌿 Earth',   primary:'#854d0e', secondary:'#a16207', bg:'#fefce8', headerBg:'#fef9c3', accent:'#ca8a04', text:'#1c1917', cardBg:'#fffbeb', border:'#fde68a' },
    dark:   { name:'🌙 Dark',    primary:'#0ea5e9', secondary:'#38bdf8', bg:'#0f172a', headerBg:'#1e293b', accent:'#7dd3fc', text:'#f1f5f9', cardBg:'#1e293b', border:'#334155' },
    custom: { name:'🏫 Custom',  primary:'#1e3a5f', secondary:'#2563eb', bg:'#f0f7ff', headerBg:'#dbeafe', accent:'#3b82f6', text:'#111827', cardBg:'#eff6ff', border:'#bfdbfe' },
  };

  function readEditorText() {
    if (window.tinymce && tinymce.activeEditor) {
      return tinymce.activeEditor.getContent({format:'text'}).trim();
    }
    const frame = document.querySelector('iframe.tox-edit-area__iframe');
    if (frame) try { return frame.contentDocument.body.innerText.trim(); } catch(e) {}
    return '';
  }

  const PAGE_TYPES = [
    { value:'page',         label:'Canvas Page',  icon:'📄' },
    { value:'assignment',   label:'Assignment',   icon:'📝' },
    { value:'announcement', label:'Announcement', icon:'📢' },
    { value:'discussion',   label:'Discussion',   icon:'💬' },
    { value:'syllabus',     label:'Syllabus',     icon:'📋' },
    { value:'quiz',         label:'Quiz',         icon:'✅' },
  ];

  function detectPageType() {
    const p = window.location.pathname;
    if (/\/courses\/\d+\/assignments\/syllabus/.test(p)) return 'syllabus';
    if (/\/courses\/\d+\/assignments/.test(p))           return 'assignment';
    if (/\/courses\/\d+\/announcements/.test(p))         return 'announcement';
    if (/\/courses\/\d+\/discussion_topics/.test(p))     return 'discussion';
    if (/\/courses\/\d+\/quizzes/.test(p))               return 'quiz';
    return 'page';
  }

  function showContentBuilder() {
    if (document.getElementById('ce-ai-overlay')) document.getElementById('ce-ai-overlay').remove();

    const st = {
      view: 'build',
      contentType: detectPageType(),
      pageStyle: 'pastel',
      customColor: '#1e3a5f',
      pageElements:     { emojiIcons:true, sectionDividers:true, tipBoxes:true, imagePlaceholders:false, collapsible:false, quoteBoxes:false, alertBoxes:false },
      assignElements:   { numberedSteps:true, checklist:false, rubricTable:false, pointValue:false, dueDate:false, videoEmbed:false, objectivesBox:false, integrityNote:false },
      announceElements: { emojiIcons:true, alertBoxes:true, tipBoxes:false, deadlineBox:false },
      discussElements:  { emojiIcons:true, quoteBoxes:true, tipBoxes:true, rubric:false, netiquette:false },
      syllabusElements: { sectionDividers:true, emojiIcons:true, gradeTable:true, scheduleTable:false, policies:true, officeHours:false },
      quizElements:     { timeBox:true, rulesBox:true, checklist:false, pointBreakdown:false },
      announceConfig:   { type:'informational', date:'', actionText:'' },
      discussConfig:    { promptStyle:'analytical', minWords:200, replyCount:2, replyWords:100, points:'', dueDate:'' },
      quizConfig:       { timeLimit:'', attempts:'1', qTypes:['mc','tf'] },
      assignConfig:     { submissionType:'file', groupWork:false },
      syllabusConfig:   { courseName:'', instructor:'', term:'', meetingTimes:'' },
      contentLength: 'standard',
      insertMode: 'replace',
      pointValue:'', dueDate:'',
      textContent:'', uploadedFile:'', uploadedName:'',
      generatedHTML:'',
      apiKey: GM_getValue('ce_license_key',''),
    };

    const overlay = document.createElement('div');
    overlay.id = 'ce-ai-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

    const pw = Math.min(760, window.innerWidth-40);
    const ph = Math.min(880, window.innerHeight-40);
    const panel = document.createElement('div');
    panel.style.cssText = `width:${pw}px;height:${ph}px;background:#f1f5f9;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;overflow:hidden;`;

    function render() {
      panel.innerHTML = '';
      panel.appendChild(cbHeader());
      const body = document.createElement('div');
      body.style.cssText = 'flex:1;overflow-y:auto;min-height:0;';
      if      (st.view==='setup')   body.appendChild(cbSetup());
      else if (st.view==='build')   body.appendChild(cbBuild());
      else if (st.view==='loading') body.appendChild(cbLoading());
      else if (st.view==='result')  body.appendChild(cbResult());
      panel.appendChild(body);
    }

    function cbLoading() {
      const w=document.createElement('div');
      w.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:18px;padding:40px;box-sizing:border-box;';
      // inject spin keyframe once
      if (!document.getElementById('ce-spin-style')) {
        const s=document.createElement('style'); s.id='ce-spin-style';
        s.textContent='@keyframes ce-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }
      const spinner=document.createElement('div');
      spinner.style.cssText='width:56px;height:56px;border:5px solid #e5e7eb;border-top-color:#7c3aed;border-radius:50%;animation:ce-spin .8s linear infinite;flex-shrink:0;';
      const msg=document.createElement('div');
      msg.style.cssText='font-size:16px;font-weight:700;color:#374151;text-align:center;';
      msg.textContent='Claude is building your content…';
      const sub=document.createElement('div');
      sub.style.cssText='font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;';
      sub.textContent='This usually takes 15–30 seconds.\nDo not close this window.';
      w.appendChild(spinner); w.appendChild(msg); w.appendChild(sub);
      return w;
    }

    // ── HEADER ──────────────────────────────────────────────────────────────────
    function cbHeader() {
      const h = document.createElement('div');
      h.style.cssText = 'background:#2d1b69;color:#fff;height:52px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-radius:12px 12px 0 0;';
      const left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:10px;';
      left.innerHTML = '<div style="width:28px;height:28px;border-radius:7px;background:#7c3aed;display:flex;align-items:center;justify-content:center;font-size:15px;">✦</div>';
      const t = document.createElement('strong');
      t.style.fontSize = '15px';
      t.textContent = st.view==='setup' ? 'API Setup' : st.view==='result' ? 'Generated Content' : 'AI Content Builder';
      left.appendChild(t); h.appendChild(left);
      const right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:8px;';
      if (st.view !== 'setup') {
        const bTab = cbHdrBtn('Build', st.view==='build');
        bTab.onclick = () => { st.view='build'; render(); };
        right.appendChild(bTab);
      }
      const x = document.createElement('button');
      x.textContent='✕'; x.style.cssText='background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px;line-height:1;';
      x.onclick=()=>overlay.remove(); right.appendChild(x); h.appendChild(right);
      return h;
    }
    function cbHdrBtn(label, active) {
      const b = document.createElement('button'); b.textContent=label;
      b.style.cssText=`padding:5px 10px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${active?'#7c3aed':'rgba(255,255,255,.12)'};color:${active?'#fff':'#cbd5e1'};`;
      return b;
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────────
    function mkCard(mb) {
      const c=document.createElement('div');
      c.style.cssText=`background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.05);margin-bottom:${mb||'10px'};`;
      return c;
    }
    function mkSecHdr(text) {
      const h=document.createElement('div'); h.textContent=text;
      h.style.cssText='font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;padding:12px 0 6px;';
      return h;
    }
    function mkToggle(label, desc, checked, onChange) {
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;';
      const left=document.createElement('div');
      const lbl=document.createElement('div'); lbl.textContent=label; lbl.style.cssText='font-size:13px;font-weight:500;color:#111827;';
      left.appendChild(lbl);
      if (desc) { const d=document.createElement('div'); d.textContent=desc; d.style.cssText='font-size:11px;color:#9ca3af;margin-top:1px;'; left.appendChild(d); }
      let cur=checked;
      const sw=document.createElement('div');
      sw.style.cssText=`width:40px;height:22px;border-radius:11px;background:${cur?'#2563eb':'#d1d5db'};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;`;
      const knob=document.createElement('div');
      knob.style.cssText=`position:absolute;top:3px;left:${cur?'21px':'3px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);`;
      sw.appendChild(knob);
      sw.onclick=()=>{ cur=!cur; sw.style.background=cur?'#2563eb':'#d1d5db'; knob.style.left=cur?'21px':'3px'; onChange(cur); };
      row.appendChild(left); row.appendChild(sw); return row;
    }
    function mkSubHdr(txt) {
      const d=document.createElement('div');
      d.style.cssText='font-size:10px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #f1f5f9;';
      d.textContent=txt; return d;
    }
    function mkField(label, placeholder, val, onchange, type='text') {
      const r=document.createElement('div'); r.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
      const l=document.createElement('span'); l.textContent=label; l.style.cssText='font-size:12px;color:#6b7280;white-space:nowrap;min-width:90px;';
      const inp=document.createElement('input'); inp.type=type; inp.placeholder=placeholder; inp.value=val||'';
      inp.style.cssText='flex:1;padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;font-family:inherit;background:#fff;';
      inp.oninput=()=>onchange(inp.value); r.appendChild(l); r.appendChild(inp); return r;
    }
    function mkSelect(label, options, val, onchange) {
      const r=document.createElement('div'); r.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
      const l=document.createElement('span'); l.textContent=label; l.style.cssText='font-size:12px;color:#6b7280;white-space:nowrap;min-width:90px;';
      const sel=document.createElement('select');
      sel.style.cssText='flex:1;padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;font-family:inherit;background:#fff;cursor:pointer;';
      options.forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.textContent=t; if(v===val) o.selected=true; sel.appendChild(o); });
      sel.onchange=()=>onchange(sel.value); r.appendChild(l); r.appendChild(sel); return r;
    }

    // ── SETUP VIEW ───────────────────────────────────────────────────────────────
    function cbSetup() {
      const w=document.createElement('div'); w.style.cssText='padding:20px;display:flex;flex-direction:column;gap:12px;';
      const info=document.createElement('div');
      info.style.cssText='background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;font-size:13px;line-height:1.6;color:#1e40af;';
      info.innerHTML='<strong>Canvas Enhancer License Key Required</strong><br>Enter the license key from your purchase confirmation email.';
      w.appendChild(info);
      const inp=document.createElement('input'); inp.type='text'; inp.placeholder='XXXX-XXXX-XXXX-XXXX'; inp.value=st.apiKey;
      inp.style.cssText='padding:10px 12px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;width:100%;box-sizing:border-box;font-family:monospace;background:#fff;';
      w.appendChild(inp);
      const saveBtn=document.createElement('button'); saveBtn.textContent='Save & Start Building';
      saveBtn.style.cssText='width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;';
      saveBtn.onclick=()=>{ const k=inp.value.trim().toUpperCase(); if(!k){showNotice('Enter your license key');return;} GM_setValue('ce_license_key',k); st.apiKey=k; st.view='build'; render(); };
      w.appendChild(saveBtn); return w;
    }

    // ── BUILD VIEW ───────────────────────────────────────────────────────────────
    function cbBuild() {
      const w=document.createElement('div'); w.style.cssText='padding:14px;';
      const themeCard=mkCard();
      themeCard.appendChild(mkSecHdr('Style / Theme'));
      const themeGrid=document.createElement('div'); themeGrid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:6px;';
      const cr=document.createElement('div'); cr.style.cssText=`display:${st.pageStyle==='custom'?'flex':'none'};align-items:center;gap:8px;margin-top:10px;`;
      const cl=document.createElement('span'); cl.textContent='Primary color:'; cl.style.fontSize='13px';
      const ci=document.createElement('input'); ci.type='color'; ci.value=st.customColor;
      ci.style.cssText='width:50px;height:30px;border-radius:6px;border:1px solid #d1d5db;cursor:pointer;';
      ci.oninput=()=>{ st.customColor=ci.value; }; cr.appendChild(cl); cr.appendChild(ci);
      const themeBtns=[];
      const themeStyle=(act)=>`padding:8px 6px;border-radius:8px;border:2px solid ${act?'#7c3aed':'#e5e7eb'};background:${act?'#f5f3ff':'#f9fafb'};cursor:pointer;font-size:11px;font-weight:500;color:${act?'#7c3aed':'#374151'};font-family:inherit;`;
      Object.entries(CB_THEMES).forEach(([key,theme])=>{
        const tb=document.createElement('button'); tb.textContent=theme.name; tb.dataset.key=key;
        tb.style.cssText=themeStyle(st.pageStyle===key);
        tb.onclick=()=>{
          st.pageStyle=key;
          themeBtns.forEach(b=>b.style.cssText=themeStyle(b.dataset.key===key));
          cr.style.display=key==='custom'?'flex':'none';
        };
        themeBtns.push(tb); themeGrid.appendChild(tb);
      });
      themeCard.appendChild(themeGrid); themeCard.appendChild(cr);
      // ── CONTENT INPUT (top) ──────────────────────────────────────────────────────
      const contentCard=mkCard();
      contentCard.appendChild(mkSecHdr('Content'));

      // Read from Editor — prominent full-width button
      const readBtn=document.createElement('button');
      readBtn.innerHTML='📖 &nbsp;Read from Editor';
      readBtn.style.cssText='width:100%;padding:11px;background:#0770B8;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:10px;letter-spacing:.01em;';
      readBtn.onmouseenter=()=>readBtn.style.background='#055b9a';
      readBtn.onmouseleave=()=>readBtn.style.background='#0770B8';
      readBtn.onclick=()=>{
        const txt=readEditorText();
        if (txt) { ta.value=txt; st.textContent=txt; showNotice('Editor content loaded!'); }
        else showNotice('Editor appears empty');
      };
      contentCard.appendChild(readBtn);

      // File upload row
      const uploadRow=document.createElement('div'); uploadRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:10px;';
      const chip=document.createElement('div');
      chip.style.cssText=`flex:1;padding:8px 12px;border-radius:8px;border:1px dashed #94a3b8;background:${st.uploadedName?'#eff6ff':'#f9fafb'};font-size:12px;color:${st.uploadedName?'#1d4ed8':'#6b7280'};text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
      chip.textContent=st.uploadedName?`📎 ${st.uploadedName}`:'No file selected';
      uploadRow.appendChild(chip);
      const upBtn=document.createElement('button'); upBtn.textContent='📁 Upload File';
      upBtn.style.cssText='background:#64748b;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:12px;cursor:pointer;flex-shrink:0;font-family:inherit;';
      upBtn.onclick=()=>{ const fi=document.createElement('input'); fi.type='file'; fi.accept='.txt,.pdf,.doc,.docx,.csv,.md'; fi.style.cssText='position:fixed;top:-9999px;'; fi.onchange=()=>{ const file=fi.files[0]; fi.remove(); if(!file)return; const reader=new FileReader(); reader.onload=e=>{st.uploadedFile=e.target.result;st.uploadedName=file.name;render();}; reader.readAsText(file); }; document.body.appendChild(fi); fi.click(); };
      uploadRow.appendChild(upBtn);
      if (st.uploadedName) { const clr=document.createElement('button'); clr.textContent='✕'; clr.style.cssText='background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;'; clr.onclick=()=>{st.uploadedFile='';st.uploadedName='';render();}; uploadRow.appendChild(clr); }
      contentCard.appendChild(uploadRow);

      const ta=document.createElement('textarea'); ta.rows=4;
      ta.placeholder='Or paste content / describe what you want to create…';
      ta.value=st.textContent;
      ta.style.cssText='width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;font-family:inherit;resize:vertical;background:#f9fafb;line-height:1.5;';
      ta.oninput=()=>{st.textContent=ta.value;};
      contentCard.appendChild(ta); w.appendChild(contentCard);

      // Type
      const typeCard=mkCard();
      typeCard.appendChild(mkSecHdr('What are you creating?'));
      const detectedType=detectPageType();
      const detectedLabel=PAGE_TYPES.find(t=>t.value===detectedType)?.label||'Page';
      const detNote=document.createElement('div'); detNote.style.cssText='font-size:11px;color:#9ca3af;margin-bottom:8px;';
      detNote.textContent=`Auto-detected: ${detectedLabel}`;
      typeCard.appendChild(detNote);
      const typeSel=document.createElement('select');
      typeSel.style.cssText='width:100%;padding:10px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:13px;font-family:inherit;cursor:pointer;color:#374151;';
      PAGE_TYPES.forEach(t=>{ const o=document.createElement('option'); o.value=t.value; o.textContent=`${t.icon}  ${t.label}`; if(t.value===st.contentType) o.selected=true; typeSel.appendChild(o); });
      typeSel.onchange=()=>{st.contentType=typeSel.value;render();};
      typeCard.appendChild(typeSel); w.appendChild(typeCard);
      w.appendChild(themeCard);

      // ── CUSTOMIZE ───────────────────────────────────────────────────────────────
      const elemCard=mkCard();
      elemCard.appendChild(mkSecHdr('Customize'));

      if (st.contentType==='page') {
        [['emojiIcons','Emoji Icons','Add emojis to section headers'],
         ['sectionDividers','Section Dividers','Visual breaks between sections'],
         ['tipBoxes','Tip / Reminder Boxes','Highlighted boxes for important info'],
         ['imagePlaceholders','Image Placeholders','Placeholder boxes for images'],
         ['collapsible','Collapsible Sections','Click-to-expand areas'],
         ['quoteBoxes','Quote / Highlight','Styled callout boxes'],
         ['alertBoxes','Warning / Alert Boxes','Red/yellow alert boxes'],
        ].forEach(([k,l,d])=>elemCard.appendChild(mkToggle(l,d,st.pageElements[k],v=>{st.pageElements[k]=v;})));

      } else if (st.contentType==='announcement') {
        elemCard.appendChild(mkSubHdr('Settings'));
        elemCard.appendChild(mkSelect('Tone', [
          ['informational','📢 General / Informational'],
          ['reminder','⏰ Reminder'],
          ['urgent','🚨 Urgent / Important'],
          ['event','📅 Event / Upcoming Date'],
        ], st.announceConfig.type, v=>{st.announceConfig.type=v;}));
        elemCard.appendChild(mkField('Date / Deadline', 'e.g. June 15 at 11:59pm', st.announceConfig.date, v=>{st.announceConfig.date=v;}));
        elemCard.appendChild(mkField('Call to action', 'e.g. Complete the survey by Friday', st.announceConfig.actionText, v=>{st.announceConfig.actionText=v;}));
        elemCard.appendChild(mkSubHdr('Include'));
        [['emojiIcons','Emoji Icons','Highlight key info with emojis'],
         ['alertBoxes','Highlight Box','Styled box for the main message'],
         ['tipBoxes','Tip / Reminder Box','Secondary callout box'],
         ['deadlineBox','Deadline Box','Prominently styled date/deadline block'],
        ].forEach(([k,l,d])=>elemCard.appendChild(mkToggle(l,d,st.announceElements[k],v=>{st.announceElements[k]=v;})));

      } else if (st.contentType==='discussion') {
        elemCard.appendChild(mkSubHdr('Prompt Setup'));
        elemCard.appendChild(mkSelect('Prompt style', [
          ['analytical','🔍 Analytical / Critical Thinking'],
          ['reflective','💭 Personal Reflection'],
          ['creative','✨ Creative / Hypothetical'],
          ['debate','⚖️ Debate / Argument'],
          ['case_study','📰 Case Study / Current Events'],
        ], st.discussConfig.promptStyle, v=>{st.discussConfig.promptStyle=v;}));
        elemCard.appendChild(mkField('Points', '0', st.discussConfig.points, v=>{st.discussConfig.points=v;}, 'number'));
        elemCard.appendChild(mkField('Initial post due', '', st.discussConfig.dueDate, v=>{st.discussConfig.dueDate=v;}, 'date'));
        elemCard.appendChild(mkSubHdr('Response Requirements'));
        elemCard.appendChild(mkField('Min words (post)', '200', st.discussConfig.minWords, v=>{st.discussConfig.minWords=v;}, 'number'));
        elemCard.appendChild(mkField('Replies required', '2', st.discussConfig.replyCount, v=>{st.discussConfig.replyCount=v;}, 'number'));
        elemCard.appendChild(mkField('Min words (reply)', '100', st.discussConfig.replyWords, v=>{st.discussConfig.replyWords=v;}, 'number'));
        elemCard.appendChild(mkSubHdr('Include'));
        [['emojiIcons','Emoji Icons','Add emojis to headings'],
         ['quoteBoxes','Prompt Callout Box','Styled box highlighting the main question'],
         ['tipBoxes','Response Guidelines','Instructions for how students should respond'],
         ['rubric','Grading Rubric','Table with grading criteria for the discussion'],
         ['netiquette','Netiquette Reminder','Discussion etiquette expectations'],
        ].forEach(([k,l,d])=>elemCard.appendChild(mkToggle(l,d,st.discussElements[k],v=>{st.discussElements[k]=v;})));

      } else if (st.contentType==='assignment') {
        elemCard.appendChild(mkSubHdr('Assignment Details'));
        elemCard.appendChild(mkSelect('Submission type', [
          ['file','📎 File Upload'],
          ['text','✍️ Text Entry'],
          ['url','🔗 Website URL'],
          ['media','🎥 Media Recording'],
          ['none','📋 No Submission (view only)'],
        ], st.assignConfig.submissionType, v=>{st.assignConfig.submissionType=v;}));
        elemCard.appendChild(mkField('Points', '100', st.pointValue, v=>{st.pointValue=v;}, 'number'));
        elemCard.appendChild(mkField('Due date', '', st.dueDate, v=>{st.dueDate=v;}, 'date'));
        const grpRow=document.createElement('div'); grpRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        const grpLbl=document.createElement('span'); grpLbl.textContent='Group work'; grpLbl.style.cssText='font-size:12px;color:#6b7280;min-width:90px;';
        grpRow.appendChild(grpLbl);
        grpRow.appendChild(mkToggle('Group assignment','Students work in teams',st.assignConfig.groupWork,v=>{st.assignConfig.groupWork=v;}));
        elemCard.appendChild(grpRow);
        elemCard.appendChild(mkSubHdr('Include'));
        [['objectivesBox','Learning Objectives','What students will learn or demonstrate'],
         ['numberedSteps','Step-by-step Instructions','Numbered directions for the task'],
         ['checklist','Submission Checklist','Checkbox list of what to include'],
         ['rubricTable','Grading Rubric','Criteria and point breakdown table'],
         ['videoEmbed','Video Embed Placeholder','Box for a YouTube/Vimeo link'],
         ['integrityNote','Academic Integrity Note','Reminder about original work expectations'],
        ].forEach(([k,l,d])=>elemCard.appendChild(mkToggle(l,d,st.assignElements[k],v=>{st.assignElements[k]=v;})));

      } else if (st.contentType==='quiz') {
        elemCard.appendChild(mkSubHdr('Quiz Settings'));
        elemCard.appendChild(mkField('Time limit', 'e.g. 30 minutes', st.quizConfig.timeLimit, v=>{st.quizConfig.timeLimit=v;}));
        elemCard.appendChild(mkSelect('Attempts allowed', [
          ['1','1 attempt'], ['2','2 attempts'], ['3','3 attempts'], ['unlimited','Unlimited'],
        ], st.quizConfig.attempts, v=>{st.quizConfig.attempts=v;}));
        elemCard.appendChild(mkSubHdr('Question Types'));
        [['mc','Multiple Choice'],['tf','True / False'],['short','Short Answer'],['essay','Essay / Extended Response'],['matching','Matching']].forEach(([val,label])=>{
          const on=st.quizConfig.qTypes.includes(val);
          elemCard.appendChild(mkToggle(label,'',on,checked=>{
            if(checked && !st.quizConfig.qTypes.includes(val)) st.quizConfig.qTypes.push(val);
            else if(!checked) st.quizConfig.qTypes=st.quizConfig.qTypes.filter(q=>q!==val);
          }));
        });
        elemCard.appendChild(mkSubHdr('Include'));
        [['timeBox','Time Limit Box','Prominently display the time allowed'],
         ['rulesBox','Rules / Policies Box','No cheating, browser rules, etc.'],
         ['checklist','Pre-Quiz Checklist','What students need before starting'],
         ['pointBreakdown','Point Breakdown','Show points per section or question type'],
        ].forEach(([k,l,d])=>elemCard.appendChild(mkToggle(l,d,st.quizElements[k],v=>{st.quizElements[k]=v;})));

      } else if (st.contentType==='syllabus') {
        elemCard.appendChild(mkSubHdr('Course Info'));
        elemCard.appendChild(mkField('Course name', 'e.g. Introduction to Biology', st.syllabusConfig.courseName, v=>{st.syllabusConfig.courseName=v;}));
        elemCard.appendChild(mkField('Instructor', 'e.g. Dr. Jane Smith', st.syllabusConfig.instructor, v=>{st.syllabusConfig.instructor=v;}));
        elemCard.appendChild(mkField('Term', 'e.g. Fall 2025', st.syllabusConfig.term, v=>{st.syllabusConfig.term=v;}));
        elemCard.appendChild(mkField('Meeting times', 'e.g. MWF 10:00–10:50am', st.syllabusConfig.meetingTimes, v=>{st.syllabusConfig.meetingTimes=v;}));
        elemCard.appendChild(mkSubHdr('Include'));
        [['sectionDividers','Section Dividers','Visual breaks between major sections'],
         ['emojiIcons','Emoji Icons','Add emojis to section headers'],
         ['gradeTable','Grading Breakdown','Grade weights and percentage table'],
         ['scheduleTable','Course Schedule','Weekly topic and assignment schedule'],
         ['policies','Course Policies','Late work, attendance, academic integrity'],
         ['officeHours','Office Hours','Instructor availability and contact info'],
        ].forEach(([k,l,d])=>elemCard.appendChild(mkToggle(l,d,st.syllabusElements[k],v=>{st.syllabusElements[k]=v;})));
      }
      w.appendChild(elemCard);

      // Length
      const lenCard=mkCard();
      lenCard.appendChild(mkSecHdr('Content length'));
      const lenRow=document.createElement('div'); lenRow.style.cssText='display:flex;gap:8px;';
      const lenBtns=[];
      [['concise','Concise','Short and focused'],['standard','Standard','Balanced detail'],['detailed','Detailed','Comprehensive coverage']].forEach(([val,label,desc])=>{
        const lb=document.createElement('button'); lb.type='button'; lb.dataset.val=val;
        const style=act=>`flex:1;padding:10px 8px;border-radius:10px;border:2px solid ${act?'#7c3aed':'#e5e7eb'};background:${act?'#f5f3ff':'#f9fafb'};cursor:pointer;font-size:12px;font-family:inherit;color:${act?'#7c3aed':'#6b7280'};`;
        lb.style.cssText=style(st.contentLength===val);
        lb.innerHTML=`<div style="font-weight:700;margin-bottom:2px;">${label}</div><div style="font-size:11px;opacity:.75;">${desc}</div>`;
        lb.onclick=()=>{ st.contentLength=val; lenBtns.forEach(b=>b.style.cssText=style(b.dataset.val===val)); };
        lenBtns.push(lb); lenRow.appendChild(lb);
      });
      lenCard.appendChild(lenRow); w.appendChild(lenCard);

      // Generate button
      const genBtn=document.createElement('button');
      genBtn.textContent=`✦ Generate ${PAGE_TYPES.find(t=>t.value===st.contentType)?.label||'Content'}`;
      genBtn.style.cssText='width:100%;padding:14px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(124,58,237,.35);margin-bottom:6px;font-family:inherit;';
      genBtn.onclick=()=>cbGenerate(st,genBtn,render);
      w.appendChild(genBtn);

      if (st.generatedHTML) {
        const vb=document.createElement('button'); vb.textContent='View Last Result →';
        vb.style.cssText='width:100%;padding:10px;background:#e2e8f0;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;';
        vb.onclick=()=>{st.view='result';render();}; w.appendChild(vb);
      }
      return w;
    }

    // ── RESULT VIEW ──────────────────────────────────────────────────────────────
    function cbResult() {
      const w=document.createElement('div'); w.style.cssText='display:flex;flex-direction:column;height:100%;';
      const tabRow=document.createElement('div'); tabRow.style.cssText='display:flex;border-bottom:1px solid #e5e7eb;background:#fff;flex-shrink:0;';
      const pTab=document.createElement('button'); pTab.textContent='👁 Preview';
      pTab.style.cssText='flex:1;padding:10px;border:none;border-bottom:2px solid #7c3aed;background:#fff;cursor:pointer;font-size:13px;font-weight:700;color:#7c3aed;font-family:inherit;';
      const cTab=document.createElement('button'); cTab.textContent='</> HTML';
      cTab.style.cssText='flex:1;padding:10px;border:none;border-bottom:2px solid transparent;background:#f9fafb;cursor:pointer;font-size:13px;font-weight:500;color:#6b7280;font-family:inherit;';
      const iframe=document.createElement('iframe'); iframe.style.cssText='flex:1;border:none;background:#fff;width:100%;';
      iframe.srcdoc=st.generatedHTML||'<p>No content generated.</p>';
      const codeBox=document.createElement('textarea'); codeBox.value=st.generatedHTML; codeBox.readOnly=true;
      codeBox.style.cssText='flex:1;padding:12px;font-family:Consolas,monospace;font-size:11px;border:none;resize:none;background:#1e293b;color:#e2e8f0;line-height:1.6;display:none;width:100%;box-sizing:border-box;';
      pTab.onclick=()=>{ iframe.style.display='block'; codeBox.style.display='none'; pTab.style.borderBottomColor='#7c3aed'; pTab.style.color='#7c3aed'; pTab.style.background='#fff'; pTab.style.fontWeight='700'; cTab.style.borderBottomColor='transparent'; cTab.style.background='#f9fafb'; cTab.style.color='#6b7280'; cTab.style.fontWeight='500'; };
      cTab.onclick=()=>{ iframe.style.display='none'; codeBox.style.display='block'; cTab.style.borderBottomColor='#7c3aed'; cTab.style.color='#7c3aed'; cTab.style.background='#fff'; cTab.style.fontWeight='700'; pTab.style.borderBottomColor='transparent'; pTab.style.background='#f9fafb'; pTab.style.color='#6b7280'; pTab.style.fontWeight='500'; };
      tabRow.appendChild(pTab); tabRow.appendChild(cTab);
      const ca=document.createElement('div'); ca.style.cssText='flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;'; ca.appendChild(iframe); ca.appendChild(codeBox);
      const actions=document.createElement('div'); actions.style.cssText='padding:12px 14px;border-top:1px solid #e5e7eb;background:#f8fafc;display:flex;flex-direction:column;gap:8px;flex-shrink:0;';
      // Insert mode toggle
      const modeRow=document.createElement('div'); modeRow.style.cssText='display:flex;gap:6px;';
      [['replace','Replace existing content'],['append','Keep existing & append']].forEach(([val,label])=>{
        const act=st.insertMode===val;
        const mb=document.createElement('button'); mb.type='button';
        mb.style.cssText=`flex:1;padding:7px 10px;border-radius:8px;border:2px solid ${act?'#0770B8':'#d1d5db'};background:${act?'#e8f4fc':'#f9fafb'};cursor:pointer;font-size:12px;font-family:inherit;color:${act?'#0770B8':'#6b7280'};font-weight:${act?'700':'400'};`;
        mb.textContent=label;
        mb.onclick=()=>{st.insertMode=val;render();};
        modeRow.appendChild(mb);
      });
      actions.appendChild(modeRow);
      const insBtn=document.createElement('button'); insBtn.textContent='↵ Insert into Canvas Editor';
      insBtn.style.cssText='width:100%;padding:12px;background:#0770B8;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;';
      insBtn.onclick=()=>{
        if (!st.generatedHTML) return;
        if (st.insertMode==='replace') {
          if (window.tinymce && tinymce.activeEditor) { tinymce.activeEditor.setContent(st.generatedHTML); }
          else { const f=document.querySelector('iframe.tox-edit-area__iframe'); if(f) try{f.contentDocument.body.innerHTML=st.generatedHTML+'<p><br></p>';}catch(e){} }
        } else {
          insertHTML(st.generatedHTML);
        }
        overlay.remove(); showNotice('Content inserted!');
      };
      const backBtn=document.createElement('button'); backBtn.textContent='← Back to Builder';
      backBtn.style.cssText='width:100%;padding:10px;background:#e2e8f0;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;';
      backBtn.onclick=()=>{st.view='build';render();};
      actions.appendChild(insBtn); actions.appendChild(backBtn);
      w.appendChild(tabRow); w.appendChild(ca); w.appendChild(actions); return w;
    }

    overlay.appendChild(panel); document.body.appendChild(overlay); render();
  }

  function cbGenerate(st, genBtn, renderFn) {
    // license check bypassed
    if (!st.textContent.trim() && !st.uploadedFile) { showNotice('Add some content or describe what to create'); return; }
    genBtn.textContent='Generating…'; genBtn.disabled=true;
    st.view='loading'; renderFn();
    const theme = st.pageStyle==='custom' ? {...CB_THEMES.custom,primary:st.customColor,secondary:st.customColor} : CB_THEMES[st.pageStyle]||CB_THEMES.pastel;
    const elemMap = { page:st.pageElements, assignment:st.assignElements, quiz:st.quizElements, announcement:st.announceElements, discussion:st.discussElements, syllabus:st.syllabusElements };
    const elems = elemMap[st.contentType]||st.pageElements;
    const typeDesc = {
      page:         'a visually rich Canvas content page for sharing course material, resources, or learning content',
      assignment:   'a Canvas assignment description with clear student-facing instructions, requirements, and expectations',
      quiz:         'a Canvas quiz instructions page with clear directions, rules, and question format guidelines for students',
      announcement: 'a Canvas announcement — keep it concise and direct. Clear headline, key info, and any action items.',
      discussion:   'a Canvas discussion board prompt with directions, response requirements, and grading info for students',
      syllabus:     'a comprehensive Canvas course syllabus — structured, formal, and policy-focused',
    };
    let prompt=`You are an expert Canvas LMS content designer. Generate professional HTML for ${typeDesc[st.contentType]||typeDesc.page}.\n\n`;
    prompt+=`Theme: ${CB_THEMES[st.pageStyle]?.name}\nPrimary: ${theme.primary}\nSecondary: ${theme.secondary}\nBG: ${theme.bg}\nHeader BG: ${theme.headerBg}\nText: ${theme.text}\n\n`;

    if (st.contentType==='page') {
      prompt+=`Include:\n`;
      if (elems.emojiIcons)        prompt+=`- Emojis on section headers\n`;
      if (elems.sectionDividers)   prompt+=`- Styled dividers between sections\n`;
      if (elems.tipBoxes)          prompt+=`- Tip/reminder boxes with 💡 icon\n`;
      if (elems.imagePlaceholders) prompt+=`- Image placeholder boxes\n`;
      if (elems.collapsible)       prompt+=`- Collapsible sections (details/summary)\n`;
      if (elems.quoteBoxes)        prompt+=`- Quote/highlight callout boxes\n`;
      if (elems.alertBoxes)        prompt+=`- Warning/alert boxes with ⚠️\n`;

    } else if (st.contentType==='announcement') {
      const cfg=st.announceConfig;
      const toneMap={informational:'General informational tone',reminder:'Reminder tone — "Don\'t forget…" framing',urgent:'Urgent/important tone — grab attention immediately',event:'Upcoming event/date announcement'};
      prompt+=`Tone: ${toneMap[cfg.type]||toneMap.informational}\n`;
      if (cfg.date)       prompt+=`Key date/deadline: ${cfg.date}\n`;
      if (cfg.actionText) prompt+=`Call to action: ${cfg.actionText}\n`;
      prompt+=`\nInclude:\n`;
      if (elems.emojiIcons)    prompt+=`- Emojis to highlight key info\n`;
      if (elems.alertBoxes)    prompt+=`- A styled highlight box for the main message\n`;
      if (elems.tipBoxes)      prompt+=`- A secondary tip/reminder callout box\n`;
      if (elems.deadlineBox)   prompt+=`- A prominently styled deadline/date block\n`;

    } else if (st.contentType==='discussion') {
      const cfg=st.discussConfig;
      const styleMap={analytical:'Analytical / Critical Thinking — students analyze evidence and form reasoned arguments',reflective:'Personal Reflection — students share personal experiences and connect to course concepts',creative:'Creative / Hypothetical — thought experiment or imaginative scenario',debate:'Debate / Argument — students take and defend a position',case_study:'Case Study / Current Events — students examine a real-world scenario'};
      prompt+=`Discussion prompt style: ${styleMap[cfg.promptStyle]||styleMap.analytical}\n`;
      if (cfg.points)    prompt+=`Points: ${cfg.points}\n`;
      if (cfg.dueDate)   prompt+=`Initial post due: ${cfg.dueDate}\n`;
      prompt+=`Response requirements: Initial post minimum ${cfg.minWords||200} words. Students must reply to ${cfg.replyCount||2} classmates, minimum ${cfg.replyWords||100} words each.\n`;
      prompt+=`\nInclude:\n`;
      if (elems.emojiIcons)   prompt+=`- Emojis on headings\n`;
      if (elems.quoteBoxes)   prompt+=`- A styled callout box prominently displaying the main discussion question\n`;
      if (elems.tipBoxes)     prompt+=`- A "How to Respond" guidelines box with numbered instructions\n`;
      if (elems.rubric)       prompt+=`- A grading rubric table (criteria: content quality, critical thinking, responsiveness to peers, writing quality)\n`;
      if (elems.netiquette)   prompt+=`- A netiquette section with discussion etiquette expectations\n`;

    } else if (st.contentType==='assignment') {
      const cfg=st.assignConfig;
      const subMap={file:'File Upload',text:'Text Entry',url:'Website URL submission',media:'Media Recording',none:'No submission required (view only)'};
      prompt+=`Submission type: ${subMap[cfg.submissionType]||subMap.file}\n`;
      prompt+=`${cfg.groupWork?'Group assignment — students work in teams':'Individual assignment'}\n`;
      if (st.pointValue) prompt+=`Total points: ${st.pointValue}\n`;
      if (st.dueDate)    prompt+=`Due date: ${st.dueDate}\n`;
      prompt+=`\nInclude:\n`;
      if (elems.objectivesBox)   prompt+=`- Learning objectives section\n`;
      if (elems.numberedSteps)   prompt+=`- Numbered step-by-step instructions\n`;
      if (elems.checklist)       prompt+=`- Submission checklist\n`;
      if (elems.rubricTable)     prompt+=`- Grading rubric table\n`;
      if (elems.videoEmbed)      prompt+=`- Video embed placeholder\n`;
      if (elems.integrityNote)   prompt+=`- Academic integrity reminder\n`;

    } else if (st.contentType==='quiz') {
      const cfg=st.quizConfig;
      const qTypeLabels={mc:'Multiple Choice',tf:'True/False',short:'Short Answer',essay:'Essay/Extended Response',matching:'Matching'};
      if (cfg.timeLimit)  prompt+=`Time limit: ${cfg.timeLimit}\n`;
      prompt+=`Attempts allowed: ${cfg.attempts==='unlimited'?'Unlimited':cfg.attempts}\n`;
      if (cfg.qTypes.length) prompt+=`Question types: ${cfg.qTypes.map(q=>qTypeLabels[q]||q).join(', ')}\n`;
      prompt+=`\nInclude:\n`;
      if (elems.timeBox)        prompt+=`- Prominently styled time limit box\n`;
      if (elems.rulesBox)       prompt+=`- Rules and policies box (academic integrity, browser requirements)\n`;
      if (elems.checklist)      prompt+=`- Pre-quiz checklist (what students need before starting)\n`;
      if (elems.pointBreakdown) prompt+=`- Point breakdown by section or question type\n`;

    } else if (st.contentType==='syllabus') {
      const cfg=st.syllabusConfig;
      if (cfg.courseName)    prompt+=`Course: ${cfg.courseName}\n`;
      if (cfg.instructor)    prompt+=`Instructor: ${cfg.instructor}\n`;
      if (cfg.term)          prompt+=`Term: ${cfg.term}\n`;
      if (cfg.meetingTimes)  prompt+=`Meeting times: ${cfg.meetingTimes}\n`;
      prompt+=`\nInclude:\n`;
      if (elems.sectionDividers) prompt+=`- Styled dividers between major sections\n`;
      if (elems.emojiIcons)      prompt+=`- Emojis on section headers\n`;
      if (elems.gradeTable)      prompt+=`- Grading breakdown table with weights/percentages\n`;
      if (elems.scheduleTable)   prompt+=`- Weekly course schedule table\n`;
      if (elems.policies)        prompt+=`- Policies section (late work, attendance, academic integrity)\n`;
      if (elems.officeHours)     prompt+=`- Office hours and contact info section\n`;
    }

    const lengthInstr = { concise:'Keep the output concise and focused — 1-2 short sections, minimal copy.', standard:'Use a balanced amount of detail — 3-4 sections with moderate copy.', detailed:'Be comprehensive — cover the topic thoroughly with multiple sections, rich detail, and supporting elements.' };
    const maxTokensMap = { concise:2000, standard:4000, detailed:8096 };
    prompt+=`\nLength: ${lengthInstr[st.contentLength]||lengthInstr.standard}\n`;

    if (st.textContent.trim()) prompt+=`\nContent:\n${st.textContent}\n`;
    if (st.uploadedFile)       prompt+=`\nUploaded file (${st.uploadedName}):\n${st.uploadedFile}\n`;
    prompt+=`\nRules: Return ONLY HTML. Inline CSS only — no <style> tags, no <head>/<body>. Web-safe fonts only. No JavaScript. No external images. Ready to paste into Canvas Rich Content Editor.`;
    ceGenerate({ model:'claude-sonnet-4-6', max_tokens:maxTokensMap[st.contentLength]||4000, messages:[{role:'user',content:prompt}] })
      .then(data => {
        genBtn.disabled=false; genBtn.textContent='✦ Generate';
        let html=data?.content?.[0]?.text||'';
        html=html.replace(/```html/gi,'').replace(/```/g,'').trim();
        st.generatedHTML=html; st.view='result'; renderFn();
      })
      .catch(err => {
        genBtn.disabled=false; genBtn.textContent='✦ Generate'; st.view='build'; renderFn();
        showNotice(err.message||'Error generating content — try again');
      });
  }

  // ── QUIZ MAKER ────────────────────────────────────────────────────────────────
  function showQuizMaker() {
    if (document.getElementById('ce-qm-overlay')) document.getElementById('ce-qm-overlay').remove();
    const apiKey = GM_getValue('ce_license_key','');

    const qst = {
      topic:'', subject:'general', level:'college', difficulty:'medium',
      typeCounts:{ mc:5, tf:3, short:2, essay:0 },
      includeExplanations:true,
      variantsPerQ:1, randomizeGroups:false,
      groups:[], checked:[], queue:[],
      quizTitle:'Quiz', engine:'classic',
    };

    const overlay = document.createElement('div');
    overlay.id='ce-qm-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};

    const pw=Math.min(1100,window.innerWidth-40);
    const ph=Math.min(880,window.innerHeight-40);
    const panel=document.createElement('div');
    panel.style.cssText=`width:${pw}px;height:${ph}px;background:#f1f5f9;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.35);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:#1a1a1a;`;

    // Top bar
    const topBar=document.createElement('div');
    topBar.style.cssText='height:52px;background:#0C447C;color:#fff;display:flex;align-items:center;padding:0 20px;gap:12px;flex-shrink:0;';
    const topTitle=document.createElement('span'); topTitle.style.cssText='font-size:15px;font-weight:700;flex:1;'; topTitle.textContent='✦ Quiz Maker';
    const closeBtn=document.createElement('button');
    closeBtn.style.cssText='background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:6px;padding:6px 14px;font-size:13px;cursor:pointer;font-family:inherit;';
    closeBtn.textContent='✕ Close'; closeBtn.onclick=()=>overlay.remove();
    topBar.appendChild(topTitle); topBar.appendChild(closeBtn); panel.appendChild(topBar);

    // 3-column grid
    const cols=document.createElement('div');
    cols.style.cssText='display:grid;grid-template-columns:280px 1fr 260px;flex:1;min-height:0;overflow:hidden;';

    // ── LEFT COLUMN ────────────────────────────────────────────────────────
    const left=document.createElement('div');
    left.style.cssText='overflow-y:auto;background:#fff;border-right:1px solid #e2e4e7;display:flex;flex-direction:column;';
    const leftHdr=document.createElement('div');
    leftHdr.style.cssText='padding:12px 16px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;background:#fff;position:sticky;top:0;z-index:2;';
    leftHdr.textContent='Builder'; left.appendChild(leftHdr);
    const leftBody=document.createElement('div'); leftBody.style.cssText='padding:14px 16px;';

    function qCard(){const d=document.createElement('div');d.style.cssText='background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px;';return d;}
    function qSectionLbl(txt){const d=document.createElement('div');d.style.cssText='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px;';d.textContent=txt;return d;}
    function qField(lbl,ph,val,cb,type='text'){
      const w=document.createElement('div');w.style.marginBottom='8px';
      if(lbl){const l=document.createElement('div');l.textContent=lbl;l.style.cssText='font-size:12px;color:#6b7280;margin-bottom:4px;';w.appendChild(l);}
      const inp=document.createElement('input');inp.type=type;inp.placeholder=ph;inp.value=val||'';
      inp.style.cssText='width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;background:#fff;box-sizing:border-box;';
      inp.oninput=()=>cb(inp.value);w.appendChild(inp);return w;
    }
    function qSelField(lbl,opts,val,cb){
      const w=document.createElement('div');w.style.marginBottom='8px';
      if(lbl){const l=document.createElement('div');l.textContent=lbl;l.style.cssText='font-size:12px;color:#6b7280;margin-bottom:4px;';w.appendChild(l);}
      const sel=document.createElement('select');
      sel.style.cssText='width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;background:#fff;cursor:pointer;box-sizing:border-box;';
      opts.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if(v===val)o.selected=true;sel.appendChild(o);});
      sel.onchange=()=>cb(sel.value);w.appendChild(sel);return w;
    }
    function qSwitch(lbl,desc,checked,cb){
      const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;';
      const info=document.createElement('div');
      const name=document.createElement('div');name.textContent=lbl;name.style.cssText='font-size:12px;font-weight:500;color:#111827;';
      info.appendChild(name);
      if(desc){const d=document.createElement('div');d.textContent=desc;d.style.cssText='font-size:11px;color:#9ca3af;';info.appendChild(d);}
      let cur=checked;
      const sw=document.createElement('div');
      sw.style.cssText=`width:36px;height:20px;border-radius:10px;background:${cur?'#7c3aed':'#d1d5db'};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;`;
      const knob=document.createElement('div');
      knob.style.cssText=`position:absolute;top:2px;left:${cur?'18px':'2px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);`;
      sw.appendChild(knob);
      sw.onclick=()=>{cur=!cur;sw.style.background=cur?'#7c3aed':'#d1d5db';knob.style.left=cur?'18px':'2px';cb(cur);};
      row.appendChild(info);row.appendChild(sw);return row;
    }

    function qCountRow(lbl,desc,typeKey,totalSpan){
      const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;';
      const info=document.createElement('div');
      const name=document.createElement('div');name.textContent=lbl;name.style.cssText='font-size:12px;font-weight:500;color:#111827;';
      info.appendChild(name);
      if(desc){const d=document.createElement('div');d.textContent=desc;d.style.cssText='font-size:11px;color:#9ca3af;';info.appendChild(d);}
      const ctrl=document.createElement('div');ctrl.style.cssText='display:flex;align-items:center;gap:4px;flex-shrink:0;';
      const minusBtn=document.createElement('button');minusBtn.textContent='−';
      minusBtn.style.cssText='width:24px;height:24px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;line-height:1;font-family:inherit;color:#374151;padding:0;';
      const numSpan=document.createElement('span');numSpan.textContent=qst.typeCounts[typeKey];
      numSpan.style.cssText='min-width:24px;text-align:center;font-size:13px;font-weight:600;color:#111827;';
      const plusBtn=document.createElement('button');plusBtn.textContent='+';
      plusBtn.style.cssText='width:24px;height:24px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;line-height:1;font-family:inherit;color:#374151;padding:0;';
      function updateCount(delta){
        qst.typeCounts[typeKey]=Math.max(0,qst.typeCounts[typeKey]+delta);
        numSpan.textContent=qst.typeCounts[typeKey];
        numSpan.style.color=qst.typeCounts[typeKey]===0?'#9ca3af':'#111827';
        name.style.color=qst.typeCounts[typeKey]===0?'#9ca3af':'#111827';
        if(totalSpan)totalSpan.textContent='Total: '+Object.values(qst.typeCounts).reduce((s,v)=>s+v,0)+' questions';
      }
      updateCount(0);
      minusBtn.onclick=()=>updateCount(-1);
      plusBtn.onclick=()=>updateCount(1);
      ctrl.appendChild(minusBtn);ctrl.appendChild(numSpan);ctrl.appendChild(plusBtn);
      row.appendChild(info);row.appendChild(ctrl);return row;
    }

    // Topic card
    const topicCard=qCard(); topicCard.appendChild(qSectionLbl('Topic'));
    const topicTa=document.createElement('textarea');
    topicTa.rows=3;topicTa.placeholder='e.g. The American Civil War\ne.g. Photosynthesis\ne.g. Quadratic equations';
    topicTa.style.cssText='width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;';
    topicTa.oninput=()=>qst.topic=topicTa.value;
    topicCard.appendChild(topicTa); leftBody.appendChild(topicCard);

    // Settings card
    const setCard=qCard(); setCard.appendChild(qSectionLbl('Settings'));
    setCard.appendChild(qSelField('Subject',[['general','General / Any'],['math','Mathematics'],['science','Science'],['history','History / Social Studies'],['english','English / Language Arts'],['foreign_lang','Foreign Language'],['cs','Computer Science'],['other','Other']],qst.subject,v=>qst.subject=v));
    setCard.appendChild(qSelField('Level',[['elementary','Elementary (K–5)'],['middle','Middle School (6–8)'],['high','High School (9–12)'],['college','College / University'],['graduate','Graduate Level'],['professional','Professional / Certification']],qst.level,v=>qst.level=v));
    setCard.appendChild(qSelField('Difficulty',[['easy','Easy'],['medium','Medium'],['hard','Hard'],['mixed','Mixed — variety of difficulties']],qst.difficulty,v=>qst.difficulty=v));
    setCard.appendChild(qSelField('Variants per question',[['1','1 — unique questions'],['2','2 — pairs (A & B)'],['3','3 — triplets (A, B & C)']],String(qst.variantsPerQ),v=>{qst.variantsPerQ=parseInt(v);}));
    setCard.appendChild(qSwitch('Randomize questions','Canvas shows 1 random variant per student (Classic Quizzes)',qst.randomizeGroups,v=>qst.randomizeGroups=v));
    leftBody.appendChild(setCard);

    // Question types card with per-type count steppers
    const typeCard=qCard(); typeCard.appendChild(qSectionLbl('Question Types'));
    const typeTotalSpan=document.createElement('div');
    typeTotalSpan.style.cssText='font-size:11px;color:#6b7280;text-align:right;margin-top:6px;';
    typeTotalSpan.textContent='Total: '+Object.values(qst.typeCounts).reduce((s,v)=>s+v,0)+' questions';
    typeCard.appendChild(qCountRow('Multiple Choice','4 options, one correct','mc',typeTotalSpan));
    typeCard.appendChild(qCountRow('True / False','Binary choice','tf',typeTotalSpan));
    typeCard.appendChild(qCountRow('Short Answer','Word, number, or phrase','short',typeTotalSpan));
    typeCard.appendChild(qCountRow('Essay','Open-ended, manually graded','essay',typeTotalSpan));
    typeCard.appendChild(typeTotalSpan);
    leftBody.appendChild(typeCard);

    // Options card
    const optsCard=qCard(); optsCard.appendChild(qSectionLbl('Options'));
    optsCard.appendChild(qSwitch('Include Explanations','Answer explanations on each question',qst.includeExplanations,v=>qst.includeExplanations=v));
    leftBody.appendChild(optsCard);

    if(!apiKey){
      const notice=document.createElement('div');
      notice.style.cssText='background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;font-size:12px;color:#1e40af;margin-bottom:12px;line-height:1.5;';
      notice.innerHTML='<strong>License key required.</strong><br>Set your key via <strong>✦ AI Builder → ⚙ Setup</strong>.';
      leftBody.appendChild(notice);
    }

    const statusEl=document.createElement('div');statusEl.style.display='none';leftBody.appendChild(statusEl);
    function showQStatus(msg,type){
      const c={err:'background:#fef2f2;color:#991b1b;border:1px solid #fca5a5',ok:'background:#f0fdf4;color:#166534;border:1px solid #86efac',info:'background:#eff6ff;color:#1e40af;border:1px solid #93c5fd'};
      statusEl.style.cssText=`display:block;padding:10px 12px;border-radius:6px;font-size:12px;margin-bottom:10px;line-height:1.5;${c[type]||c.info}`;
      statusEl.textContent=msg;
      if(type!=='info')setTimeout(()=>statusEl.style.display='none',5000);
    }

    const genBtn=document.createElement('button');
    genBtn.textContent='✦ Generate Questions';
    genBtn.style.cssText='width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:8px;box-shadow:0 4px 12px rgba(124,58,237,.3);';
    leftBody.appendChild(genBtn);

    const loadEl=document.createElement('div');
    loadEl.style.cssText='display:none;text-align:center;padding:12px;color:#6b7280;font-size:13px;';
    loadEl.innerHTML='<div style="display:inline-block;width:16px;height:16px;border:2px solid #e2e8f0;border-top-color:#7c3aed;border-radius:50%;animation:ce-spin .7s linear infinite;vertical-align:middle;margin-right:8px;"></div>Claude is writing your questions…';
    leftBody.appendChild(loadEl);
    left.appendChild(leftBody);

    // ── CENTER COLUMN ──────────────────────────────────────────────────────
    const mid=document.createElement('div');
    mid.style.cssText='overflow-y:auto;background:#f8f9fa;border-right:1px solid #e2e4e7;display:flex;flex-direction:column;';
    const midHdrRow=document.createElement('div');
    midHdrRow.style.cssText='padding:12px 16px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;background:#f8f9fa;position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;';
    midHdrRow.textContent='Questions';
    const selAllBtn=document.createElement('button');
    selAllBtn.style.cssText='display:none;font-size:11px;background:none;border:none;color:#7c3aed;cursor:pointer;font-family:inherit;font-weight:700;';
    selAllBtn.textContent='Select all';
    midHdrRow.appendChild(selAllBtn); mid.appendChild(midHdrRow);
    const midBody=document.createElement('div'); midBody.style.cssText='padding:14px 16px;';
    const midEmpty=document.createElement('div');
    midEmpty.style.cssText='display:flex;align-items:center;justify-content:center;height:280px;color:#9ca3af;font-size:13px;text-align:center;line-height:1.8;';
    midEmpty.innerHTML='Generate questions on the left<br>to review and select them here.';
    midBody.appendChild(midEmpty); mid.appendChild(midBody);

    // ── RIGHT COLUMN ───────────────────────────────────────────────────────
    const right=document.createElement('div');
    right.style.cssText='overflow-y:auto;background:#fff;display:flex;flex-direction:column;';
    const qCountBadge=document.createElement('span');
    qCountBadge.style.cssText='background:#e5e7eb;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700;margin-left:6px;';qCountBadge.textContent='0';
    const rightHdrRow=document.createElement('div');
    rightHdrRow.style.cssText='padding:12px 16px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;background:#fff;position:sticky;top:0;z-index:2;display:flex;align-items:center;';
    rightHdrRow.textContent='Quiz '; rightHdrRow.appendChild(qCountBadge); right.appendChild(rightHdrRow);
    const rightBody=document.createElement('div'); rightBody.style.cssText='padding:14px 16px;';

    rightBody.appendChild(qField('Quiz title','e.g. Unit 3 Quiz',qst.quizTitle,v=>qst.quizTitle=v));
    rightBody.appendChild(qSelField('Quiz engine',[['classic','Classic Quizzes'],['new','New Quizzes (LTI)']],qst.engine,v=>qst.engine=v));

    const addSelBtn=document.createElement('button');
    addSelBtn.textContent='+ Add Selected to Quiz';
    addSelBtn.disabled=true;
    addSelBtn.style.cssText='width:100%;padding:10px;background:#9ca3af;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px;margin-bottom:8px;';
    rightBody.appendChild(addSelBtn);

    const div1=document.createElement('div');div1.style.cssText='height:1px;background:#e5e7eb;margin:4px 0 12px;';rightBody.appendChild(div1);

    const queueEmpty=document.createElement('div');
    queueEmpty.style.cssText='text-align:center;padding:20px 8px;color:#9ca3af;font-size:12px;line-height:1.8;';
    queueEmpty.innerHTML='No questions yet.<br>Select questions in the center<br>and click <strong>Add Selected</strong>.';
    rightBody.appendChild(queueEmpty);

    const queueList=document.createElement('div');queueList.style.display='none';rightBody.appendChild(queueList);

    const exportArea=document.createElement('div');exportArea.style.display='none';
    const div2=document.createElement('div');div2.style.cssText='height:1px;background:#e5e7eb;margin:12px 0;';exportArea.appendChild(div2);
    const createBtn=document.createElement('button');
    createBtn.textContent='✓ Create Quiz in Canvas';
    createBtn.style.cssText='width:100%;padding:12px;background:#0770B8;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;';
    exportArea.appendChild(createBtn);
    const exportStatus=document.createElement('div');exportArea.appendChild(exportStatus);
    const clearBtn=document.createElement('button');
    clearBtn.textContent='Clear all questions';
    clearBtn.style.cssText='width:100%;padding:8px;background:none;border:none;color:#9ca3af;font-size:12px;cursor:pointer;font-family:inherit;margin-top:4px;';
    clearBtn.onclick=()=>{qst.queue=[];renderQueue();};
    exportArea.appendChild(clearBtn);
    rightBody.appendChild(exportArea);
    right.appendChild(rightBody);

    cols.appendChild(left);cols.appendChild(mid);cols.appendChild(right);
    panel.appendChild(cols); overlay.appendChild(panel); document.body.appendChild(overlay);

    // ── RENDER QUESTIONS ───────────────────────────────────────────────────
    const TYPE_LABELS={mc:'Multiple Choice',tf:'True / False',short:'Short Answer',essay:'Essay'};
    const TYPE_BADGE={mc:'background:#dbeafe;color:#1e40af',tf:'background:#dcfce7;color:#166534',short:'background:#fef3c7;color:#92400e',essay:'background:#f3e8ff;color:#6b21a8'};

    function updateAddBtn(){
      const n=qst.checked.filter(Boolean).length;
      addSelBtn.disabled=n===0;
      const vTotal=qst.groups.filter((_,i)=>qst.checked[i]).reduce((s,g)=>s+g.variants.length,0);
      addSelBtn.textContent=n>0?`+ Add ${n} Group${n!==1?'s':''} (${vTotal} q) to Quiz`:'+ Add Selected to Quiz';
      addSelBtn.style.background=n>0?'#7c3aed':'#9ca3af';
      addSelBtn.style.cursor=n>0?'pointer':'default';
    }

    const activeVariant=[];
    function renderQVariant(q){
      const wrap=document.createElement('div');wrap.style.marginLeft='26px';
      const qTxt=document.createElement('div');qTxt.style.cssText='font-size:13px;line-height:1.5;color:#111827;margin-bottom:8px;';qTxt.textContent=q.text;wrap.appendChild(qTxt);
      const ans=document.createElement('div');
      if(q.type==='mc'&&q.choices?.length){
        q.choices.forEach(c=>{
          const row=document.createElement('div');
          row.style.cssText=`display:flex;gap:6px;align-items:flex-start;font-size:12px;padding:4px 8px;border-radius:6px;margin-bottom:3px;${c.correct?'background:#f0fdf4;border:1px solid #86efac;':'background:#f9fafb;border:1px solid #f3f4f6;'}`;
          row.innerHTML=`<span style="font-weight:700;min-width:16px;color:${c.correct?'#166534':'#6b7280'}">${c.label}.</span><span style="color:${c.correct?'#166534':'#374151'}">${c.text}</span>`;
          ans.appendChild(row);
        });
      } else if(q.type==='tf'){
        ans.innerHTML=`<span style="font-size:12px;padding:3px 10px;border-radius:6px;background:#f0fdf4;border:1px solid #86efac;color:#166534;display:inline-block;">Answer: ${q.answer?'True':'False'}</span>`;
      } else if(q.type==='short'){
        ans.innerHTML=`<span style="font-size:12px;padding:3px 10px;border-radius:6px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;display:inline-block;">Answer: ${q.answer||''}</span>`;
      } else {
        ans.innerHTML=`<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:#f3e8ff;border:1px solid #d8b4fe;color:#6b21a8;display:inline-block;">Manually graded</span>`;
      }
      wrap.appendChild(ans);
      if(qst.includeExplanations&&q.explanation){
        const exp=document.createElement('div');exp.style.cssText='margin-top:8px;font-size:11px;color:#6b7280;padding-top:8px;border-top:1px solid #f1f5f9;line-height:1.5;';exp.textContent='💡 '+q.explanation;wrap.appendChild(exp);
      }
      return wrap;
    }

    function renderQuestions(){
      midBody.innerHTML='';
      if(!qst.groups.length){midBody.appendChild(midEmpty);return;}
      selAllBtn.style.display='inline-block';
      const totalQ=qst.groups.reduce((s,g)=>s+g.variants.length,0);
      const bar=document.createElement('div');bar.style.cssText='font-size:12px;color:#6b7280;margin-bottom:12px;';
      bar.textContent=`${qst.groups.length} group${qst.groups.length!==1?'s':''} · ${totalQ} total question${totalQ!==1?'s':''}`;
      midBody.appendChild(bar);

      qst.groups.forEach((g,gi)=>{
        if(activeVariant[gi]===undefined)activeVariant[gi]=0;
        const sel=qst.checked[gi];
        const card=document.createElement('div');
        card.style.cssText=`background:#fff;border:2px solid ${sel?'#7c3aed':'#e5e7eb'};border-radius:10px;padding:12px 14px;margin-bottom:10px;transition:border-color .15s;`;

        // Header row
        const hdr=document.createElement('div');hdr.style.cssText='display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;cursor:pointer;';
        const cbBox=document.createElement('div');
        cbBox.style.cssText=`width:18px;height:18px;border-radius:4px;border:2px solid ${sel?'#7c3aed':'#d1d5db'};background:${sel?'#7c3aed':'#fff'};flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;`;
        if(sel)cbBox.innerHTML='<svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
        const qNum=document.createElement('div');qNum.style.cssText='font-weight:700;font-size:13px;color:#111;flex:1;';
        qNum.textContent=`Group ${gi+1}${g.concept?' — '+g.concept:''}`;
        const firstQ=g.variants[0];
        const bc=TYPE_BADGE[firstQ?.type]||TYPE_BADGE.mc;
        const badge=document.createElement('span');
        badge.style.cssText=`font-size:10px;padding:2px 8px;border-radius:20px;${bc};font-weight:600;white-space:nowrap;flex-shrink:0;`;
        badge.textContent=TYPE_LABELS[firstQ?.type]||'?';
        hdr.appendChild(cbBox);hdr.appendChild(qNum);hdr.appendChild(badge);
        hdr.onclick=()=>{qst.checked[gi]=!qst.checked[gi];updateAddBtn();renderQuestions();};
        card.appendChild(hdr);

        // Variant tabs (only if >1 variant)
        if(g.variants.length>1){
          const tabRow=document.createElement('div');tabRow.style.cssText='display:flex;gap:4px;margin-bottom:8px;margin-left:26px;';
          g.variants.forEach((v,vi)=>{
            const tab=document.createElement('button');tab.type='button';
            const isActive=activeVariant[gi]===vi;
            tab.style.cssText=`padding:3px 10px;border-radius:20px;border:1px solid ${isActive?'#7c3aed':'#d1d5db'};background:${isActive?'#f5f3ff':'#f9fafb'};color:${isActive?'#7c3aed':'#6b7280'};font-size:11px;font-weight:${isActive?'700':'400'};cursor:pointer;font-family:inherit;`;
            tab.textContent='Version '+String.fromCharCode(65+vi);
            tab.onclick=e=>{e.stopPropagation();activeVariant[gi]=vi;renderQuestions();};
            tabRow.appendChild(tab);
          });
          card.appendChild(tabRow);
        }

        // Active variant content
        card.appendChild(renderQVariant(g.variants[activeVariant[gi]]||g.variants[0]));
        midBody.appendChild(card);
      });
    }

    let allSelected=false;
    selAllBtn.onclick=()=>{
      allSelected=!allSelected;
      qst.checked=qst.groups.map(()=>allSelected);
      selAllBtn.textContent=allSelected?'Deselect all':'Select all';
      updateAddBtn();renderQuestions();
    };

    // ── RENDER QUEUE ───────────────────────────────────────────────────────
    function renderQueue(){
      const totalQueueQ=qst.queue.reduce((s,g)=>s+g.variants.length,0);
      qCountBadge.textContent=qst.queue.length;
      if(!qst.queue.length){queueEmpty.style.display='block';queueList.style.display='none';exportArea.style.display='none';return;}
      queueEmpty.style.display='none';queueList.style.display='block';exportArea.style.display='block';
      queueList.innerHTML='';
      const TYPE_SHORT={mc:'MC',tf:'T/F',short:'SA',essay:'Essay'};
      const totalLine=document.createElement('div');totalLine.style.cssText='font-size:11px;color:#9ca3af;margin-bottom:8px;';
      totalLine.textContent=`${qst.queue.length} groups · ${totalQueueQ} total questions`;
      queueList.appendChild(totalLine);
      qst.queue.forEach((g,i)=>{
        const firstQ=g.variants[0]||{};
        const item=document.createElement('div');item.style.cssText='display:flex;align-items:flex-start;gap:6px;padding:7px 0;border-bottom:1px solid #f1f5f9;';
        const num=document.createElement('span');num.style.cssText='font-size:11px;font-weight:700;color:#9ca3af;min-width:18px;margin-top:2px;';num.textContent=(i+1)+'.';
        const bc=TYPE_BADGE[firstQ.type]||TYPE_BADGE.mc;
        const badge=document.createElement('span');badge.style.cssText=`font-size:9px;padding:1px 5px;border-radius:10px;${bc};font-weight:700;flex-shrink:0;margin-top:3px;`;badge.textContent=TYPE_SHORT[firstQ.type]||'?';
        const txt=document.createElement('div');txt.style.cssText='flex:1;';
        const label=document.createElement('div');label.style.cssText='font-size:12px;color:#374151;line-height:1.4;';
        label.textContent=(g.concept||firstQ.text||'').slice(0,55)+(( g.concept||firstQ.text||'').length>55?'…':'');
        txt.appendChild(label);
        if(g.variants.length>1){
          const vtag=document.createElement('div');vtag.style.cssText='font-size:10px;color:#7c3aed;margin-top:2px;';
          vtag.textContent=`${g.variants.length} variants`+(qst.randomizeGroups?' · randomized':'');
          txt.appendChild(vtag);
        }
        const del=document.createElement('button');del.textContent='✕';del.style.cssText='background:none;border:none;color:#9ca3af;cursor:pointer;font-size:11px;flex-shrink:0;padding:0;line-height:1;margin-top:2px;';
        del.onclick=()=>{qst.queue.splice(i,1);renderQueue();};
        item.appendChild(num);item.appendChild(badge);item.appendChild(txt);item.appendChild(del);
        queueList.appendChild(item);
      });
    }

    addSelBtn.onclick=()=>{
      const toAdd=qst.groups.filter((_,i)=>qst.checked[i]);
      if(!toAdd.length)return;
      qst.queue.push(...toAdd);
      qst.checked=qst.groups.map(()=>false);
      allSelected=false; selAllBtn.textContent='Select all';
      updateAddBtn();renderQuestions();renderQueue();
      const qCount=toAdd.reduce((s,g)=>s+g.variants.length,0);
      showQStatus(`${toAdd.length} group${toAdd.length!==1?'s':''} (${qCount} questions) added to quiz.`,'ok');
    };

    // ── GENERATE ───────────────────────────────────────────────────────────
    genBtn.onclick=()=>{
      // license check bypassed
      if(!qst.topic.trim()){showQStatus('Enter a topic first.','err');return;}
      const totalQ=Object.values(qst.typeCounts).reduce((s,v)=>s+v,0);
      if(!totalQ){showQStatus('Set at least one question type count above zero.','err');return;}
      genBtn.disabled=true; loadEl.style.display='block';
      const typeLabels={mc:'Multiple Choice (4 options A–D, exactly one correct)',tf:'True/False (answer is boolean)',short:'Short Answer (single word, number, or short phrase)',essay:'Essay (open-ended, no answer key)'};
      const levelMap={elementary:'Elementary (K–5)',middle:'Middle School',high:'High School',college:'College / University',graduate:'Graduate Level',professional:'Professional / Certification'};
      const diffMap={easy:'easy',medium:'medium difficulty',hard:'challenging/hard',mixed:'a mix of easy, medium, and hard'};
      const useGroups=qst.variantsPerQ>1;
      const typeCountLines=Object.entries(qst.typeCounts).filter(([,n])=>n>0).map(([k,n])=>`${n} ${typeLabels[k]}`).join('\n');
      const qSchema=`{
      "type": "mc|tf|short|essay",
      "text": "Question text",
      "choices": [{"label":"A","text":"option","correct":false},{"label":"B","text":"option","correct":true},{"label":"C","text":"option","correct":false},{"label":"D","text":"option","correct":false}],
      "answer": null,
      "answer_alts": [],
      "explanation": "Why the answer is correct"
    }`;
      const prompt=useGroups
        ?`You are an expert quiz designer for Canvas LMS. Generate exactly ${totalQ} question GROUPS about: "${qst.topic}"

Each group tests the same concept but uses completely different wording, numbers, or scenarios for each variant — designed so different students get equivalent but non-identical questions.
Subject: ${qst.subject==='general'?'general':qst.subject}
Level: ${levelMap[qst.level]||'College'}
Difficulty: ${diffMap[qst.difficulty]||'medium'}
Variants per group: ${qst.variantsPerQ}
Question type breakdown (exact counts):
${typeCountLines}
${qst.includeExplanations?'Include a brief explanation for each correct answer.':'Do not include explanations.'}

Return ONLY valid JSON — no markdown, no code fences:
{
  "groups": [
    {
      "concept": "Concept name under 6 words",
      "variants": [${qSchema},${qSchema}]
    }
  ]
}

Critical rules:
- Each group must have exactly ${qst.variantsPerQ} variants
- All variants in a group must be the same question type
- mc: exactly 4 choices (A–D), exactly one correct:true
- tf: answer must be boolean true or false
- short: answer is a string; include answer_alts for alternate forms
- essay: answer is null
- Match the exact question type counts listed above
- Total groups: exactly ${totalQ}`
        :`You are an expert quiz designer for Canvas LMS. Generate questions about: "${qst.topic}"

Subject: ${qst.subject==='general'?'general':qst.subject}
Level: ${levelMap[qst.level]||'College'}
Difficulty: ${diffMap[qst.difficulty]||'medium'}
Question type breakdown (exact counts):
${typeCountLines}
${qst.includeExplanations?'Include a brief explanation for each correct answer.':'Do not include explanations.'}

Return ONLY valid JSON — no markdown, no code fences:
{ "questions": [${qSchema}] }

Critical rules:
- mc: exactly 4 choices (A–D), exactly one correct:true
- tf: answer must be boolean true or false
- short: answer is a string; include answer_alts for alternate forms
- essay: answer is null
- Match the exact question type counts listed above
- Total: exactly ${totalQ} questions`;

      ceGenerate({ model:'claude-sonnet-4-6', max_tokens:12000, messages:[{role:'user',content:prompt}] })
        .then(data => {
          genBtn.disabled=false; loadEl.style.display='none';
          let raw=data?.content?.[0]?.text||'';
          raw=raw.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
          const s=raw.indexOf('{'),e=raw.lastIndexOf('}');
          if(s===-1||e===-1){showQStatus('Could not find JSON in response','err');return;}
          try{
            const parsed=JSON.parse(raw.slice(s,e+1));
            if(parsed.groups?.length){
              qst.groups=parsed.groups;
            } else if(parsed.questions?.length){
              qst.groups=parsed.questions.map(q=>({concept:q.text.slice(0,50),variants:[q]}));
            } else {
              showQStatus('No questions returned','err');return;
            }
            qst.checked=qst.groups.map(()=>false);
            allSelected=false;selAllBtn.textContent='Select all';
            activeVariant.length=0;
            renderQuestions();
            const totalQ=qst.groups.reduce((s,g)=>s+g.variants.length,0);
            showQStatus(`${qst.groups.length} group${qst.groups.length!==1?'s':''} (${totalQ} questions) generated — select to add.`,'ok');
          }catch(err){showQStatus('Parse error: '+err.message,'err');}
        })
        .catch(err => {
          genBtn.disabled=false; loadEl.style.display='none';
          showQStatus(err.message||'Error generating questions — try again','err');
        });
    };

    // ── CANVAS API HELPERS ─────────────────────────────────────────────────
    function csrf(){
      const m=document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
      if(m)return decodeURIComponent(m[1]);
      const meta=document.querySelector('meta[name="csrf-token"]');
      return meta?meta.getAttribute('content'):'';
    }
    async function canvasAPI(method,path,body){
      const r=await fetch(window.location.origin+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-Token':csrf()},body:body?JSON.stringify(body):undefined});
      if(!r.ok){const t=await r.text();throw new Error(`Canvas API ${r.status}: ${t.slice(0,200)}`);}
      return r.json();
    }
    function showExportStatus(msg,type){
      const c={err:'background:#fef2f2;color:#991b1b;border:1px solid #fca5a5',ok:'background:#f0fdf4;color:#166534;border:1px solid #86efac',info:'background:#eff6ff;color:#1e40af;border:1px solid #93c5fd'};
      exportStatus.innerHTML=`<div style="padding:8px 12px;border-radius:6px;font-size:12px;margin-top:8px;line-height:1.5;${c[type]||c.info}">${msg}</div>`;
    }

    // ── CREATE CLASSIC QUIZ ────────────────────────────────────────────────
    async function createClassicQuiz(cid){
      const totalQ=qst.queue.reduce((s,g)=>s+g.variants.length,0);
      showExportStatus('Creating quiz…','info');
      const quiz=await canvasAPI('POST',`/api/v1/courses/${cid}/quizzes`,{quiz:{title:qst.quizTitle||'Quiz',quiz_type:'assignment',published:false,show_correct_answers:true}});
      const qid=quiz.id;
      showExportStatus(`Quiz created — adding ${totalQ} questions…`,'info');
      const TYPE_MAP={mc:'multiple_choice_question',tf:'true_false_question',short:'short_answer_question',essay:'essay_question'};
      function buildClassicQ(q,pos,groupId){
        const body={question_name:`Q${pos}`,question_text:q.text,question_type:TYPE_MAP[q.type]||'short_answer_question',points_possible:q.type==='essay'?5:1,position:pos};
        if(groupId) body.quiz_group_id=groupId;
        if(q.type==='mc') body.answers=q.choices.map(c=>({answer_text:c.text,answer_weight:c.correct?100:0,answer_comments:c.correct&&q.explanation?q.explanation:''}));
        else if(q.type==='tf') body.answers=[{answer_text:'True',answer_weight:q.answer===true?100:0},{answer_text:'False',answer_weight:q.answer===false?100:0}];
        else if(q.type==='short'){const alts=[q.answer,...(q.answer_alts||[])].filter(Boolean);body.answers=alts.map(a=>({answer_text:a,answer_weight:100}));}
        return body;
      }
      let pos=1;
      for(const [gi,g] of qst.queue.entries()){
        const useGroup=qst.randomizeGroups&&g.variants.length>1;
        let groupId=null;
        if(useGroup){
          const grpResp=await canvasAPI('POST',`/api/v1/courses/${cid}/quizzes/${qid}/groups`,{quiz_groups:[{name:g.concept||`Group ${gi+1}`,pick_count:1,question_points:1}]});
          groupId=grpResp?.quiz_groups?.[0]?.id||null;
        }
        for(const v of g.variants){
          await canvasAPI('POST',`/api/v1/courses/${cid}/quizzes/${qid}/questions`,{question:buildClassicQ(v,pos++,groupId)});
        }
      }
      const url=`${window.location.origin}/courses/${cid}/quizzes/${qid}`;
      const note=qst.randomizeGroups&&qst.queue.some(g=>g.variants.length>1)?' (groups randomized — each student gets 1 variant per group)':'';
      showExportStatus(`✓ Quiz created${note}! <a href="${url}" target="_blank" style="color:#0770B8;font-weight:600;">Open in Canvas ↗</a>`,'ok');
    }

    // ── CREATE NEW QUIZ (LTI) ──────────────────────────────────────────────
    async function createNewQuiz(cid){
      const totalQ=qst.queue.reduce((s,g)=>s+g.variants.length,0);
      showExportStatus('Creating New Quiz…','info');
      const quiz=await canvasAPI('POST',`/api/quiz/v1/courses/${cid}/quizzes`,{quiz:{title:qst.quizTitle||'Quiz',quiz_type:'practice_quiz'}});
      const qid=quiz.id;
      showExportStatus(`Quiz created — adding ${totalQ} questions…`,'info');
      const typeSlug={mc:'choice',tf:'true_false',short:'short_answer',essay:'essay'};
      function buildNewItem(q,pos){
        const entry={entry_type:'Item',position:pos,item_body:`<p>${q.text}</p>`,interaction_type_slug:typeSlug[q.type]||'short_answer',scoring_data:{value:q.type==='essay'?5:1},answer_feedback:{}};
        if(q.type==='mc'){
          entry.interaction_data={choices:q.choices.map((c,i)=>({id:`c${i}`,item_body:`<p>${c.text}</p>`,position:i+1}))};
          const ci=q.choices.findIndex(c=>c.correct);
          entry.scoring_data.correct_answer=ci>=0?[{type:'choice',value:`c${ci}`}]:[];
          entry.scoring_algorithm='Equivalence';
        } else if(q.type==='tf'){
          entry.interaction_data={true_choice:{item_body:'<p>True</p>'},false_choice:{item_body:'<p>False</p>'}};
          entry.scoring_data.correct_answer=q.answer?'true':'false';
          entry.scoring_algorithm='Equivalence';
        } else if(q.type==='short'){
          entry.interaction_data={};
          entry.scoring_data.correct_answer=[q.answer,...(q.answer_alts||[])].filter(Boolean);
          entry.scoring_algorithm='TextMatch';
        } else {
          entry.interaction_data={};entry.scoring_algorithm='None';
        }
        return entry;
      }
      let pos=1;
      for(const g of qst.queue){
        for(const v of g.variants){
          await canvasAPI('POST',`/api/quiz/v1/courses/${cid}/quizzes/${qid}/items`,{item:buildNewItem(v,pos++)});
        }
      }
      const url=`${window.location.origin}/courses/${cid}/quizzes/${qid}`;
      const note=qst.randomizeGroups&&qst.queue.some(g=>g.variants.length>1)?' (all variants added — New Quizzes randomization requires item banks; variants appear as separate items)':'';
      showExportStatus(`✓ Quiz created${note}! <a href="${url}" target="_blank" style="color:#0770B8;font-weight:600;">Open in Canvas ↗</a>`,'ok');
    }

    createBtn.onclick=async()=>{
      if(!qst.queue.length){showExportStatus('Add questions to the quiz first.','err');return;}
      const cid=window.location.pathname.match(/\/courses\/(\d+)/)?.[1];
      if(!cid){showExportStatus('Navigate to a Canvas course first.','err');return;}
      createBtn.disabled=true;createBtn.textContent='Creating…';
      try{ if(qst.engine==='classic') await createClassicQuiz(cid); else await createNewQuiz(cid); }
      catch(e){showExportStatus(`Error: ${e.message}`,'err');}
      createBtn.disabled=false;createBtn.textContent='✓ Create Quiz in Canvas';
    };
  }

  // ── UPGRADE MODAL ─────────────────────────────────────────────────────────────
  function showUpgradeModal(feature) {
    if (document.getElementById('ce-upgrade-overlay')) return;
    const overlay = document.createElement('div'); overlay.id = 'ce-upgrade-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:center;justify-content:center;';

    const panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;border-radius:14px;width:500px;max-width:calc(100vw - 40px);overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.35);font-family:inherit;';

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px 28px 20px;color:#fff;position:relative;';
    hdr.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;opacity:.8;margin-bottom:6px;">Canvas Enhancer Pro</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:4px;">Unlock ${feature}</div>
      <div style="font-size:14px;opacity:.85;">AI-powered content creation for Canvas LMS instructors.</div>`;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:18px;background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;';
    closeBtn.onclick = () => overlay.remove();
    hdr.appendChild(closeBtn); panel.appendChild(hdr);

    // Video placeholder
    const vid = document.createElement('div');
    vid.style.cssText = 'background:#0f0f1a;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;';
    vid.innerHTML = `
      <div style="width:56px;height:56px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.3);">
        <span style="font-size:22px;margin-left:4px;">▶</span>
      </div>
      <div style="color:rgba(255,255,255,.5);font-size:13px;">Demo video coming soon</div>`;
    panel.appendChild(vid);

    // Features
    const body = document.createElement('div'); body.style.cssText = 'padding:20px 28px;';

    const features = feature === 'AI Builder'
      ? ['Generate full Canvas pages, assignments, and discussions in seconds','Auto-detects the page type and customizes the output','Choose content length and insert or replace existing content']
      : ['Build complete Canvas quizzes with AI-generated questions','Multiple choice, true/false, short answer, and essay','Creates the quiz directly in Canvas — Classic and New Quizzes'];

    const featureList = document.createElement('ul');
    featureList.style.cssText = 'list-style:none;padding:0;margin:0 0 20px;display:flex;flex-direction:column;gap:8px;';
    features.forEach(f => {
      const li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#374151;';
      li.innerHTML = `<span style="color:#7c3aed;font-size:16px;line-height:1.2;flex-shrink:0;">✓</span><span>${f}</span>`;
      featureList.appendChild(li);
    });
    body.appendChild(featureList);

    // Pricing
    const price = document.createElement('div');
    price.style.cssText = 'background:#f5f3ff;border:1px solid #ede9fe;border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    price.innerHTML = `
      <div>
        <div style="font-size:15px;font-weight:700;color:#111827;">Base Plan</div>
        <div style="font-size:12px;color:#6b7280;">50 AI generations/month · All features</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:3px;">Pro: 150 gen/mo — $20/mo or $200/yr</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px;font-weight:800;color:#7c3aed;">$6.58<span style="font-size:13px;font-weight:400;color:#6b7280;">/mo</span></div>
        <div style="font-size:11px;color:#6b7280;">when billed annually ($79/yr)</div>
      </div>`;
    body.appendChild(price);

    const upgradeBtn = document.createElement('button');
    upgradeBtn.textContent = 'Upgrade to Pro →';
    upgradeBtn.style.cssText = 'width:100%;padding:13px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px;box-shadow:0 4px 14px rgba(124,58,237,.35);';
    upgradeBtn.onclick = () => window.open('https://canvasenhancer.com/upgrade', '_blank');
    body.appendChild(upgradeBtn);

    const keyLink = document.createElement('div');
    keyLink.style.cssText = 'text-align:center;font-size:12px;color:#6b7280;';
    keyLink.innerHTML = 'Already have a license key? <a href="#" style="color:#7c3aed;font-weight:600;">Enter it here →</a>';
    keyLink.querySelector('a').onclick = e => { e.preventDefault(); overlay.remove(); showSettings(); };
    body.appendChild(keyLink);

    panel.appendChild(body);
    overlay.appendChild(panel);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  // ── SETTINGS ──────────────────────────────────────────────────────────────────
  function showSettings() {
    if (document.getElementById('ce-settings-overlay')) return;
    const overlay=document.createElement('div'); overlay.id='ce-settings-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;';

    const panel=document.createElement('div');
    panel.style.cssText='background:#fff;border-radius:12px;width:460px;max-width:calc(100vw - 40px);max-height:calc(100vh - 60px);overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:inherit;';

    // Header
    const hdr=document.createElement('div');
    hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #e5e7eb;';
    const title=document.createElement('div');
    title.style.cssText='font-size:16px;font-weight:700;color:#111827;';
    title.textContent='⚙ Canvas Enhancer Settings';
    const closeBtn=document.createElement('button');
    closeBtn.textContent='✕'; closeBtn.style.cssText='background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280;line-height:1;padding:0;';
    closeBtn.onclick=()=>overlay.remove();
    hdr.appendChild(title); hdr.appendChild(closeBtn); panel.appendChild(hdr);

    const body=document.createElement('div'); body.style.cssText='padding:20px 24px;';

    function settingsSection(icon, label, desc, badge) {
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f3f4f6;cursor:default;';
      const left=document.createElement('div');
      const lbl=document.createElement('div'); lbl.style.cssText='font-size:13px;font-weight:600;color:#111827;'; lbl.textContent=`${icon} ${label}`;
      const d=document.createElement('div'); d.style.cssText='font-size:12px;color:#6b7280;margin-top:2px;'; d.textContent=desc;
      left.appendChild(lbl); left.appendChild(d);
      const right=document.createElement('div');
      right.style.cssText='font-size:11px;font-weight:600;color:#9ca3af;background:#f3f4f6;border-radius:20px;padding:2px 10px;white-space:nowrap;flex-shrink:0;margin-left:12px;';
      right.textContent=badge||'Coming soon';
      row.appendChild(left); row.appendChild(right); return row;
    }

    body.appendChild(settingsSection('📦','Plan & Usage','View your current plan, usage limits, and upgrade options.'));
    body.appendChild(settingsSection('🔑','License Key','Enter or manage your Canvas Enhancer license key.'));
    body.appendChild(settingsSection('🔔','Notifications','Control update alerts and release notes.'));
    body.appendChild(settingsSection('🎨','Appearance','Toolbar position, button labels, and theme.'));
    body.appendChild(settingsSection('🔒','Privacy & Data','What is stored locally and how to clear it.'));
    body.appendChild(settingsSection('🗑','Uninstall','Remove all stored data and deactivate Canvas Enhancer.'));

    const ver=document.createElement('div');
    ver.style.cssText='margin-top:20px;font-size:11px;color:#9ca3af;text-align:center;';
    ver.textContent='Canvas Enhancer v2.4';
    body.appendChild(ver);

    panel.appendChild(body);
    overlay.appendChild(panel);
    overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
    document.body.appendChild(overlay);
  }

  // ── SPEEDGRADER AI GRADER ─────────────────────────────────────────────────────
  function sgLoadSettings(courseId, assignmentId) {
    const all = GM_getValue('ce_grader_settings', {});
    return all[`${courseId}_${assignmentId}`] || {
      totalPoints: 100, rubricText: '', answerKey: '',
      gradingIntensity: 'balanced', feedbackTone: 'encouraging',
      acceptIntent: true, partialCredit: true, customInstructions: '',
    };
  }
  function sgSaveSettings(courseId, assignmentId, name, settings) {
    const all = GM_getValue('ce_grader_settings', {});
    all[`${courseId}_${assignmentId}`] = { ...settings, _name: name };
    GM_setValue('ce_grader_settings', all);
  }

  function showSpeedGraderPanel() {
    const sg = {
      token: GM_getValue('ce_canvas_token', ''),
      view: 'grade',   // grade | settings | token_setup
      floating: false,
      open: false,
      // assignment context (from URL)
      courseId:     '',
      assignmentId: '',
      assignmentName: '',
      // settings (loaded from storage per assignment)
      settings: { totalPoints:100, rubricText:'', answerKey:'', gradingIntensity:'balanced', feedbackTone:'encouraging', acceptIntent:true, partialCredit:true, customInstructions:'' },
      settingsDraft: null,
      // student & submission
      studentId:   '',
      studentName: '',
      subStatus:   'idle',  // idle | loading | ready | nosubmission | error
      subText:     '',
      subError:    '',
      // grading
      grading: false,
      result:  null,  // { score, total, feedback }
    };

    // ── URL HELPERS ────────────────────────────────────────────────────────────
    function getUrlParts() {
      const params = new URLSearchParams(window.location.search);
      const m = window.location.pathname.match(/\/courses\/(\d+)/);
      return { courseId: m?.[1]||'', assignmentId: params.get('assignment_id')||'', studentId: params.get('student_id')||'' };
    }

    function loadAssignmentSettings() {
      const { courseId, assignmentId } = getUrlParts();
      sg.courseId = courseId; sg.assignmentId = assignmentId;
      if (courseId && assignmentId) sg.settings = sgLoadSettings(courseId, assignmentId);
    }

    // ── FETCH SUBMISSION ───────────────────────────────────────────────────────
    async function fetchSubmission() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      if (!studentId || !sg.token || !courseId || !assignmentId) return;
      sg.studentId = studentId; sg.subText = ''; sg.subStatus = 'loading'; sg.result = null;
      render();
      try {
        const nameEl = document.querySelector('#student_carousel_name, .student_selection option:checked, #students_selectmenu-button .ui-selectmenu-text');
        if (nameEl) { sg.studentName = nameEl.textContent.trim().replace(/\s*\(.*\)$/, ''); }
        else { try { const u = await ceCanvasApi(`${window.location.origin}/api/v1/users/${studentId}/profile`); sg.studentName = u.name || u.short_name || ''; } catch(_) {} }

        if (!sg.assignmentName) {
          try { const a = await ceCanvasApi(`${window.location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}`); sg.assignmentName = a.name || ''; } catch(_) {}
        }

        const sub = await ceCanvasApi(`${window.location.origin}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}?include[]=attachments`);
        if (!sub.submission_type) { sg.subStatus = 'nosubmission'; render(); return; }

        if (sub.submission_type === 'online_text_entry' && sub.body) {
          const tmp = document.createElement('div'); tmp.innerHTML = sub.body;
          sg.subText = (tmp.textContent || tmp.innerText || '').trim();
          sg.subStatus = 'ready'; render();
        } else if (sub.submission_type === 'online_upload' && sub.attachments?.length) {
          const att = sub.attachments.find(a => /pdf|word|document|officedocument/.test(a['content-type']||'')||/\.(pdf|docx?|txt|xlsx?)$/i.test(a.filename||'')) || sub.attachments[0];
          try {
            const parsed = await ceParseFile(null, att.filename, att['content-type'], att.url);
            sg.subText = parsed.text; sg.subStatus = 'ready';
          } catch(e) {
            const fname = decodeURIComponent((att.filename||'').replace(/\+/g,' '));
            sg.subStatus = 'error'; sg.subError = `Could not read "${fname}": ${e?.message||'unknown error'}`;
          }
          render();
        } else if (sub.submission_type === 'online_url') {
          sg.subText = `[URL submission: ${sub.url}]`; sg.subStatus = 'ready'; render();
        } else {
          sg.subStatus = 'error'; sg.subError = 'Submission type not supported — paste text below'; render();
        }
      } catch(e) {
        sg.subStatus = 'error'; sg.subError = e.message || 'Failed to load submission'; render();
      }
    }

    // ── GRADE ──────────────────────────────────────────────────────────────────
    async function gradeSubmission() {
      const st = sg.settings;
      const total = st.totalPoints || 100;
      const firstName = sg.studentName ? sg.studentName.split(' ')[0] : 'the student';
      sg.grading = true; render();

      const intensityMap = {
        lenient:  'Be generous. Give benefit of the doubt. Focus on what the student did well.',
        balanced: 'Grade fairly. Acknowledge strengths and note specific weaknesses.',
        strict:   'Hold students to high standards. Be thorough in identifying errors.',
      };
      const toneMap = {
        encouraging: 'Start with positives, then constructive feedback. Be warm and supportive.',
        neutral:     'Be objective and professional.',
        direct:      'Be concise and direct. Focus on what needs improvement.',
      };

      let prompt = `You are an expert teacher grading a student assignment.\nStudent: ${sg.studentName||'Student'}\n\n`;
      prompt += `GRADING APPROACH: ${intensityMap[st.gradingIntensity]||intensityMap.balanced}\n`;
      prompt += `FEEDBACK TONE: ${toneMap[st.feedbackTone]||toneMap.encouraging}\n`;
      if (st.acceptIntent)   prompt += `ACCEPT INTENT: Give credit if the student conveys the correct meaning even if wording differs.\n`;
      if (st.partialCredit)  prompt += `PARTIAL CREDIT: Award partial credit for partially correct answers.\n`;
      prompt += `\nTOTAL POINTS: ${total}\n\n`;
      if (st.rubricText)         prompt += `RUBRIC / GRADING CRITERIA:\n${st.rubricText}\n\n`;
      if (st.answerKey)          prompt += `ANSWER KEY:\n${st.answerKey}\n\n`;
      if (st.customInstructions) prompt += `ADDITIONAL INSTRUCTIONS:\n${st.customInstructions}\n\n`;
      prompt += `FORMATTING NOTE: The submission uses these structural markers extracted from the Word/PDF file: [HEADING 1], [HEADING 2], [HEADING 3] for section headings; **bold** for bold text; _italic_ for italic; • for list items; [Caption:] for captions. If the rubric requires formatting like headings or sections, look for these markers. Visual-only formatting (font size, colors, line spacing) cannot be detected.\n\n`;
      prompt += `STUDENT SUBMISSION:\n${sg.subText.slice(0, 14000)}\n\n`;
      prompt += `Grade this submission. DO NOT penalize for things not in the rubric.\n\n`;
      prompt += `Respond in EXACTLY this format — no other text:\nSCORE: [number]/${total}\nFEEDBACK:\n- ⚠ TEACHER CHECK: [list the specific items the teacher must manually verify that cannot be auto-detected from text, e.g. fonts, spacing, margins, drawings, headers]\n- [Address ${firstName} by name, summarize overall performance]\n- [Specific finding on a rubric criterion — what was present or missing]\n- [Another criterion or area for improvement]\n\nRules: first bullet MUST start with ⚠ TEACHER CHECK:. Use 3-5 bullets total.`;

      try {
        const data = await ceGenerate({ model:'claude-sonnet-4-6', max_tokens:800, messages:[{role:'user',content:prompt}] });
        const text = data?.content?.[0]?.text||'';
        const scoreMatch    = text.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)/);
        const feedbackMatch = text.match(/FEEDBACK:\s*([\s\S]+)/);
        sg.result = { score: scoreMatch ? parseFloat(scoreMatch[1]) : null, total, feedback: feedbackMatch ? feedbackMatch[1].trim() : text.trim() };
      } catch(e) {
        sg.result = { score:null, total, feedback: 'Error: '+(e.message||'Could not generate feedback') };
      }
      sg.grading = false; render();
    }

    // ── RENDER ─────────────────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.id = 'ce-ai-grader';
    container.style.cssText = 'width:100%;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;overflow:hidden;';

    function render() {
      container.innerHTML = '';
      const hdr = document.createElement('div');
      hdr.style.cssText = 'background:#2d3b45;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;';
      const htitle = document.createElement('span');
      htitle.style.cssText = 'font-weight:700;font-size:13px;';
      htitle.textContent = sg.view === 'settings' ? '⚙ Grading Settings' : '✦ AI Grader';
      hdr.appendChild(htitle);
      const hdrRight = document.createElement('div'); hdrRight.style.cssText = 'display:flex;align-items:center;gap:4px;';
      if (sg.view === 'grade' && sg.token) {
        const sBtn = document.createElement('button'); sBtn.textContent = '⚙'; sBtn.type='button';
        sBtn.title = 'Assignment settings';
        sBtn.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;font-size:13px;padding:2px 7px;border-radius:3px;cursor:pointer;';
        sBtn.onclick = () => { sg.settingsDraft = {...sg.settings}; sg.view='settings'; render(); };
        hdrRight.appendChild(sBtn);
        const kBtn = document.createElement('button'); kBtn.textContent = '🔑'; kBtn.type='button';
        kBtn.title = 'Change Canvas API token';
        kBtn.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;font-size:13px;padding:2px 7px;border-radius:3px;cursor:pointer;';
        kBtn.onclick = () => { sg.view='token_setup'; render(); };
        hdrRight.appendChild(kBtn);
      }
      if (sg.floating) {
        const xBtn = document.createElement('button'); xBtn.textContent = '✕'; xBtn.type='button';
        xBtn.style.cssText = 'background:rgba(255,255,255,.15);border:none;color:#fff;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:3px;line-height:1;';
        xBtn.onclick = () => { sg.open=false; container.style.display='none'; toggleBtn.style.display='block'; };
        hdrRight.appendChild(xBtn);
      }
      hdr.appendChild(hdrRight);
      container.appendChild(hdr);
      const body = document.createElement('div'); body.style.cssText = 'padding:14px 12px;';
      if (!sg.token || sg.view === 'token_setup') body.appendChild(renderTokenSetup());
      else if (sg.view === 'settings')            body.appendChild(renderSettings());
      else                                        body.appendChild(renderGrade());
      container.appendChild(body);
    }

    function mkBtn(label, css) {
      const b = document.createElement('button'); b.type='button'; b.textContent=label;
      b.style.cssText = `width:100%;padding:7px 10px;border-radius:3px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:none;box-sizing:border-box;${css}`;
      return b;
    }

    // ── TOKEN SETUP VIEW ───────────────────────────────────────────────────────
    function renderTokenSetup() {
      const isReplace = !!sg.token; // true = changing existing token
      const w = document.createElement('div');
      const title = document.createElement('div'); title.style.cssText='font-weight:600;color:#2d3b45;margin-bottom:6px;';
      title.textContent = isReplace ? 'Replace Canvas API Token' : 'Connect Canvas to get started'; w.appendChild(title);
      if (isReplace) {
        const cur = document.createElement('div'); cur.style.cssText='font-size:11px;color:#6b7280;background:#f9fafb;padding:5px 8px;border-radius:3px;margin-bottom:8px;font-family:monospace;';
        cur.textContent = 'Current: ' + sg.token.slice(0,6) + '••••••••' + sg.token.slice(-4); w.appendChild(cur);
      } else {
        const steps = ['Click your name → Account → Settings','Scroll to "Approved Integrations"','Click + New Access Token → copy it','Paste it below'];
        const ol = document.createElement('ol'); ol.style.cssText='color:#6b7280;font-size:12px;padding-left:16px;margin:0 0 8px 0;line-height:1.9;';
        steps.forEach(s=>{ const li=document.createElement('li'); li.textContent=s; ol.appendChild(li); }); w.appendChild(ol);
      }
      const inp=document.createElement('input'); inp.type='password'; inp.placeholder='Paste new token here…';
      inp.style.cssText='width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;margin-bottom:6px;font-family:inherit;';
      w.appendChild(inp);
      const save=mkBtn(isReplace ? 'Update Token' : 'Save & Connect','background:#0770B8;color:#fff;');
      save.onclick=()=>{ const v=inp.value.trim(); if(!v) return; sg.token=v; GM_setValue('ce_canvas_token',v); sg.view='grade'; loadAssignmentSettings(); render(); if(sg.subStatus==='idle') fetchSubmission(); };
      w.appendChild(save);
      if (isReplace) {
        const cancel=mkBtn('Cancel','background:#f0f0f0;color:#374151;margin-top:4px;');
        cancel.onclick=()=>{ sg.view='grade'; render(); }; w.appendChild(cancel);
      }
      return w;
    }

    // ── SETTINGS VIEW ──────────────────────────────────────────────────────────
    function renderSettings() {
      const w = document.createElement('div'); w.style.cssText='display:flex;flex-direction:column;gap:8px;';
      const d = sg.settingsDraft;
      if (sg.assignmentName) {
        const nb=document.createElement('div'); nb.style.cssText='font-size:11px;color:#6b7280;margin-bottom:2px;';
        nb.textContent=`Assignment: ${sg.assignmentName}`; w.appendChild(nb);
      }
      function mkLabel(txt) { const l=document.createElement('div'); l.style.cssText='font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;'; l.textContent=txt; return l; }
      function mkTextarea(val, placeholder, rows) {
        const ta=document.createElement('textarea'); ta.value=val; ta.placeholder=placeholder;
        ta.style.cssText=`width:100%;box-sizing:border-box;height:${(rows||3)*22}px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;resize:vertical;font-family:inherit;line-height:1.5;`;
        return ta;
      }
      function mkSelect(options, val) {
        const sel=document.createElement('select'); sel.style.cssText='width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;font-family:inherit;background:#fff;';
        options.forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; if(v===val) o.selected=true; sel.appendChild(o); });
        return sel;
      }
      function mkToggle(label, val, onChange) {
        const row=document.createElement('div'); row.style.cssText='display:flex;align-items:center;justify-content:space-between;';
        const lbl=document.createElement('span'); lbl.style.cssText='font-size:12px;color:#374151;'; lbl.textContent=label; row.appendChild(lbl);
        const sw=document.createElement('button'); sw.type='button';
        sw.style.cssText=`width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;background:${val?'#0770B8':'#d1d5db'};position:relative;flex-shrink:0;`;
        sw.innerHTML=`<span style="position:absolute;top:2px;left:${val?'18px':'2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:left .15s;"></span>`;
        sw.onclick=()=>onChange(!val);
        row.appendChild(sw); return row;
      }

      w.appendChild(mkLabel('Total Points'));
      const ptsInp=document.createElement('input'); ptsInp.type='number'; ptsInp.min='1'; ptsInp.max='1000'; ptsInp.value=d.totalPoints||100;
      ptsInp.style.cssText='width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;font-family:inherit;';
      ptsInp.oninput=()=>{ d.totalPoints=parseInt(ptsInp.value)||100; }; w.appendChild(ptsInp);

      w.appendChild(mkLabel('Grading Intensity'));
      const intSel=mkSelect([['lenient','Lenient — benefit of the doubt'],['balanced','Balanced — fair and consistent'],['strict','Strict — hold to high standards']],d.gradingIntensity||'balanced');
      intSel.onchange=()=>{ d.gradingIntensity=intSel.value; }; w.appendChild(intSel);

      w.appendChild(mkLabel('Feedback Tone'));
      const toneSel=mkSelect([['encouraging','Encouraging — lead with positives'],['neutral','Neutral — objective and professional'],['direct','Direct — concise, focus on improvements']],d.feedbackTone||'encouraging');
      toneSel.onchange=()=>{ d.feedbackTone=toneSel.value; }; w.appendChild(toneSel);

      w.appendChild(mkLabel('Rubric / Grading Criteria'));
      const rubHint=document.createElement('div'); rubHint.style.cssText='font-size:11px;color:#9ca3af;margin-bottom:3px;'; rubHint.textContent='List criteria and point values. Saved per assignment.'; w.appendChild(rubHint);
      const rubTa=mkTextarea(d.rubricText||'','e.g.\n- Clear thesis: 20 pts\n- Evidence: 30 pts\n- Grammar: 10 pts',5);
      rubTa.oninput=()=>{ d.rubricText=rubTa.value; }; w.appendChild(rubTa);

      w.appendChild(mkLabel('Answer Key (optional)'));
      const akTa=mkTextarea(d.answerKey||'','Correct answers or key points the submission should contain.',4);
      akTa.oninput=()=>{ d.answerKey=akTa.value; }; w.appendChild(akTa);

      w.appendChild(mkToggle('Accept intent (credit correct meaning)', d.acceptIntent, v=>{ d.acceptIntent=v; sg.settingsDraft=d; render(); }));
      w.appendChild(mkToggle('Allow partial credit', d.partialCredit, v=>{ d.partialCredit=v; sg.settingsDraft=d; render(); }));

      w.appendChild(mkLabel('Additional AI Instructions (optional)'));
      const ciTa=mkTextarea(d.customInstructions||'','Any other instructions for the AI grader…',2);
      ciTa.oninput=()=>{ d.customInstructions=ciTa.value; }; w.appendChild(ciTa);

      const saveBtn=mkBtn('Save Settings','background:#0770B8;color:#fff;margin-top:4px;');
      saveBtn.onclick=()=>{
        sg.settings={...d};
        sgSaveSettings(sg.courseId, sg.assignmentId, sg.assignmentName, sg.settings);
        sg.view='grade'; render(); showNotice('Settings saved!');
      };
      w.appendChild(saveBtn);
      const cancelBtn=mkBtn('Cancel','background:#f0f0f0;color:#374151;margin-top:4px;');
      cancelBtn.onclick=()=>{ sg.view='grade'; render(); }; w.appendChild(cancelBtn);

      // ── BACKUP / RESTORE ──────────────────────────────────────────────────
      const sep=document.createElement('div'); sep.style.cssText='border-top:1px solid #e5e7eb;margin-top:10px;padding-top:8px;';
      sep.appendChild(mkLabel('Backup & Restore'));

      const exportBtn=mkBtn('⬇ Export all assignment settings','background:#f5f5f5;color:#374151;font-weight:400;margin-top:4px;');
      exportBtn.onclick=()=>{
        const data=GM_getValue('ce_grader_settings',{});
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob); const a=document.createElement('a');
        a.href=url; a.download='grader-settings-backup.json'; a.click(); URL.revokeObjectURL(url);
      };
      sep.appendChild(exportBtn);

      let importOpen=false;
      const importBtn=mkBtn('⬆ Import backup','background:#f5f5f5;color:#374151;font-weight:400;margin-top:4px;');
      const importTa=document.createElement('textarea'); importTa.placeholder='Paste exported JSON here…';
      importTa.style.cssText='display:none;width:100%;box-sizing:border-box;height:60px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:11px;resize:vertical;font-family:monospace;margin-top:4px;';
      const confirmBtn=mkBtn('✓ Confirm import (overwrites all)','display:none;background:#dc2626;color:#fff;font-weight:600;margin-top:4px;');
      confirmBtn.style.display='none';
      importBtn.onclick=()=>{
        importOpen=!importOpen;
        importTa.style.display=importOpen?'block':'none';
        confirmBtn.style.display=importOpen?'block':'none';
      };
      confirmBtn.onclick=()=>{
        try {
          const parsed=JSON.parse(importTa.value);
          GM_setValue('ce_grader_settings',parsed);
          loadAssignmentSettings();
          showNotice('Settings restored!');
          importOpen=false; importTa.style.display='none'; confirmBtn.style.display='none'; importTa.value='';
        } catch(_) { showNotice('Invalid JSON — check the file and try again'); }
      };
      sep.appendChild(importBtn); sep.appendChild(importTa); sep.appendChild(confirmBtn);
      w.appendChild(sep);
      return w;
    }

    // ── GRADE VIEW ─────────────────────────────────────────────────────────────
    function renderGrade() {
      const w = document.createElement('div'); w.style.cssText='display:flex;flex-direction:column;gap:6px;';
      const st = sg.settings;
      const hasCriteria = !!(st.rubricText || st.answerKey || st.customInstructions);
      const badge = document.createElement('div');
      badge.style.cssText = `font-size:11px;padding:5px 8px;border-radius:3px;margin-bottom:2px;${hasCriteria?'background:#e6f4ea;color:#127a1b;':'background:#fef9e7;color:#856404;'}`;
      badge.textContent = hasCriteria
        ? `📋 ${st.totalPoints} pts  ·  ${st.gradingIntensity}  ·  Rubric set`
        : `⚠ No rubric set — click ⚙ to add grading criteria`;
      w.appendChild(badge);

      if (sg.grading) {
        const ld=document.createElement('div'); ld.style.cssText='text-align:center;padding:14px 0;';
        ld.innerHTML=`<div style="color:#0770B8;font-weight:600;">Grading ${sg.studentName?sg.studentName.split(' ')[0]+"'s":'the'} submission…</div><div style="font-size:11px;color:#9ca3af;margin-top:3px;">Takes a few seconds</div>`;
        w.appendChild(ld); return w;
      }

      if (sg.result) { renderResult(w); return w; }

      if (sg.studentName) {
        const sn=document.createElement('div'); sn.style.cssText='font-weight:600;color:#2d3b45;font-size:13px;';
        sn.textContent=`👤 ${sg.studentName}`; w.appendChild(sn);
      }

      if (sg.subStatus==='loading') {
        const ld=document.createElement('div'); ld.style.cssText='font-size:12px;color:#9ca3af;'; ld.textContent='Loading submission…'; w.appendChild(ld); return w;
      }
      if (sg.subStatus==='nosubmission') {
        const nd=document.createElement('div'); nd.style.cssText='font-size:12px;color:#9ca3af;font-style:italic;'; nd.textContent='No submission yet.'; w.appendChild(nd); return w;
      }
      if (sg.subStatus==='error') {
        const ed=document.createElement('div'); ed.style.cssText='font-size:12px;color:#c0392b;margin-bottom:4px;'; ed.textContent=sg.subError; w.appendChild(ed);
      }
      if (sg.subStatus==='ready') {
        const words=sg.subText.split(/\s+/).filter(Boolean).length;
        const rd=document.createElement('div'); rd.style.cssText='font-size:12px;color:#127a1b;display:flex;align-items:center;justify-content:space-between;';
        const rdLbl=document.createElement('span'); rdLbl.textContent=`✓ Submission — ${words} words`;
        const rdToggle=document.createElement('button'); rdToggle.type='button'; rdToggle.textContent='view';
        rdToggle.style.cssText='background:none;border:none;color:#127a1b;text-decoration:underline;font-size:11px;cursor:pointer;padding:0;font-family:inherit;';
        const rdPrev=document.createElement('textarea'); rdPrev.readOnly=true; rdPrev.value=sg.subText;
        rdPrev.style.cssText='display:none;width:100%;box-sizing:border-box;height:90px;font-size:10px;font-family:monospace;border:1px solid #c7cdd1;border-radius:3px;padding:4px 6px;resize:vertical;color:#374151;background:#f9fafb;margin-top:3px;';
        let subVis=false; rdToggle.onclick=()=>{ subVis=!subVis; rdPrev.style.display=subVis?'block':'none'; rdToggle.textContent=subVis?'hide':'view'; };
        rd.appendChild(rdLbl); rd.appendChild(rdToggle); w.appendChild(rd); w.appendChild(rdPrev);
      }

      if (!sg.subText.trim()) {
        const lbl=document.createElement('div'); lbl.style.cssText='font-size:11px;color:#6b7280;margin-bottom:3px;'; lbl.textContent='Paste submission text:'; w.appendChild(lbl);
        const ta=document.createElement('textarea'); ta.placeholder='Paste student response here…';
        ta.style.cssText='width:100%;box-sizing:border-box;height:72px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;resize:vertical;font-family:inherit;';
        ta.oninput=()=>{ sg.subText=ta.value; }; w.appendChild(ta);
      }

      if (sg.subText.trim() || sg.subStatus==='error') {
        const fname = sg.studentName ? sg.studentName.split(' ')[0]+"'s" : 'this';
        const gradeBtn=mkBtn(`✦ Grade ${fname} submission`,'background:#0770B8;color:#fff;margin-top:2px;');
        gradeBtn.onclick=gradeSubmission; w.appendChild(gradeBtn);
      }
      return w;
    }

    function renderResult(w) {
      const r = sg.result;

      // Split ⚠ warning lines from regular feedback lines
      const allLines = r.feedback.split('\n');
      const warnLines = allLines.filter(l => /^[-•*]?\s*⚠/.test(l.trim()));
      const feedLines = allLines.filter(l => !/^[-•*]?\s*⚠/.test(l.trim()) && l.trim()).join('\n');

      // ⚠ Teacher check — red box at top
      if (warnLines.length) {
        const warn = document.createElement('div');
        warn.style.cssText = 'background:#fef2f2;border:1px solid #fca5a5;border-radius:4px;padding:7px 10px;margin-bottom:8px;font-size:11px;color:#b91c1c;line-height:1.5;';
        warn.textContent = warnLines.map(l => l.replace(/^[-•*]\s*/, '').trim()).join('\n');
        w.appendChild(warn);
      }

      // Editable score row
      const scoreRow = document.createElement('div'); scoreRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;background:#f0f7ff;border-radius:4px;padding:7px 10px;';
      const scoreLabel = document.createElement('span'); scoreLabel.style.cssText='font-size:12px;font-weight:700;color:#0770B8;white-space:nowrap;'; scoreLabel.textContent='Score:'; scoreRow.appendChild(scoreLabel);
      const scoreInp = document.createElement('input'); scoreInp.type='number'; scoreInp.min='0'; scoreInp.max=String(r.total); scoreInp.step='0.5';
      scoreInp.value = r.score !== null ? String(r.score) : '';
      scoreInp.style.cssText='width:60px;padding:4px 6px;border:1px solid #bfdbfe;border-radius:3px;font-size:16px;font-weight:700;color:#0770B8;text-align:center;font-family:inherit;background:#fff;';
      scoreInp.oninput=()=>{ r.score=parseFloat(scoreInp.value)||0; };
      const scoreSep = document.createElement('span'); scoreSep.style.cssText='font-size:16px;font-weight:700;color:#0770B8;'; scoreSep.textContent=` / ${r.total}`;
      scoreRow.appendChild(scoreInp); scoreRow.appendChild(scoreSep); w.appendChild(scoreRow);

      // Editable feedback (no ⚠ lines — those stay in the red box)
      const lbl=document.createElement('div'); lbl.style.cssText='font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;'; lbl.textContent='Student comment (editable)'; w.appendChild(lbl);
      const ta=document.createElement('textarea'); ta.value=feedLines;
      ta.style.cssText='width:100%;box-sizing:border-box;height:130px;padding:6px 8px;border:1px solid #c7cdd1;border-radius:3px;font-size:12px;resize:vertical;font-family:inherit;line-height:1.6;';
      ta.oninput=()=>{ r._editedFeedback=ta.value; }; w.appendChild(ta);

      // Insert comment + grade
      const ins=mkBtn('↵ Insert comment & grade','background:#0770B8;color:#fff;margin-top:6px;');
      ins.onclick=()=>{
        const commentText = r._editedFeedback !== undefined ? r._editedFeedback : feedLines;
        // Insert comment
        const box = document.querySelector(
          '#speed_grader_comment_textarea, #speedgrader_textarea, ' +
          'textarea[name="comment[text_comment]"], #grading_comment, ' +
          '#comment_textarea, .submission-comment-form textarea, ' +
          'textarea[aria-label*="comment" i], textarea[placeholder*="comment" i], ' +
          '.grading_comment textarea'
        );
        if (box) {
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          nativeSetter.call(box, commentText);
          box.dispatchEvent(new Event('input',{bubbles:true}));
          box.dispatchEvent(new Event('change',{bubbles:true}));
          box.focus();
        } else { navigator.clipboard.writeText(commentText).then(()=>{}); }
        // Insert grade
        const gradeInput = document.querySelector(
          '#student_grading_value, #grading-box-extended, ' +
          'input.grading-box-number, input[data-testid="student-grades-input"], ' +
          'input[aria-label="Grade"], input[aria-label="grade"], ' +
          '.react-grade-input input, #submission_details .grade input, ' +
          'input[placeholder="–"]'
        );
        if (gradeInput && r.score !== null) {
          gradeInput.value = String(r.score);
          gradeInput.dispatchEvent(new Event('input',{bubbles:true}));
          gradeInput.dispatchEvent(new Event('change',{bubbles:true}));
          gradeInput.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter'}));
          showNotice(box ? 'Comment & grade inserted!' : 'Grade inserted — comment copied to clipboard');
        } else {
          showNotice(box ? 'Comment inserted!' : 'Copied to clipboard');
        }
      };
      w.appendChild(ins);
      const again=mkBtn('↺ Grade again','background:#f5f5f5;color:#2d3b45;margin-top:4px;');
      again.style.border='1px solid #c7cdd1'; again.onclick=()=>{ sg.result=null; render(); }; w.appendChild(again);
    }

    // ── TOGGLE (floating mode) ─────────────────────────────────────────────────
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ce-ai-grader-toggle';
    toggleBtn.textContent = '✦ AI Grader';
    toggleBtn.style.cssText = 'position:fixed;top:110px;right:45px;background:#2d3b45;color:#fff;border:none;border-radius:6px 0 0 6px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:-2px 2px 8px rgba(0,0,0,.25);white-space:nowrap;';
    toggleBtn.onclick=()=>{ sg.open=!sg.open; container.style.display=sg.open?'block':'none'; toggleBtn.style.display=sg.open?'none':'block'; if(sg.open&&sg.token&&sg.subStatus==='idle') fetchSubmission(); else render(); };

    // ── INJECT ─────────────────────────────────────────────────────────────────
    function findSidebar() {
      return (
        document.querySelector('#rightside_inner') ||
        document.querySelector('#right_side')       ||
        document.querySelector('#right-side')       ||
        document.querySelector('#grading_box_holder') ||
        document.querySelector('#speedgrader_sidebar') ||
        document.querySelector('#speedgrader_textarea')?.closest('#right_side,#rightside,#right-side,[id*="right"],form') ||
        document.querySelector('#speedgrader_textarea')?.parentElement
      );
    }

    function inject() {
      if (document.getElementById('ce-ai-grader')) return;
      loadAssignmentSettings();
      const sidebar = findSidebar();
      if (sidebar) {
        sg.floating=false; sg.open=true;
        container.style.cssText = 'width:100%;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;overflow:hidden;border-top:2px solid #2d3b45;';
        sidebar.appendChild(container);
        render();
        if (sg.token) fetchSubmission();
      } else {
        sg.floating=true;
        container.style.cssText='display:none;position:fixed;right:0;top:52px;bottom:0;width:340px;z-index:99998;box-shadow:-4px 0 24px rgba(0,0,0,.3);background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;overflow-y:auto;';
        document.body.appendChild(container);
        document.body.appendChild(toggleBtn);
        render();
      }
    }

    // ── NAVIGATION TRACKING ────────────────────────────────────────────────────
    let sgLastStudentId    = getUrlParts().studentId;
    let sgLastAssignmentId = getUrlParts().assignmentId;

    function onNavChange() {
      const { courseId, assignmentId, studentId } = getUrlParts();
      const assignmentChanged = assignmentId && assignmentId !== sgLastAssignmentId;
      const studentChanged    = studentId    && studentId    !== sgLastStudentId;
      if (!assignmentChanged && !studentChanged) return;
      if (assignmentChanged) {
        sgLastAssignmentId = assignmentId;
        sg.courseId = courseId; sg.assignmentId = assignmentId; sg.assignmentName = '';
        sg.settings = sgLoadSettings(courseId, assignmentId);
      }
      sgLastStudentId = studentId;
      sg.result = null; sg.subText = ''; sg.subStatus = 'idle'; sg.studentName = '';
      if (sg.token && (!sg.floating || sg.open)) fetchSubmission(); else render();
    }

    // Cover all URL-change mechanisms SpeedGrader may use
    const _origPushState    = history.pushState.bind(history);
    const _origReplaceState = history.replaceState.bind(history);
    history.pushState    = function(...a) { _origPushState(...a);    setTimeout(onNavChange, 100); };
    history.replaceState = function(...a) { _origReplaceState(...a); setTimeout(onNavChange, 100); };
    window.addEventListener('popstate',   () => setTimeout(onNavChange, 100));
    window.addEventListener('hashchange', () => setTimeout(onNavChange, 100));

    // Polling fallback — catches any SpeedGrader navigation our hooks miss
    setInterval(onNavChange, 1200);

    // DOM observer — student name element changes when SpeedGrader loads next student
    const _sgNameEl = document.querySelector('#student_carousel_name, #students_selectmenu-button');
    if (_sgNameEl) new MutationObserver(()=>setTimeout(onNavChange,200)).observe(_sgNameEl,{childList:true,subtree:true,characterData:true});

    // Try immediately, then poll for up to 15s for async sidebar load
    inject();
    new MutationObserver(() => { if (!document.getElementById('ce-ai-grader')) inject(); })
      .observe(document.body, { childList: true, subtree: true });
    let _sgPollCount = 0;
    const _sgPoll = setInterval(() => {
      if (document.getElementById('ce-ai-grader') || _sgPollCount++ > 30) { clearInterval(_sgPoll); return; }
      inject();
    }, 500);
  }

  // ── BUILD TOOLBAR ─────────────────────────────────────────────────────────────
  function buildToolbar() {
    if (document.getElementById('ce-toolbar')) return;
    const toolbar = document.createElement('div'); toolbar.id = 'ce-toolbar';

    // rowProps must exist before rowTop so icon/video handlers can reference it
    const rowProps = document.createElement('div'); rowProps.id = 'ce-row-props';

    function makeTopGroup(label,panelEl) {
      const group=document.createElement('div'); group.className='ce-group';
      const btn=document.createElement('button'); btn.className='ce-btn'; btn.type='button';
      btn.textContent=label; panelEl.className+=' ce-panel';
      btn.onclick=e=>{e.stopPropagation();const isOpen=panelEl.classList.contains('ce-open');closeAllPanels();if(!isOpen){panelEl.classList.add('ce-open');btn.classList.add('ce-open');}};
      group.appendChild(btn); group.appendChild(panelEl); return group;
    }

    const rowBottom = document.createElement('div'); rowBottom.id = 'ce-row-bottom';

    const aiBtn=document.createElement('button'); aiBtn.className='ce-btn'; aiBtn.type='button';
    aiBtn.textContent='AI Builder';
    aiBtn.style.marginLeft='-41px';
    aiBtn.onclick=e=>{e.stopPropagation();closeAllPanels();showContentBuilder();};
    rowBottom.appendChild(aiBtn);
    const qmBtn=document.createElement('button'); qmBtn.className='ce-btn'; qmBtn.type='button';
    qmBtn.textContent='Quiz Maker';
    qmBtn.onclick=e=>{e.stopPropagation();closeAllPanels();showQuizMaker();};
    rowBottom.appendChild(qmBtn);

    Object.entries(COMPONENTS).forEach(([,cat]) => {
      const group=document.createElement('div'); group.className='ce-group';
      const btn=document.createElement('button'); btn.className='ce-btn'; btn.type='button';
      btn.textContent=`${cat.label} ▾`;
      const panel=document.createElement('div'); panel.className='ce-panel';
      cat.items.forEach(item => {
        const entry=document.createElement('button'); entry.className='ce-item'; entry.type='button';
        if (false && item.pro) {
          entry.innerHTML=`${item.label} <span style="opacity:.55;font-size:11px;">🔒</span>`;
          entry.style.cssText='color:#666;';
          entry.onclick=e=>{e.stopPropagation();chrome.storage.local.get('ce_license_key',s=>{s.ce_license_key?handleItemClick(item,rowProps):showUpgradeModal('Pro Components');});};
        } else {
          entry.textContent=item.label;
          entry.onclick=e=>{e.stopPropagation();handleItemClick(item,rowProps);};
        }
        panel.appendChild(entry);
      });
      btn.onclick=e=>{e.stopPropagation();const isOpen=panel.classList.contains('ce-open');closeAllPanels();if(!isOpen){panel.classList.add('ce-open');btn.classList.add('ce-open');}};
      group.appendChild(btn); group.appendChild(panel); rowBottom.appendChild(group);
    });

    const iconsGroup=makeTopGroup('Icons',buildIconPanel(rowProps));
    rowBottom.appendChild(iconsGroup);

    const gearBtn=document.createElement('button'); gearBtn.className='ce-btn'; gearBtn.type='button';
    gearBtn.innerHTML='<span class="ce-icon">⚙</span>';
    gearBtn.title='Settings';
    gearBtn.style.cssText='padding:4px 8px;font-size:16px;';
    gearBtn.onclick=e=>{e.stopPropagation();closeAllPanels();showSettings();};
    rowBottom.appendChild(gearBtn);

    toolbar.appendChild(rowBottom);
    toolbar.appendChild(rowProps);

    toolbar.addEventListener('mousedown', e => {
      if (e.target.closest('#ce-row-props') || e.target.closest('#ce-dialog-overlay')) return;
      e.preventDefault();
    });
    document.addEventListener('click', closeAllPanels);

    const rce = document.querySelector('.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce');
    if (rce) rce.parentNode.insertBefore(toolbar, rce);
    else document.body.appendChild(toolbar);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────────
  loadComponents();


  const RCE_SEL = '.rce-wrapper, [data-testid="RCEWrapper"], .tox-tinymce';
  const isSpeedGrader = () => /speed_grader/.test(window.location.href);
  if (isSpeedGrader()) {
    showSpeedGraderPanel();
  } else {
    if (document.querySelector(RCE_SEL)) buildToolbar();
    new MutationObserver(() => {
      if (document.querySelector(RCE_SEL) && !document.getElementById('ce-toolbar')) buildToolbar();
    }).observe(document.body, { childList:true, subtree:true });
  }

  // ── TEXT ALERT SIGNUP — Canvas context bridge ─────────────────────────────────
  // When the /signup iframe asks for context, call the Canvas API for the real
  // course name and term, then reply via postMessage.
  window.addEventListener('message', async evt => {
    if (evt.data?.type !== 'CE_REQUEST_CONTEXT' || !evt.source) return;

    const env    = window.ENV || {};
    const source = evt.source;

    // Student name — window.ENV.current_user is reliable
    const name = env.current_user?.display_name || env.current_user?.name || '';

    // Course ID from the Canvas page URL: /courses/12345/...
    const courseMatch = window.location.pathname.match(/\/courses\/(\d+)/);
    const courseId    = courseMatch?.[1] || '';

    let className = '';
    let term      = '';

    if (courseId) {
      try {
        // include[]=term fetches enrollment term in the same call
        const course = await ceCanvasApi(`/api/v1/courses/${courseId}?include[]=term`);
        className = course.name       || '';
        term      = course.term?.name || '';
      } catch { /* fall through to ENV fallback */ }
    }

    // ENV fallback if API call failed or no course in URL
    if (!className) className = env.COURSE_TITLE || env.course?.name || '';
    if (!term)      term      = env.ENROLLMENT_TERM?.name || '';

    source.postMessage({ type: 'CE_CONTEXT', name, className, term }, '*');
  });

})();
