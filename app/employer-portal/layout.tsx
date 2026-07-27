import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Portal — New Castle School of Trades',
  description: 'Connect with NCST Career Services, request applicants, post openings, register for events, and manage your employer partnership.',
};

export default function EmployerPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
