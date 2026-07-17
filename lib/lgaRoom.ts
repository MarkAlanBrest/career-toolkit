import { get, put } from '@vercel/blob';

export type ReservationStatus = 'pending' | 'approved' | 'denied';

export type Reservation = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  name: string;
  organization: string;
  email: string;
  phone: string;
  eventName: string;
  purpose: string;
  numberOfPeople: number;
  setupRequirements: string;
  specialRequests: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

export type LgaRoomSettings = {
  buildingManagerEmail: string;
  maintenanceEmail: string;
};

export const ROOM_NAME = 'LGA Room';
export const ROOM_OPEN_TIME = '07:00';
export const ROOM_CLOSE_TIME = '21:00';

// One JSON file in Vercel Blob holds every reservation. At the volume this room sees
// (a couple hundred bookings a year), a single durable flat file beats standing up a
// database — Blob storage just needs to actually persist, unlike a function's local disk.
const BLOB_PATHNAME = 'lga-room/reservations.json';
const SETTINGS_PATHNAME = 'lga-room/settings.json';

export function getAdminPassword(): string {
  return process.env.LGA_ROOM_ADMIN_PASSWORD || 'ncstadmin123';
}

export function isAdminAuthorized(providedPassword: string | null | undefined): boolean {
  return Boolean(providedPassword) && providedPassword === getAdminPassword();
}

export async function getAllReservations(): Promise<Reservation[]> {
  const result = await get(BLOB_PATHNAME, { access: 'private' });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

export async function saveAllReservations(reservations: Reservation[]): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(reservations), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getSettings(): Promise<LgaRoomSettings> {
  const result = await get(SETTINGS_PATHNAME, { access: 'private' });
  if (!result) return { buildingManagerEmail: '', maintenanceEmail: '' };
  const data = await new Response(result.stream).json();
  return {
    buildingManagerEmail: typeof data?.buildingManagerEmail === 'string' ? data.buildingManagerEmail : '',
    maintenanceEmail: typeof data?.maintenanceEmail === 'string' ? data.maintenanceEmail : '',
  };
}

export async function saveSettings(settings: LgaRoomSettings): Promise<void> {
  await put(SETTINGS_PATHNAME, JSON.stringify(settings), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
