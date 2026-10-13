export type Portion = { label: string; price: number };
export type MenuProduct = { id: string; name: string; description: string; category: string; price: number; image: string; ingredients: string[]; portions: Portion[] };
export type CartItem = { productId: string; quantity: number; portion: string; notes: string };
export function publicProduct(id: string, data: Record<string, unknown>): MenuProduct {
  return { id, name: String(data.name || ''), description: String(data.description || ''), category: String(data.category || 'Outros'), price: Number(data.price), image: String(data.image || ''), ingredients: Array.isArray(data.ingredients) ? data.ingredients.map(String) : [], portions: Array.isArray(data.portions) ? data.portions.map(p => ({ label: String(p.label), price: Number(p.price) })) : [] };
}
export function priceOrder(items: CartItem[], products: Map<string, MenuProduct>) {
  let cents = 0;
  const lines = items.map(item => {
    const product = products.get(item.productId);
    if (!product) throw new Error('Um produto ficou indisponível. Atualize o cardápio.');
    const portion = item.portion ? product.portions.find(p => p.label === item.portion) : undefined;
    if (product.portions.length && !portion) throw new Error('Escolha uma porção válida.');
    if (item.portion && !portion) throw new Error('Porção indisponível.');
    const price = portion?.price ?? product.price;
    if (!Number.isFinite(price) || price <= 0) throw new Error('Produto sem preço válido.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error('Quantidade inválida.');
    cents += Math.round(price * 100) * item.quantity;
    return { product: { ...product, name: product.name + (portion ? ` — ${portion.label}` : ''), price }, quantity: item.quantity, portion: item.portion, notes: item.notes };
  });
  return { items: lines, total: cents / 100 };
}
export function productImage(image: string) {
  if (image.startsWith('https://firebasestorage.googleapis.com/')) return image;
  const file = image.split('/').pop();
  return file && /^[\w.-]+\.(png|jpg|jpeg|webp)$/i.test(file) ? `/assets/images/produtos/${file}` : '/assets/images/produtos/placeholder.jpg';
}
export const statusLabels: Record<string, string> = { created: 'Recebido', recebido: 'Recebido', accepted: 'Recebido', preparing: 'Em preparo', readyForPickup: 'Pronto', pronto: 'Pronto', onTheWay: 'Saiu para entrega', delivered: 'Entregue', cancelled: 'Cancelado' };
