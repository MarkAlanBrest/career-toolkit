import { NextRequest, NextResponse } from 'next/server';
import { getSession, generateId } from '@/lib/dcAuth';
import { redis } from '@/lib/redis';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

interface RefDoc {
  id: string;
  name: string;
  filename: string;
  text: string;
  chars: number;
  uploadedAt: string;
}

async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return null;
  return getSession(token);
}

async function getDocs(schoolId: string): Promise<RefDoc[]> {
  const raw = await redis.get<string>(`dc:school:${schoolId}:documents`);
  if (!raw) return [];
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as RefDoc[]);
}

async function saveDocs(schoolId: string, docs: RefDoc[]): Promise<void> {
  await redis.set(`dc:school:${schoolId}:documents`, JSON.stringify(docs));
}

// GET — list reference documents for the signed-in user's school
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const documents = await getDocs(session.schoolId);
  return NextResponse.json({ documents }, { headers: CORS });
}

// POST — add a reference document (text already extracted client-side via /api/parse-file)
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const filename = String(body?.filename || '').trim();
  const text = String(body?.text || '');

  if (!name || !text.trim()) {
    return NextResponse.json({ error: 'Name and extracted text are required.' }, { status: 400, headers: CORS });
  }

  const docs = await getDocs(session.schoolId);
  const document: RefDoc = {
    id: generateId(),
    name,
    filename,
    text,
    chars: text.length,
    uploadedAt: new Date().toISOString(),
  };
  docs.push(document);
  await saveDocs(session.schoolId, docs);

  return NextResponse.json({ ok: true, document }, { headers: CORS });
}

// DELETE — remove a reference document
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: CORS });

  const body = await req.json().catch(() => null);
  const id = String(body?.id || '');
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400, headers: CORS });

  const docs = await getDocs(session.schoolId);
  await saveDocs(session.schoolId, docs.filter(d => d.id !== id));

  return NextResponse.json({ ok: true }, { headers: CORS });
}
