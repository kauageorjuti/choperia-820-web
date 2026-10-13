import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin, productSchema, categorySchema } from '@/lib/admin-rest';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
export const runtime = 'nodejs';
type Context = { params:Promise<{resource:string;id:string}> };
export async function PATCH(request: Request, context:Context) {
  const user = await verifyAdmin(request);
  if (!user) return Response.json({error:'Acesso administrativo necessário.'},{status:401});
  const {resource,id} = await context.params;
  if (!['products','categories','orders'].includes(resource) || !id || id.includes('/')) return Response.json({error:'Recurso não encontrado.'},{status:404});
  try {
    const body = await request.json();
    const ref = adminDb.collection(resource).doc(id);
    if (resource==='orders') {
      const input = z.object({status:z.enum(['preparing','readyForPickup','onTheWay','delivered','cancelled']),cancelReason:z.string().trim().max(300).optional()}).safeParse(body);
      if (!input.success) return Response.json({error:'Status inválido.'},{status:400});
      await adminDb.runTransaction(async tx => {
        const order = await tx.get(ref);
        if (!order.exists) throw new Error('not-found');
        const data = order.data()!;
        const next:Record<string,string[]> = {created:['preparing','cancelled'],recebido:['preparing','cancelled'],accepted:['preparing','cancelled'],preparing:[data.type==='delivery'?'onTheWay':'readyForPickup','cancelled'],readyForPickup:['delivered','cancelled'],onTheWay:['delivered','cancelled']};
        if (!next[data.status || 'created']?.includes(input.data.status)) throw new Error('invalid-transition');
        tx.update(ref,{status:input.data.status,statusHistory:FieldValue.arrayUnion(input.data.status),statusAudit:FieldValue.arrayUnion({status:input.data.status,at:Timestamp.now(),by:user.uid}),...(input.data.cancelReason?{cancelReason:input.data.cancelReason}:{})});
      });
    } else {
      const parsed = (resource==='products'?productSchema.partial():categorySchema.partial()).safeParse(body);
      if (!parsed.success || !Object.keys(parsed.data).length) return Response.json({error:'Dados inválidos.'},{status:400});
      if (!(await ref.get()).exists) return Response.json({error:'Recurso não encontrado.'},{status:404});
      await ref.update(parsed.data);
    }
    return Response.json({success:true});
  } catch(e) {
    const message = e instanceof Error ? e.message : '';
    return Response.json({error:message==='invalid-transition'?'O status mudou. Atualize o painel.':message==='not-found'?'Pedido não encontrado.':'Não foi possível atualizar.'},{status:message==='invalid-transition'?409:message==='not-found'?404:503});
  }
}
export async function DELETE(request: Request, context:Context) {
  if (!await verifyAdmin(request)) return Response.json({error:'Acesso administrativo necessário.'},{status:401});
  const {resource,id} = await context.params;
  if (!['products','categories'].includes(resource) || !id || id.includes('/')) return Response.json({error:'Recurso não encontrado.'},{status:404});
  try { await adminDb.collection(resource).doc(id).delete(); return Response.json({success:true}); }
  catch { return Response.json({error:'Não foi possível excluir.'},{status:503}); }
}
