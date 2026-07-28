'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { archivo, publicSans } from '../../lga-room/shared';
import { EmployerResetPasswordPanel } from '../employer-auth-modals';
import styles from '../employer-portal.module.css';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  return (
    <main className={`${publicSans.className} ${styles.page}`}>
      <section className={styles.resetPasswordPage}>
        <div className={styles.resetPasswordCard}>
          <Link href="/employer-portal" className={styles.resetPasswordBrand}>
            <Image src="/ncst-logo.png" width={154} height={40} alt="New Castle School of Trades" priority />
            <span>Employer Portal</span>
          </Link>
          <span className={styles.kicker}>Account security</span>
          <h1 className={archivo.className}>Reset password</h1>
          {token ? (
            <EmployerResetPasswordPanel
              token={token}
              onSuccess={() => router.push('/employer-portal')}
            />
          ) : (
            <div>
              <p style={{ margin: '0 0 12px', color: '#606b78', fontSize: 13, lineHeight: 1.5 }}>
                This reset link is missing a token. Use the forgot-password option on the employer sign-in screen to request a new link.
              </p>
              <Link href="/employer-portal" style={{ color: '#001f52', fontSize: 12, fontWeight: 700 }}>Back to employer portal</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function EmployerResetPasswordPage() {
  return (
    <Suspense fallback={<main className={`${publicSans.className} ${styles.page}`} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
