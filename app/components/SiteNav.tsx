'use client';

const navy = '#2d3b45';
const blue = '#0770a3';

export default function SiteNav({ active }: { active?: 'home' | 'features' | 'pricing' }) {
  const extensionUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || '#';
  const linkStyle = (page: string) => ({
    color: active === page ? '#fff' : '#a8bac4',
    fontSize: 14,
    textDecoration: 'none',
    fontWeight: active === page ? 700 : 400,
  } as React.CSSProperties);

  return (
    <nav style={{ background: navy, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <a href="/" style={{ color: '#fff', fontWeight: 700, fontSize: 17, textDecoration: 'none' }}>Canvas Enhancer</a>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <a href="/"         style={linkStyle('home')}>Home</a>
        <a href="/features" style={linkStyle('features')}>Features</a>
        <a href="/pricing"  style={linkStyle('pricing')}>Pricing</a>
        <a href={extensionUrl} style={{ background: blue, color: '#fff', padding: '7px 16px', borderRadius: 4, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Install Free
        </a>
      </div>
    </nav>
  );
}
