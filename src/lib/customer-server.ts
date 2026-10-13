import 'server-only';
import { createHash } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const hash = (text:string) => createHash('sha256').update(text).digest('hex');
export function normalizePhone(value:string) {
  let digits=value.replace(/\D/g,'');
  if (digits.startsWith('55') && digits.length>11) digits=digits.slice(2);
  return /^[1-9]{2}[0-9]{8,9}$/.test(digits)?digits:'';
}
export const ownProfileRef = (session:string,phone:string) => adminDb.doc(`web_customer_sessions/${hash(session+':'+phone)}`);
export const customerRef = (phone:string) => adminDb.doc(`web_customers/${hash(phone)}`);
export function sameOrigin(request:Request) { return request.headers.get('origin')===`${new URL(request.url).protocol}//${request.headers.get('host')}`; }
export async function rateLimit(key:string,max=30) {
  const hour=Math.floor(Date.now()/3600000);
  const ref=adminDb.doc(`web_limits/${hash(key+':'+hour)}`);
  return adminDb.runTransaction(async tx=>{
    const doc=await tx.get(ref);const count=Number(doc.data()?.count||0);
    if(count>=max)return false;
    tx.set(ref,{count:count+1,expiresAt:Timestamp.fromMillis(Date.now()+7200000)});
    return true;
  });
}
export async function findCustomer(phone:string) {
  const profile=await customerRef(phone).get();
  if(profile.exists)return {name:String(profile.data()?.name||''),address:String(profile.data()?.address||'')};
  // Compatibilidade com os clientes identificados no aplicativo mobile.
  const values=[phone,'55'+phone,'+55'+phone,phone.length===11?`(${phone.slice(0,2)}) ${phone.slice(2,7)}-${phone.slice(7)}`:`(${phone.slice(0,2)}) ${phone.slice(2,6)}-${phone.slice(6)}`];
  const [users,orders]=await Promise.all([adminDb.collection('users').where('phone','in',values).limit(1).get(),adminDb.collection('orders').where('userPhone','in',values).get()]);
  const latest=orders.docs.sort((a,b)=>(b.data().createdAt?.toMillis?.()||0)-(a.data().createdAt?.toMillis?.()||0));
  const user=users.docs[0]?.data();const order=latest[0]?.data();
  if(!user&&!order)return null;
  return {name:String(user?.name||order?.userName||''),address:String(latest.find(d=>typeof d.data().address==='string'&&d.data().address)?.data().address||user?.address||'')};
}
export const mockWhatsApp = () => process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS==='true' && !!process.env.FIRESTORE_EMULATOR_HOST && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')===true;
