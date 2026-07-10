'use client';

const serif = 'Georgia,"Times New Roman",serif';
const display = '"Trebuchet MS",Arial,sans-serif';

export default function SiteNav({ active }: { active?: 'home' | 'features' | 'pricing' | 'departments' | 'course-builder' }) {
  const links = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/course-builder', label: 'Course Builder', key: 'course-builder' },
    { href: '/features', label: 'Features', key: 'features' },
    { href: '/pricing', label: 'AI Credits', key: 'pricing' },
    { href: '/departments', label: 'Departments', key: 'departments' },
    { href: 'https://career-toolkit-ruby.vercel.app/content-studio.user.js', label: 'Install', key: 'install' },
  ];

  return (
    <header style={{ width: '100%', padding: '34px 0 24px' }}>
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 28,
          flexWrap: 'wrap',
        }}
      >
        <a href="/" style={{ textDecoration: 'none', color: '#26315f' }}>
          <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1, fontWeight: 700 }}>
            Canvas Enhancer
          </div>
          <div style={{ fontFamily: display, fontSize: 12, color: '#777', marginTop: 8, letterSpacing: 0 }}>
            Practical Canvas tools for teachers
          </div>
        </a>

        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Site navigation">
          {links.map(link => {
            const isActive = active === link.key;

            return (
              <a
                key={link.key}
                href={link.href}
                style={{
                  display: 'inline-block',
                  minWidth: 92,
                  padding: '8px 12px',
                  borderRadius: 3,
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: isActive ? '#fff' : '#6d6f73',
                  background: isActive ? '#244f98' : 'transparent',
                  fontFamily: display,
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
