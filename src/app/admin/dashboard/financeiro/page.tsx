"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Wallet, Plus, CheckCircle, Store, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import logger from "@/lib/logger";

export default function FinanceiroPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [cashflow, setCashflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Modals
  const [isAberturaModalOpen, setIsAberturaModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);

  // Form states
  const [trocoInicial, setTrocoInicial] = useState("");
  const [saidaDesc, setSaidaDesc] = useState("");
  const [saidaValor, setSaidaValor] = useState("");
  const [valorRealGaveta, setValorRealGaveta] = useState("");

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  useEffect(() => {
    // 1. Escutar Caixa do Dia
    const cashflowRef = doc(db, "cashflow", todayStr);
    const unsubCash = onSnapshot(
      cashflowRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCashflow(docSnap.data());
        } else {
          setCashflow(null);
        }
        setLoading(false);
      },
      (error) => {
        logger.error("Falha no listener do caixa do dia", {
          action: "CASHFLOW_SNAPSHOT",
          component: "FinanceiroPage",
          resourceId: todayStr,
          ...logger.fromError(error),
        });
        setLoading(false);
      }
    );

    // 2. Escutar Pedidos de Hoje para Faturamento Real-time
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const unsubOrders = onSnapshot(
      // Lê todos durante a migração para aceitar pedidos antigos com
      // createdAt numérico e pedidos novos com Firestore Timestamp.
      collection(db, "orders"),
      (snapshot) => {
        const fetchedOrders: Record<string, unknown>[] = snapshot.docs
          .map((d): Record<string, unknown> => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
          .filter((order) => {
            const rawCreatedAt: unknown = order.createdAt;
            let createdAtMillis = Number.NaN;
            if (
              rawCreatedAt !== null &&
              typeof rawCreatedAt === "object" &&
              "toMillis" in rawCreatedAt &&
              typeof rawCreatedAt.toMillis === "function"
            ) {
              createdAtMillis = rawCreatedAt.toMillis();
            } else if (typeof rawCreatedAt === "number") {
              createdAtMillis = rawCreatedAt;
            } else if (typeof rawCreatedAt === "string") {
              createdAtMillis = Date.parse(rawCreatedAt);
            }
            return createdAtMillis >= todayStart.getTime() && createdAtMillis <= todayEnd.getTime();
          });
        setOrders(fetchedOrders);
      },
      (error) => {
        logger.error("Falha no listener de pedidos de hoje", {
          action: "TODAY_ORDERS_SNAPSHOT",
          component: "FinanceiroPage",
          ...logger.fromError(error),
        });
      }
    );

    // 3. Buscar Histórico de 7 Dias
    const fetchHistory = async () => {
      try {
        const qHistory = query(collection(db, "cashflow"), orderBy("date", "desc"), limit(7));
        const snap = await getDocs(qHistory);
        const hist = snap.docs.map(d => d.data()).reverse();
        setHistoryData(hist.map(h => ({
          name: h.date.split('-').slice(1).reverse().join('/'),
          Total: h.totalSales || 0
        })));
        logger.info("Histórico de caixa carregado", {
          action: "FETCH_CASHFLOW_HISTORY",
          component: "FinanceiroPage",
          recordCount: snap.docs.length,
        });
      } catch (error) {
        logger.error("Falha ao buscar histórico de 7 dias", {
          action: "FETCH_CASHFLOW_HISTORY",
          component: "FinanceiroPage",
          ...logger.fromError(error),
        });
      }
    };
    fetchHistory();

    return () => {
      unsubCash();
      unsubOrders();
    };
  }, [todayStr]);

  // Calculations
  const validOrders = orders.filter(o => !['cancelado', 'cancelled'].includes(o.status));
  const paidOrders = validOrders.filter(o => o.isPaid || ['entregue', 'delivered'].includes(o.status)); // Considera pagos

  const totalSales = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPixCard = paidOrders.filter(o => ['PIX', 'Cartão de Crédito', 'Cartão de Débito'].includes(o.paymentMethod))
                                 .reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCash = paidOrders.filter(o => o.paymentMethod === 'Dinheiro')
                              .reduce((sum, o) => sum + (o.total || 0), 0);

  // Motoboys: Subtrair taxa de entrega do caixa (mesmo se pagou no PIX, o motoboy recebe em dinheiro)
  const deliveryOrders = validOrders.filter(o => o.type === 'delivery');
  const totalDeliveryFees = deliveryOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  const totalExpenses = cashflow?.expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;

  const expectedDrawer = (cashflow?.initialChange || 0) + totalCash - totalExpenses - totalDeliveryFees;

  const isCaixaAberto = cashflow?.isOpen === true;

  // Handlers
  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(trocoInicial.replace(',', '.'));
    if (isNaN(val)) return;
    try {
      await setDoc(doc(db, "cashflow", todayStr), {
        date: todayStr,
        isOpen: true,
        initialChange: val,
        expenses: [],
        openedAt: Timestamp.now(),
        totalSales: 0,
      });
      logger.info("Caixa aberto com sucesso", {
        action: "OPEN_CASHFLOW",
        component: "FinanceiroPage",
        resourceId: todayStr,
        initialChange: val,
      });
      setIsAberturaModalOpen(false);
    } catch (error) {
      logger.fatal("Falha crítica ao abrir caixa", {
        action: "OPEN_CASHFLOW",
        component: "FinanceiroPage",
        resourceId: todayStr,
        ...logger.fromError(error),
      });
      alert("Erro ao abrir o caixa. Tente novamente.");
    }
  };

  const handleRegistrarSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(saidaValor.replace(',', '.'));
    if (isNaN(val) || !saidaDesc) return;
    const newExpenses = [...(cashflow.expenses || []), {
      desc: saidaDesc,
      amount: val,
      time: new Date().toISOString()
    }];
    try {
      await setDoc(doc(db, "cashflow", todayStr), { expenses: newExpenses }, { merge: true });
      logger.info("Saída de caixa registrada", {
        action: "REGISTER_EXPENSE",
        component: "FinanceiroPage",
        resourceId: todayStr,
        expenseDescription: saidaDesc,
        expenseAmount: val,
      });
      setIsSaidaModalOpen(false);
      setSaidaDesc("");
      setSaidaValor("");
    } catch (error) {
      logger.fatal("Falha crítica ao registrar saída de caixa", {
        action: "REGISTER_EXPENSE",
        component: "FinanceiroPage",
        resourceId: todayStr,
        expenseAmount: val,
        ...logger.fromError(error),
      });
      alert("Erro ao registrar saída. Tente novamente.");
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const valReal = parseFloat(valorRealGaveta.replace(',', '.'));
    if (isNaN(valReal)) return;
    const diff = valReal - expectedDrawer;
    try {
      await setDoc(doc(db, "cashflow", todayStr), {
        isOpen: false,
        closedAt: Timestamp.now(),
        totalSales,
        totalPixCard,
        totalCash,
        totalDeliveryFees,
        totalExpenses,
        expectedDrawer,
        reportedDrawer: valReal,
        difference: diff
      }, { merge: true });
      logger.info("Caixa fechado", {
        action: "CLOSE_CASHFLOW",
        component: "FinanceiroPage",
        resourceId: todayStr,
        totalSales,
        expectedDrawer,
        reportedDrawer: valReal,
        difference: diff,
      });
      setIsFechamentoModalOpen(false);
    } catch (error) {
      logger.fatal("Falha crítica ao fechar caixa", {
        action: "CLOSE_CASHFLOW",
        component: "FinanceiroPage",
        resourceId: todayStr,
        totalSales,
        ...logger.fromError(error),
      });
      alert("Erro ao fechar o caixa. Tente novamente.");
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-[#d48806] rounded-full"></div></div>;

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Financeiro e Caixa</h1>
          <p className="text-[#a0a0a0] mt-1">Gestão de faturamento, saídas e fechamento diário.</p>
        </div>
        <div className="flex gap-3">
          {isCaixaAberto ? (
            <>
              <button 
                onClick={() => setIsSaidaModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-[#e2e2e2] text-[#1f1f1f] font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:bg-[#f9f9f9] transition-colors"
              >
                <ArrowDownCircle size={18} className="text-[#e53935]" />
                Registrar Saída (Sangria)
              </button>
              <button 
                onClick={() => setIsFechamentoModalOpen(true)}
                className="flex items-center gap-2 bg-[#1f1f1f] hover:bg-[#000000] text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                <Store size={18} />
                Fechar Caixa
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsAberturaModalOpen(true)}
              className="flex items-center gap-2 bg-[#d48806] hover:bg-[#b47000] text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <Wallet size={18} />
              Abrir Caixa do Dia
            </button>
          )}
        </div>
      </div>

      {!isCaixaAberto && !cashflow?.closedAt && (
        <div className="bg-[#fff8e1] border border-[#ffe082] p-6 rounded-xl flex items-center gap-4 mt-4">
          <Store className="text-[#f57f17]" size={32} />
          <div>
            <h3 className="font-bold text-[#f57f17] text-lg">O Caixa está Fechado</h3>
            <p className="text-[#f57f17]/80">Para começar a registrar vendas e saídas, abra o caixa informando o troco inicial.</p>
          </div>
        </div>
      )}

      {cashflow?.closedAt && (
        <div className="bg-[#e8f5e9] border border-[#a5d6a7] p-6 rounded-xl flex items-center gap-4 mt-4">
          <CheckCircle className="text-[#2e7d32]" size={32} />
          <div>
            <h3 className="font-bold text-[#2e7d32] text-lg">Caixa Fechado com Sucesso</h3>
            <p className="text-[#2e7d32]/80">O caixa de hoje já foi encerrado. Diferença relatada: R$ {cashflow.difference?.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e2e2e2] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-2">
            <span className="font-bold text-sm">Faturamento Bruto</span>
            <TrendingUp size={20} className="text-[#41af00]" />
          </div>
          <div className="text-3xl font-black text-[#1f1f1f]">
            R$ {totalSales.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-xs text-[#a0a0a0] mt-2">{validOrders.length} pedidos confirmados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e2e2] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-2">
            <span className="font-bold text-sm">Vendas Virtuais (Pix/Cartão)</span>
            <ArrowUpCircle size={20} className="text-[#0288d1]" />
          </div>
          <div className="text-3xl font-black text-[#1f1f1f]">
            R$ {totalPixCard.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e2e2] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-[#d48806]" />
          <div className="flex items-center justify-between text-[#a0a0a0] mb-2 pr-4">
            <span className="font-bold text-sm">Entradas em Dinheiro</span>
            <Wallet size={20} className="text-[#d48806]" />
          </div>
          <div className="text-3xl font-black text-[#1f1f1f]">
            R$ {totalCash.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="bg-[#1f1f1f] p-5 rounded-2xl shadow-sm flex flex-col justify-between text-white">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-2">
            <span className="font-bold text-sm text-white/80">Dinheiro Físico na Gaveta</span>
            <DollarSign size={20} className="text-white" />
          </div>
          <div className="text-3xl font-black text-[#41af00]">
            R$ {expectedDrawer.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-xs text-white/60 mt-2">Inclui Troco + Vendas - Despesas - Motoboys</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Gráfico 7 dias */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm lg:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-[#1f1f1f] mb-6">Faturamento (Últimos 7 dias)</h2>
          <div className="h-[300px] w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a0a0a0', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0a0a0', fontSize: 12}} dx={-10} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip 
                    cursor={{fill: '#f9f9f9'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="Total" fill="#d48806" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#a0a0a0]">Sem dados anteriores</div>
            )}
          </div>
        </div>

        {/* Resumo Detalhado da Gaveta */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-[#1f1f1f] mb-6">Matemática da Gaveta</h2>
          
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#a0a0a0] font-semibold">+ Troco Inicial</span>
              <span className="font-bold">R$ {(cashflow?.initialChange || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#a0a0a0] font-semibold">+ Recebido em Dinheiro</span>
              <span className="font-bold text-[#41af00]">R$ {totalCash.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#a0a0a0] font-semibold">- Saídas / Despesas ({cashflow?.expenses?.length || 0})</span>
              <span className="font-bold text-[#e53935]">- R$ {totalExpenses.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#a0a0a0] font-semibold">- Pagamento Motoboys (Taxas)</span>
              <span className="font-bold text-[#e53935]">- R$ {totalDeliveryFees.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f0f0f0] mt-4">
            <div className="flex justify-between items-center">
              <span className="text-[#1f1f1f] font-black">Teórico na Gaveta</span>
              <span className="font-black text-xl text-[#d48806]">R$ {expectedDrawer.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      {isAberturaModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleAbrirCaixa} className="bg-white rounded-2xl w-[90%] sm:w-[400px] flex flex-col p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Abrir Caixa</h2>
            <p className="text-sm text-[#a0a0a0] mb-4">Informe o valor em dinheiro físico (notas e moedas) que está na gaveta para passar troco.</p>
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Troco Inicial (R$)</label>
            <input 
              type="number" step="0.01" required value={trocoInicial} onChange={e => setTrocoInicial(e.target.value)}
              className="w-full border border-[#e2e2e2] rounded-lg p-3 outline-none focus:border-[#d48806] mb-6"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsAberturaModalOpen(false)} className="px-5 py-2 text-[#a0a0a0] hover:bg-[#f0f0f0] rounded-lg font-bold">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-[#d48806] text-white rounded-lg font-bold">Abrir Caixa</button>
            </div>
          </form>
        </div>
      )}

      {isSaidaModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleRegistrarSaida} className="bg-white rounded-2xl w-[90%] sm:w-[450px] flex flex-col p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Registrar Saída (Sangria)</h2>
            
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Descrição da Saída *</label>
                <input 
                  type="text" required value={saidaDesc} onChange={e => setSaidaDesc(e.target.value)} placeholder="Ex: Compra de gelo, Pagamento pão..."
                  className="w-full border border-[#e2e2e2] rounded-lg p-3 outline-none focus:border-[#e53935]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Valor Retirado (R$) *</label>
                <input 
                  type="number" step="0.01" required value={saidaValor} onChange={e => setSaidaValor(e.target.value)}
                  className="w-full border border-[#e2e2e2] rounded-lg p-3 outline-none focus:border-[#e53935]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsSaidaModalOpen(false)} className="px-5 py-2 text-[#a0a0a0] hover:bg-[#f0f0f0] rounded-lg font-bold">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-[#e53935] text-white rounded-lg font-bold">Retirar Dinheiro</button>
            </div>
          </form>
        </div>
      )}

      {isFechamentoModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleFecharCaixa} className="bg-white rounded-2xl w-[90%] sm:w-[450px] flex flex-col p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">Fechamento de Caixa</h2>
            <div className="bg-[#f9f9f9] p-4 rounded-xl border border-[#e2e2e2] mb-4 text-center">
              <p className="text-sm text-[#a0a0a0] mb-1">Deveria ter na gaveta:</p>
              <p className="text-2xl font-black text-[#d48806]">R$ {expectedDrawer.toFixed(2).replace('.', ',')}</p>
            </div>
            <p className="text-sm text-[#1f1f1f] mb-4">Conte as notas e moedas reais na sua gaveta agora e informe abaixo:</p>
            
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Valor Real na Gaveta (R$) *</label>
            <input 
              type="number" step="0.01" required value={valorRealGaveta} onChange={e => setValorRealGaveta(e.target.value)}
              className="w-full border border-[#e2e2e2] rounded-lg p-3 outline-none focus:border-[#1f1f1f] mb-6 text-xl font-bold"
            />

            {valorRealGaveta && !isNaN(parseFloat(valorRealGaveta)) && (
              <div className={`p-3 rounded-lg text-center mb-4 font-bold ${
                (parseFloat(valorRealGaveta) - expectedDrawer) === 0 ? 'bg-[#e8f5e9] text-[#2e7d32]' :
                (parseFloat(valorRealGaveta) - expectedDrawer) > 0 ? 'bg-[#e3f2fd] text-[#0288d1]' : 'bg-[#ffebee] text-[#c62828]'
              }`}>
                Diferença: R$ {(parseFloat(valorRealGaveta) - expectedDrawer).toFixed(2).replace('.', ',')}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsFechamentoModalOpen(false)} className="px-5 py-2 text-[#a0a0a0] hover:bg-[#f0f0f0] rounded-lg font-bold">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-[#1f1f1f] text-white rounded-lg font-bold">Encerrar o Dia</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
