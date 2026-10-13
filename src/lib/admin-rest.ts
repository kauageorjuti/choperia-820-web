import 'server-only';
import { adminAuth } from '@/lib/firebase-admin';
import { z } from 'zod';
export async function verifyAdmin(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  try { const user = await adminAuth.verifyIdToken(token, true); return user.admin === true ? user : null; } catch { return null; }
}
export const productSchema = z.object({name:z.string().trim().min(2).max(150),description:z.string().trim().min(1).max(2000),price:z.number().finite().positive().max(10000),category:z.string().trim().min(1).max(100),image:z.string().max(2000),ingredients:z.array(z.string().trim().min(1).max(100)).max(50),portions:z.array(z.object({label:z.string().trim().min(1).max(100),price:z.number().finite().positive().max(10000)})).max(10).optional(),isActive:z.boolean()});
export const categorySchema = z.object({name:z.string().trim().min(2).max(100),order:z.number().int().min(0).max(10000),isActive:z.boolean()});
