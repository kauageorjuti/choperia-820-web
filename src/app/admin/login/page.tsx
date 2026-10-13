'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function EmailLogin() {
  const router = useRouter();
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  async function login(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const credential = await signInWithEmailAndPassword(auth,String(form.get('email')),String(form.get('password')));
      const token = await credential.user.getIdTokenResult(true);
      if (token.claims.admin !== true) { await signOut(auth); throw new Error('Este usuário não tem acesso administrativo.'); }
      localStorage.setItem('admin_session',JSON.stringify({id:credential.user.uid,name:credential.user.displayName || credential.user.email,role:'admin'}));
      router.push('/admin/dashboard');
    } catch(e) { setError(e instanceof Error && e.message.startsWith('Este usuário') ? e.message : 'Não foi possível entrar. Confira e-mail e senha.'); }
    finally { setLoading(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-[#f7f8f5]"><form onSubmit={login} className="w-full max-w-md rounded-xl bg-white border border-[#dce2d9] p-8 flex flex-col gap-5"><h1 className="text-2xl font-bold text-[#193e32]">Choperia 820 · Administração</h1><p className="text-sm text-gray-600">Entre com sua conta administrativa.</p><label className="text-sm">E-mail<input className="block w-full border rounded p-3 mt-2" name="email" type="email" autoComplete="username" required disabled={loading}/></label><label className="text-sm">Senha<input className="block w-full border rounded p-3 mt-2" name="password" type="password" autoComplete="current-password" required disabled={loading}/></label>{error && <p role="alert" className="text-red-700 text-sm">{error}</p>}<button disabled={loading} className="bg-[#193e32] text-white p-3 rounded font-bold">{loading?'Entrando…':'Entrar'}</button><Link href="/admin" className="text-sm underline">Usar perfil e PIN</Link><Link href="/" className="text-sm underline">Voltar ao cardápio</Link></form></main>;
}
