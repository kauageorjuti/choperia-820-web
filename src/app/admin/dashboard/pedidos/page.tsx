"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  MessageSquare,
  Printer,
  Eye,
  CheckCircle2,
  Plus,
  ChevronDown,
  Clock,
  Bike,
  MoreVertical,
  LayoutGrid,
  List,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  doc,
  addDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2 as CheckCircle2Icon, ChevronDown as ChevronDownIcon, Clock as ClockIcon, Search, ShoppingBag, ShoppingCart as ShoppingCartIcon, User, Plus as PlusIcon, X as XIcon, Filter } from "lucide-react";
import Image from "next/image";
import PrintReceipt from "@/components/PrintReceipt";
import logger from "@/lib/logger";
import { adminRequest } from "@/lib/admin-api";
import {getOrderStatus} from "@/lib/order-utils";

type ViewMode = "colunas" | "lista";
type SectorFilter = "todos" | "delivery" | "balcao";

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const [printAll, setPrintAll] = useState(false);
  const router = useRouter();

  // View controls
  const [viewMode, setViewMode] = useState<ViewMode>("colunas");
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("todos");
  const [sectorMenuOpen, setSectorMenuOpen] = useState(false);

  // Cancel modal
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Novo Pedido (PDV) modal
  const [isPDVOpen, setIsPDVOpen] = useState(false);
  const [pdvType, setPdvType] = useState<"pickup" | "delivery">("pickup");
  const [pdvClientName, setPdvClientName] = useState("");
  const [pdvAddress, setPdvAddress] = useState("");
  const [pdvPayment, setPdvPayment] = useState("Dinheiro");
  const [pdvItems, setPdvItems] = useState<{ product: any; quantity: number }[]>([]);
  const [pdvSearch, setPdvSearch] = useState("");
  const [isSubmittingPDV, setIsSubmittingPDV] = useState(false);

  const [advancing,setAdvancing]=useState<string[]>([]);
  const advancingRef=useRef(new Set<string>());
  const initialLoadDone = useRef(false);
  const allOrdersPrintRef = useRef<any[]>([]);

  const playNotificationSound = () => {
    if (localStorage.getItem("soundEnabled") === "false") return;
    const playSynth = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.6);
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.6);
      } catch (e) {}
    };
    try {
      const audio = new Audio("/som.mp3");
      audio.play().catch(() => playSynth());
    } catch (e) {
      playSynth();
    }
  };

  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsubOrders = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data(),status:getOrderStatus(d.data()) }));
        setOrders(fetched);
        setLoading(false);
        if (initialLoadDone.current) {
          let playSound = false;
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (!data.status || data.status === "created" || data.status === "recebido") {
                playSound = true;
              }
            }
          });
          if (playSound) playNotificationSound();
        } else {
          initialLoadDone.current = true;
        }
      },
      (error) => {
        logger.error("Falha crítica no listener de pedidos", {
          action: "ORDERS_SNAPSHOT",
          component: "PedidosPage",
          ...logger.fromError(error),
        });
        setLoading(false);
      }
    );

    const unsubCouriers = onSnapshot(query(collection(db, "couriers")), (snap) => {
      setCouriers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubProducts = onSnapshot(query(collection(db, "products")), (snap) => {
      setProducts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => (p as Record<string, unknown>).isActive !== false)
      );
    }, (error) => {
      logger.error("Falha no listener de produtos", { action: "PRODUCTS_SNAPSHOT", component: "PedidosPage", ...logger.fromError(error) });
    });

    const handleAfterPrint = () => {
      setPrintingOrder(null);
      setPrintAll(false);
    };
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      unsubOrders();
      unsubCouriers();
      unsubProducts();
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────
  const handleAdvanceStatus = async (orderId: string, currentStatus: string, orderType = "pickup") => {
    if(advancingRef.current.has(orderId)) return;
    advancingRef.current.add(orderId);setAdvancing(ids=>[...ids,orderId]);
    let nextStatus = "created";
    if (!currentStatus || currentStatus === "created" || currentStatus === "recebido") {
      nextStatus = "preparing";
    } else if (currentStatus === "preparing") {
      nextStatus = orderType === "delivery" ? "onTheWay" : "readyForPickup";
    } else if (["onTheWay", "readyForPickup", "pronto"].includes(currentStatus)) {
      nextStatus = "delivered";
    }
    try {
      await adminRequest(`/api/admin/orders/${orderId}`, "PATCH", { status: nextStatus });
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status: nextStatus } : order));
      logger.info("Status do pedido avançado (Kanban)", {
        action: "ADVANCE_ORDER_STATUS",
        component: "PedidosPage",
        resourceId: orderId,
        previousStatus: currentStatus,
        nextStatus,
      });
    } catch (error) {
      logger.error("Falha ao avançar status do pedido", {
        action: "ADVANCE_ORDER_STATUS",
        component: "PedidosPage",
        resourceId: orderId,
        previousStatus: currentStatus,
        nextStatus,
        ...logger.fromError(error),
      });
      alert(error instanceof Error ? error.message : "Erro ao atualizar o pedido. Tente novamente.");
    } finally {
      advancingRef.current.delete(orderId);setAdvancing(ids=>ids.filter(id=>id!==orderId));
    }
  };

  const handlePrint = (order: any) => {
    setPrintAll(false);
    setPrintingOrder(order);
    setTimeout(() => window.print(), 150);
  };

  const handlePrintAll = () => {
    setPrintingOrder(null);
    const active = orders.filter((o) => !["cancelled", "delivered"].includes(o.status));
    allOrdersPrintRef.current = active;
    setPrintAll(true);
    setTimeout(() => window.print(), 200);
  };

  const toggleItemCheck = async (orderId: string, currentItems: any[], idx: number) => {
    const newItems = [...currentItems];
    newItems[idx] = { ...newItems[idx], checked: !newItems[idx].checked };
    try {
      await updateDoc(doc(db, "orders", orderId), { items: newItems });
    } catch (error) {
      logger.warn("Falha ao marcar item do pedido", {
        action: "TOGGLE_ITEM_CHECK",
        component: "PedidosPage",
        resourceId: orderId,
        itemIndex: idx,
        ...logger.fromError(error),
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModalOrder || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      await adminRequest(`/api/admin/orders/${cancelModalOrder.id}`, "PATCH", { status: "cancelled", cancelReason: cancelReason.trim() });
      logger.info("Pedido cancelado", {
        action: "CANCEL_ORDER",
        component: "PedidosPage",
        resourceId: cancelModalOrder.id,
        cancelReason: cancelReason.trim(),
      });
      setCancelModalOrder(null);
      setCancelReason("");
    } catch (error) {
      logger.error("Falha ao cancelar pedido", {
        action: "CANCEL_ORDER",
        component: "PedidosPage",
        resourceId: cancelModalOrder.id,
        ...logger.fromError(error),
      });
      alert(error instanceof Error ? error.message : "Erro ao cancelar pedido. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAssignCourier = async (orderId: string, courierId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { courierId });
      const courier = couriers.find((c) => c.id === courierId);
      if (courier) {
        await updateDoc(doc(db, "couriers", courierId), {
          totalDeliveries: (courier.totalDeliveries || 0) + 1,
        });
      }
      logger.info("Entregador atribuído ao pedido", {
        action: "ASSIGN_COURIER",
        component: "PedidosPage",
        resourceId: orderId,
        courierId,
      });
    } catch (error) {
      logger.error("Falha ao atribuir entregador", {
        action: "ASSIGN_COURIER",
        component: "PedidosPage",
        resourceId: orderId,
        courierId,
        ...logger.fromError(error),
      });
    }
  };

  // PDV handlers
  const addToPDV = (product: any) => {
    setPdvItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromPDV = (productId: string) => {
    setPdvItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleSubmitPDV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pdvItems.length === 0) return alert("Adicione pelo menos 1 produto.");
    setIsSubmittingPDV(true);
    try {
      const total = pdvItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
      await addDoc(collection(db, "orders"), {
        userName: pdvClientName || "Cliente Balcão",
        userPhone: "",
        type: pdvType,
        address: pdvType === "delivery" ? pdvAddress : null,
        paymentMethod: pdvPayment,
        isPaid: false,
        items: pdvItems.map((i) => ({ product: i.product, quantity: i.quantity })),
        total,
        deliveryFee: pdvType === "delivery" ? 0 : 0,
        status: "created",
        statusHistory: ["created"],
        createdAt: Timestamp.now(),
        isManual: true,
      });
      setIsPDVOpen(false);
      setPdvClientName("");
      setPdvAddress("");
      setPdvItems([]);
      setPdvSearch("");
    } catch (err) {
      console.error(err);
      alert("Erro ao criar pedido.");
    } finally {
      setIsSubmittingPDV(false);
    }
  };

  // ─── Filtered data ────────────────────────────────────────────
  const activeOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "delivered");

  const filteredOrders = activeOrders.filter((o) => {
    if (sectorFilter === "delivery") return o.type === "delivery";
    if (sectorFilter === "balcao") return o.type !== "delivery";
    return true;
  });

  const receivedOrders = filteredOrders.filter((o) => !o.status || ["created", "accepted", "recebido"].includes(o.status));
  const preparingOrders = filteredOrders.filter((o) => ["preparing", "preparando"].includes(o.status));
  const readyOrders = filteredOrders.filter((o) => ["readyForPickup", "onTheWay", "pronto"].includes(o.status));

  const renderTime = (createdAt: any) => {
    if (!createdAt) return <span className="text-[#1f1f1f] font-bold text-sm">0 min</span>;
    let date: Date;
    if (createdAt.toDate) date = createdAt.toDate();
    else if (createdAt.seconds) date = new Date(createdAt.seconds * 1000);
    else date = new Date(createdAt);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins > 15) return <span className="text-[#ba1a1a] font-bold text-sm">Atrasado {diffMins}m</span>;
    return <span className="text-[#1f1f1f] font-bold text-sm">{diffMins} min</span>;
  };

  const sectorLabel = sectorFilter === "delivery" ? "Delivery" : sectorFilter === "balcao" ? "Balcão" : "Todos os Setores";

  const pdvFiltered = products.filter((p) => p.name?.toLowerCase().includes(pdvSearch.toLowerCase()));
  const pdvTotal = pdvItems.reduce((s, i) => s + i.product.price * i.quantity, 0);

  // ─── Order Card (reusable) ────────────────────────────────────
  const OrderCard = ({ order }: { order: any }) => {
    const col = receivedOrders.includes(order) ? "received" : preparingOrders.includes(order) ? "preparing" : "ready";
    return (
      <div 
        onClick={() => router.push(`/admin/dashboard/pedidos/${order.id}`)}
        className={`bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        col === "received" ? "border border-[#e2e2e2]" :
        col === "preparing" ? "border-l-4 border-l-[#d48806] border-y border-y-[#e2e2e2] border-r border-r-[#e2e2e2]" :
        "border-l-4 border-l-[#266d00] border-y border-y-[#e2e2e2] border-r border-r-[#e2e2e2]"
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className={`font-bold text-xl ${col === "received" ? "text-[#1f1f1f]" : col === "preparing" ? "text-[#855300]" : "text-[#266d00]"}`}>
              #{(order.orderNumber || order.id?.slice(-4).toUpperCase())}
            </h3>
            <p className="text-sm font-medium text-[#524435] mt-0.5">{order.userName || "Cliente"}</p>
          </div>
          <div className="flex items-center gap-2">
            {renderTime(order.createdAt)}
            <button onClick={(e) => { e.stopPropagation(); setCancelModalOrder(order); }} className="text-[#a0a0a0] hover:text-[#e53935] transition-colors ml-1" title="Cancelar">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <p className="text-xs font-bold text-[#a0a0a0] mb-2 uppercase">{order.table ? `Mesa ${order.table}` : order.type === "delivery" ? "🛵 Delivery" : "🏠 Balcão / Retirada"} · {order.paymentMethod}</p>

        {col === "preparing" ? (
          <div className="flex flex-col gap-2 mb-4">
            {order.items?.map((i: any, idx: number) => (
              <div key={idx} onClick={(e) => { e.stopPropagation(); toggleItemCheck(order.id, order.items, idx); }} className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${i.checked ? "bg-[#d48806] border-[#d48806]" : "border-[#a0a0a0] group-hover:border-[#d48806]"}`}>
                  {i.checked && <CheckCircle2 size={11} className="text-white" />}
                </div>
                <span className={`text-sm font-medium ${i.checked ? "text-[#a0a0a0] line-through" : "text-[#1f1f1f]"}`}>{i.quantity}x {i.product?.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#524435] mb-4 leading-relaxed">
            {order.items?.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ") || "–"}
          </p>
        )}

        {order.observation && (
          <div className="flex gap-2 mb-3 text-[#524435] bg-[#f9f9f9] p-2 rounded-lg">
            <MessageSquare size={14} className="text-[#a0a0a0] shrink-0 mt-0.5" />
            <p className="text-xs italic">"{order.observation}"</p>
          </div>
        )}

        {col === "ready" && order.type === "delivery" && (
          <div className="mb-3">
            <p className="text-xs font-bold text-[#266d00] mb-1 flex items-center gap-1"><Bike size={13} /> Motoboy:</p>
            <select
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-[#e2e2e2] rounded-lg p-2 text-sm outline-none focus:border-[#266d00] bg-[#f9f9f9]"
              value={order.courierId || ""}
              onChange={(e) => handleAssignCourier(order.id, e.target.value)}
            >
              <option value="" disabled>Selecione...</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {col !== "ready" ? (
            <>
              <button disabled={advancing.includes(order.id)} onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(order.id, order.status, order.type); }}
                className={`flex-1 text-white font-bold py-2.5 rounded-lg transition-colors text-sm ${col === "received" ? "bg-[#855300] hover:bg-[#6b4200]" : "bg-[#d48806] hover:bg-[#b47000]"}`}>
                {advancing.includes(order.id) ? "ATUALIZANDO…" : col === "received" ? "PREPARAR" : "PRONTO"}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handlePrint(order); }} className="w-10 h-10 flex items-center justify-center border border-[#e2e2e2] rounded-lg hover:bg-[#f9f9f9] text-[#524435]">
                <Printer size={16} />
              </button>
            </>
          ) : (
            <button disabled={advancing.includes(order.id)} onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(order.id, order.status, order.type); }}
              className="flex-1 bg-[#41af00] hover:bg-[#266d00] text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
              {advancing.includes(order.id) ? "ATUALIZANDO…" : order.type === "delivery" ? "CONCLUIR ENTREGA" : "ENTREGAR"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print: single order */}
      {printingOrder && !printAll && <PrintReceipt order={printingOrder} />}

      {/* Print: all active orders */}
      {printAll && (
        <div className="hidden print:block">
          {allOrdersPrintRef.current.map((order, i) => (
            <div key={order.id} className={i > 0 ? "break-before-page" : ""}>
              <PrintReceipt order={order} />
            </div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-[90%] sm:w-[450px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#e2e2e2]">
              <h2 className="text-xl font-bold text-[#1f1f1f]">Cancelar Pedido</h2>
              <p className="text-[#a0a0a0] text-sm mt-1">Pedido #{cancelModalOrder.id?.slice(-4).toUpperCase()}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Motivo do cancelamento *</label>
              <textarea
                value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Falta de estoque, Cliente desistiu..."
                className="w-full border border-[#e2e2e2] rounded-lg p-3 text-sm min-h-[100px] outline-none focus:border-[#d48806]"
              />
            </div>
            <div className="p-4 bg-[#f9f9f9] border-t border-[#e2e2e2] flex justify-end gap-3">
              <button onClick={() => { setCancelModalOrder(null); setCancelReason(""); }}
                className="px-5 py-2 text-[#524435] font-bold hover:bg-[#e2e2e2] rounded-lg">Voltar</button>
              <button onClick={handleCancelOrder} disabled={!cancelReason.trim() || isCancelling}
                className="px-5 py-2 bg-[#e53935] text-white font-bold rounded-lg disabled:opacity-50">
                {isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDV Modal */}
      {isPDVOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 print:hidden">
          <form onSubmit={handleSubmitPDV} className="bg-white rounded-2xl w-[95%] sm:w-[700px] max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#e2e2e2] flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1f1f1f]">Novo Pedido Manual (PDV)</h2>
              <button type="button" onClick={() => setIsPDVOpen(false)} className="text-[#a0a0a0] hover:text-[#1f1f1f]"><X size={22} /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left: product picker */}
              <div className="w-1/2 border-r border-[#e2e2e2] flex flex-col">
                <div className="p-3 border-b border-[#e2e2e2]">
                  <input
                    type="text" placeholder="Buscar produto..." value={pdvSearch}
                    onChange={(e) => setPdvSearch(e.target.value)}
                    className="w-full border border-[#e2e2e2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#d48806]"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {pdvFiltered.map((p) => (
                    <button key={p.id} type="button" onClick={() => addToPDV(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f9f9f9] border-b border-[#f0f0f0] text-left transition-colors">
                      <div className="relative w-10 h-10 bg-[#f9f9f9] rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image ? <Image src={p.image.startsWith('http') || p.image.startsWith('data:') ? p.image : '/' + p.image} alt={p.name} fill sizes="40px" className="object-cover" unoptimized={!p.image.startsWith('http')} /> : <ShoppingCart size={16} className="text-[#d1d1d1]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1f1f1f] truncate">{p.name}</p>
                        <p className="text-xs text-[#a0a0a0]">{p.category}</p>
                      </div>
                      <span className="text-sm font-black text-[#d48806] shrink-0">R$ {Number(p.price).toFixed(2).replace('.', ',')}</span>
                    </button>
                  ))}
                  {pdvFiltered.length === 0 && <p className="text-center text-[#a0a0a0] p-8 text-sm">Nenhum produto encontrado</p>}
                </div>
              </div>

              {/* Right: order summary */}
              <div className="w-1/2 flex flex-col">
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setPdvType("pickup")}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${pdvType === "pickup" ? "bg-[#1f1f1f] text-white" : "bg-[#f0f0f0] text-[#a0a0a0]"}`}>
                      🏠 Balcão
                    </button>
                    <button type="button" onClick={() => setPdvType("delivery")}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${pdvType === "delivery" ? "bg-[#1f1f1f] text-white" : "bg-[#f0f0f0] text-[#a0a0a0]"}`}>
                      🛵 Delivery
                    </button>
                  </div>

                  <input type="text" placeholder="Nome do cliente (opcional)" value={pdvClientName}
                    onChange={(e) => setPdvClientName(e.target.value)}
                    className="w-full border border-[#e2e2e2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#d48806] mb-3"
                  />
                  {pdvType === "delivery" && (
                    <input type="text" placeholder="Endereço de entrega *" value={pdvAddress}
                      onChange={(e) => setPdvAddress(e.target.value)} required
                      className="w-full border border-[#e2e2e2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#d48806] mb-3"
                    />
                  )}
                  <select value={pdvPayment} onChange={(e) => setPdvPayment(e.target.value)}
                    className="w-full border border-[#e2e2e2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#d48806] mb-4">
                    <option>Dinheiro</option>
                    <option>PIX</option>
                    <option>Cartão de Crédito</option>
                    <option>Cartão de Débito</option>
                  </select>

                  <p className="text-xs font-bold text-[#a0a0a0] uppercase mb-2">Itens ({pdvItems.length})</p>
                  {pdvItems.length === 0 && <p className="text-sm text-[#a0a0a0] text-center py-4">← Adicione produtos</p>}
                  {pdvItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2 mb-2">
                      <div className="flex items-center border border-[#e2e2e2] rounded-lg overflow-hidden">
                        <button type="button" onClick={() => setPdvItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                          className="px-2 py-1 text-[#a0a0a0] hover:bg-[#f0f0f0] font-bold text-lg">−</button>
                        <span className="px-3 py-1 font-bold text-sm">{item.quantity}</span>
                        <button type="button" onClick={() => setPdvItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))}
                          className="px-2 py-1 text-[#a0a0a0] hover:bg-[#f0f0f0] font-bold text-lg">+</button>
                      </div>
                      <span className="flex-1 text-sm font-medium text-[#1f1f1f] truncate">{item.product.name}</span>
                      <span className="text-sm font-bold text-[#d48806] shrink-0">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                      <button type="button" onClick={() => removeFromPDV(item.product.id)} className="text-[#a0a0a0] hover:text-[#e53935]"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-[#e2e2e2]">
                  <div className="flex justify-between mb-3">
                    <span className="font-bold text-[#1f1f1f]">Total</span>
                    <span className="font-black text-xl text-[#d48806]">R$ {pdvTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <button type="submit" disabled={isSubmittingPDV || pdvItems.length === 0}
                    className="w-full bg-[#855300] hover:bg-[#6b4200] text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmittingPDV ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Lançar Pedido
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main View */}
      <div className="flex flex-col h-full gap-6 print:hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {/* Sector filter */}
            <div className="relative">
              <button onClick={() => setSectorMenuOpen((v) => !v)}
                className="flex items-center justify-between min-w-[170px] bg-white border border-[#e2e2e2] px-4 py-2.5 rounded-lg shadow-sm hover:border-[#d48806] transition-colors">
                <span className="font-semibold text-[#1f1f1f] text-sm">{sectorLabel}</span>
                <ChevronDown size={16} className={`text-[#524435] transition-transform ${sectorMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {sectorMenuOpen && (
                <div className="absolute top-full mt-1 left-0 bg-white border border-[#e2e2e2] rounded-xl shadow-lg z-50 overflow-hidden w-[170px]">
                  {(["todos", "delivery", "balcao"] as SectorFilter[]).map((s) => (
                    <button key={s} onClick={() => { setSectorFilter(s); setSectorMenuOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-[#f9f9f9] transition-colors ${sectorFilter === s ? "text-[#d48806]" : "text-[#1f1f1f]"}`}>
                      {s === "todos" ? "Todos os Setores" : s === "delivery" ? "🛵 Delivery" : "🏠 Balcão / Retirada"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex bg-[#e8e8e8] p-1 rounded-lg">
              <button onClick={() => setViewMode("colunas")}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === "colunas" ? "bg-white text-[#1f1f1f] shadow-sm" : "text-[#524435] hover:text-[#1f1f1f]"}`}>
                <LayoutGrid size={15} /> Colunas
              </button>
              <button onClick={() => setViewMode("lista")}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === "lista" ? "bg-white text-[#1f1f1f] shadow-sm" : "text-[#524435] hover:text-[#1f1f1f]"}`}>
                <List size={15} /> Lista
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handlePrintAll}
              className="flex items-center gap-2 bg-white border border-[#e2e2e2] text-[#1f1f1f] font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:bg-[#f9f9f9] transition-colors text-sm">
              <Printer size={16} /> IMPRIMIR TUDO
            </button>
            <button onClick={() => setIsPDVOpen(true)}
              className="flex items-center gap-2 bg-[#855300] hover:bg-[#6b4200] text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm">
              <Plus size={16} /> NOVO PEDIDO
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d48806]" />
          </div>
        ) : viewMode === "colunas" ? (
          /* ── KANBAN VIEW ────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
            {/* Column 1: Recebidos */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#1f1f1f]">Recebidos</h2>
                  <span className="bg-[#fef08a] text-[#854d0e] font-bold px-2 py-0.5 rounded-full text-sm">
                    {receivedOrders.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="w-8 h-1 bg-[#d48806] rounded-full" />
              </div>
              {receivedOrders.length === 0 && (
                <div className="border-2 border-dashed border-[#e2e2e2] rounded-xl p-8 flex flex-col items-center justify-center text-[#a0a0a0]">
                  <Clock size={32} className="mb-2 opacity-50" />
                  <p className="font-medium text-center">Nenhum pedido novo</p>
                </div>
              )}
              {receivedOrders.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>

            {/* Column 2: Em Preparo */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#1f1f1f]">Em Preparo</h2>
                  <span className="bg-[#fed7aa] text-[#c2410c] font-bold px-2 py-0.5 rounded-full text-sm">
                    {preparingOrders.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="w-8 h-1 bg-[#ea580c] rounded-full" />
              </div>
              {preparingOrders.length === 0 && (
                <div className="border-2 border-dashed border-[#e2e2e2] rounded-xl p-8 flex flex-col items-center justify-center text-[#a0a0a0]">
                  <Clock size={32} className="mb-2 opacity-50" />
                  <p className="font-medium text-center">Nenhum em preparo</p>
                </div>
              )}
              {preparingOrders.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>

            {/* Column 3: Prontos */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#1f1f1f]">Prontos</h2>
                  <span className="bg-[#dcfce7] text-[#166534] font-bold px-2 py-0.5 rounded-full text-sm">
                    {readyOrders.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="w-8 h-1 bg-[#266d00] rounded-full" />
              </div>
              {readyOrders.length === 0 && (
                <div className="border-2 border-dashed border-[#e2e2e2] rounded-xl p-8 flex flex-col items-center justify-center text-[#a0a0a0]">
                  <CheckCircle2 size={32} className="mb-2 opacity-50" />
                  <p className="font-medium text-center">Nenhum pronto</p>
                </div>
              )}
              {readyOrders.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          </div>
        ) : (
          /* ── LIST VIEW ──────────────────────────────────────── */
          <div className="flex flex-col gap-3 pb-10">
            {filteredOrders.length === 0 && (
              <div className="border-2 border-dashed border-[#e2e2e2] rounded-xl p-16 flex flex-col items-center justify-center text-[#a0a0a0]">
                <Clock size={40} className="mb-3 opacity-30" />
                <p className="font-bold text-lg text-[#1f1f1f]">Nenhum pedido ativo</p>
              </div>
            )}
            {filteredOrders.map((order) => {
              const statusLabel =
                !order.status || ["created", "recebido"].includes(order.status) ? { label: "Recebido", color: "bg-[#fef08a] text-[#854d0e]" } :
                ["preparing", "preparando"].includes(order.status) ? { label: "Em Preparo", color: "bg-[#fed7aa] text-[#c2410c]" } :
                { label: "Pronto", color: "bg-[#dcfce7] text-[#166534]" };
              return (
                <div key={order.id} className="bg-white rounded-xl border border-[#e2e2e2] p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    <span className="font-black text-xl text-[#1f1f1f]">#{(order.orderNumber || order.id?.slice(-4).toUpperCase())}</span>
                    <span className="text-xs text-[#a0a0a0]">{renderTime(order.createdAt)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusLabel.color}`}>{statusLabel.label}</span>
                      <span className="text-xs text-[#a0a0a0]">{order.type === "delivery" ? "🛵 Delivery" : "🏠 Balcão"}</span>
                      <span className="text-xs text-[#a0a0a0]">· {order.paymentMethod}</span>
                    </div>
                    <p className="font-bold text-[#1f1f1f] truncate">{order.userName || "Cliente"}</p>
                    <p className="text-sm text-[#524435] truncate">{order.items?.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-black text-[#d48806]">R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}</p>
                    <div className="flex gap-2 mt-2">
                      <button disabled={advancing.includes(order.id)} onClick={() => handleAdvanceStatus(order.id, order.status, order.type)}
                        className="px-3 py-1.5 bg-[#855300] text-white rounded-lg text-xs font-bold hover:bg-[#6b4200] transition-colors">
                        Avançar
                      </button>
                      <button onClick={() => handlePrint(order)} className="p-1.5 border border-[#e2e2e2] rounded-lg hover:bg-[#f9f9f9] text-[#524435]">
                        <Printer size={14} />
                      </button>
                      <button onClick={() => setCancelModalOrder(order)} className="p-1.5 border border-[#e2e2e2] rounded-lg hover:bg-[#e53935]/10 text-[#a0a0a0] hover:text-[#e53935]">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
