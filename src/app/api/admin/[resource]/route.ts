import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin, productSchema, categorySchema } from '@/lib/admin-rest';
export const runtime = 'nodejs';
type Context = { params:Promise<{resource:string}> };
export async function GET(request: Request, context: Context) {
  if (!await verifyAdmin(request)) return Response.json({error:'Acesso administrativo necessário.'},{status:401});
  const {resource} = await context.params;
  if (!['products','categories','orders'].includes(resource)) return Response.json({error:'Recurso não encontrado.'},{status:404});
  try { const snapshot = await adminDb.collection(resource).get(); return Response.json(snapshot.docs.map(d=>({ ...d.data(), id:d.id })),{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'Serviço indisponível.'},{status:503}); }
}
export async function POST(request: Request, context: Context) {
  if (!await verifyAdmin(request)) return Response.json({error:'Acesso administrativo necessário.'},{status:401});
  const {resource} = await context.params;
  if (!['products','categories'].includes(resource)) return Response.json({error:'Recurso não encontrado.'},{status:404});
  try {
    const parsed = (resource==='products' ? productSchema : categorySchema).safeParse(await request.json());
    if (!parsed.success) return Response.json({error:'Revise os campos obrigatórios e o preço.'},{status:400});
    const ref = await adminDb.collection(resource).add(parsed.data);
    return Response.json({id:ref.id},{status:201});
  } catch { return Response.json({error:'Não foi possível cadastrar.'},{status:503}); }
}
