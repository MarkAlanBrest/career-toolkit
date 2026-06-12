import type { ConferenceRecord, EarlyAlertRule, InstructorNote } from '../types/notes';

type StoreShape = {
  notes: InstructorNote[];
  conferences: ConferenceRecord[];
  rules: EarlyAlertRule[];
};

const STORE_KEY = 'crp_notes_v1';

type ChromeLike = {
  storage?: {
    local?: {
      get(key: string): Promise<Record<string, string | undefined>>;
      set(values: Record<string, string>): Promise<void>;
    };
  };
};

export class NotesStore {
  async all(): Promise<StoreShape> {
    const raw = await readStore();
    if (!raw) return { notes: [], conferences: [], rules: [] };
    try {
      return { notes: [], conferences: [], rules: [], ...JSON.parse(raw) };
    } catch {
      return { notes: [], conferences: [], rules: [] };
    }
  }

  async notesForStudent(courseId: string, studentId: string): Promise<InstructorNote[]> {
    const store = await this.all();
    return store.notes
      .filter(note => note.courseId === courseId && note.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveNote(note: Omit<InstructorNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstructorNote> {
    const store = await this.all();
    const now = new Date().toISOString();
    const saved: InstructorNote = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    store.notes.unshift(saved);
    await writeStore(JSON.stringify(store));
    return saved;
  }
}

async function readStore(): Promise<string | null> {
  const chromeApi = (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
  if (chromeApi?.storage?.local) {
    const result = await chromeApi.storage.local.get(STORE_KEY);
    return result[STORE_KEY] || null;
  }
  return localStorage.getItem(STORE_KEY);
}

async function writeStore(value: string): Promise<void> {
  const chromeApi = (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
  if (chromeApi?.storage?.local) {
    await chromeApi.storage.local.set({ [STORE_KEY]: value });
    return;
  }
  localStorage.setItem(STORE_KEY, value);
}
