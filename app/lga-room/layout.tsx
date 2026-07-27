import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LG Room Reservations',
  description: 'Reserve the LG Room at New Castle School of Trades — a professional space for business use.',
};

export default function LgaRoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
