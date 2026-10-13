import { auth } from '@/lib/firebase';
export async function adminRequest(path: string, method = 'GET', body?: unknown) {
  await auth.authStateReady();
  let token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre novamente no painel.');
  const send = () => fetch(path, {method, headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
  let response = await send();
  if (response.status === 401 && auth.currentUser) { token = await auth.currentUser.getIdToken(true); response = await send(); }
  const result = await response.json().catch(() => ({error:'O servidor está reiniciando. Aguarde alguns segundos e tente novamente.'}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result;
}
