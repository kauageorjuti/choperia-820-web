'use client';
import {useEffect,useState} from 'react';
import {collection,onSnapshot} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {statusLabels} from '@/lib/menu-domain';
import {getOrderStatus,toOrderDate} from '@/lib/order-utils';
import Link from 'next/link';
type Order = {id:string;orderNumber?:string;userName?:string;table?:string;total?:number;createdAt?:unknown;status?:string;statusAudit?:{status:string;by:string;at:unknown}[];items?:{quantity:number;product?:{name:string}}[]};
export default function History() {
 const [orders,setOrders]=useState<Order[]>([]);const [status,setStatus]=useState('all');const [error,setError]=useState('');
 useEffect(()=>onSnapshot(collection(db,'orders'),s=>setOrders(s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(toOrderDate((b as Order).createdAt)?.getTime()||0)-(toOrderDate((a as Order).createdAt)?.getTime()||0))),()=>setError('Não foi possível carregar os pedidos.')),[]);
 const shown=orders.filter(o=>status==='all'||getOrderStatus(o)===status);
 return <div className="space-y-5"><h1 className="text-2xl font-bold">Todos os pedidos</h1><p className="text-sm text-gray-600">Pedidos ativos, concluídos e cancelados, atualizados em tempo real.</p><label className="text-sm">Filtrar por status <select className="border p-2 rounded ml-2 bg-white" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos</option>{Object.entries(statusLabels).filter(([s])=>!['accepted','recebido','pronto'].includes(s)).map(([s,label])=><option key={s} value={s}>{label}</option>)}</select></label>{error&&<p role="alert">{error}</p>}<div className="space-y-4">{shown.map(o=><article key={o.id} className="bg-white border rounded-xl p-5 space-y-3"><div className="flex flex-wrap justify-between gap-3"><Link className="font-bold underline" href={`/admin/dashboard/pedidos/${o.id}`}>#{o.orderNumber||o.id.slice(-4).toUpperCase()} · {o.userName||'Cliente'} {o.table&&`· Mesa ${o.table}`}</Link><span className="text-sm">{statusLabels[getOrderStatus(o)]||getOrderStatus(o)}</span></div><p className="text-sm">{o.items?.map(i=>`${i.quantity}x ${i.product?.name}`).join(', ')}</p><p className="text-sm text-gray-600">{toOrderDate(o.createdAt)?.toLocaleString('pt-BR')} · {(o.total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>{o.statusAudit?.length&&<details className="text-xs"><summary className="cursor-pointer">Histórico de alterações</summary><ol className="mt-2 space-y-2">{o.statusAudit.map((entry,i)=><li key={i}>{statusLabels[entry.status]||entry.status} · {toOrderDate(entry.at)?.toLocaleString('pt-BR')} · {entry.by}</li>)}</ol></details>}</article>)}{!shown.length&&!error&&<p>Nenhum pedido neste status.</p>}</div></div>;
}
