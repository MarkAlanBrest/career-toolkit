const ink  = '#1B303D';
const muted = '#526A79';
const blue  = '#0770B8';
const font  = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 8, marginTop: 0 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}>{children}</div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: font, color: ink, maxWidth: 680, margin: '40px auto', padding: '0 24px 60px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, marginTop: 0 }}>
        Canvas Enhancer — Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: muted, marginBottom: 36, marginTop: 0 }}>
        Last updated: June 2026
      </p>

      <Section title="Overview">
        <p style={{ margin: '0 0 12px' }}>
          Canvas Enhancer is a browser extension for Chrome and Microsoft Edge that adds
          AI-powered tools to the Canvas LMS. This policy explains what data we collect,
          how we use it, and what we do not do with it.
        </p>
        <p style={{ margin: 0 }}>
          We collect only what is necessary to deliver the product. We do not sell your
          data, share it with advertisers, or use it for any purpose other than operating
          Canvas Enhancer.
        </p>
      </Section>

      <Section title="What we collect">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>
            <strong>Canvas account identifier.</strong> The extension reads your Canvas
            user ID (an integer assigned by your institution&apos;s Canvas instance) and
            your Canvas domain (e.g. <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>school.instructure.com</code>).
            These are combined into an account key (<code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>userID@domain</code>)
            stored in your browser and on our servers. This key identifies your credit
            account and is stable across devices on the same Canvas instance.
          </Li>
          <Li>
            <strong>Teacher registration (optional).</strong> If you choose to register
            to receive credits from colleagues, you provide your name and school email
            address through the Settings panel. This information is stored on our servers
            and allows other teachers at your school to send credits to you by email.
            Registration is entirely voluntary.
          </Li>
          <Li>
            <strong>AI credit balance and usage.</strong> Your current credit balance,
            total credits used, and credit transfer history are stored on our servers,
            keyed to your account identifier.
          </Li>
          <Li>
            <strong>Payment information.</strong> If you purchase AI credits, your payment
            is processed by Stripe. We store only a Stripe customer reference ID and the
            last 4 digits and brand of your card for display purposes. Your full card
            number, expiry, and CVV are never transmitted to or stored by Canvas Enhancer
            — they are held exclusively by Stripe.
          </Li>
          <Li>
            <strong>Auto-reload settings.</strong> If you enable auto-reload, your chosen
            threshold and reload amount are stored alongside your account identifier.
          </Li>
        </ul>
      </Section>

      <Section title="What we do not collect">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>Your Canvas login credentials or session password</Li>
          <Li>Student names, student IDs, grades, or any other student personal information</Li>
          <Li>The content of Canvas pages you visit (unless you explicitly submit text to an AI feature)</Li>
          <Li>Your IP address or browsing history outside of Canvas</Li>
          <Li>Any data from websites other than your Canvas instance</Li>
        </ul>
      </Section>

      <Section title="Browser permissions">
        <p style={{ margin: '0 0 10px' }}>
          The extension requests the following browser permissions and uses them as described:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>
            <strong>storage</strong> — Saves your preferences, account identifier, and
            settings locally in your browser.
          </Li>
          <Li>
            <strong>cookies</strong> — Reads your Canvas session cookie solely to
            authenticate requests to the Canvas API on your behalf (for example, to
            load assignment data for grading tools). No cookies are read from any
            other website.
          </Li>
          <Li>
            <strong>windows</strong> — Opens the credit management panel in a new
            browser window when requested.
          </Li>
          <Li>
            <strong>management</strong> — Allows you to uninstall Canvas Enhancer
            from within the extension&apos;s Settings panel. This permission is used
            for no other purpose.
          </Li>
        </ul>
        <p style={{ margin: '10px 0 0' }}>
          The extension operates only on Canvas LMS domains (<code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>*.instructure.com</code>,{' '}
          <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>*.canvas.com</code>,{' '}
          <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>*.canvaslms.com</code>) and on
          the Canvas Enhancer website. It also accesses <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>*.amazonaws.com</code>{' '}
          because Canvas serves uploaded files (such as student submissions) through
          Amazon S3 — the extension needs this to read submission content for AI grading.
        </p>
      </Section>

      <Section title="AI processing and student data">
        <p style={{ margin: '0 0 12px' }}>
          When you use AI features (grading, page building, quiz creation), the content
          you submit — such as assignment instructions or student submission text — is
          sent to <strong>Anthropic&apos;s Claude API</strong> for processing. This
          content is used solely to generate the AI response and is governed by{' '}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
            style={{ color: blue }}>Anthropic&apos;s Privacy Policy</a>.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          Canvas Enhancer does <strong>not</strong> store, log, or retain the content of
          submissions or AI responses. Once the response is delivered to your browser,
          no record of the content is kept on our servers.
        </p>
        <p style={{ margin: 0 }}>
          <strong>FERPA notice:</strong> Teachers are responsible for ensuring their use
          of AI tools complies with their institution&apos;s data policies and applicable
          law, including FERPA. We recommend avoiding submitting content that includes
          student names or other identifying information to AI features.
        </p>
      </Section>

      <Section title="Credit sharing between teachers">
        <p style={{ margin: '0 0 12px' }}>
          Canvas Enhancer allows teachers to share AI credits with colleagues at the same
          school. To send credits to another teacher, you search by their school email
          address. Searches are scoped to your Canvas domain — you can only find teachers
          registered on the same Canvas instance as you.
        </p>
        <p style={{ margin: 0 }}>
          If you register to receive credits, your name and email become discoverable by
          other teachers at your school searching by your exact email address. No directory
          or list of registered teachers is ever displayed. You can request removal of your
          registration at any time by contacting us (see below).
        </p>
      </Section>

      <Section title="How we use data">
        <p style={{ margin: '0 0 8px' }}>The data we collect is used only to:</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>Identify your credit account across devices on the same Canvas instance</Li>
          <Li>Track your AI credit balance and deduct credits when AI features are used</Li>
          <Li>Enable credit transfers between teachers at the same school</Li>
          <Li>Process payments and manage auto-reload charges through Stripe</Li>
          <Li>Display your saved card details in the credits panel</Li>
        </ul>
        <p style={{ margin: '12px 0 0' }}>
          We do not sell, share, or transfer any data to third parties for marketing,
          advertising, or any other purpose.
        </p>
      </Section>

      <Section title="Data storage and security">
        <p style={{ margin: '0 0 12px' }}>
          Credit balances, registration profiles, and settings are stored in{' '}
          <a href="https://upstash.com" target="_blank" rel="noopener noreferrer"
            style={{ color: blue }}>Upstash Redis</a>, a managed database with
          encryption at rest and in transit. Payment data is stored and secured by{' '}
          <a href="https://stripe.com/docs/security" target="_blank" rel="noopener noreferrer"
            style={{ color: blue }}>Stripe</a>, which is PCI DSS Level 1 certified.
          The Canvas Enhancer API runs on Vercel, a SOC 2-certified hosting provider.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p style={{ margin: '0 0 12px' }}>
          Your credit balance, registration profile (if created), and settings persist
          until you request deletion. To delete your data, email{' '}
          <a href="mailto:canvasenhancer@gmail.com" style={{ color: blue }}>
            canvasenhancer@gmail.com
          </a>{' '}
          with the subject line &quot;Delete my data&quot; from the email address
          associated with your account, or include your Canvas domain and Canvas user ID
          so we can locate your record.
        </p>
        <p style={{ margin: 0 }}>
          We will process deletion requests within 30 days. Stripe payment records are
          subject to Stripe&apos;s own retention policies for legal and financial
          compliance purposes.
        </p>
      </Section>

      <Section title="Children's privacy">
        <p style={{ margin: 0 }}>
          Canvas Enhancer is designed for use by teachers and school administrators only.
          It is not directed at children under 13 and we do not knowingly collect
          information from children. Student data that appears in Canvas (such as submission
          text processed by AI features) is handled as described in the AI Processing
          section above and is never stored by Canvas Enhancer.
        </p>
      </Section>

      <Section title="Third-party services">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>
            <strong>Anthropic</strong> — AI processing.{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>
          </Li>
          <Li>
            <strong>Stripe</strong> — Payment processing.{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>
          </Li>
          <Li>
            <strong>Upstash</strong> — Database hosting.{' '}
            <a href="https://upstash.com/trust/privacy.pdf" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>
          </Li>
          <Li>
            <strong>Vercel</strong> — API and website hosting.{' '}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>
          </Li>
        </ul>
      </Section>

      <Section title="Changes to this policy">
        <p style={{ margin: 0 }}>
          We may update this policy as the product evolves. Material changes will be noted
          by updating the date at the top of this page. Continued use of Canvas Enhancer
          after changes constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p style={{ margin: 0 }}>
          Questions about this policy or data deletion requests:{' '}
          <a href="mailto:canvasenhancer@gmail.com" style={{ color: blue }}>
            canvasenhancer@gmail.com
          </a>
        </p>
      </Section>
    </div>
  );
}
