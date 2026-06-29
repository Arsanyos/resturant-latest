export interface OrderItemView {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  kitchenStatus: string;
  notes: string | null;
}

export interface OrderView {
  id: string;
  orderNumber: number;
  createdAt: string;
  items: OrderItemView[];
}

export function sortOrdersByNumber(orders: OrderView[]): OrderView[] {
  return [...orders].sort((a, b) => a.orderNumber - b.orderNumber);
}

export function allItemsServed(orders: OrderView[]): boolean {
  if (orders.length === 0) return false;
  return orders.every((order) =>
    order.items.every(
      (item) => item.kitchenStatus === "SERVED" || item.kitchenStatus === "CANCELLED"
    )
  );
}

export function hasOrderItems(orders: OrderView[]): boolean {
  return orders.some((order) => order.items.length > 0);
}
