import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
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
  adminNotifyEmail: string;
  buildingManagerEmail: string;
  maintenanceEmail: string;
  senderEmail: string;
  senderAppPassword: string;
  senderName: string;
};

export type AdminAccount = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

export const ROOM_NAME = 'LGA Room';
export const ROOM_OPEN_TIME = '07:00';
export const ROOM_CLOSE_TIME = '21:00';

// One JSON file in Vercel Blob holds every reservation. At the volume this room sees
// (a couple hundred bookings a year), a single durable flat file beats standing up a
// database — Blob storage just needs to actually persist, unlike a function's local disk.
const BLOB_PATHNAME = 'lga-room/reservations.json';
const SETTINGS_PATHNAME = 'lga-room/settings.json';
const ADMINS_PATHNAME = 'lga-room/admins.json';

// A break-glass password from server config — always works, even if every admin
// account below gets removed, so this deployment can never be locked out entirely.
export function getMasterPassword(): string {
  return process.env.LGA_ROOM_ADMIN_PASSWORD || 'ncstadmin123';
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const suppliedHash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, 'hex');
  if (suppliedHash.length !== storedHash.length) return false;
  return timingSafeEqual(suppliedHash, storedHash);
}

export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const result = await get(ADMINS_PATHNAME, { access: 'private' });
  if (!result) return [];
  const data = await new Response(result.stream).json();
  return Array.isArray(data) ? data : [];
}

async function saveAdminAccounts(accounts: AdminAccount[]): Promise<void> {
  await put(ADMINS_PATHNAME, JSON.stringify(accounts), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function addAdminAccount(email: string, password: string): Promise<void> {
  const accounts = await getAdminAccounts();
  const next = accounts.filter(a => a.email.toLowerCase() !== email.toLowerCase());
  next.push({ email: email.toLowerCase(), passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
  await saveAdminAccounts(next);
}

export async function removeAdminAccount(email: string): Promise<void> {
  const accounts = await getAdminAccounts();
  await saveAdminAccounts(accounts.filter(a => a.email.toLowerCase() !== email.toLowerCase()));
}

export async function isAdminAuthorized(email: string | null | undefined, password: string | null | undefined): Promise<boolean> {
  if (!password) return false;
  if (password === getMasterPassword()) return true;
  if (!email) return false;
  try {
    const accounts = await getAdminAccounts();
    const account = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    return Boolean(account) && verifyPassword(password, account!.passwordHash);
  } catch {
    return false;
  }
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

const EMPTY_SETTINGS: LgaRoomSettings = {
  adminNotifyEmail: '',
  buildingManagerEmail: '',
  maintenanceEmail: '',
  senderEmail: '',
  senderAppPassword: '',
  senderName: '',
};

export async function getSettings(): Promise<LgaRoomSettings> {
  const result = await get(SETTINGS_PATHNAME, { access: 'private' });
  if (!result) return { ...EMPTY_SETTINGS };
  const data = await new Response(result.stream).json();
  return {
    adminNotifyEmail: typeof data?.adminNotifyEmail === 'string' ? data.adminNotifyEmail : '',
    buildingManagerEmail: typeof data?.buildingManagerEmail === 'string' ? data.buildingManagerEmail : '',
    maintenanceEmail: typeof data?.maintenanceEmail === 'string' ? data.maintenanceEmail : '',
    senderEmail: typeof data?.senderEmail === 'string' ? data.senderEmail : '',
    senderAppPassword: typeof data?.senderAppPassword === 'string' ? data.senderAppPassword : '',
    senderName: typeof data?.senderName === 'string' ? data.senderName : '',
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
