import { NextRequest, NextResponse } from 'next/server';
import { getSession, generateId } from '@/lib/dcAuth';
import { redis } from '@/lib/billing';
import { cookies } from 'next/headers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export const dynamic = 'force-dynamic';

const MAX_MATERIALS = 30;

interface TeacherMaterial {
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

async function getMaterials(email: string): Promise<TeacherMaterial[]> {
  const raw = await redis.get<string>(`dc:teacher:${email}:materials`);
  if (!raw) return [];
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as TeacherMaterial[]);
}

async function saveMaterials(email: string, materials: TeacherMaterial[]): Promise<void> {
  await redis.set(`dc:teacher:${email}:materials`, JSON.stringify(materials));
}

// GET — list the signed-in teacher's own saved materials
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const materials = await getMaterials(session.email.toLowerCase());
  return NextResponse.json({ materials }, { headers: CORS });
}

// POST — save a new material (pasted text, or text already extracted client-side via /api/parse-file)
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const filename = String(body?.filename || '').trim();
  const text = String(body?.text || '');

  if (!name || !text.trim()) {
    return NextResponse.json({ error: 'Name and text are required.' }, { status: 400, headers: CORS });
  }

  const email = session.email.toLowerCase();
  const materials = await getMaterials(email);
  if (materials.length >= MAX_MATERIALS) {
    return NextResponse.json({ error: `You've reached the ${MAX_MATERIALS}-material limit. Delete an existing material to add a new one.` }, { status: 400, headers: CORS });
  }

  const material: TeacherMaterial = {
    id: generateId(),
    name,
    filename,
    text,
    chars: text.length,
    uploadedAt: new Date().toISOString(),
  };
  materials.push(material);
  await saveMaterials(email, materials);

  return NextResponse.json({ ok: true, material }, { headers: CORS });
}

// DELETE — remove a material
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401, headers: CORS });

  const body = await req.json().catch(() => null);
  const id = String(body?.id || '');
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400, headers: CORS });

  const email = session.email.toLowerCase();
  const materials = await getMaterials(email);
  await saveMaterials(email, materials.filter(m => m.id !== id));

  return NextResponse.json({ ok: true }, { headers: CORS });
}
