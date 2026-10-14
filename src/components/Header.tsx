"use client";

import { useEffect, useState, useRef } from "react";
import { User, Clock, Bell, Printer, X, ChevronRight, RotateCcw } from "lucide-react";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getOrderStatus, toOrderDate } from "@/lib/order-utils";
import { usePathname } from "next/navigation";
import PrintReceipt from "@/components/PrintReceipt";

interface AdminSession {
  id: string;
  name: string;
  role: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  created:        { label: "Recebido",   color: "bg-[#fef08a] text-[#854d0e]" },
  recebido:       { label: "Recebido",   color: "bg-[#fef08a] text-[#854d0e]" },
  accepted:       { label: "Aceito",     color: "bg-[#fef08a] text-[#854d0e]" },
  preparing:      { label: "Preparo",    color: "bg-[#fed7aa] text-[#c2410c]" },
  preparando:     { label: "Preparo",    color: "bg-[#fed7aa] text-[#c2410c]" },
  readyForPickup: { label: "Pronto",     color: "bg-[#dcfce7] text-[#166534]" },
  onTheWay:       { label: "A Caminho",  color: "bg-[#dcfce7] text-[#166534]" },
  pronto:         { label: "Pronto",     color: "bg-[#dcfce7] text-[#166534]" },
  delivered:      { label: "Entregue",   color: "bg-[#e2e2e2] text-[#524435]" },
  cancelled:      { label: "Cancelado",  color: "bg-[#ffebee] text-[#c62828]" },
};

export function Header() {
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [time, setTime] = useState(new Date());
  const [storeOpen, setStoreOpen] = useState<boolean | null>(null);

  // Painéis
  const [notifOpen, setNotifOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Dados
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenRef = useRef<string | null>(null);

  // Impressão via histórico
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"todos" | "entregue" | "cancelado">("todos");

  useEffect(() => {
    const stored = localStorage.getItem("admin_session");
    if (stored) setSession(JSON.parse(stored));

    const lastSeen = localStorage.getItem("notif_last_seen");
    lastSeenRef.current = lastSeen;

    const timer = setInterval(() => setTime(current => {
      const next = new Date();
      return current.getMinutes() === next.getMinutes() && current.getHours() === next.getHours() ? current : next;
    }), 1000);

    // Store status
    const unsubStore = onSnapshot(doc(db, "store_settings", "main"), (snap) => {
      setStoreOpen(snap.exists() ? (snap.data().isOpen ?? true) : true);
    });

    // Últimos 30 pedidos para notificações (novos)
    const qRecent = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(30));
    const unsubRecent = onSnapshot(qRecent, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const newOnes = orders.filter((o: any) => {
        if (!o.createdAt) return false;
        const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : new Date(o.createdAt).getTime();
        return !lastSeenRef.current || ts > parseInt(lastSeenRef.current);
      });
      setUnreadCount(newOnes.length);
      setRecentOrders(orders);
    });

    return () => {
      clearInterval(timer);
      unsubStore();
      unsubRecent();
    };
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100)), snap => {
      setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [historyOpen]);

  const handleOpenNotif = () => {
    setNotifOpen((v) => !v);
    setHistoryOpen(false);
    // Marca como lido
    const now = Date.now().toString();
    localStorage.setItem("notif_last_seen", now);
    lastSeenRef.current = now;
    setUnreadCount(0);
  };

  const handleOpenHistory = () => {
    setHistoryOpen((v) => !v);
    setNotifOpen(false);
  };

  const handlePrint = (order: any) => {
    setPrintingOrder(order);
    setTimeout(() => window.print(), 150);
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return "";
    const date = toOrderDate(createdAt);
    if (!date) return "";
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const isOpen = storeOpen !== false;

  const filteredHistory = allOrders.filter((o) => {
    const status = getOrderStatus(o);
    if (historyFilter === "entregue") return status === "delivered" || status === "entregue";
    if (historyFilter === "cancelado") return status === "cancelled" || status === "cancelado";
    return true;
  });

  const pageTitle = {
    "/admin/dashboard": "Visão Geral",
    "/admin/dashboard/pedidos": "Painel de Pedidos",
"/admin/dashboard/historico": "Histórico de Pedidos",
    "/admin/dashboard/cardapio": "Cardápio",
    "/admin/dashboard/clientes": "Clientes",
    "/admin/dashboard/funcionarios": "Equipe",
    "/admin/dashboard/financeiro": "Financeiro e Caixa",
    "/admin/dashboard/entregadores": "Entregadores",
    "/admin/dashboard/configuracoes": "Configurações",
  }[pathname] ?? (pathname.startsWith("/admin/dashboard/pedidos/") ? "Detalhes do pedido" : "Painel de Controle");

  return (
    <>
      {/* Print receipt hidden */}
      {printingOrder && <PrintReceipt order={printingOrder} />}

      {/* Overlay to close panels */}
      {(notifOpen || historyOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setNotifOpen(false); setHistoryOpen(false); }} />
      )}

      <header className="h-16 sm:h-20 bg-white border-b border-[#e2e2e2] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 shadow-sm z-50 print:hidden relative">

        {/* Left */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <h1 className="truncate text-lg font-bold text-[#855300] sm:text-2xl">{pageTitle}</h1>
          {storeOpen !== null && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              isOpen ? "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]" : "bg-[#ffebee] text-[#c62828] border-[#ffcdd2]"
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOpen ? "bg-[#16a34a]" : "bg-[#e53935]"}`} />
              {isOpen ? "Loja Aberta" : "Loja Fechada"}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-5 text-[#524435]">
          <div className="hidden md:flex items-center gap-2 font-medium">
            <Clock size={18} />
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>

          {/* Bell: histórico de notificações */}
          <div className="relative">
            <button onClick={handleOpenNotif} className={`relative hover:text-[#d48806] transition-colors ${notifOpen ? "text-[#d48806]" : ""}`}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e53935] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] z-50 overflow-hidden">
                <div className="p-4 border-b border-[#f0f0f0] flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-[#1f1f1f]">Novos Pedidos</h3>
                    <p className="text-xs text-[#a0a0a0]">Últimos 30 pedidos recebidos</p>
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="text-[#a0a0a0] hover:text-[#1f1f1f]"><X size={16} /></button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {recentOrders.slice(0, 20).map((order) => {
                    const status = getOrderStatus(order);
                    const st = STATUS_MAP[status] || { label: status, color: "bg-[#e2e2e2] text-[#524435]" };
                    return (
                      <div key={order.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f9f9f9] hover:bg-[#f9f9f9] transition-colors">
                        <div className="w-9 h-9 rounded-full bg-[#f0f0f0] flex items-center justify-center text-xs font-black text-[#1f1f1f] shrink-0">
                          #{order.id?.slice(-3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#1f1f1f] truncate">{order.userName || "Cliente"}</p>
                          <p className="text-xs text-[#a0a0a0] truncate">{order.items?.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ")}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          <span className="text-[10px] text-[#a0a0a0]">{formatTime(order.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {recentOrders.length === 0 && (
                    <p className="text-center text-[#a0a0a0] p-8 text-sm">Nenhum pedido ainda</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Printer: histórico completo */}
          <div className="relative hidden sm:block">
            <button onClick={handleOpenHistory} className={`hover:text-[#d48806] transition-colors ${historyOpen ? "text-[#d48806]" : ""}`}>
              <Printer size={20} />
            </button>

            {historyOpen && (
              <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] z-50 overflow-hidden">
                <div className="p-4 border-b border-[#f0f0f0]">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-bold text-[#1f1f1f]">Histórico de Pedidos</h3>
                      <p className="text-xs text-[#a0a0a0]">Clique na impressora para reimprimir</p>
                    </div>
                    <button onClick={() => setHistoryOpen(false)} className="text-[#a0a0a0] hover:text-[#1f1f1f]"><X size={16} /></button>
                  </div>
                  {/* Filter tabs */}
                  <div className="flex gap-1 bg-[#f0f0f0] p-1 rounded-lg">
                    {(["todos", "entregue", "cancelado"] as const).map((f) => (
                      <button key={f} onClick={() => setHistoryFilter(f)}
                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-colors capitalize ${historyFilter === f ? "bg-white text-[#1f1f1f] shadow-sm" : "text-[#a0a0a0] hover:text-[#1f1f1f]"}`}>
                        {f === "todos" ? "Todos" : f === "entregue" ? "✅ Entregues" : "❌ Cancelados"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto">
                  {filteredHistory.map((order) => {
                    const status = getOrderStatus(order);
                    const st = STATUS_MAP[status] || { label: status, color: "bg-[#e2e2e2] text-[#524435]" };
                    return (
                      <div key={order.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f9f9f9] hover:bg-[#f9f9f9] transition-colors group">
                        <div className="w-9 h-9 rounded-full bg-[#f0f0f0] flex items-center justify-center text-xs font-black text-[#1f1f1f] shrink-0">
                          #{order.id?.slice(-3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-sm text-[#1f1f1f] truncate">{order.userName || "Cliente"}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                          </div>
                          <p className="text-xs text-[#a0a0a0] truncate">{order.items?.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ")}</p>
                          <p className="text-[10px] text-[#a0a0a0] mt-0.5">{formatTime(order.createdAt)} · R$ {Number(order.total || 0).toFixed(2).replace(".", ",")}</p>
                        </div>
                        <button
                          onClick={() => handlePrint(order)}
                          className="p-2 text-[#a0a0a0] hover:text-[#d48806] hover:bg-[#d48806]/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Reimprimir comanda"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {filteredHistory.length === 0 && (
                    <p className="text-center text-[#a0a0a0] p-8 text-sm">Nenhum pedido encontrado</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 sm:pl-5 sm:border-l sm:border-[#e2e2e2]">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-[#1f1f1f] leading-tight">{session?.name || "Usuário"}</p>
              <p className="text-[10px] font-bold text-[#d48806] uppercase tracking-wider">{session?.role || "CARREGANDO"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#e8e8e8] flex items-center justify-center text-[#524435] border border-[#d8c3ae]">
              <User size={20} />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
