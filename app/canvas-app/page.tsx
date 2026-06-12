'use client';

import { useMemo, useState, type CSSProperties } from 'react';

const IOS_URL = 'https://apps.apple.com/us/app/canvas-student/id480883488';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.instructure.candroid';

function qrUrl(url: string, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(url)}`;
}

function canvasBannerHtml() {
  const iosQr = qrUrl(IOS_URL, 150);
  const androidQr = qrUrl(ANDROID_URL, 150);
  return `<div style="font-family:Arial,Helvetica,sans-serif;border:1px solid #d1d5db;border-radius:8px;background:#ffffff;overflow:hidden;max-width:980px;margin:16px auto;">
  <div style="background:#2d3b45;color:#ffffff;padding:18px 22px;">
    <div style="font-size:24px;font-weight:800;line-height:1.15;">Get Canvas Announcements on Your Phone</div>
    <div style="font-size:14px;line-height:1.45;margin-top:6px;color:#dbe5eb;">Install the Canvas Student app and turn on notifications so you do not miss course updates.</div>
  </div>
  <div style="display:flex;gap:18px;align-items:stretch;flex-wrap:wrap;padding:18px 22px;">
    <div style="flex:1 1 320px;min-width:260px;">
      <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:10px;">Before you leave today:</div>
      <ol style="margin:0;padding-left:22px;color:#374151;font-size:14px;line-height:1.65;">
        <li>Scan the QR code for your phone.</li>
        <li>Install the Canvas Student app.</li>
        <li>Log in to Canvas.</li>
        <li>Allow notifications when your phone asks.</li>
      </ol>
      <div style="margin-top:12px;background:#f9fafb;border-left:4px solid #2d3b45;padding:10px 12px;color:#111827;font-size:13px;line-height:1.45;">
        Also check Canvas notification settings and make sure course announcements are enabled.
      </div>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">
      <div style="width:150px;text-align:center;">
        <img src="${iosQr}" alt="QR code for Canvas Student on iPhone" style="width:150px;height:150px;border:1px solid #e5e7eb;border-radius:6px;" />
        <div style="font-size:13px;font-weight:800;color:#111827;margin-top:8px;">iPhone</div>
        <a href="${IOS_URL}" style="font-size:12px;color:#0770B8;">Open App Store</a>
      </div>
      <div style="width:150px;text-align:center;">
        <img src="${androidQr}" alt="QR code for Canvas Student on Android" style="width:150px;height:150px;border:1px solid #e5e7eb;border-radius:6px;" />
        <div style="font-size:13px;font-weight:800;color:#111827;margin-top:8px;">Android</div>
        <a href="${ANDROID_URL}" style="font-size:12px;color:#0770B8;">Open Google Play</a>
      </div>
    </div>
  </div>
</div>`;
}

function emailBannerHtml() {
  const iosQr = qrUrl(IOS_URL, 190);
  const androidQr = qrUrl(ANDROID_URL, 190);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px;background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#2d3b45;color:#ffffff;padding:26px 30px;text-align:center;">
            <div style="font-size:30px;font-weight:800;line-height:1.15;">Get Canvas Announcements on Your Phone</div>
            <div style="font-size:16px;line-height:1.5;margin-top:10px;color:#dbe5eb;">Install the Canvas Student app and turn on notifications so you do not miss course updates, reminders, or schedule changes.</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 30px;color:#111827;">
            <div style="font-size:18px;font-weight:800;margin-bottom:12px;">Set it up in four steps</div>
            <ol style="margin:0 0 20px 22px;padding:0;color:#374151;font-size:15px;line-height:1.7;">
              <li>Scan the QR code for your phone.</li>
              <li>Install the Canvas Student app.</li>
              <li>Log in to Canvas.</li>
              <li>Allow notifications when your phone asks.</li>
            </ol>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td align="center" width="50%" style="padding:10px;">
                  <img src="${iosQr}" width="190" height="190" alt="QR code for Canvas Student on iPhone" style="display:block;border:1px solid #e5e7eb;" />
                  <div style="font-size:15px;font-weight:800;margin-top:10px;">iPhone</div>
                  <a href="${IOS_URL}" style="font-size:13px;color:#0770B8;">Open App Store</a>
                </td>
                <td align="center" width="50%" style="padding:10px;">
                  <img src="${androidQr}" width="190" height="190" alt="QR code for Canvas Student on Android" style="display:block;border:1px solid #e5e7eb;" />
                  <div style="font-size:15px;font-weight:800;margin-top:10px;">Android</div>
                  <a href="${ANDROID_URL}" style="font-size:13px;color:#0770B8;">Open Google Play</a>
                </td>
              </tr>
            </table>
            <div style="margin-top:18px;background:#f9fafb;border-left:4px solid #2d3b45;padding:12px 14px;color:#111827;font-size:14px;line-height:1.5;">
              After installing, check your Canvas notification settings and make sure course announcements are enabled.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export default function CanvasAppMarketingPage() {
  const [copied, setCopied] = useState('');
  const canvasHtml = useMemo(canvasBannerHtml, []);
  const emailHtml = useMemo(emailBannerHtml, []);

  async function copy(label: string, html: string) {
    await navigator.clipboard.writeText(html);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  }

  return (
    <main style={S.page}>
      <section style={S.header}>
        <h1 style={S.h1}>Canvas Student App Promotion Kit</h1>
        <p style={S.sub}>Copy a ready-made Canvas banner or email block that helps students install Canvas Student and enable notifications.</p>
      </section>

      <section style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h2 style={S.h2}>Canvas Banner</h2>
            <p style={S.note}>Paste this into a Canvas page, announcement, or module item.</p>
          </div>
          <button style={S.button} onClick={() => copy('Canvas banner', canvasHtml)}>{copied === 'Canvas banner' ? 'Copied' : 'Copy HTML'}</button>
        </div>
        <div dangerouslySetInnerHTML={{ __html: canvasHtml }} />
      </section>

      <section style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h2 style={S.h2}>Full Email Version</h2>
            <p style={S.note}>Use this for a larger email-style message to students.</p>
          </div>
          <button style={S.button} onClick={() => copy('Email version', emailHtml)}>{copied === 'Email version' ? 'Copied' : 'Copy HTML'}</button>
        </div>
        <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
      </section>
    </main>
  );
}

const S: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#eef2f5',
    color: '#111827',
    fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: 24,
    boxSizing: 'border-box',
  },
  header: {
    maxWidth: 980,
    margin: '0 auto 18px',
  },
  h1: {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
  },
  sub: {
    margin: '8px 0 0',
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 1.5,
  },
  panel: {
    maxWidth: 1060,
    margin: '0 auto 22px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: 16,
  },
  panelHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  h2: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },
  note: {
    margin: '3px 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  button: {
    border: 'none',
    borderRadius: 6,
    background: '#2d3b45',
    color: '#fff',
    padding: '9px 14px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
