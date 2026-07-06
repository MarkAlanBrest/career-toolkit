'use client';

import { useState } from 'react';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#1E293B';
const blue = '#1E4D8C';
const border = '#E2E8F0';
const muted = '#64748B';
const green = '#15803D';
const red = '#DC2626';

const VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'nova', label: 'Nova' },
  { id: 'shimmer', label: 'Shimmer' },
];

type SlideResult = { slide: number; status: string };

export default function PptNarratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [voice, setVoice] = useState('alloy');
  const [polish, setPolish] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SlideResult[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.pptx$/i.test(f.name)) { setError('Please choose a .pptx file.'); return; }
    if (f.size > 40 * 1024 * 1024) { setError('File must be under 40 MB.'); return; }
    setFile(f);
    setError('');
    setResults(null);
  }

  async function generate() {
    if (!file) { setError('Choose a .pptx file first.'); return; }
    setWorking(true);
    setError('');
    setResults(null);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await fetch('/api/ppt-narrator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b64, voice, polish }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || `Generation failed (HTTP ${resp.status}).`);
        return;
      }

      const resultsHeader = resp.headers.get('X-Narration-Results');
      if (resultsHeader) {
        try { setResults(JSON.parse(decodeURIComponent(resultsHeader))); } catch {}
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pptx$/i, '') + '-narrated.pptx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font }}>
      <div style={{ background: navy, color: '#fff', padding: '0 24px', minHeight: 56, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>PPT Narrator</div>
      </div>

      <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 16px 40px' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: navy, marginBottom: 6 }}>Turn speaker notes into narration</div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.5, marginBottom: 18 }}>
            Upload a .pptx. Each slide&apos;s speaker notes are converted to narration audio and embedded into that slide, set to play automatically and advance the slide when it finishes — so PowerPoint&apos;s own <strong>Export to Video</strong> picks it up correctly.
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>PowerPoint file</label>
            <input type="file" accept=".pptx" onChange={handleFile} style={{ fontSize: 13, fontFamily: font }} />
            {file && <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>{file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB</div>}
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Voice</label>
              <select value={voice} onChange={e => setVoice(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, fontFamily: font, color: navy, background: '#fff' }}>
                {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: navy, cursor: 'pointer' }}>
                <input type="checkbox" checked={polish} onChange={e => setPolish(e.target.checked)} />
                Polish notes into natural spoken narration
              </label>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: red, marginBottom: 14 }}>{error}</div>
          )}

          <button
            onClick={generate}
            disabled={working || !file}
            style={{ background: blue, color: '#fff', border: 'none', borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: working || !file ? 'not-allowed' : 'pointer', opacity: working || !file ? 0.6 : 1 }}
          >
            {working ? 'Generating narration…' : 'Generate Narrated PPTX'}
          </button>
          {working && (
            <div style={{ fontSize: 12, color: muted, marginTop: 10 }}>This can take a little while for decks with many slides — don&apos;t close this tab.</div>
          )}
        </div>

        {results && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: navy, marginBottom: 10 }}>Per-slide results</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map(r => {
                const ok = r.status.startsWith('narrated');
                const skipped = r.status.startsWith('skipped');
                const color = ok ? green : skipped ? muted : red;
                return (
                  <div key={r.slide} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ color: navy, fontWeight: 600 }}>Slide {r.slide}</span>
                    <span style={{ color }}>{r.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
