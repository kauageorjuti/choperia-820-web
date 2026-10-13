import { adminDb } from '@/lib/firebase-admin';
import { customerSession, privateHeaders } from '@/lib/menu-server';
import { getOrderStatus } from '@/lib/order-utils';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await customerSession();
  const { id } = await context.params;
  if (!session || !/^[a-f0-9]{32}$/.test(id)) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  try {
    const snap = await adminDb.collection('orders').doc(id).get();
    const data = snap.data();
    if (!data || data.webSession !== session) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    return Response.json({ id, number: data.orderNumber, status: getOrderStatus(data), total: data.total, table: data.table, type:data.type,deliveryFee:data.deliveryFee||0, statusHistory: data.statusHistory, createdAt: data.createdAt?.toDate().toISOString() }, { headers: privateHeaders });
  } catch { return Response.json({ error: 'Não foi possível atualizar o pedido.' }, { status: 503 }); }
}

