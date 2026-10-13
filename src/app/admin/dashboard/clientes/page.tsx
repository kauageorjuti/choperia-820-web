"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, UserCheck, DollarSign, Star, Users, Filter, Send, MessageSquare, Eye, ChevronLeft, ChevronRight, Copy } from "lucide-react";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  status: "VIP Prime" | "Cliente Frequente" | "Novo" | "Inativo";
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"Todos" | "VIPs" | "Inativos">("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const [contactFilter, setContactFilter] = useState<"todos" | "telefone">("todos");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState("Olá! Temos novidades e promoções especiais na Choperia 820. 🍻");
  const [feedback, setFeedback] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const custMap: Record<string, CustomerData> = {};

      snap.docs.forEach(d => {
        const o = d.data();
        if (o.statusHistory?.includes("cancelled")) return;

        const uId = o.userId || o.userPhone || "avulso";
        if (uId === "avulso") return;

        const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt;
        const date = ts ? new Date(ts) : null;

        if (!custMap[uId]) {
          custMap[uId] = {
            id: uId,
            name: o.userName || "Cliente Desconhecido",
            email: o.userEmail || `${(o.userName || "cliente").split(' ')[0].toLowerCase()}@email.com`,
            phone: o.userPhone || "Não informado",
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: date,
            status: "Novo"
          };
        }

        custMap[uId].totalOrders += 1;
        custMap[uId].totalSpent += (Number(o.total) || 0);

        if (date && custMap[uId].lastOrderDate) {
          if (date > custMap[uId].lastOrderDate!) {
            custMap[uId].lastOrderDate = date;
          }
        }
      });

      // Calcular status
      const now = new Date();
      const finalCustomers = Object.values(custMap).map(c => {
        let status = "Novo";
        const daysSinceLastOrder = c.lastOrderDate 
          ? Math.floor((now.getTime() - c.lastOrderDate.getTime()) / (1000 * 3600 * 24))
          : 999;

        if (daysSinceLastOrder > 30) {
          status = "Inativo";
        } else if (c.totalSpent > 1000 || c.totalOrders >= 15) {
          status = "VIP Prime";
        } else if (c.totalOrders >= 5) {
          status = "Cliente Frequente";
        }
        
        return { ...c, status: status as any };
      });

      setCustomers(finalCustomers);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Metrics
  const totalCustomers = customers.length;
  const activeThisMonth = customers.filter(c => c.status !== "Inativo").length;
  const avgLTV = totalCustomers > 0 ? customers.reduce((acc, c) => acc + c.totalSpent, 0) / totalCustomers : 0;
  
  // Filtering
  const filtered = useMemo(() => {
    let result = customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeTab === "VIPs") result = result.filter(c => c.status === "VIP Prime");
    if (activeTab === "Inativos") result = result.filter(c => c.status === "Inativo");
    if (contactFilter === "telefone") result = result.filter(c => c.phone.replace(/\D/g, "").length >= 10);

    result.sort((a, b) => b.totalSpent - a.totalSpent); // Sort by highest LTV default

    return result;
  }, [customers, searchTerm, activeTab, contactFilter]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3000);
  };

  const copyText = async (text: string, message = "Copiado para a área de transferência.") => {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback(message);
    } catch {
      showFeedback("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const openWhatsApp = (customer: CustomerData, message = "Olá! Tudo bem? Somos da Choperia 820. 🍻") => {
    const phone = customer.phone.replace(/\D/g, "");
    if (phone.length < 10) {
      showFeedback("Este cliente não possui telefone válido.");
      return;
    }
    window.open(`https://wa.me/55${phone.slice(-11)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const handleOpenCampaign = () => {
    if (filtered.filter(c => c.phone.replace(/\D/g, "").length >= 10).length === 0) {
      showFeedback("Não há clientes com telefone válido neste filtro.");
      return;
    }
    setIsCampaignOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (currentPage > Math.max(totalPages, 1)) setCurrentPage(Math.max(totalPages, 1));
  }, [currentPage, totalPages]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getDaysAgo = (date: Date | null) => {
    if (!date) return "Nunca";
    const diff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diff === 0) return "HOJE";
    if (diff === 1) return "HÁ 1 DIA";
    return `HÁ ${diff} DIAS`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    const diff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#d48806] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-transparent relative z-10">
        <h1 className="text-3xl font-bold text-[#1f1f1f]">Gestão de Clientes</h1>
        
        <div className="flex items-center gap-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={18} />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#e8e8e8]/50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#d48806]/30 text-sm font-medium transition-shadow"
            />
          </div>
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#fff8e1] text-[#d48806] flex items-center justify-center">
              <Users size={24} />
            </div>
            <span className="bg-[#dcfce7] text-[#166534] text-xs font-bold px-2 py-1 rounded-md">+5.2%</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Total de Clientes</p>
            <p className="text-3xl font-bold text-[#1f1f1f]">{totalCustomers.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#fff8e1] text-[#d48806] flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <span className="bg-[#dcfce7] text-[#166534] text-xs font-bold px-2 py-1 rounded-md">Ativos</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Ativos este mês</p>
            <p className="text-3xl font-bold text-[#1f1f1f]">{activeThisMonth.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#fff8e1] text-[#d48806] flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <span className="bg-[#fff8e1] text-[#d48806] text-xs font-bold px-2 py-1 rounded-md">LTV</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Média LTV</p>
            <p className="text-3xl font-bold text-[#1f1f1f]">
              <span className="text-xl">R$ </span>
              {avgLTV.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#fff8e1] text-[#d48806] flex items-center justify-center">
              <Star size={24} />
            </div>
            <span className="bg-[#f0f0f0] text-[#524435] text-xs font-bold px-2 py-1 rounded-md">4.9/5</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-1">Satisfação</p>
            <p className="text-3xl font-bold text-[#1f1f1f]">98.4%</p>
          </div>
        </div>
      </div>

      {/* Tabela de Base de Dados */}
      <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-6 border-b border-[#e2e2e2] flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-center bg-white">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h2 className="text-2xl font-bold text-[#1f1f1f]">Base de Dados</h2>
            <div className="flex bg-[#f9f9f9] rounded-lg p-1 border border-[#e2e2e2]">
              {(["Todos", "VIPs", "Inativos"] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                  className={`px-4 py-1 rounded-md text-xs font-bold transition-colors ${activeTab === tab ? "bg-white text-[#d48806] shadow-sm border border-[#e2e2e2]" : "text-[#a0a0a0] hover:text-[#524435]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowFilters(value => !value)} aria-pressed={showFilters} className="flex items-center gap-2 px-4 py-2 border border-[#e2e2e2] rounded-lg text-sm font-bold text-[#524435] hover:bg-[#f9f9f9] transition-colors">
              <Filter size={16} /> Filtrar
            </button>
            <button onClick={handleOpenCampaign} className="flex items-center gap-2 px-4 py-2 bg-[#d48806] hover:bg-[#b87300] rounded-lg text-sm font-bold text-white transition-colors shadow-[0_2px_8px_rgba(212,136,6,0.3)]">
              <Send size={16} /> Enviar Promoção
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e2e2e2] bg-[#fcfcfc] px-4 py-3 sm:px-6">
            <span className="text-sm font-bold text-[#524435]">Contatos:</span>
            <button onClick={() => { setContactFilter("todos"); setCurrentPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${contactFilter === "todos" ? "bg-[#1f1f1f] text-white" : "bg-white text-[#524435] border border-[#e2e2e2]"}`}>Todos</button>
            <button onClick={() => { setContactFilter("telefone"); setCurrentPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${contactFilter === "telefone" ? "bg-[#1f1f1f] text-white" : "bg-white text-[#524435] border border-[#e2e2e2]"}`}>Com telefone</button>
          </div>
        )}

        <div className="overflow-x-auto">
        {/* Table Columns */}
        <div className="grid min-w-[760px] grid-cols-12 gap-4 px-6 py-4 border-b border-[#e2e2e2] bg-[#fdfdfd] text-xs font-bold text-[#524435] tracking-wider uppercase">
          <div className="col-span-3">Avatar/Nome</div>
          <div className="col-span-3">Contato</div>
          <div className="col-span-1 text-center">Pedidos</div>
          <div className="col-span-2 text-center">Total Gasto</div>
          <div className="col-span-2">Último Pedido</div>
          <div className="col-span-1 text-center">Ações</div>
        </div>

        {/* Table Rows */}
        <div className="flex-col min-w-[760px]">
          {currentItems.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fcfcfc] transition-colors items-center">
              
              {/* Nome & Avatar */}
              <div className="col-span-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#fff8e1] text-[#d48806] font-bold text-lg flex items-center justify-center shrink-0">
                  {getInitials(c.name)}
                </div>
                <div>
                  <p className="font-bold text-[#1f1f1f] text-sm leading-tight">{c.name}</p>
                  <p className="text-xs mt-1 flex items-center gap-1.5 font-medium">
                    <span className={`w-2 h-2 rounded-full ${
                      c.status === "VIP Prime" ? "bg-[#166534]" : 
                      c.status === "Inativo" ? "bg-[#c62828]" : "bg-[#d48806]"
                    }`} />
                    <span className={c.status === "Inativo" ? "text-[#c62828]" : c.status === "VIP Prime" ? "text-[#166534]" : "text-[#524435]"}>
                      {c.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Contato */}
              <div className="col-span-3 flex flex-col justify-center">
                <p className="text-xs text-[#524435] font-medium">{c.email}</p>
                <p className="text-xs text-[#a0a0a0] mt-0.5">{c.phone}</p>
              </div>

              {/* Pedidos */}
              <div className="col-span-1 flex items-center justify-center">
                <span className="bg-[#f0f0f0] text-[#524435] px-3 py-1 rounded-lg text-xs font-bold">
                  {c.totalOrders}
                </span>
              </div>

              {/* Total Gasto */}
              <div className="col-span-2 flex items-center justify-center">
                <span className="font-bold text-[#1f1f1f] text-sm">
                  R$ {c.totalSpent.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {/* Último Pedido */}
              <div className="col-span-2 flex flex-col justify-center">
                <p className="text-xs text-[#524435] font-medium">{formatDate(c.lastOrderDate)}</p>
                <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${
                  c.status === "Inativo" ? "text-[#c62828]" : "text-[#166534]"
                }`}>
                  {getDaysAgo(c.lastOrderDate)}
                </p>
              </div>

              {/* Ações */}
              <div className="col-span-1 flex items-center justify-center gap-2">
                <button onClick={() => openWhatsApp(c)} className="w-8 h-8 rounded-lg bg-[#dcfce7] text-[#166534] flex items-center justify-center hover:bg-green-200 transition-colors" title="Conversar no WhatsApp" aria-label={`Conversar com ${c.name} no WhatsApp`}>
                  <MessageSquare size={14} />
                </button>
                <button onClick={() => setSelectedCustomer(c)} className="w-8 h-8 rounded-lg bg-[#f0f0f0] text-[#524435] flex items-center justify-center hover:bg-[#e2e2e2] transition-colors" title="Ver detalhes" aria-label={`Ver detalhes de ${c.name}`}>
                  <Eye size={14} />
                </button>
              </div>

            </div>
          ))}

          {currentItems.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-[#a0a0a0]">
              <Users size={48} className="mb-4 opacity-20" />
              <p>Nenhum cliente encontrado nesta aba.</p>
            </div>
          )}
        </div>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 bg-white border-t border-[#e2e2e2] flex justify-between items-center">
          <p className="text-xs text-[#a0a0a0] font-medium">
            Mostrando {currentItems.length} de <span className="font-bold text-[#1f1f1f]">{filtered.length}</span> clientes
          </p>

          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e2e2] text-[#a0a0a0] disabled:opacity-50 hover:bg-[#f9f9f9]"
            >
              <ChevronLeft size={16} />
            </button>
            
            {[...Array(totalPages)].map((_, idx) => {
              const page = idx + 1;
              if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                return (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                      currentPage === page ? "bg-[#d48806] text-white" : "border border-[#e2e2e2] text-[#524435] hover:bg-[#f9f9f9]"
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="w-8 h-8 flex items-center justify-center text-[#a0a0a0]">...</span>;
              }
              return null;
            })}

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e2e2] text-[#a0a0a0] disabled:opacity-50 hover:bg-[#f9f9f9]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {feedback && <div role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-[#1f1f1f] px-4 py-2 text-sm font-semibold text-white shadow-xl">{feedback}</div>}

      {selectedCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
          <div className="w-[calc(100vw-2rem)] max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-[#1f1f1f]">{selectedCustomer.name}</h2><p className="mt-1 text-sm text-[#a0a0a0]">Resumo de relacionamento</p></div><button onClick={() => setSelectedCustomer(null)} className="rounded-lg px-2 py-1 text-[#524435] hover:bg-[#f0f0f0]" aria-label="Fechar detalhes">×</button></div>
            <div className="space-y-3 rounded-xl bg-[#f9f9f9] p-4 text-sm"><p><span className="font-bold">Telefone:</span> {selectedCustomer.phone}</p><p><span className="font-bold">Pedidos:</span> {selectedCustomer.totalOrders}</p><p><span className="font-bold">Total gasto:</span> R$ {selectedCustomer.totalSpent.toFixed(2).replace(".", ",")}</p></div>
            <div className="mt-5 flex flex-wrap justify-end gap-3"><button onClick={() => copyText(selectedCustomer.phone, "Telefone copiado.")} className="flex items-center gap-2 rounded-lg border border-[#e2e2e2] px-4 py-2 text-sm font-bold text-[#524435]"><Copy size={16} /> Copiar telefone</button><button onClick={() => openWhatsApp(selectedCustomer)} className="flex items-center gap-2 rounded-lg bg-[#266d00] px-4 py-2 text-sm font-bold text-white"><MessageSquare size={16} /> WhatsApp</button></div>
          </div>
        </div>
      )}

      {isCampaignOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"><div className="w-[calc(100vw-2rem)] max-w-[560px] rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold text-[#1f1f1f]">Preparar promoção</h2><p className="mt-1 text-sm text-[#a0a0a0]">A mensagem será copiada para você enviar no WhatsApp Business. Nenhum cliente recebe mensagem automaticamente.</p><textarea value={campaignMessage} onChange={(event) => setCampaignMessage(event.target.value)} className="mt-4 min-h-28 w-full rounded-xl border border-[#e2e2e2] p-3 text-sm outline-none focus:border-[#d48806]" /><p className="mt-2 text-xs text-[#524435]">Público atual: {filtered.filter(c => c.phone.replace(/\D/g, "").length >= 10).length} cliente(s) com telefone.</p><div className="mt-5 flex justify-end gap-3"><button onClick={() => setIsCampaignOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#524435]">Cancelar</button><button onClick={() => { copyText(campaignMessage, "Mensagem da promoção copiada."); setIsCampaignOpen(false); }} className="flex items-center gap-2 rounded-lg bg-[#d48806] px-4 py-2 text-sm font-bold text-white"><Copy size={16} /> Copiar mensagem</button></div></div></div>
      )}
    </div>
  );
}
