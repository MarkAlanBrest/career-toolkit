'use client';

import { lgaRoomStyles, publicSans } from '../shared';
import { LgaRoomCalendar } from './lga-room-calendar';

export default function LgaRoomCalendarPage() {
  return (
    <main className={publicSans.className}>
      <style>{lgaRoomStyles}</style>
      <LgaRoomCalendar />
    </main>
  );
}
