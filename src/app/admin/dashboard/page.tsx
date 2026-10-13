"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, Activity } from "lucide-react";
import { isCancelledOrder, toOrderDate } from "@/lib/order-utils";

interface Order {
  id: string;
  total: number;
  statusHistory?: string[];
  createdAt: any;
  items: any[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Busca últimos 500 pedidos para não pesar muito, focado em estatísticas recentes
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500));
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Order[];
      setOrders(data);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // -- Cálculos do Dia --
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = useMemo(() => {
    return orders.filter(o => {
      const date = toOrderDate(o.createdAt);
      return date !== null && date >= todayStart && !isCancelledOrder(o);
    });
  }, [orders]);

  const todayRevenue = todayOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const todayCount = todayOrders.length;
  const ticketMedio = todayCount > 0 ? todayRevenue / todayCount : 0;

  // -- Gráfico de Faturamento dos últimos 7 dias --
  const last7DaysData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayOrders = orders.filter(o => {
        const date = toOrderDate(o.createdAt);
        return date !== null && !isCancelledOrder(o) && date >= d && date < nextDay;
      });

      const total = dayOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
      data.push({
        name: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        total: total,
        pedidos: dayOrders.length
      });
    }
    return data;
  }, [orders]);

  // -- Top Produtos Vendidos (Baseado nos 500 pedidos) --
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string, qty: number }> = {};
    orders.forEach(o => {
      if (isCancelledOrder(o)) return;
      o.items?.forEach(item => {
        const id = item.product?.id || "unknown";
        const name = item.product?.name || "Desconhecido";
        if (!counts[id]) counts[id] = { name, qty: 0 };
        counts[id].qty += item.quantity || 1;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#d48806] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full pb-8 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Visão Geral</h1>
          <p className="text-[#524435] mt-1">
            Acompanhe o desempenho da Choperia 820 em tempo real.
          </p>
        </div>
      </div>

      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#166534] shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">
              Faturamento Hoje
            </h3>
            <p className="text-2xl font-black text-[#1f1f1f]">
              R$ {todayRevenue.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fef08a] flex items-center justify-center text-[#854d0e] shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">
              Pedidos Hoje
            </h3>
            <p className="text-2xl font-black text-[#1f1f1f]">
              {todayCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#e0e7ff] flex items-center justify-center text-[#3730a3] shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">
              Ticket Médio
            </h3>
            <p className="text-2xl font-black text-[#1f1f1f]">
              R$ {ticketMedio.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#ffebee] flex items-center justify-center text-[#c62828] shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">
              Projeção Mensal
            </h3>
            <p className="text-2xl font-black text-[#1f1f1f]">
              R$ {(todayRevenue * 30).toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1f1f1f] mb-6">Faturamento — Últimos 7 Dias</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 12 }} tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip 
                  cursor={{ fill: '#f9f9f9' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e2e2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => {
                    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                    return [`R$ ${numericValue.toFixed(2)}`, 'Faturamento'];
                  }}
                />
                <Bar dataKey="total" fill="#d48806" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Produtos */}
        <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-[#1f1f1f] mb-4">Top 5 Produtos</h3>
          <p className="text-xs text-[#a0a0a0] mb-4">Baseado no histórico recente</p>
          
          <div className="flex-1 flex flex-col gap-4">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? "bg-[#fef08a] text-[#854d0e]" : 
                  i === 1 ? "bg-[#e2e8f0] text-[#475569]" :
                  i === 2 ? "bg-[#fed7aa] text-[#c2410c]" :
                  "bg-[#f0f0f0] text-[#a0a0a0]"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1f1f1f] text-sm truncate">{p.name}</p>
                </div>
                <div className="text-sm font-black text-[#524435] shrink-0">
                  {p.qty}x
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-[#a0a0a0] text-sm">
                Nenhum dado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
