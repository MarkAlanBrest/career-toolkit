import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import type { ParsedFile, ParsedTable } from './types';

const TEXT_PREVIEW_MAX = 12000;

function cellString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${value.getFullYear()}`;
  }
  return String(value).trim();
}

function tableFromAoA(data: unknown[][], sheetName: string): ParsedTable | null {
  if (!data.length) return null;
  const headerRowIndex = data.findIndex(row =>
    Array.isArray(row) && row.filter(c => cellString(c)).length >= 2
  );
  if (headerRowIndex < 0) return null;
  const headers = (data[headerRowIndex] as unknown[]).map(c => cellString(c));
  const rows = data.slice(headerRowIndex + 1)
    .map(row => (row as unknown[]).map(c => cellString(c)))
    .filter(row => row.some(cell => cell));
  if (!rows.length) return null;
  return { sheetName, headers, rows };
}

function parseSpreadsheet(buffer: Buffer, filename: string): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const tables: ParsedTable[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const table = tableFromAoA(aoa, sheetName);
    if (table) tables.push(table);
  }
  const textPreview = tables
    .map(t => `${t.sheetName}\n${t.headers.join(',')}\n${t.rows.slice(0, 5).map(r => r.join(',')).join('\n')}`)
    .join('\n\n')
    .slice(0, TEXT_PREVIEW_MAX);
  return {
    id: randomUUID(),
    filename,
    mimeType: 'spreadsheet',
    kind: 'spreadsheet',
    tables,
    textPreview,
  };
}

function parseCsvText(text: string, filename: string): ParsedFile {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows = lines.map(line => line.split(',').map(c => c.trim()));
  const table = tableFromAoA(rows, 'CSV');
  return {
    id: randomUUID(),
    filename,
    mimeType: 'text/csv',
    kind: 'spreadsheet',
    tables: table ? [table] : [],
    textPreview: text.slice(0, TEXT_PREVIEW_MAX),
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch {
    return '';
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch {
    return '';
  }
}

export async function extractUploadedFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedFile> {
  const fname = filename.toLowerCase();
  const mime = mimeType.toLowerCase();
  const isPdf = mime.includes('pdf') || fname.endsWith('.pdf');
  const isDocx = mime.includes('word') || fname.endsWith('.docx') || fname.endsWith('.doc');
  const isXlsx = mime.includes('spreadsheet') || mime.includes('excel') || fname.endsWith('.xlsx') || fname.endsWith('.xls');
  const isCsv = mime.includes('csv') || fname.endsWith('.csv');

  if (isXlsx) return parseSpreadsheet(buffer, filename);
  if (isCsv) return parseCsvText(buffer.toString('utf-8'), filename);

  let text = '';
  if (isPdf) text = await extractPdfText(buffer);
  else if (isDocx) text = await extractDocxText(buffer);
  else text = buffer.toString('utf-8');

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      id: randomUUID(),
      filename,
      mimeType,
      kind: 'document',
      tables: [],
      textPreview: '',
      parseWarning: 'No text could be extracted from this file.',
    };
  }

  // Try tab-separated or pipe tables in plain text
  const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
  const delimiter = lines[0]?.includes('\t') ? '\t' : lines[0]?.includes('|') ? '|' : null;
  if (delimiter && lines.length > 2) {
    const aoa = lines.map(line => line.split(delimiter).map(c => c.trim()));
    const table = tableFromAoA(aoa, 'Extracted');
    if (table && table.rows.length) {
      return {
        id: randomUUID(),
        filename,
        mimeType,
        kind: 'spreadsheet',
        tables: [table],
        textPreview: trimmed.slice(0, TEXT_PREVIEW_MAX),
      };
    }
  }

  return {
    id: randomUUID(),
    filename,
    mimeType,
    kind: 'document',
    tables: [],
    textPreview: trimmed.slice(0, TEXT_PREVIEW_MAX),
  };
}
