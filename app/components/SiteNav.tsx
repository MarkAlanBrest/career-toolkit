'use client';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

export default function SiteNav({ active }: { active?: 'home' | 'features' | 'pricing' }) {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #E5E7EB',
      padding: '0 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: font,
    }}>
      <a href="/" style={{ color: '#111827', fontWeight: 600, fontSize: 15, textDecoration: 'none', letterSpacing: '-0.2px' }}>
        Canvas Enhancer
      </a>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {[
          { href: '/',         label: 'Home',       key: 'home' },
          { href: '/features', label: 'Features',   key: 'features' },
          { href: '/pricing',  label: 'Pricing',    key: 'pricing' },
        ].map(link => (
          <a key={link.key} href={link.href} style={{
            color: active === link.key ? '#111827' : '#6B7280',
            fontSize: 14,
            textDecoration: 'none',
            fontWeight: active === link.key ? 600 : 400,
          }}>
            {link.label}
          </a>
        ))}
        <a href={extensionUrl} style={{
          background: '#0770B8',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          Install Free
        </a>
      </div>
    </nav>
  );
}
