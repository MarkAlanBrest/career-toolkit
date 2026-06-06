import { NextResponse } from 'next/server';
import COMPONENTS from '@/lib/components';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=3600',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  return NextResponse.json(COMPONENTS, { headers: CORS });
}
