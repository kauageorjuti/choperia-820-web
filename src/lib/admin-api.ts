import { auth } from '@/lib/firebase';
export async function adminRequest(path: string, method = 'GET', body?: unknown) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre novamente no painel.');
  const response = await fetch(path, {method, headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result;
}
