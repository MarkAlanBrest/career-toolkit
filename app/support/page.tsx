'use client';

import SiteNav from '../components/SiteNav';

const serif = 'Georgia,"Times New Roman",serif';
const display = '"Trebuchet MS",Arial,sans-serif';
const pageBg = '#e9ecef';
const paper = '#f8f8f5';
const text = '#595c60';
const heading = '#26315f';
const blue = '#244f98';
const rule = '#d2d2cc';

const faqs = [
  {
    q: 'The toolbar is not showing up in Canvas.',
    a: 'Make sure the extension is enabled in your browser. Open edge://extensions (Edge) or chrome://extensions (Chrome), find Canvas Enhancer, and confirm the toggle is on. Then reload your Canvas page. The toolbar appears at the top of Canvas pages when you are signed in as a teacher or instructor.',
  },
  {
    q: 'How do I buy AI credits?',
    a: 'Go to canvasenhancer.com/pricing to see the available credit packs. Credits are purchased once and do not expire. You can also buy credits directly from the extension toolbar using the hub menu.',
  },
  {
    q: 'My AI credits are not showing up after purchase.',
    a: 'Credits are applied to your account automatically after payment. If they do not appear within a few minutes, reload the Canvas page and check the hub. If the issue persists, email support at the address below with your purchase confirmation.',
  },
  {
    q: 'Can I send credits to another teacher?',
    a: 'Yes. Open the hub in the extension toolbar, go to the Credits section, and use the Send Credits option. Enter the teacher\'s email address and the amount to send. The recipient must have Canvas Enhancer installed.',
  },
  {
    q: 'Does Canvas Enhancer work on my school\'s Canvas site?',
    a: 'Canvas Enhancer works on any Canvas LMS site hosted on instructure.com, canvas.com, or canvaslms.com. If your school uses a custom domain, the extension may not activate. Contact support with your Canvas URL and we can look into it.',
  },
  {
    q: 'Is student data collected or stored?',
    a: 'No. Canvas Enhancer does not collect or store student data. AI features send only the content you are actively working with — a submission you are grading or instructions you provide — to generate a response. No gradebook data, student names, or submission history are stored on any server.',
  },
  {
    q: 'How do I uninstall the extension?',
    a: 'Open edge://extensions (Edge) or chrome://extensions (Chrome), find Canvas Enhancer, and click Remove. This does not delete your credit balance — credits are stored on your account and will be available if you reinstall.',
  },
];

export default function SupportPage() {
  return (
    <main style={{ minHeight: '100vh', background: pageBg, color: text, fontFamily: serif }}>
      <SiteNav />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 48px' }}>
        <section style={{ background: paper, border: '1px solid #d9d9d2', padding: '38px 38px 34px' }}>
          <h1 style={{ margin: 0, color: heading, fontFamily: serif, fontSize: 'clamp(30px,5vw,42px)', lineHeight: 1.12 }}>
            Support
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 760, fontSize: 15, lineHeight: 1.8 }}>
            For help with Canvas Enhancer, start with the common questions below. If you need further assistance, email us directly.
          </p>
          <p style={{ margin: '16px 0 0', fontSize: 15 }}>
            <strong style={{ color: heading }}>Email:</strong>{' '}
            <a href="mailto:support@canvasenhancer.com" style={{ color: blue }}>support@canvasenhancer.com</a>
          </p>
        </section>

        <section style={{ marginTop: 26, background: paper, border: '1px solid #d9d9d2', padding: '30px 34px' }}>
          <h2 style={{ margin: '0 0 18px', color: blue, fontFamily: serif, fontSize: 23 }}>
            Common questions
          </h2>
          <div style={{ borderTop: `1px solid ${rule}` }}>
            {faqs.map(({ q, a }) => (
              <div key={q} style={{ borderBottom: `1px solid ${rule}`, padding: '20px 0' }}>
                <h3 style={{ margin: '0 0 10px', color: heading, fontFamily: serif, fontSize: 17, lineHeight: 1.3 }}>
                  {q}
                </h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.85, textAlign: 'justify' }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 26, padding: '4px 2px 0' }}>
          <h2 style={{ margin: '0 0 12px', color: heading, fontFamily: serif, fontSize: 22 }}>
            Still need help?
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, maxWidth: 780 }}>
            Email <a href="mailto:support@canvasenhancer.com" style={{ color: blue }}>support@canvasenhancer.com</a> and include your Canvas site URL, a description of the issue, and your browser version. We typically respond within one business day.
          </p>
        </section>
      </div>
    </main>
  );
}
