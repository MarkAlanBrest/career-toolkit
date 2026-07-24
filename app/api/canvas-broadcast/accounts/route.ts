import { NextRequest, NextResponse } from 'next/server';
import { broadcastAuthError, getBroadcastSession } from '@/lib/broadcastAuth';
import {
  createBroadcastAccount,
  deleteBroadcastAccount,
  listBroadcastAccounts,
  updateBroadcastAccount,
} from '@/lib/broadcastAccounts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const current = await getBroadcastSession(request);
  if (!current) return NextResponse.json(broadcastAuthError(), { status: 401 });
  return NextResponse.json({ accounts: await listBroadcastAccounts(), currentAccountId: current.id });
}

export async function POST(request: NextRequest) {
  const current = await getBroadcastSession(request);
  if (!current) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const input = await request.json().catch(() => null);
  try {
    return NextResponse.json({ account: await createBroadcastAccount(input || {}) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add administrator.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const current = await getBroadcastSession(request);
  if (!current) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const input = await request.json().catch(() => null);
  try {
    return NextResponse.json({ account: await updateBroadcastAccount(String(input?.id || ''), input || {}) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update administrator.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const current = await getBroadcastSession(request);
  if (!current) return NextResponse.json(broadcastAuthError(), { status: 401 });
  const id = request.nextUrl.searchParams.get('id') || '';
  try {
    await deleteBroadcastAccount(id, current.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete administrator.' }, { status: 400 });
  }
}
