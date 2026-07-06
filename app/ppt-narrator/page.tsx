'use client';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const navy = '#1E293B';
const border = '#E2E8F0';
const muted = '#64748B';

// This page is intentionally just installation instructions. The actual tool runs entirely as a
// Tampermonkey userscript (extension/PPT_Narrator.user.js) — it takes over this exact page and
// replaces this content with its own UI once installed, so everything (reading the .pptx,
// calling OpenAI/Anthropic, embedding the narration) happens locally in the browser with no
// server involved at all.
export default function PptNarratorPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: font }}>
      <div style={{ background: navy, color: '#fff', padding: '0 24px', minHeight: 56, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>PPT Narrator</div>
      </div>

      <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 16px 40px' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: navy, marginBottom: 10 }}>Install the PPT Narrator userscript</div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 16 }}>
            This tool runs as a Tampermonkey userscript rather than a hosted app — it reads your
            .pptx, generates narration audio, and embeds it back into the file entirely inside
            your browser. Nothing is uploaded to any server; your file and API keys never leave
            this tab except to call OpenAI/Anthropic directly.
          </div>
          <ol style={{ fontSize: 13.5, color: navy, lineHeight: 1.9, paddingLeft: 20, marginBottom: 16 }}>
            <li>Install the <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener noreferrer">Tampermonkey extension</a> for your browser, if you haven&apos;t already.</li>
            <li>Open <code>extension/PPT_Narrator.user.js</code> from the project repo and copy its contents.</li>
            <li>In Tampermonkey, choose &ldquo;Create a new script,&rdquo; paste it in, and save.</li>
            <li>Reload this page — the userscript will take over and replace this text with the actual tool.</li>
          </ol>
          <div style={{ fontSize: 12, color: muted }}>
            You&apos;ll need your own OpenAI API key (for narration audio) and Anthropic API key (to polish speaker notes into natural narration) — both are entered once in the tool and stored locally by Tampermonkey.
          </div>
        </div>
      </div>
    </div>
  );
}
