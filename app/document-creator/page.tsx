import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/dcAuth';

export const dynamic = 'force-dynamic';

export default async function DocumentCreatorPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) redirect('/document-creator/login');
  const session = await getSession(token);
  if (!session) redirect('/document-creator/login');
  redirect('/document-creator/app');
}
