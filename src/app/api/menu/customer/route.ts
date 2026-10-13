import {customerSession,privateHeaders} from '@/lib/menu-server';
import {findCustomer,normalizePhone,ownProfileRef,rateLimit,sameOrigin} from '@/lib/customer-server';
export const runtime='nodejs';
export async function POST(request:Request) {
 if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
 const session=await customerSession();if(!session)return Response.json({error:'Reabra o cardápio.'},{status:401});
 try {
  const body=await request.json();const phone=typeof body.phone==='string'?normalizePhone(body.phone):'';
  if(!phone)return Response.json({error:'Informe o telefone com DDD.'},{status:400});
  if(!await rateLimit('lookup:'+session))return Response.json({error:'Aguarde antes de consultar novamente.'},{status:429});
  const own=await ownProfileRef(session,phone).get();
  if(own.exists)return Response.json({found:true,profile:{name:own.data()?.name,address:own.data()?.address}},{headers:privateHeaders});
  const profile=await findCustomer(phone);
  return Response.json({found:!!profile,requiresVerification:!!profile},{headers:privateHeaders});
 } catch {return Response.json({error:'Não foi possível buscar o cadastro. Você pode preencher seus dados.'},{status:503});}
}
