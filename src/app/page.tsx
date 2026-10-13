import type { Metadata } from 'next';
import Menu from '@/components/Menu';
export const metadata: Metadata = { title: 'Choperia 820 | Cardápio', description: 'Explore o cardápio da Choperia 820 e faça seu pedido na mesa.' };
export default function Page() { return <Menu />; }
