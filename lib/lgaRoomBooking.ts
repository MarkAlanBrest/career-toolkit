import { getFederalHolidayName } from '@/lib/lgaRoomHolidays';
import { timesOverlap } from '@/lib/lgaRoom';
import type { Reservation } from '@/lib/lgaRoom';

export { isFederalHoliday } from '@/lib/lgaRoomHolidays';

export const RENTAL_BASE_HOURS = 3;
export const RENTAL_BASE_PRICE = 150;
export const RENTAL_HOURLY_RATE = 50;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateStr(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatReservationReference(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function isPastDate(dateStr: string): boolean {
  return dateStr < toDateStr(new Date());
}

export function validateBookingDate(dateStr: string): { ok: true } | { ok: false; error: string } {
  if (isPastDate(dateStr)) {
    return { ok: false, error: 'Reservations cannot be made for past dates.' };
  }
  const holiday = getFederalHolidayName(dateStr);
  if (holiday) {
    return { ok: false, error: `The room is not available on ${holiday}.` };
  }
  return { ok: true };
}

export function durationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export function estimateRentalCost(startTime: string, endTime: string): number {
  const hours = durationHours(startTime, endTime);
  if (hours <= RENTAL_BASE_HOURS) return RENTAL_BASE_PRICE;
  return RENTAL_BASE_PRICE + (hours - RENTAL_BASE_HOURS) * RENTAL_HOURLY_RATE;
}

export function formatRentalCost(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function pendingOverlapWarning(
  existing: Reservation[],
  date: string,
  startTime: string,
  endTime: string,
): string | null {
  const overlapping = existing.filter(
    r => r.status === 'pending' && r.date === date && timesOverlap(r.startTime, r.endTime, startTime, endTime),
  );
  if (!overlapping.length) return null;
  return 'Another request is already pending for part of this time. Your request can still be submitted, but approval is not guaranteed.';
}
