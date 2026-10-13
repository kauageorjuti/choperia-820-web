'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Bike,ShoppingBag,Loader2,CheckCircle2} from 'lucide-react';
import styles from './Menu.module.css';
export type CheckoutData={name:string;phone:string;address:string;type:'delivery'|'pickup';paymentMethod:string};
type Props={subtotal:number;deliveryFee:number;sending:boolean;disabled:boolean;onSubmit:(data:CheckoutData)=>Promise<void>;onChange:()=>void;onTypeChange:(type:'delivery'|'pickup')=>void};
const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function CustomerCheckout({subtotal,deliveryFee,sending,disabled,onSubmit,onChange,onTypeChange}:Props){
 const [form,setForm]=useState<CheckoutData>({name:'',phone:'',address:'',type:'delivery',paymentMethod:'Pix'});
 const [lookup,setLookup]=useState('');const [requiresVerification,setRequiresVerification]=useState(false);
 const [challenge,setChallenge]=useState('');const [code,setCode]=useState('');const [confirming,setConfirming]=useState(false);const [message,setMessage]=useState('');
 const phone=form.phone.replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
 function change(key:keyof CheckoutData,value:string){setForm(f=>({...f,[key]:value}));onChange();if(key==='type')onTypeChange(value as 'delivery'|'pickup');}
 useEffect(()=>{
  let disposed=false;const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setRequiresVerification(false);setChallenge('');setMessage('');
   if(!/^[1-9]{2}\d{8,9}$/.test(phone)){setLookup('');return;}
   setLookup('Buscando cliente…');
   try{
    const res=await fetch('/api/menu/customer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone}),signal:controller.signal});const body=await res.json();
    if(disposed)return;if(!res.ok)throw new Error(body.error);
    if(body.profile){setForm(f=>({...f,name:body.profile.name||'',address:body.profile.address||''}));setLookup('Cadastro encontrado. Confira seus dados.');}
    else if(body.requiresVerification){setRequiresVerification(true);setLookup('Cadastro encontrado. Confirme seu WhatsApp para recuperar os dados.');}
    else setLookup('Primeiro pedido? Preencha seus dados abaixo.');
   }catch(e){if(!disposed)setLookup(e instanceof Error?e.message:'Preencha seus dados para continuar.');}
  },650);
  return()=>{disposed=true;controller.abort();clearTimeout(timer);};
 },[phone]);
 async function confirm(action:'send'|'verify'){
  setConfirming(true);setMessage('');
  try{
   const res=await fetch('/api/menu/customer/'+(action==='send'?'code':'verify'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='send'?{phone}:{challengeId:challenge,code})});const body=await res.json();
   if(!res.ok)throw new Error(body.error);
   if(action==='send'){setChallenge(body.challengeId);setMessage(body.testMode?'Emulador: use o código fictício 654321. Nenhum WhatsApp enviado.':'Código enviado ao seu WhatsApp. Válido por 10 minutos.');}
   else{setRequiresVerification(false);setChallenge('');setForm(f=>({...f,name:body.profile?.name||f.name,address:body.profile?.address||f.address}));setLookup('WhatsApp confirmado. Confira seu nome e endereço.');onChange();}
  }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível confirmar.');}
  finally{setConfirming(false);}
 }
 const fee=form.type==='delivery'?deliveryFee:0;
 return <form className={styles.checkout} onSubmit={e=>{e.preventDefault();void onSubmit(form);}}>
  <fieldset className={styles.fulfillment}><legend>Como você quer receber?</legend>{(['delivery','pickup'] as const).map(type=><label key={type} className={form.type===type?styles.selectedMethod:''}><input type="radio" name="fulfillment" value={type} checked={form.type===type} disabled={sending} onChange={()=>change('type',type)}/>{type==='delivery'?<Bike size={18}/>:<ShoppingBag size={18}/>}<span>{type==='delivery'?'Entrega':'Retirada'}</span></label>)}</fieldset>
  <label>Telefone / WhatsApp<input type="tel" required autoComplete="tel" maxLength={20} minLength={10} inputMode="tel" placeholder="(16) 99999-9999" value={form.phone} disabled={sending} onChange={e=>{change('phone',e.target.value);setRequiresVerification(false);setChallenge('');}}/></label>
  {lookup&&<p className={styles.lookup} role="status">{lookup==='Buscando cliente…'?<Loader2 size={14} className={styles.spinning}/>:lookup.includes('Confira')?<CheckCircle2 size={14}/>:null}{lookup}</p>}
  {requiresVerification&&<div className={styles.verifyBox}>{challenge?<><label>Código recebido no WhatsApp<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} placeholder="6 dígitos"/></label><button type="button" disabled={confirming||code.length!==6} onClick={()=>void confirm('verify')}>{confirming?'Confirmando…':'Confirmar código'}</button></>:<button type="button" disabled={confirming} onClick={()=>void confirm('send')}>{confirming?'Enviando…':'Receber código no WhatsApp'}</button>}<small>Você também pode preencher seus dados e seguir com o pedido.</small></div>}
  {message&&<p className={styles.lookup} role="status">{message}</p>}
  <label>Seu nome<input required minLength={2} maxLength={80} autoComplete="name" placeholder="Nome completo" value={form.name} disabled={sending} onChange={e=>change('name',e.target.value)}/></label>
  {form.type==='delivery'?<label>Endereço de entrega<textarea required minLength={8} maxLength={500} autoComplete="street-address" placeholder="Rua, número, bairro, cidade e complemento" value={form.address} disabled={sending} onChange={e=>change('address',e.target.value)}/></label>:<div className={styles.pickupNote}>Retire na Choperia 820<br/><strong>Rua Hum, 820 — Centro, Orlândia/SP</strong></div>}
  <label>Forma de pagamento<select value={form.paymentMethod} disabled={sending} onChange={e=>change('paymentMethod',e.target.value)}>{['Pix','Cartão de crédito','Cartão de débito','Dinheiro'].map(p=><option key={p}>{p}</option>)}</select></label>
  <div className={styles.summary}><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>{form.type==='delivery'?'Taxa de entrega':'Retirada no local'}</span><span>{fee?money(fee):'Grátis'}</span></div><div className={styles.checkoutTotal}><strong>Total</strong><strong>{money(subtotal+fee)}</strong></div></div>
  <button className={styles.primary} disabled={sending||disabled||confirming}>{sending?'Enviando…':form.type==='delivery'?'Pedir para entrega':'Pedir para retirada'}<ArrowRight size={17}/></button><small>{form.type==='delivery'?'Pagamento na entrega.':'Pagamento na retirada.'} Nenhum valor é cobrado agora.</small>
 </form>;
}
