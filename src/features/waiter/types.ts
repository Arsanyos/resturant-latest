import type { MenuCategory } from "@/features/customer/types";
import type { WaiterTableStatus } from "@/lib/waiter/service";

export interface WaiterTableSummary {
  id: string;
  number: number;
  label: string;
  capacity: number;
  status: WaiterTableStatus;
  assignedWaiters: Array<{ id: string; name: string }>;
  isAssignedToMe: boolean;
  canMutate: boolean;
  pendingAssistanceCount: number;
  session: {
    id: string;
    startedByType: string;
    startedAt: string;
    orderCount: number;
    itemCount: number;
    paymentStatus: string | null;
  } | null;
}

export interface WaiterTablesData {
  tables: WaiterTableSummary[];
}

export interface AssistanceRequestSummary {
  id: string;
  tableId: string;
  tableNumber: number;
  tableLabel: string;
  sessionId: string | null;
  deviceInfo: string | null;
  status: string;
  createdAt: string;
}

export interface WaiterTableDetail {
  table: {
    id: string;
    number: number;
    label: string;
    capacity: number;
  };
  assignedWaiters: Array<{ id: string; name: string }>;
  isAssignedToMe: boolean;
  canMutate: boolean;
  session: {
    id: string;
    startedByType: string;
    startedAt: string;
    orders: Array<{
      id: string;
      orderNumber: number;
      createdAt: string;
      takenByStaffId: string | null;
      items: Array<{
        id: string;
        menuItemId: string;
        nameI18nKey: string;
        quantity: number;
        unitPrice: number;
        kitchenStatus: string;
        modifiersJson: unknown;
        notes: string | null;
        cancelReason: string | null;
      }>;
    }>;
    payment: {
      subtotal: number;
      serviceCharge: number;
      tax: number;
      totalDue: number;
      totalPaid: number;
      status: string;
    } | null;
  } | null;
}

export interface WaiterMenuData {
  menu: MenuCategory[];
  currency: string;
  isOpen: boolean;
}
