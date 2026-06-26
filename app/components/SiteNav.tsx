'use client';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

export default function SiteNav({ active }: { active?: 'home' | 'features' | 'pricing' }) {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const links = [
    { href: '/', label: 'Overview', key: 'home' },
    { href: '/features', label: 'Features', key: 'features' },
    { href: '/pricing', label: 'AI Credits', key: 'pricing' },
  ];

  return (
    <nav style={{
      borderBottom: '1px solid #d7dde2',
      background: '#fff',
      padding: '18px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 24,
      flexWrap: 'wrap',
      fontFamily: font,
    }}>
      <a href="/" style={{ color: '#1f2933', textDecoration: 'none', fontSize: 16, fontWeight: 650 }}>
        Canvas Enhancer
      </a>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        {links.map(link => (
          <a
            key={link.key}
            href={link.href}
            style={{
              color: active === link.key ? '#1f2933' : '#5f6b76',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: active === link.key ? 650 : 400,
            }}
          >
            {link.label}
          </a>
        ))}
        <a href={extensionUrl} style={{ color: '#1f2933', fontSize: 14, fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Install
        </a>
      </div>
    </nav>
  );
}
