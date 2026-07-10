'use client';

import { useEffect, useRef, useState } from 'react';
import { COLORS, FONT_SIZES, FONTS, ICONS, COMPONENTS, GENERATORS, applyProps, READY_MADE_PAGES, ColorPair } from '@/lib/pageComponents';

const navy = '#172A36';
const blue = '#0770B8';
const border = '#E2E8F0';
const muted = '#526A79';
const paper = '#F8FAFC';

type Tab = 'insert' | 'icons' | 'ready';

export default function Editor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [tab, setTab] = useState<Tab>('insert');
  const [openCategory, setOpenCategory] = useState<string | null>('headers');
  const [activeColor, setActiveColor] = useState<ColorPair>(COLORS[0]);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (canvasRef.current && canvasRef.current.innerHTML !== html) {
      canvasRef.current.innerHTML = html || '<p><br></p>';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !canvasRef.current) return;
    const range = sel.getRangeAt(0);
    if (canvasRef.current.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange();
  }

  function focusAndRestore() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(canvas);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function commitChange() {
    if (canvasRef.current) onChange(canvasRef.current.innerHTML);
  }

  function insertHtml(fragment: string) {
    focusAndRestore();
    document.execCommand('insertHTML', false, fragment);
    saveSelection();
    commitChange();
  }

  function insertComponent(catKey: string, itemIdx: number) {
    const item = COMPONENTS[catKey].items[itemIdx];
    let out: string;
    if (item.generate) {
      const values = fieldValues[`${catKey}:${itemIdx}`] || {};
      const withDefaults: Record<string, string> = {};
      (item.fields || []).forEach(f => { withDefaults[f.id] = values[f.id] ?? String(f.default); });
      withDefaults.color = activeColor.p;
      out = GENERATORS[item.generate](withDefaults);
    } else {
      out = applyProps(item.html || '', { color: activeColor, font: 'inherit', size: '14px', width: '100%', align: 'left', vpad: '12px' });
    }
    insertHtml(out);
  }

  function format(cmd: string, value?: string) {
    focusAndRestore();
    document.execCommand(cmd, false, value);
    saveSelection();
    commitChange();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 12, maxWidth: '100%' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6, background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: 6 }}>
          <ToolBtn onMouseDown={() => format('bold')} label="B" title="Bold" bold />
          <ToolBtn onMouseDown={() => format('italic')} label="I" title="Italic" italic />
          <ToolBtn onMouseDown={() => format('underline')} label="U" title="Underline" underline />
          <ToolBtn onMouseDown={() => format('insertUnorderedList')} label="• List" title="Bullet list" />
          <ToolBtn onMouseDown={() => format('insertOrderedList')} label="1. List" title="Numbered list" />
          <select onMouseDown={saveSelection} onChange={e => format('fontName', e.target.value)} style={selectSm} defaultValue="">
            <option value="" disabled>Font</option>
            {FONTS.map(f => <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>)}
          </select>
          <select onMouseDown={saveSelection} onChange={e => format('fontSize', String(FONT_SIZES.indexOf(e.target.value) + 1 || 3))} style={selectSm} defaultValue="">
            <option value="" disabled>Size</option>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ maxWidth: '100%', overflowX: 'auto', border: `1px solid ${border}`, borderRadius: 8, background: '#fff' }}>
          <div
            ref={canvasRef}
            contentEditable
            suppressContentEditableWarning
            onInput={commitChange}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            style={{
              minHeight: 320, padding: 14,
              fontSize: 14, lineHeight: 1.6, color: navy, outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ minWidth: 0, border: `1px solid ${border}`, borderRadius: 8, background: '#fff', overflow: 'hidden', maxHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
          {(['insert', 'icons', 'ready'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em',
              border: 'none', cursor: 'pointer', background: tab === t ? blue : '#fff', color: tab === t ? '#fff' : muted,
            }}>{t === 'ready' ? 'Pages' : t}</button>
          ))}
        </div>

        <div style={{ padding: 10, overflowY: 'auto', flex: 1 }}>
          {tab === 'insert' && (
            <>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {COLORS.map(c => (
                  <button key={c.name} title={c.name} onClick={() => setActiveColor(c)} style={{
                    width: 20, height: 20, borderRadius: '50%', background: c.p, border: activeColor.name === c.name ? `2px solid ${navy}` : '1px solid #fff', cursor: 'pointer', padding: 0,
                  }} />
                ))}
              </div>
              {Object.entries(COMPONENTS).map(([key, cat]) => (
                <div key={key} style={{ marginBottom: 6 }}>
                  <button onClick={() => setOpenCategory(openCategory === key ? null : key)} style={{
                    width: '100%', textAlign: 'left', background: paper, border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px',
                    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: navy,
                  }}>{cat.icon} {cat.label}</button>
                  {openCategory === key && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                      {cat.items.map((item, i) => (
                        <div key={item.label}>
                          <button
                            onMouseDown={saveSelection}
                            onClick={() => insertComponent(key, i)}
                            style={{ width: '100%', textAlign: 'left', background: '#fff', border: `1px solid ${border}`, borderRadius: 5, padding: '6px 9px', fontSize: 12, cursor: 'pointer', color: navy }}
                          >{item.label}</button>
                          {item.fields && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                              {item.fields.map(f => (
                                f.type === 'select' ? (
                                  <select key={f.id} style={selectXs} defaultValue={String(f.default)}
                                    onChange={e => setFieldValues(v => ({ ...v, [`${key}:${i}`]: { ...v[`${key}:${i}`], [f.id]: e.target.value } }))}>
                                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : (
                                  <input key={f.id} type="number" style={{ ...selectXs, width: 46 }} defaultValue={f.default} min={f.min} max={f.max}
                                    onChange={e => setFieldValues(v => ({ ...v, [`${key}:${i}`]: { ...v[`${key}:${i}`], [f.id]: e.target.value } }))} />
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'icons' && (
            <>
              {Object.entries(ICONS).map(([cat, list]) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {list.map(icon => (
                      <button key={icon} onMouseDown={saveSelection} onClick={() => insertHtml(icon + ' ')} style={{
                        width: 26, height: 26, fontSize: 14, border: `1px solid ${border}`, borderRadius: 4, background: '#fff', cursor: 'pointer',
                      }}>{icon}</button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'ready' && (
            <>
              <div style={{ fontSize: 11.5, color: muted, marginBottom: 8 }}>Inserts a ready-made layout at the top of the page.</div>
              {READY_MADE_PAGES.map(p => (
                <button key={p.key} onMouseDown={saveSelection} onClick={() => insertHtml(p.html('Page Title'))} style={{
                  width: '100%', textAlign: 'left', background: '#fff', border: `1px solid ${border}`, borderRadius: 6, padding: '8px 10px', marginBottom: 5, cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: navy }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{p.description}</div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ onMouseDown, label, title, bold, italic, underline }: { onMouseDown: () => void; label: string; title: string; bold?: boolean; italic?: boolean; underline?: boolean }) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onMouseDown(); }}
      style={{
        minWidth: 30, padding: '5px 8px', fontSize: 12, border: `1px solid ${border}`, borderRadius: 5, background: '#fff', cursor: 'pointer',
        fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', color: navy,
      }}
    >{label}</button>
  );
}

const selectSm: React.CSSProperties = { fontSize: 11.5, border: `1px solid ${border}`, borderRadius: 5, padding: '4px 6px', background: '#fff', color: navy };
const selectXs: React.CSSProperties = { fontSize: 11, border: `1px solid ${border}`, borderRadius: 4, padding: '2px 4px', background: '#fff', color: navy };
