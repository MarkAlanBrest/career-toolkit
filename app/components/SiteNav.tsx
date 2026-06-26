'use client';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

export default function SiteNav({ active }: { active?: 'home' | 'features' | 'pricing' }) {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const links = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/features', label: 'Features', key: 'features' },
    { href: '/pricing', label: 'AI Credits', key: 'pricing' },
  ];

  return (
    <nav style={{
      background: 'rgba(255,255,255,.94)',
      borderBottom: '1px solid #DDE7EE',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 64,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: font,
      backdropFilter: 'blur(14px)',
      gap: 18,
      flexWrap: 'wrap',
    }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#203342', fontWeight: 900, fontSize: 16, textDecoration: 'none', letterSpacing: 0 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#0770B8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 950 }}>CE</span>
        Canvas Enhancer
      </a>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {links.map(link => (
          <a key={link.key} href={link.href} style={{
            color: active === link.key ? '#0770B8' : '#5F7280',
            background: active === link.key ? '#EAF5FC' : 'transparent',
            fontSize: 14,
            textDecoration: 'none',
            fontWeight: 800,
            padding: '8px 11px',
            borderRadius: 999,
          }}>
            {link.label}
          </a>
        ))}
        <a href={extensionUrl} style={{
          background: '#203342',
          color: '#fff',
          padding: '9px 15px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 900,
          textDecoration: 'none',
          boxShadow: '0 10px 24px rgba(32,51,66,.18)',
        }}>
          Install Free
        </a>
      </div>
    </nav>
  );
}
