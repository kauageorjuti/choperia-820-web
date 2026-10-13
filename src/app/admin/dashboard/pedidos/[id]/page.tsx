"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronRight, Printer, Edit, CheckCircle, User, MapPin, CreditCard, AlignLeft, Clock } from "lucide-react";
import Image from "next/image";
import logger from "@/lib/logger";
import { adminRequest } from "@/lib/admin-api";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printType, setPrintType] = useState<"cozinha" | "caixa" | "motoboy" | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
          logger.info("Pedido carregado", {
            action: "FETCH_ORDER",
            component: "OrderDetailsPage",
            resourceId: id as string,
          });
        } else {
          logger.warn("Pedido não encontrado no Firestore", {
            action: "FETCH_ORDER",
            component: "OrderDetailsPage",
            resourceId: id as string,
          });
        }
      } catch (error) {
        logger.error("Falha ao buscar detalhes do pedido", {
          action: "FETCH_ORDER",
          component: "OrderDetailsPage",
          resourceId: id as string,
          ...logger.fromError(error),
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#d48806] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-center text-[#a0a0a0]">Pedido não encontrado.</div>;
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case "created":
      case "accepted":
        return <span className="bg-[#fef08a] text-[#854d0e] px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Recebido</span>;
      case "preparing":
        return <span className="bg-[#fed7aa] text-[#c2410c] px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Em Preparo</span>;
      case "readyForPickup":
      case "onTheWay":
        return <span className="bg-[#bbf7d0] text-[#166534] px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Pronto / Despachado</span>;
      case "delivered":
        return <span className="bg-[#dcfce7] text-[#166534] px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Entregue</span>;
      case "cancelled":
        return <span className="bg-[#ffebee] text-[#c62828] px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Cancelado</span>;
      default:
        return <span className="bg-[#e2e2e2] text-[#524435] px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase">{order.status}</span>;
    }
  };

  const translateStatus = (s: string) => {
    const map: any = {
      created: "Pedido Criado",
      accepted: "Pedido Aceito",
      preparing: "Em Preparo",
      readyForPickup: "Pronto para Retirada",
      onTheWay: "Saiu para Entrega",
      delivered: "Entregue",
      cancelled: "Cancelado"
    };
    return map[s] || s.toUpperCase();
  };

  const formatPaymentMethod = (order: any) => {
    const method = order.paymentMethod || order.payment_method || order.payment || order.pagamento || order.formaPagamento;
    if (!method) return "Não informado";
    const m = method.toString().toLowerCase();
    if (m.includes("pix")) return "PIX";
    if (m.includes("credit") || m.includes("crédito")) return "Cartão de Crédito";
    if (m.includes("debit") || m.includes("débito")) return "Cartão de Débito";
    if (m.includes("cash") || m.includes("dinheiro")) return "Dinheiro";
    return method;
  };

  const handlePrint = (type: "cozinha" | "caixa" | "motoboy") => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const advanceStatus = async () => {
    let nextStatus = "preparing";
    if (order.status === "preparing") {
      nextStatus = order.type === "delivery" ? "onTheWay" : "readyForPickup";
    } else if (["onTheWay", "readyForPickup"].includes(order.status)) {
      nextStatus = "delivered";
    }
    try {
      await adminRequest(`/api/admin/orders/${order.id}`, "PATCH", { status: nextStatus });
      setOrder({ ...order, status: nextStatus, statusHistory: [...(order.statusHistory || []), nextStatus] });
      logger.info("Status do pedido avançado", {
        action: "ADVANCE_ORDER_STATUS",
        component: "OrderDetailsPage",
        resourceId: order.id,
        previousStatus: order.status,
        nextStatus,
      });
      if (nextStatus === "preparing") {
        handlePrint("cozinha");
      }
    } catch (error) {
      logger.error("Falha ao avançar status do pedido", {
        action: "ADVANCE_ORDER_STATUS",
        component: "OrderDetailsPage",
        resourceId: order.id,
        previousStatus: order.status,
        nextStatus,
        ...logger.fromError(error),
      });
      alert("Erro ao atualizar o status do pedido. Tente novamente.");
    }
  };

  return (
    <>
      {/* ── TELA PRINCIPAL (oculta na impressão) ── */}
      <div className="flex flex-col gap-6 h-full pb-8 overflow-y-auto font-sans print:hidden">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center text-sm font-semibold text-[#a0a0a0]">
            <button onClick={() => router.push("/admin/dashboard/pedidos")} className="hover:text-[#d48806] transition-colors">
              Pedidos
            </button>
            <ChevronRight size={16} className="mx-1" />
            <span className="text-[#1f1f1f]">Detalhes do Pedido</span>
          </div>

          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#e2e2e2] shadow-sm">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-[#1f1f1f]">
                Pedido #{(order.orderNumber || order.id.slice(-4).toUpperCase())}
              </h1>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-lg border border-[#e2e2e2] font-bold text-[#1f1f1f] bg-white hover:bg-[#f9f9f9] transition-colors flex items-center gap-2 shadow-sm text-sm">
                <Edit size={16} /> Editar Pedido
              </button>
              {!["delivered", "cancelled"].includes(order.status) && (
                <button 
                  onClick={advanceStatus}
                  className="px-5 py-2.5 rounded-lg font-bold text-white bg-[#855300] hover:bg-[#6b4200] transition-colors flex items-center gap-2 shadow-sm text-sm"
                >
                  <CheckCircle size={16} /> 
                  {order.status === "created" || order.status === "accepted" ? "Iniciar Preparo" : 
                   order.status === "preparing" ? "Concluir Preparo" : 
                   order.type === "delivery" ? "Marcar como Entregue" : "Marcar como Entregue"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="col-span-2 flex flex-col gap-6">
            {/* Itens */}
            <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[#e2e2e2] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#1f1f1f] flex items-center gap-2">
                  <ShoppingBagIcon /> Itens do Pedido
                </h2>
                <span className="text-sm font-semibold text-[#a0a0a0]">{order.items?.length || 0} itens</span>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className={`flex items-start gap-4 ${idx !== order.items.length - 1 ? "pb-4 border-b border-[#f0f0f0]" : ""}`}>
                    <div className="relative w-20 h-20 rounded-xl bg-[#f9f9f9] overflow-hidden border border-[#e2e2e2] shrink-0 flex items-center justify-center">
                      {item.product?.image ? (
                        <Image src={item.product.image.startsWith('http') || item.product.image.startsWith('data:') ? item.product.image : '/' + item.product.image} alt="Produto" fill sizes="80px" className="object-cover" unoptimized={!item.product?.image?.startsWith('http')} />
                      ) : (
                        <div className="text-[#a0a0a0] text-xs font-bold">SEM FOTO</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#1f1f1f]">{item.quantity}x {item.product?.name}</h3>
                      {item.product?.description && (
                        <p className="text-sm text-[#524435] mt-1">{item.product.description}</p>
                      )}
                      {item.observation && (
                        <p className="text-sm text-[#855300] italic mt-2 bg-[#fef08a]/30 inline-block px-2 py-1 rounded">
                          Obs: {item.observation}
                        </p>
                      )}
                    </div>
                    <div className="font-bold text-[#1f1f1f] whitespace-nowrap">
                      R$ {(item.product?.price * item.quantity).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#f9f9f9] p-5 border-t border-[#e2e2e2] flex flex-col gap-2 text-sm font-semibold text-[#524435]">
                <div className="flex justify-between w-full lg:w-1/2 ml-auto">
                  <span>Subtotal:</span>
                  <span>R$ {(order.total - (order.deliveryFee || 0)).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between w-full lg:w-1/2 ml-auto">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {(order.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between w-full lg:w-1/2 ml-auto pt-3 border-t border-[#e2e2e2] mt-1">
                  <span className="font-bold text-lg text-[#1f1f1f]">Total:</span>
                  <span className="font-black text-lg text-[#d48806]">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            {/* Impressão */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-[#1f1f1f] flex items-center gap-2 px-1">
                <Printer size={22} className="text-[#d48806]"/> Impressão
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => handlePrint("cozinha")} className="bg-white border border-[#e2e2e2] rounded-2xl p-5 hover:border-[#d48806] transition-colors flex flex-col items-center justify-center gap-2 shadow-sm">
                  <div className="text-[#d48806]"><i className="lucide-utensils"></i></div>
                  <div className="font-bold text-[#1f1f1f]">Imprimir Cozinha</div>
                  <div className="text-xs text-[#a0a0a0]">Itens, obs, tempo</div>
                </button>
                <button onClick={() => handlePrint("caixa")} className="bg-white border border-[#e2e2e2] rounded-2xl p-5 hover:border-[#d48806] transition-colors flex flex-col items-center justify-center gap-2 shadow-sm">
                  <div className="text-[#d48806]"><i className="lucide-receipt"></i></div>
                  <div className="font-bold text-[#1f1f1f]">Imprimir Caixa</div>
                  <div className="text-xs text-[#a0a0a0]">Valores, pagamento</div>
                </button>
                <button onClick={() => handlePrint("motoboy")} className="bg-white border border-[#e2e2e2] rounded-2xl p-5 hover:border-[#d48806] transition-colors flex flex-col items-center justify-center gap-2 shadow-sm">
                  <div className="text-[#d48806]"><i className="lucide-bike"></i></div>
                  <div className="font-bold text-[#1f1f1f]">Imprimir Motoboy</div>
                  <div className="text-xs text-[#a0a0a0]">Endereço, total</div>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Cliente */}
            <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-[#f9f9f9] border border-[#e2e2e2] flex items-center justify-center text-[#524435]">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1f1f1f]">Cliente</h3>
                  <p className="text-xs text-[#a0a0a0]">ID #{order.userId?.slice(-4).toUpperCase() || "BALC"}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-[#a0a0a0] tracking-wider uppercase mb-0.5">Nome Completo</p>
                  <p className="font-semibold text-[#1f1f1f]">{order.userName || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#a0a0a0] tracking-wider uppercase mb-0.5">Telefone</p>
                  <p className="font-semibold text-[#1f1f1f]">{order.userPhone || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#a0a0a0] tracking-wider uppercase mb-0.5">Tipo de Pedido</p>
                  <p className="font-semibold text-[#1f1f1f] flex items-center gap-1">
                    {order.table ? `Mesa ${order.table}` : order.type === "delivery" ? "🛵 Delivery" : "🏠 Retirada no Balcão"}
                  </p>
                </div>
              </div>
            </div>

            {/* Endereço */}
            {order.type === "delivery" && order.address && (
              <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={18} className="text-[#a0a0a0]" />
                  <h3 className="font-bold text-[#1f1f1f]">Endereço de Entrega</h3>
                </div>
                <div className="bg-[#f9f9f9] rounded-xl p-4 border border-[#f0f0f0]">
                  {typeof order.address === 'string' ? (
                    <p className="text-sm font-semibold text-[#1f1f1f]">{order.address}</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#1f1f1f] mb-1">
                        {order.address.street}, {order.address.number} {order.address.complement && `- ${order.address.complement}`}
                      </p>
                      <p className="text-sm text-[#524435] mb-2">{order.address.neighborhood} {order.address.city && `- ${order.address.city}, ${order.address.state}`}</p>
                      {order.address.reference && (
                        <p className="text-xs text-[#a0a0a0]"><span className="font-semibold">Referência:</span> {order.address.reference}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-5">
              <p className="text-[10px] font-bold text-[#a0a0a0] tracking-wider uppercase mb-2">Forma de Pagamento</p>
              <p className="font-bold text-[#1f1f1f] flex items-center gap-2 text-sm">
                <CreditCard size={16} /> {formatPaymentMethod(order)}
              </p>
            </div>

            {/* Notas Internas */}
            <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-sm p-5">
              <p className="text-[10px] font-bold text-[#a0a0a0] tracking-wider uppercase mb-2">Notas Internas</p>
              <div className="bg-[#ffebee]/50 border border-[#ffcdd2] rounded-xl p-4">
                <p className="text-sm text-[#c62828] font-medium italic">
                  {order.internalNote || "Nenhuma nota adicionada."}
                </p>
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-[#1f1f1f] rounded-2xl shadow-sm p-5 text-white">
              <h3 className="font-bold mb-4">Histórico do Pedido</h3>
              <div className="flex flex-col gap-4">
                {order.statusHistory?.map((s: string, i: number) => (
                  <div key={i} className="flex gap-3 relative">
                    {i !== order.statusHistory.length - 1 && (
                      <div className="absolute left-1.5 top-5 bottom-[-20px] w-0.5 bg-[#524435]" />
                    )}
                    <div className="w-3 h-3 rounded-full mt-1 shrink-0 bg-[#d48806]" />
                    <div>
                      <p className="text-sm font-bold text-white">{translateStatus(s)}</p>
                      <p className="text-xs text-[#a0a0a0]">Status atualizado</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ÁREA DE IMPRESSÃO (visível apenas ao imprimir) ── */}
      {printType === "cozinha" && (
        <div className="hidden print:block text-black font-mono w-[80mm] mx-auto text-sm bg-white p-4">
          <h1 className="text-2xl font-black text-center mb-1">COZINHA</h1>
          <div className="border-t-2 border-black border-dashed my-2" />
          
          <h2 className="text-5xl font-black text-center my-4">#{(order.orderNumber || order.id.slice(-4).toUpperCase())}</h2>
          
          <div className="border-2 border-black p-2 text-center font-bold text-xl uppercase mb-4">
            {order.table ? `MESA ${order.table}` : order.type === "delivery" ? "DELIVERY" : "BALCÃO / RETIRADA"}
          </div>

          <p className="font-bold text-xs">Data: {new Date().toLocaleString('pt-BR')}</p>
          <p className="font-bold text-xs mb-2">Cliente: {order.userName || "Não informado"}</p>

          <div className="border-t-4 border-black my-2" />
          <p className="text-center font-bold my-2 text-lg">--- PREPARAR ITENS ---</p>
          
          <div className="flex flex-col gap-3 mb-2">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="border-b-2 border-black border-dashed pb-3 last:border-0">
                <p className="font-black text-xl">{item.quantity}x {item.product?.name}</p>
                {item.observation && (
                  <div className="border-2 border-black p-2 mt-1">
                    <p className="font-bold uppercase text-sm">OBS: {item.observation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t-4 border-black my-4" />
          
          <div className="border-4 border-black p-3 text-center">
            <p className="font-bold text-xs uppercase">TEMPO ESTIMADO</p>
            <p className="font-black text-2xl">40 MIN</p>
          </div>
        </div>
      )}

      {printType === "caixa" && (
        <div className="hidden print:block text-black font-mono w-[80mm] mx-auto text-sm bg-white p-4">
          <h1 className="text-xl font-bold text-center mb-1">CHOPERIA 820</h1>
          <p className="text-center text-xs">Rua Hum, 820 - Centro</p>
          <p className="text-center text-xs mb-2">Tel: (16) 99987-2820</p>
          <div className="border-t-2 border-black border-dashed my-2" />
          
          <h2 className="text-3xl font-black text-center my-4">#{(order.orderNumber || order.id.slice(-4).toUpperCase())}</h2>
          
          <div className="border-2 border-black p-2 text-center font-bold text-lg uppercase mb-4">
            {order.table ? `MESA ${order.table}` : order.type === "delivery" ? "DELIVERY" : "BALCÃO / RETIRADA"}
          </div>

          <p className="font-bold text-xs">Data: {new Date().toLocaleString('pt-BR')}</p>
          <p className="font-bold text-xs mb-2">Cliente: {order.userName || "Não informado"}</p>
          
          <div className="border-t-4 border-black my-2" />
          <p className="text-center font-bold my-2">--- ITENS DO PEDIDO ---</p>
          
          <div className="flex flex-col gap-1 mb-2">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm font-bold">
                <span>{item.quantity}x {item.product?.name}</span>
                <span>R$ {(item.product?.price * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>

          <div className="border-t-4 border-black my-2" />
          
          <p className="font-bold text-xs uppercase mb-1">Situação do Pagamento:</p>
          <div className="border-2 border-black p-2 text-center font-bold text-sm uppercase mb-3">
            {order.isPaid ? "PAGO" : "NÃO FOI PAGO AINDA"}
          </div>

          <p className="font-bold text-xs uppercase mb-1">Forma Escolhida:</p>
          <div className="border-2 border-black p-2 text-center font-bold text-sm uppercase mb-4">
            {formatPaymentMethod(order)}
          </div>

          <div className="border-t-4 border-black my-2" />
          
          <div className="flex justify-between items-center my-2">
            <span className="font-bold text-xl uppercase">Total:</span>
            <span className="font-black text-xl">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
          </div>

          <div className="border-t-2 border-black border-dashed my-2" />
          
          <p className="text-center mt-4 text-xs font-bold">Agradecemos a preferência!</p>
          <p className="text-center text-xs font-bold">Choperia 820</p>
        </div>
      )}

      {printType === "motoboy" && (
        <div className="hidden print:block text-black font-mono w-[80mm] mx-auto text-sm bg-white p-4">
          <h1 className="text-xl font-bold text-center mb-1">ENTREGA MOTOBOY</h1>
          <div className="border-t-2 border-black border-dashed my-2" />
          
          <h2 className="text-4xl font-black text-center my-4">#{(order.orderNumber || order.id.slice(-4).toUpperCase())}</h2>
          
          <div className="border-2 border-black p-2 text-center font-bold text-lg uppercase mb-4">
            {order.type === "delivery" ? "DELIVERY" : "RETIRADA"}
          </div>

          <p className="font-bold text-xs mb-1">Cliente: {order.userName || "Não informado"}</p>
          <p className="font-bold text-xs mb-2">Tel: {order.userPhone || "Não informado"}</p>

          <div className="border-t-4 border-black my-2" />
          <p className="text-center font-bold my-2">--- ENDEREÇO DE ENTREGA ---</p>
          
          <div className="border-2 border-black p-3 mb-2">
            {order.address ? (
              typeof order.address === 'string' ? (
                <p className="font-bold text-lg leading-tight">{order.address}</p>
              ) : (
                <>
                  <p className="font-bold text-lg leading-tight">{order.address.street}, {order.address.number}</p>
                  {order.address.complement && <p className="font-bold text-md leading-tight mt-1">{order.address.complement}</p>}
                  <p className="font-bold text-md leading-tight mt-1">{order.address.neighborhood}</p>
                  {order.address.reference && <p className="text-xs font-bold mt-2 border-t border-black border-dashed pt-1">Ref: {order.address.reference}</p>}
                </>
              )
            ) : (
              <p className="font-bold text-center">Retirada no Balcão</p>
            )}
          </div>

          <div className="border-t-4 border-black my-2" />
          <p className="text-center font-bold my-2">--- ITENS DO PEDIDO ---</p>
          
          <div className="flex flex-col gap-1 mb-2">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="text-sm font-bold">
                {item.quantity}x {item.product?.name}
              </div>
            ))}
          </div>

          <div className="border-t-4 border-black my-2" />
          
          <p className="font-bold text-xs uppercase mb-1 mt-2">Forma de Pagamento:</p>
          <div className="border-2 border-black p-2 text-center font-bold text-sm uppercase mb-2">
            {formatPaymentMethod(order)}
          </div>

          <div className="border-4 border-black p-2 mt-4 text-center">
            <p className="font-bold text-xs uppercase mb-1">COBRAR DO CLIENTE:</p>
            <p className="font-black text-2xl">R$ {Number(order.total).toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      )}
    </>
  );
}

function ShoppingBagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  );
}
