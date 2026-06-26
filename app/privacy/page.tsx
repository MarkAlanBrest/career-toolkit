const ink   = '#1B303D';
const muted  = '#526A79';
const blue   = '#0770B8';
const font   = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 8, marginTop: 0 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}>{children}</div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 6 }}>{children}</li>
  );
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
          Canvas Enhancer is a Chrome extension that adds AI-powered tools to the Canvas LMS.
          This policy explains what data we collect, how we use it, and what we do not do with it.
        </p>
        <p style={{ margin: 0 }}>
          <strong>The short version:</strong> We collect no personally identifiable information.
          We do not know your name, email address, or school. Your account is identified only
          by an anonymous ID generated on your device.
        </p>
      </Section>

      <Section title="What we collect">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>
            <strong>Anonymous device ID.</strong> When you install Canvas Enhancer, the extension
            generates a random identifier (UUID) and stores it in your browser&apos;s local storage.
            This ID is used to track your AI credit balance. It contains no personal information
            and is not linked to your Canvas account, name, or email.
          </Li>
          <Li>
            <strong>AI credit balance and usage.</strong> Your current credit balance and total
            credits used are stored in our database, keyed to your anonymous device ID.
          </Li>
          <Li>
            <strong>Payment information.</strong> If you purchase AI credits, your payment is
            processed by Stripe. We store only a Stripe customer reference ID and the last
            4 digits and brand of your card (e.g. "Visa ···· 4242") for display in the credits
            panel. Your full card number, expiry, and CVV are never transmitted to or stored
            by Canvas Enhancer — they are held exclusively by Stripe.
          </Li>
          <Li>
            <strong>Auto-reload settings.</strong> If you enable auto-reload, your chosen
            threshold and reload amount are stored alongside your anonymous device ID.
          </Li>
        </ul>
      </Section>

      <Section title="What we do not collect">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>Your name, email address, or any other personal information</Li>
          <Li>Your Canvas login credentials or session tokens</Li>
          <Li>Your school, district, or institution name</Li>
          <Li>Student names, student IDs, or any student personal information</Li>
          <Li>Your IP address or browsing history</Li>
          <Li>Any data from Canvas pages you visit beyond what you explicitly submit to an AI feature</Li>
        </ul>
      </Section>

      <Section title="AI processing and student data">
        <p style={{ margin: '0 0 12px' }}>
          When you use AI features (grading, page building, quiz creation), the content you
          submit — such as assignment instructions or student submission text — is sent to
          <strong> Anthropic&apos;s Claude API</strong> for processing. This content is used
          solely to generate the AI response and is governed by{' '}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
            style={{ color: blue }}>Anthropic&apos;s Privacy Policy</a>.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          Canvas Enhancer does <strong>not</strong> store, log, or retain the content of
          submissions or AI responses. Once the response is streamed to your browser, no
          record of the content is kept on our servers.
        </p>
        <p style={{ margin: 0 }}>
          <strong>FERPA notice:</strong> Teachers are responsible for ensuring their use of
          AI tools complies with their institution&apos;s data policies and applicable law,
          including FERPA. We recommend avoiding submitting content that includes student
          names or other identifying information to AI features.
        </p>
      </Section>

      <Section title="How we use data">
        <p style={{ margin: '0 0 8px' }}>
          The limited data we collect is used only to:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>Track your AI credit balance and deduct credits when AI features are used</Li>
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
          Credit balances and settings are stored in{' '}
          <a href="https://upstash.com" target="_blank" rel="noopener noreferrer"
            style={{ color: blue }}>Upstash Redis</a>, a managed database with encryption
          at rest and in transit. Payment data is stored and secured by{' '}
          <a href="https://stripe.com/docs/security" target="_blank" rel="noopener noreferrer"
            style={{ color: blue }}>Stripe</a>, which is PCI DSS Level 1 certified.
        </p>
        <p style={{ margin: 0 }}>
          Because we collect no personal information, there is no profile to breach. The
          worst case in a data leak is that someone learns an anonymous UUID has X credits —
          nothing more.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p style={{ margin: 0 }}>
          Your credit balance and settings persist in our database until you request deletion.
          To delete your data, email{' '}
          <a href="mailto:markalanbrest@gmail.com" style={{ color: blue }}>
            markalanbrest@gmail.com
          </a>{' '}
          with the subject line &quot;Delete my data.&quot; Because accounts are anonymous,
          you will need to provide your device&apos;s install ID, which can be found by
          opening the browser console on any Canvas page and typing{' '}
          <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 3, fontSize: 13 }}>
            chrome.storage.local.get(&apos;ce_install_id&apos;, console.log)
          </code>.
        </p>
      </Section>

      <Section title="Third-party services">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <Li>
            <strong>Anthropic</strong> — AI processing. See their{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>.
          </Li>
          <Li>
            <strong>Stripe</strong> — Payment processing. See their{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>.
          </Li>
          <Li>
            <strong>Upstash</strong> — Database hosting. See their{' '}
            <a href="https://upstash.com/trust/privacy.pdf" target="_blank" rel="noopener noreferrer"
              style={{ color: blue }}>Privacy Policy</a>.
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
          Questions about this policy? Email{' '}
          <a href="mailto:markalanbrest@gmail.com" style={{ color: blue }}>
            markalanbrest@gmail.com
          </a>.
        </p>
      </Section>
    </div>
  );
}
