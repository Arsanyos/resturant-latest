import type { CashierSessionChip } from "@/lib/cashier/service";

export interface CashierSessionSummary {
  sessionId: string;
  tableId: string;
  tableNumber: number;
  tableLabel: string;
  startedAt: string;
  startedByType: string;
  orderCount: number;
  chip: CashierSessionChip;
  paymentStatus: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  paymentId: string | null;
}

export interface VerificationQueueItem {
  transactionId: string;
  paymentId: string;
  sessionId: string;
  tableNumber: number;
  tableLabel: string;
  amount: number;
  telebirrRef: string | null;
  telebirrStatus: string | null;
  createdAt: string;
}

export interface SessionBill {
  session: {
    id: string;
    startedAt: string;
    startedByType: string;
    status: string;
  };
  table: {
    id: string;
    number: number;
    label: string;
  };
  restaurant: {
    id: string;
    name: string;
    currency: string;
  };
  canPay: boolean;
  orders: Array<{
    id: string;
    orderNumber: number;
    createdAt: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      kitchenStatus: string;
      notes: string | null;
    }>;
  }>;
  payment: {
    id: string;
    status: string;
    subtotal: number;
    serviceCharge: number;
    tax: number;
    totalDue: number;
    totalPaid: number;
    balance: number;
    transactions: Array<{
      id: string;
      amount: number;
      method: string;
      status: string;
      telebirrRef: string | null;
      telebirrStatus: string | null;
      cashTendered: number | null;
      createdAt: string;
    }>;
  } | null;
}
