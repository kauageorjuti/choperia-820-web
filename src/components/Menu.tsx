'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Plus, Minus, ArrowRight, X, MapPin, Utensils, Check, RefreshCw } from 'lucide-react';
import { CartItem, MenuProduct, productImage, statusLabels } from '@/lib/menu-domain';
import styles from './Menu.module.css';
import CustomerCheckout, {CheckoutData} from './CustomerCheckout';
import StoreInfo from './StoreInfo';
type MenuData = { products: MenuProduct[]; categories: {name: string; order: number}[]; isOpen: boolean;deliveryFee:number };
type Tracking = { id: string; number: string; status: string; total: number; table?: string;type?: 'delivery'|'pickup' };
const money = (value: number) => value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const lineKey = (item: CartItem) => JSON.stringify([item.productId, item.portion, item.notes]);
export default function Menu() {
  const [data, setData] = useState<MenuData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Tudo');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restored, setRestored] = useState(false);
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [portion, setPortion] = useState('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef('');
  async function load(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch('/api/menu', {cache:'no-store'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar o cardápio.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const restore = setTimeout(() => {
    void load();
    try {
      const saved = JSON.parse(localStorage.getItem('820-cart') || '[]');
      if (Array.isArray(saved)) setCart(saved.filter(i => typeof i.productId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20 && typeof i.portion === 'string' && typeof i.notes === 'string'));
      const last = JSON.parse(localStorage.getItem('820-last-order') || 'null');
      if (last && /^[a-f0-9]{32}$/.test(last.id)) setTracking(last);
      requestId.current = localStorage.getItem('820-request') || crypto.randomUUID();
    } catch { requestId.current = crypto.randomUUID(); }
    setRestored(true);
    }, 0);
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 30000);
    return () => { clearTimeout(restore); clearInterval(timer); };
  }, []);
  useEffect(() => { if (restored) { try { localStorage.setItem('820-cart', JSON.stringify(cart)); } catch {} } }, [cart, restored]);
  const trackingId = tracking?.id;
  useEffect(() => {
    if (!trackingId) return;
    let disposed = false;
    async function refresh() {
      try {
        const res = await fetch(`/api/menu/orders/${trackingId}`, {cache:'no-store'});
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (!disposed) { setTracking(body); setTrackingError(''); }
      } catch (e) { if (!disposed) setTrackingError(e instanceof Error ? e.message : 'Falha ao atualizar.'); }
    }
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [trackingId]);
  function changeCart(next: CartItem[]) {
    setCart(next); requestId.current = crypto.randomUUID();
    try { localStorage.removeItem('820-request'); } catch {}
  }
  function openProduct(product: MenuProduct) { setSelected(product); setPortion(product.portions[0]?.label || ''); setNotes(''); setQuantity(1); dialog.current?.showModal(); }
  function addProduct() {
    if (!selected) return;
    const item = { productId: selected.id, portion, notes: notes.trim(), quantity };
    const existing = cart.find(i => lineKey(i) === lineKey(item));
    changeCart(existing ? cart.map(i => lineKey(i) === lineKey(item) ? {...i, quantity: Math.min(20,i.quantity + quantity)} : i) : [...cart, item]);
    setNotice(`${selected.name} adicionado ao pedido.`); dialog.current?.close();
  }
  const lines = cart.map(item => {
    const product = data?.products.find(p => p.id === item.productId);
    const chosen = product?.portions.find(p => p.label === item.portion);
    const valid = !!product && (product.portions.length ? !!chosen : !item.portion);
    return {item, product, valid, price: chosen?.price ?? product?.price ?? 0};
  });
  const total = lines.reduce((sum,l) => sum + Math.round(l.price * 100) * l.item.quantity, 0) / 100;
  const count = cart.reduce((sum,i) => sum + i.quantity,0);
  const categories = ['Tudo', ...new Set([...(data?.categories.map(c => c.name) || []), ...(data?.products.map(p => p.category) || [])].filter(c => c && c !== 'Tudo'))];
  const products = (data?.products || []).filter(p => (category === 'Tudo' || p.category === category) && `${p.name} ${p.description} ${p.category}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const sections = categories.filter(c => c !== 'Tudo' && products.some(p => p.category === c));
  async function submit(customer:CheckoutData) {
    if (sending) return;
    setSending(true); setNotice('');
    try {
      try { localStorage.setItem('820-request', requestId.current); } catch {}
      const res = await fetch('/api/menu/orders', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({requestId:requestId.current, ...customer, items:cart})});
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const order = {...body, status:'created', total:total+(customer.type==='delivery'?(data?.deliveryFee||0):0),type:customer.type};
      setTracking(order); changeCart([]);
      try { localStorage.setItem('820-last-order', JSON.stringify(order)); } catch {}
      setNotice(`Pedido ${body.number} recebido!`);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Falha ao enviar o pedido. Tente novamente.'); }
    finally { setSending(false); }
  }
  return <div className={styles.site}>
    <a className={styles.skip} href="#menu">Ir para o cardápio</a>
    <header className={styles.header}><Link href="/" className={styles.brand}><img src="/assets/images/logo.jpg" alt=""/><span>CHOPERIA <strong>820</strong></span></Link><nav aria-label="Navegação"><a href="#menu">Cardápio</a><a href="#pedido">Meu pedido <span className={styles.count}>{count}</span></a></nav></header>
    <section className={styles.hero}><div><span className={styles.eyebrow}>CHOPERIA 820 · DELIVERY E RETIRADA</span><h1>Seu favorito.<br/>Onde você estiver.</h1><p>Peça em casa ou retire na choperia. A gente prepara para você.</p><a href="#menu" className={styles.heroButton}>Explorar cardápio <ArrowRight size={18}/></a></div><img src="/assets/images/banner_food.jpg" alt="Porções e petiscos da Choperia 820"/></section>
    <div className={styles.storeBar}><span><MapPin size={17}/> Rua Hum, 820</span><span className={data?.isOpen ? styles.open : styles.closed}>{data ? data.isOpen ? '● Aberto para pedidos' : '● Pedidos pausados' : 'Consultando disponibilidade…'}</span><span>Entrega ou retirada · Você escolhe</span></div>
    <main className={styles.main} id="menu"><div className={styles.catalog}>
      <div className={styles.catalogHead}><div><span className={styles.eyebrow}>ESCOLHA, COMBINE, APROVEITE</span><h2>Nosso cardápio</h2></div><button className={styles.refresh} onClick={() => void load(true)} aria-label="Atualizar cardápio"><RefreshCw size={18}/></button></div>
      <label className={styles.search}><Search size={20}/><input aria-label="Buscar no cardápio" placeholder="O que você está com vontade de comer?" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="Limpar busca" onClick={() => setSearch('')}><X size={17}/></button>}</label>
      <nav className={styles.categories} aria-label="Categorias">{categories.map(c => <button key={c} aria-pressed={category===c} className={category===c ? styles.activeCategory : ''} onClick={() => setCategory(c)}>{c}</button>)}</nav>
      {error && <div role="alert" className={styles.message}>{error} <button onClick={() => void load(true)}>Tentar novamente</button></div>}
      {loading && !data && <p className={styles.message}>Preparando o cardápio…</p>}
      {!loading && data && !products.length && <p className={styles.message}>Nenhum produto encontrado. Experimente outra busca ou categoria.</p>}
      {sections.map(section => <section key={section} className={styles.section}><h3>{section}<span>{products.filter(p => p.category===section).length} opções</span></h3><div className={styles.grid}>{products.filter(p => p.category===section).map(p => <article className={styles.product} key={p.id}><button className={styles.productPhoto} onClick={() => openProduct(p)} aria-label={`Ver detalhes de ${p.name}`}><img src={productImage(p.image)} alt={p.name} loading="lazy" onError={e => { e.currentTarget.src='/assets/images/produtos/placeholder.jpg'; }}/></button><div className={styles.productBody}><button className={styles.productTitle} onClick={() => openProduct(p)}>{p.name}</button><p>{p.description || 'Confira os detalhes e personalize seu pedido.'}</p><div className={styles.productBottom}><strong>{p.portions.length ? 'A partir de ' : ''}{money(p.portions.length ? Math.min(...p.portions.map(o => o.price)) : p.price)}</strong><button className={styles.add} onClick={() => openProduct(p)} aria-label={`Adicionar ${p.name}`}><Plus size={19}/></button></div></div></article>)}</div></section>)}
    </div><aside className={styles.order} id="pedido"><div className={styles.orderHead}><ShoppingBag size={22}/><h2>Seu pedido</h2><span className={styles.count}>{count}</span></div>
      {tracking && <div className={styles.tracking}><span><Check size={17}/> Pedido #{tracking.number}</span><strong>{statusLabels[tracking.status] || tracking.status}</strong><small>{tracking.table ? `Mesa ${tracking.table}` : tracking.type==='delivery'?'Entrega em casa':'Retirada na choperia'} · {money(tracking.total)}</small><small>Atualizado automaticamente a cada 5 segundos.</small>{trackingError && <p role="alert">{trackingError}</p>}</div>}
      {!count ? <div className={styles.empty}><Utensils size={32}/><h3>O que vai ser hoje?</h3><p>Adicione seus favoritos.<br/>Seu pedido aparece aqui.</p></div> : <><div className={styles.cartLines}>{lines.map(({item, product, valid, price}, index) => <div key={lineKey(item)} className={styles.cartLine}><div><strong>{product?.name || 'Produto indisponível'}</strong>{item.portion && <small>{item.portion}</small>}{item.notes && <small>{item.notes}</small>}{!valid && <small className={styles.closed}>Remova este item indisponível.</small>}<small>{money(price)} por unidade</small></div><div className={styles.lineActions}><div className={styles.stepper}><button type="button" aria-label={`Diminuir ${product?.name}`} disabled={sending} onClick={() => changeCart(cart.flatMap((i,n) => n === index ? i.quantity > 1 ? [{...i, quantity:i.quantity-1}] : [] : [i]))}><Minus size={13}/></button><span>{item.quantity}</span><button type="button" disabled={sending || item.quantity>=20} aria-label={`Aumentar ${product?.name}`} onClick={() => changeCart(cart.map((i,n) => n===index ? {...i,quantity:i.quantity+1} : i))}><Plus size={13}/></button></div><strong>{money(price*item.quantity)}</strong><button className={styles.remove} disabled={sending} onClick={() => changeCart(cart.filter((_,n) => n!==index))}>Remover</button></div></div>)}</div><CustomerCheckout subtotal={total} deliveryFee={data?.deliveryFee||0} sending={sending} disabled={!data?.isOpen||lines.some(l=>!l.valid)} onSubmit={submit} onChange={()=>{requestId.current=crypto.randomUUID();}} onTypeChange={()=>{}}/></>}
      {notice && <p role="status" className={styles.message}>{notice}</p>}
    </aside></main><StoreInfo isOpen={data?.isOpen}/><footer className={styles.footer}><strong>CHOPERIA 820</strong><span>Bom encontro. Bom apetite.</span></footer>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setSelected(null)}>{selected && <><button className={styles.close} aria-label="Fechar detalhes" onClick={() => dialog.current?.close()}><X size={20}/></button><img className={styles.detailPhoto} src={productImage(selected.image)} alt={selected.name}/><div className={styles.detailBody}><span className={styles.eyebrow}>{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><h3>Ingredientes</h3><p>{selected.ingredients.length ? selected.ingredients.join(' · ') : 'Ingredientes não informados. Consulte a equipe em caso de restrições alimentares.'}</p>{selected.portions.length>0 && <label>Escolha sua porção<select value={portion} onChange={e => setPortion(e.target.value)}>{selected.portions.map(p => <option key={p.label} value={p.label}>{p.label} · {money(p.price)}</option>)}</select></label>}<label>Alguma observação?<textarea maxLength={300} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: sem cebola"/></label><div className={styles.detailActions}><div className={styles.stepper}><button aria-label="Diminuir quantidade" disabled={quantity<=1} onClick={() => setQuantity(q=>q-1)}><Minus size={16}/></button><span>{quantity}</span><button aria-label="Aumentar quantidade" disabled={quantity>=20} onClick={() => setQuantity(q=>q+1)}><Plus size={16}/></button></div><button className={styles.primary} disabled={sending} onClick={addProduct}>Adicionar · {money((selected.portions.find(p=>p.label===portion)?.price ?? selected.price)*quantity)}</button></div></div></>}</dialog>
  </div>;
}
