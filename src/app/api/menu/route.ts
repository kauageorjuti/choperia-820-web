import { adminDb } from '@/lib/firebase-admin';
import { publicProduct } from '@/lib/menu-domain';
import { customerSession, privateHeaders } from '@/lib/menu-server';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await customerSession(true);
    const [products, categories, settings] = await Promise.all([adminDb.collection('products').get(), adminDb.collection('categories').get(), adminDb.doc('store_settings/main').get()]);
    return Response.json({ products: products.docs.filter(d => d.data().isActive !== false).map(d => publicProduct(d.id, d.data())), categories: categories.docs.map(d => ({ name: String(d.data().name || ''), order: Number(d.data().order || 0) })).sort((a,b) => a.order - b.order), isOpen: settings.data()?.isOpen ?? false }, { headers: privateHeaders });
  } catch {
    return Response.json({ error: 'Não foi possível carregar o cardápio. Tente novamente.' }, { status: 503, headers: privateHeaders });
  }
}
