import {randomInt,randomUUID} from 'node:crypto';
import {Timestamp} from 'firebase-admin/firestore';
import {adminDb} from '@/lib/firebase-admin';
import {customerSession,privateHeaders} from '@/lib/menu-server';
import {hash,normalizePhone,rateLimit,sameOrigin,mockWhatsApp} from '@/lib/customer-server';
export const runtime='nodejs';
export async function POST(request:Request) {
 if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
 const session=await customerSession();if(!session)return Response.json({error:'Reabra o cardápio.'},{status:401});
 try {
  const body=await request.json();const phone=typeof body.phone==='string'?normalizePhone(body.phone):'';
  if(!phone)return Response.json({error:'Informe o telefone com DDD.'},{status:400});
  const mock=mockWhatsApp();
  const {WHATSAPP_ACCESS_TOKEN:token,WHATSAPP_PHONE_NUMBER_ID:numberId,WHATSAPP_AUTH_TEMPLATE:template,WHATSAPP_GRAPH_VERSION:version}=process.env;
  if(!mock&&(!token||!numberId||!template||!version))return Response.json({error:'A confirmação pelo WhatsApp ainda não está disponível. Preencha nome e endereço para continuar.'},{status:503});
  if(!await rateLimit('code-session:'+session,10)||!await rateLimit('code-phone:'+phone,3))return Response.json({error:'Limite de códigos atingido. Tente novamente em uma hora.'},{status:429});
  const id=randomUUID();const code=mock?'654321':String(randomInt(100000,1000000));
  const ref=adminDb.doc('web_verifications/'+id);
  await ref.set({phone,session,codeHash:hash(id+':'+code),attempts:0,expiresAt:Timestamp.fromMillis(Date.now()+600000),used:false});
  if(!mock){
   const res=await fetch(`https://graph.facebook.com/${version}/${numberId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({messaging_product:'whatsapp',to:'55'+phone,type:'template',template:{name:template,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'pt_BR'},components:[{type:'body',parameters:[{type:'text',text:code}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:code}]}]}})}).catch(()=>null);
   if(!res?.ok){await ref.delete();return Response.json({error:'Não foi possível enviar pelo WhatsApp. Tente novamente ou preencha seus dados.'},{status:502});}
  }
  return Response.json({challengeId:id,expiresIn:600,...(mock?{testMode:true}:{})},{headers:privateHeaders});
 }catch{return Response.json({error:'Não foi possível enviar o código.'},{status:503});}
}
