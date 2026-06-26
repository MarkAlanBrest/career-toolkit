'use client';

import { useEffect, useState } from 'react';
import { TeacherCreditPanel } from '../components/credits/TeacherCreditPanel';

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

export default function ManageCreditsPage() {
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAccountId(params.get('accountId') || '');
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#F3F7FA', fontFamily: font, color: '#1B303D', padding: 24 }}>
      <section style={{ maxWidth: 560, margin: '0 auto', background: '#fff', border: '1px solid #D8E1E8', borderRadius: 10, padding: 20 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, lineHeight: 1.2 }}>
          Manage teachers and credits
        </h1>
        <p style={{ margin: '0 0 18px', color: '#526A79', fontSize: 13, lineHeight: 1.6 }}>
          Add teachers by email, then send them credits from your balance.
        </p>
        <TeacherCreditPanel accountId={accountId} standalone />
      </section>
    </main>
  );
}
