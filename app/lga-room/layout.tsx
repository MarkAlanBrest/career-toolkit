import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LGA Room Reservations',
  description: 'Reserve the LGA Room at New Castle School of Trades — a professional space for business use.',
};

export default function LgaRoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
