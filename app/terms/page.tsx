const ink  = '#1B303D';
const muted = '#526A79';
const font  = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 8, marginTop: 0 }}>{title}</h2>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', margin: 0 }}>{children}</p>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div style={{ fontFamily: font, color: ink, maxWidth: 640, margin: '40px auto', padding: '0 24px 60px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, marginTop: 0 }}>
        Canvas Enhancer — AI Credits Terms of Purchase
      </h1>
      <p style={{ fontSize: 13, color: muted, marginBottom: 36, marginTop: 0 }}>Last updated: June 2026</p>

      <Section title="Purchases are final">
        All AI credit purchases are non-refundable. Once purchased, credits are immediately
        available in your account and do not expire.
      </Section>

      <Section title="Auto-reload">
        If you enable auto-reload, your saved payment method will be charged automatically
        when your credit balance drops below the threshold you have set. You may enable or
        disable auto-reload at any time from the AI credits panel in the Canvas Enhancer
        toolbar. You are responsible for reviewing and updating your reload settings. Canvas
        Enhancer is not liable for charges that result from auto-reload settings you have
        configured.
      </Section>

      <Section title="Payment processing">
        All payments are processed securely by{' '}
        <a href="https://stripe.com" target="_blank" rel="noopener noreferrer"
          style={{ color: '#0770B8' }}>Stripe</a>.
        Canvas Enhancer does not store your full card number — only the last 4 digits and card
        brand are retained for display purposes. By purchasing you also agree to{' '}
        <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer"
          style={{ color: '#0770B8' }}>Stripe&apos;s Terms of Service</a>.
      </Section>

      <Section title="Fair use">
        AI credits are for use within Canvas Enhancer only. Credits may not be resold,
        transferred, or used outside of the Canvas Enhancer extension. Abuse of the service
        may result in account suspension without refund.
      </Section>

      <Section title="Service availability">
        Canvas Enhancer AI features are provided on a best-effort basis. We are not liable
        for service interruptions, outages, or AI output quality. Credits consumed during a
        request are non-recoverable regardless of output quality or content.
      </Section>

      <Section title="Contact">
        For billing questions or disputes, email{' '}
        <a href="mailto:markalanbrest@gmail.com" style={{ color: '#0770B8' }}>
          markalanbrest@gmail.com
        </a>
        . We will respond within 2 business days.
      </Section>
    </div>
  );
}
