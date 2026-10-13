export type OrderRecord = {
  status?: unknown;
  statusHistory?: unknown;
  currentStatus?: unknown;
  createdAt?: unknown;
};

/** Normaliza pedidos criados pelo aplicativo, pelo PDV e por versões legadas. */
export function getOrderStatus(order: OrderRecord): string {
  if (typeof order.status === "string" && order.status.trim()) return order.status;
  if (typeof order.currentStatus === "string" && order.currentStatus.trim()) return order.currentStatus;
  if (Array.isArray(order.statusHistory)) {
    const lastStatus = [...order.statusHistory].reverse().find((status) => typeof status === "string" && status.trim());
    if (typeof lastStatus === "string") return lastStatus;
  }
  return "created";
}

export function isCancelledOrder(order: OrderRecord): boolean {
  const status = getOrderStatus(order);
  return status === "cancelled" || status === "cancelado" ||
    (Array.isArray(order.statusHistory) && order.statusHistory.includes("cancelled"));
}

export function toOrderDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
