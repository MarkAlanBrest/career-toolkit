import type { CareerRecord, ParsedFile } from './types';
import { tableToRecords } from './columnInfer';

export function buildRecordsFromFiles(files: ParsedFile[]): CareerRecord[] {
  const all: CareerRecord[] = [];
  for (const file of files) {
    for (const table of file.tables) {
      all.push(...tableToRecords(table, file.filename));
    }
  }
  return dedupeRecords(all);
}

export function dedupeRecords(records: CareerRecord[]): CareerRecord[] {
  const seen = new Set<string>();
  const out: CareerRecord[] = [];
  for (const r of records) {
    const key = [
      r.studentName.toLowerCase(),
      r.employerName.toLowerCase(),
      r.eventType,
      r.sourceFile,
      r.sourceRow,
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function mergeRecords(existing: CareerRecord[], incoming: CareerRecord[]): CareerRecord[] {
  return dedupeRecords([...existing, ...incoming]);
}

export function listPrograms(records: CareerRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    if (r.program) set.add(r.program);
  }
  return Array.from(set).sort();
}
