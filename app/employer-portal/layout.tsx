import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Portal — New Castle School of Trades',
  description: 'Partner with NCST: request applicants, post openings, and manage employer engagement.',
};

export default function EmployerPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
