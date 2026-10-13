"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bike, Plus, MapPin, Trash2, Edit2, Loader2, Phone, Clock, ClipboardList, Map, Navigation, CheckCircle2, MoreHorizontal } from "lucide-react";
import logger from "@/lib/logger";

interface Courier {
  id: string;
  name: string;
  phone: string;
  status: string;
  totalDeliveries: number;
}

interface Order {
  id: string;
  type: string;
  status: string;
  courierId?: string;
  address?: any;
  createdAt?: any;
}

export default function EntregadoresPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const unsubCouriers = onSnapshot(
      collection(db, "couriers"),
      (snap) => {
        setCouriers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Courier[]);
      },
      (error) => {
        logger.error("Falha no listener de motoboys", {
          action: "COURIERS_SNAPSHOT",
          component: "EntregadoresPage",
          ...logger.fromError(error),
        });
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
        setLoading(false);
      },
      (error) => {
        logger.error("Falha no listener de pedidos em entrega", {
          action: "DELIVERY_ORDERS_SNAPSHOT",
          component: "EntregadoresPage",
          ...logger.fromError(error),
        });
        setLoading(false);
      }
    );

    return () => {
      unsubCouriers();
      unsubOrders();
    };
  }, []);

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const ref = await addDoc(collection(db, "couriers"), {
        name,
        phone,
        status: "Livre",
        totalDeliveries: 0,
        createdAt: new Date().toISOString()
      });
      logger.info("Motoboy cadastrado", {
        action: "CREATE_COURIER",
        component: "EntregadoresPage",
        resourceId: ref.id,
        courierName: name,
        // phone é automaticamente mascarado pelo logger ([REDACTED])
      });
      setIsModalOpen(false);
      setName("");
      setPhone("");
    } catch (error) {
      logger.error("Falha ao cadastrar motoboy", {
        action: "CREATE_COURIER",
        component: "EntregadoresPage",
        courierName: name,
        ...logger.fromError(error),
      });
      alert("Erro ao cadastrar motoboy. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este motoboy?")) return;
    try {
      await deleteDoc(doc(db, "couriers", id));
      logger.info("Motoboy removido", {
        action: "DELETE_COURIER",
        component: "EntregadoresPage",
        resourceId: id,
      });
    } catch (error) {
      logger.error("Falha ao remover motoboy", {
        action: "DELETE_COURIER",
        component: "EntregadoresPage",
        resourceId: id,
        ...logger.fromError(error),
      });
      alert("Erro ao remover motoboy. Tente novamente.");
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    let nextStatus = "Livre";
    if (currentStatus === "Livre") nextStatus = "Em Rota";
    else if (currentStatus === "Em Rota") nextStatus = "Offline";
    try {
      await updateDoc(doc(db, "couriers", id), { status: nextStatus });
      logger.info("Status do motoboy alterado", {
        action: "TOGGLE_COURIER_STATUS",
        component: "EntregadoresPage",
        resourceId: id,
        previousStatus: currentStatus,
        nextStatus,
      });
    } catch (error) {
      logger.error("Falha ao alterar status do motoboy", {
        action: "TOGGLE_COURIER_STATUS",
        component: "EntregadoresPage",
        resourceId: id,
        ...logger.fromError(error),
      });
      alert("Erro ao atualizar status. Tente novamente.");
    }
  };

  const activeCouriersCount = couriers.filter(c => c.status !== "Offline").length;
  const waitingPickup = orders.filter(o => o.type === "delivery" && o.status === "preparing").length;
  
  // Pedidos em rota
  const ordersOnTheWay = orders.filter(o => o.type === "delivery" && o.status === "onTheWay").slice(0, 5);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Paginação
  const totalPages = Math.ceil(couriers.length / itemsPerPage);
  const currentItems = couriers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-[#d48806] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 font-sans pb-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-transparent relative z-10">
        <h1 className="text-3xl font-bold text-[#1f1f1f]">Gestão de Entregadores</h1>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="w-12 h-12 rounded-xl bg-[#fff8e1] text-[#d48806] flex items-center justify-center mb-6">
            <Bike size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Entregadores Ativos</p>
            <p className="text-3xl font-bold text-[#1f1f1f]">{activeCouriersCount.toString().padStart(2, '0')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="w-12 h-12 rounded-xl bg-[#ffebee] text-[#c62828] flex items-center justify-center mb-6">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Aguardando Coleta</p>
            <p className="text-3xl font-bold text-[#c62828]">{waitingPickup.toString().padStart(2, '0')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="w-12 h-12 rounded-xl bg-[#dcfce7] text-[#166534] flex items-center justify-center mb-6">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Tempo Médio</p>
            <p className="text-3xl font-bold text-[#166534]">
              24<span className="text-lg font-semibold ml-1">min</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Equipe Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#e2e2e2] flex justify-between items-center bg-white">
            <div>
              <h2 className="text-2xl font-bold text-[#1f1f1f]">Equipe de Entrega</h2>
              <p className="text-[#a0a0a0] text-sm mt-1">Gestão de disponibilidade e rotas</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#855300] hover:bg-[#6b4200] text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
            >
              <Plus size={18} /> Novo Entregador
            </button>
          </div>

          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#e2e2e2] bg-[#fdfdfd] text-xs font-bold text-[#524435] tracking-wider uppercase">
            <div className="col-span-4">Entregador</div>
            <div className="col-span-3">Contato</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-center">Entregas/Dia</div>
            <div className="col-span-1 text-center">Ações</div>
          </div>

          <div className="flex-col">
            {currentItems.map((c) => (
              <div key={c.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fcfcfc] transition-colors items-center">
                
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f0f0f0] text-[#524435] font-bold text-sm flex items-center justify-center shrink-0 border border-[#e2e2e2]">
                    {getInitials(c.name)}
                  </div>
                  <p className="font-bold text-[#1f1f1f] text-sm truncate">{c.name}</p>
                </div>

                <div className="col-span-3 flex flex-col justify-center text-xs">
                  <p className="text-[#524435]">{c.phone || "Não informado"}</p>
                </div>

                <div className="col-span-2">
                  <button 
                    onClick={() => toggleStatus(c.id, c.status)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    c.status === "Livre" ? "bg-[#bbf7d0] text-[#166534] hover:bg-green-300" : 
                    c.status === "Em Rota" ? "bg-[#fed7aa] text-[#c2410c] hover:bg-orange-300" : 
                    "bg-[#e2e2e2] text-[#524435] hover:bg-[#d1d1d1]"
                  }`}>
                    {c.status}
                  </button>
                </div>

                <div className="col-span-2 flex items-center justify-center">
                  <span className="font-bold text-[#1f1f1f]">{c.totalDeliveries || 0}</span>
                </div>

                <div className="col-span-1 flex items-center justify-center gap-2">
                  <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg bg-[#f0f0f0] text-[#a0a0a0] flex items-center justify-center hover:bg-[#ffebee] hover:text-[#c62828] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>
            ))}

            {currentItems.length === 0 && (
              <div className="p-12 flex flex-col items-center justify-center text-[#a0a0a0]">
                <Bike size={48} className="mb-4 opacity-20" />
                <p>Nenhum entregador cadastrado.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="p-4 bg-white border-t border-[#e2e2e2] flex justify-between items-center text-sm">
            <p className="text-[#a0a0a0]">
              Mostrando {currentItems.length} de {couriers.length} entregadores
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-[#e2e2e2] rounded-md disabled:opacity-50 hover:bg-[#f9f9f9]"
              >
                {'<'}
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-8 h-8 flex items-center justify-center border border-[#e2e2e2] rounded-md disabled:opacity-50 hover:bg-[#f9f9f9]"
              >
                {'>'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Map View */}
          <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#1f1f1f] flex items-center gap-2">
                <Map size={18} className="text-[#d48806]"/> Monitoramento em Tempo Real
              </h3>
              <button className="text-xs font-bold text-[#d48806] hover:underline">Ver Mapa Cheio</button>
            </div>
            
            <div className="w-full h-48 bg-[#e8e8e8] rounded-xl overflow-hidden relative border border-[#e2e2e2] flex items-center justify-center">
              {/* Fake Map Elements */}
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#1f1f1f 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="absolute w-[200px] h-[4px] bg-[#dcfce7] rotate-12 -ml-12" />
              <div className="absolute w-[150px] h-[4px] bg-[#dcfce7] -rotate-45 mt-16 ml-20" />
              
              <div className="absolute w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg border-2 border-[#d48806]">
                <Bike size={20} className="text-[#d48806]" />
              </div>
              <div className="absolute mt-16 text-[10px] font-bold bg-white px-2 py-0.5 rounded shadow-sm">LOJA SEDE</div>
              
              <div className="absolute w-3 h-3 bg-[#166534] rounded-full mt-24 ml-40 shadow-md border-2 border-white" />
              <div className="absolute -mt-10 ml-40 bg-white shadow-lg border border-[#e2e2e2] rounded-md px-3 py-1 flex flex-col gap-1 z-10">
                <span className="text-[10px] font-bold text-[#1f1f1f]">Pedido #4021</span>
              </div>
            </div>
          </div>

          {/* Active Deliveries List */}
          <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
            <div className="p-5 border-b border-[#e2e2e2]">
              <h3 className="font-bold text-[#1f1f1f]">Pedidos em Rota</h3>
            </div>
            
            <div className="flex flex-col p-2">
              {ordersOnTheWay.map((o, i) => {
                const courier = couriers.find(c => c.id === o.courierId);
                return (
                  <div key={o.id} className="p-3 hover:bg-[#f9f9f9] transition-colors rounded-xl flex gap-3 items-start border-b border-[#f0f0f0] last:border-0">
                    <div className="w-8 h-8 rounded-full bg-[#fff8e1] flex items-center justify-center text-[#d48806] shrink-0">
                      <Bike size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-[#1f1f1f] truncate">{courier?.name || "Sem entregador"}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fed7aa] text-[#c2410c] uppercase">A Caminho</span>
                      </div>
                      <p className="text-xs text-[#524435] truncate mb-2">
                        Pedido #{o.id.slice(-4).toUpperCase()} • {o.address?.neighborhood || "Endereço oculto"}
                      </p>
                      <div className="w-full bg-[#f0f0f0] rounded-full h-1.5">
                        <div className="bg-[#d48806] h-1.5 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {ordersOnTheWay.length === 0 && (
                <div className="p-6 flex flex-col items-center justify-center text-[#a0a0a0]">
                  <Navigation size={24} className="mb-2 opacity-50" />
                  <p className="text-sm">Nenhum pedido em rota.</p>
                </div>
              )}
              
              {/* Próximo na fila */}
              {waitingPickup > 0 && (
                <div className="p-3 mt-2 opacity-50 flex gap-3 items-start border-t border-[#f0f0f0]">
                  <div className="w-8 h-8 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#524435] shrink-0">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-[#1f1f1f] truncate">Próximo na fila...</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e2e2e2] text-[#524435] uppercase">Aguardando</span>
                    </div>
                    <p className="text-xs text-[#524435] truncate">
                      {waitingPickup} pedido(s) pronto(s) para coleta
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 print:hidden">
          <form onSubmit={handleAddCourier} className="bg-white rounded-2xl w-[90%] sm:w-[450px] flex flex-col p-6 shadow-2xl overflow-hidden">
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Novo Entregador</h2>
            
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Nome Completo *</label>
            <input 
              type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-[#e2e2e2] rounded-xl p-3 outline-none focus:border-[#d48806] mb-4"
              placeholder="Ex: João Silva"
            />

            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Telefone / WhatsApp</label>
            <input 
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-[#e2e2e2] rounded-xl p-3 outline-none focus:border-[#d48806] mb-6"
              placeholder="(11) 99999-9999"
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-[#f0f0f0]">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-[#524435] font-bold hover:bg-[#f0f0f0] rounded-xl transition-colors">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#d48806] hover:bg-[#b87300] text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
