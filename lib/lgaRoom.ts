import { redis } from '@/lib/redis';

export type ReservationStatus = 'pending' | 'approved' | 'denied';

export type Reservation = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  name: string;
  email: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

export const ROOM_NAME = 'LGA Room';
export const ROOM_OPEN_TIME = '07:00';
export const ROOM_CLOSE_TIME = '21:00';

const REDIS_KEY = 'lga-room:reservations';

export function getAdminPassword(): string {
  return process.env.LGA_ROOM_ADMIN_PASSWORD || 'ncstadmin123';
}

export function isAdminAuthorized(providedPassword: string | null | undefined): boolean {
  return Boolean(providedPassword) && providedPassword === getAdminPassword();
}

export async function getAllReservations(): Promise<Reservation[]> {
  const stored = await redis.get<Reservation[]>(REDIS_KEY);
  return Array.isArray(stored) ? stored : [];
}

export async function saveAllReservations(reservations: Reservation[]): Promise<void> {
  await redis.set(REDIS_KEY, reservations);
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
