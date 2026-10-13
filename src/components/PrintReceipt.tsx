export default function PrintReceipt({ order }: { order: any }) {
  if (!order) return null;

  const isDelivery = order.type === 'delivery';

  // Format date
  let dateObj = new Date();
  if (order.createdAt) {
    if (order.createdAt.toDate) dateObj = order.createdAt.toDate();
    else if (order.createdAt.seconds) dateObj = new Date(order.createdAt.seconds * 1000);
    else dateObj = new Date(order.createdAt);
  }

  const dateStr = dateObj.toLocaleDateString('pt-BR');
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Render Address safely
  const renderAddress = () => {
    if (!order.address) return "Endereço não informado.";
    if (typeof order.address === 'string') return order.address;
    
    const { street, number, neighborhood, complement, reference } = order.address;
    let parts = [];
    if (street) parts.push(street);
    if (number) parts.push(number);
    let line1 = parts.join(', ');
    
    return (
      <div className="flex flex-col gap-0.5 mt-1">
        <span>{line1 || "Endereço incompleto"}</span>
        {complement && <span>{complement}</span>}
        {neighborhood && <span>{neighborhood}</span>}
        {reference && <span className="mt-1 border-t border-black border-dashed pt-1">Ref: {reference}</span>}
      </div>
    );
  };

  const getPaymentMethod = () => {
    const method = order.paymentMethod || order.payment_method || order.payment || order.pagamento;
    if (!method) return "NÃO INFORMADO";
    const m = method.toString().toLowerCase();
    if (m.includes("pix")) return "PIX";
    if (m.includes("credit") || m.includes("crédito")) return "CARTÃO DE CRÉDITO";
    if (m.includes("debit") || m.includes("débito")) return "CARTÃO DE DÉBITO";
    if (m.includes("cash") || m.includes("dinheiro")) return "DINHEIRO";
    return method.toString().toUpperCase();
  };

  const isPaid = order.isPaid || order.paid || false;

  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
      @media print {
        @page { margin: 0; }
        body { margin: 0; padding: 0; background-color: white; }
      }
    `}} />
    
    <div className="hidden print:block text-black font-mono w-[80mm] mx-auto text-sm bg-white p-4">
      <h1 className="text-xl font-bold text-center mb-1">CHOPERIA 820</h1>
      <p className="text-center text-xs">Rua Hum, 820 - Centro</p>
      <p className="text-center text-xs mb-2">Tel: (16) 99987-2820</p>
      <div className="border-t-2 border-black border-dashed my-2" />
      
      <h2 className="text-3xl font-black text-center my-4">#{order.id?.slice(-4).toUpperCase()}</h2>
      
      <div className="border-2 border-black p-2 text-center font-bold text-lg uppercase mb-4">
        {isDelivery ? "DELIVERY" : "BALCÃO / RETIRADA"}
      </div>

      <p className="font-bold text-xs">Data: {dateStr} às {timeStr}</p>
      <p className="font-bold text-xs mb-2">Cliente: {order.userName || order.customerName || "Não informado"}</p>
      {order.userPhone && <p className="font-bold text-xs mb-2">Tel: {order.userPhone}</p>}
      
      {isDelivery && (
        <>
          <div className="border-t-4 border-black my-2" />
          <p className="text-center font-bold my-2">--- ENDEREÇO DE ENTREGA ---</p>
          <div className="border-2 border-black p-3 mb-2 font-bold text-lg leading-tight">
            {renderAddress()}
          </div>
        </>
      )}

      <div className="border-t-4 border-black my-2" />
      <p className="text-center font-bold my-2">--- ITENS DO PEDIDO ---</p>
      
      <div className="flex flex-col gap-1 mb-2">
        {order.items?.map((item: any, index: number) => (
          <div key={index} className="flex justify-between text-sm font-bold">
            <span className="max-w-[70%]">{item.quantity}x {item.product?.name}</span>
            {item.product?.price && (
              <span>R$ {((item.product.price) * item.quantity).toFixed(2).replace('.', ',')}</span>
            )}
          </div>
        ))}
      </div>

      {order.observation && (
        <div className="border-2 border-black p-2 mt-2">
          <p className="font-bold uppercase text-xs">OBS: {order.observation}</p>
        </div>
      )}

      <div className="border-t-4 border-black my-2" />
      
      <p className="font-bold text-xs uppercase mb-1">Situação do Pagamento:</p>
      <div className="border-2 border-black p-2 text-center font-bold text-sm uppercase mb-3">
        {isPaid ? "PAGO VIA APP" : "NÃO FOI PAGO AINDA"}
      </div>

      <p className="font-bold text-xs uppercase mb-1">Forma Escolhida:</p>
      <div className="border-2 border-black p-2 text-center font-bold text-sm uppercase mb-4">
        {getPaymentMethod()}
      </div>

      <div className="border-t-4 border-black my-2" />
      
      <div className="flex flex-col gap-1 text-[13px] mb-2 font-bold">
        {order.subtotal !== undefined && (
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
          <div className="flex justify-between">
            <span>Taxa de Entrega:</span>
            <span>R$ {order.deliveryFee.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center my-2 border-t-2 border-black pt-2">
        <span className="font-bold text-xl uppercase">Total:</span>
        <span className="font-black text-xl">R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}</span>
      </div>

      <div className="border-t-2 border-black border-dashed my-2" />
      
      <p className="text-center mt-4 text-xs font-bold">Agradecemos a preferência!</p>
      <p className="text-center text-xs font-bold">Choperia 820</p>
    </div>
    </>
  );
}
