import {adminDb} from '@/lib/firebase-admin';
import {customerSession,privateHeaders} from '@/lib/menu-server';
import {hash,findCustomer,ownProfileRef,sameOrigin} from '@/lib/customer-server';
export const runtime='nodejs';
export async function POST(request:Request) {
 if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
 const session=await customerSession();if(!session)return Response.json({error:'Reabra o cardápio.'},{status:401});
 try {
  const body=await request.json();
  if(typeof body.challengeId!=='string'||! /^[a-f0-9-]{36}$/.test(body.challengeId)||!/^\d{6}$/.test(body.code))return Response.json({error:'Informe os seis dígitos.'},{status:400});
  const ref=adminDb.doc('web_verifications/'+body.challengeId);
  const phone=await adminDb.runTransaction(async tx=>{
   const snap=await tx.get(ref);const data=snap.data();
   if(!data||data.session!==session||data.used||data.expiresAt.toMillis()<Date.now()||data.attempts>=5)return null;
   const valid=data.codeHash===hash(body.challengeId+':'+body.code);
   tx.update(ref,{attempts:data.attempts+1,...(valid?{used:true}:{})});
   return valid?String(data.phone):null;
  });
  if(!phone)return Response.json({error:'Código inválido ou expirado. Solicite outro código.'},{status:400});
  const profile=await findCustomer(phone);
  await ownProfileRef(session,phone).set({phone,name:profile?.name||'',address:profile?.address||'',verified:true});
  return Response.json({profile,verified:true},{headers:privateHeaders});
 }catch{return Response.json({error:'Não foi possível confirmar o código.'},{status:503});}
}
