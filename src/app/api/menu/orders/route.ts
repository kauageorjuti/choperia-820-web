import { adminDb } from '@/lib/firebase-admin';
import { publicProduct, priceOrder } from '@/lib/menu-domain';
import { customerSession, privateHeaders } from '@/lib/menu-server';
import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
export const runtime = 'nodejs';
const schema = z.object({ requestId: z.uuid(), name: z.string().trim().min(2).max(80), table: z.string().trim().regex(/^[0-9]{1,3}$/), items: z.array(z.object({ productId: z.string().min(1).max(150).regex(/^[^/]+$/), quantity: z.number().int().min(1).max(20), portion: z.string().max(100), notes: z.string().trim().max(300) })).min(1).max(40) });
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get('host')}`;
  if (origin !== expectedOrigin) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const session = await customerSession();
  if (!session) return Response.json({ error: 'Reabra o cardápio para iniciar uma sessão.' }, { status: 401 });
  let body;
  try { body = schema.safeParse(await request.json()); } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }); }
  if (!body.success) return Response.json({ error: 'Revise nome, mesa e itens do pedido.' }, { status: 400 });
  const { requestId, name, table, items } = body.data;
  const id = createHash('sha256').update(`${session}:${requestId}`).digest('hex').slice(0,32);
  const ref = adminDb.collection('orders').doc(id);
  try {
    const result = await adminDb.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (existing.exists) return { id, number: existing.data()?.orderNumber };
      const settings = await tx.get(adminDb.doc('store_settings/main'));
      if (settings.data()?.isOpen !== true) throw new Error('A loja está fechada para pedidos.');
      const docs = await tx.getAll(...[...new Set(items.map(i => i.productId))].map(id => adminDb.collection('products').doc(id)));
      const products = new Map(docs.filter(d => d.exists && d.data()?.isActive !== false).map(d => [d.id, publicProduct(d.id, d.data()!)]));
      const priced = priceOrder(items, products);
      const number = id.slice(0,8).toUpperCase();
      const now = Timestamp.now();
      tx.create(ref, { ...priced, userId: `web:${session}`, webSession: session, userName: name, userPhone: '', table, observation: ['Mesa ' + table, ...priced.items.filter(i => i.notes).map(i => i.product.name + ': ' + i.notes)].join(' | '), type: 'pickup', address: null, source: 'web-table', paymentMethod: 'Pagar no estabelecimento', isPaid: false, deliveryFee: 0, status: 'created', statusHistory: ['created'], statusAudit: [{ status: 'created', at: now, by: 'customer' }], createdAt: now, orderNumber: number });
      return { id, number };
    });
    return Response.json(result, { status: 201, headers: privateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const business = ['A loja', 'Um produto', 'Escolha', 'Porção', 'Produto sem', 'Quantidade'].some(prefix => message.startsWith(prefix));
    return Response.json({ error: business ? message : 'Não foi possível enviar. Tente novamente com o mesmo pedido.' }, { status: business ? 409 : 503 });
  }
}
