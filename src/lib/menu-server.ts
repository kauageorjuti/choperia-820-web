import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
export async function customerSession(create = false) {
  const jar = await cookies();
  const current = jar.get('menu_session')?.value;
  if (current && /^[a-f0-9-]{36}$/.test(current)) return current;
  if (!create) return null;
  const id = randomUUID();
  jar.set('menu_session', id, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return id;
}
export const privateHeaders = { 'Cache-Control': 'no-store' };
