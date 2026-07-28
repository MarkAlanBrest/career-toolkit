export type ParsedAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.rtf', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index === -1 ? '' : filename.slice(index).toLowerCase();
}

function isAllowedFile(filename: string, contentType: string): boolean {
  const extension = extensionOf(filename);
  if (extension && ALLOWED_EXTENSIONS.has(extension)) return true;
  if (contentType && ALLOWED_MIME_TYPES.has(contentType.split(';')[0].trim().toLowerCase())) return true;
  return false;
}

export function validateAttachmentFiles(files: File[]): string | null {
  if (files.length > MAX_ATTACHMENTS) {
    return `You can attach up to ${MAX_ATTACHMENTS} files.`;
  }

  let totalBytes = 0;
  for (const file of files) {
    if (!file.name.trim()) {
      return 'One of the selected files is missing a name.';
    }
    if (!isAllowedFile(file.name, file.type)) {
      return `"${file.name}" is not an allowed file type. Use PDF, Word, Excel, text, or common image files.`;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return `"${file.name}" is too large. Each file must be 4 MB or smaller.`;
    }
    totalBytes += file.size;
  }

  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return 'Attached files are too large together. Keep the total under 4 MB.';
  }

  return null;
}

export async function parseAttachmentFiles(files: File[]): Promise<ParsedAttachment[]> {
  const error = validateAttachmentFiles(files);
  if (error) throw new Error(error);

  return Promise.all(files.map(async file => ({
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    content: Buffer.from(await file.arrayBuffer()),
  })));
}

export async function parseAttachmentFormData(formData: FormData): Promise<ParsedAttachment[]> {
  const entries = formData.getAll('attachments').filter((entry): entry is File => entry instanceof File && entry.size > 0);
  return parseAttachmentFiles(entries);
}
