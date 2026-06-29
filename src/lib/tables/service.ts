import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import type { CreateTableInput, UpdateTableInput } from "@/lib/validation/table";

export class TableError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "TableError";
  }
}

export async function listTables(restaurantId: string) {
  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: "asc" },
  });

  return {
    tables: tables.map((t) => ({
      id: t.id,
      number: t.number,
      label: t.label,
      capacity: t.capacity,
      isActive: t.isActive,
      qrToken: t.qrToken,
    })),
  };
}

export async function createTable(
  restaurantId: string,
  input: CreateTableInput,
  staff: StaffSessionData
) {
  let number = input.number;
  if (!number) {
    const max = await prisma.table.aggregate({
      where: { restaurantId },
      _max: { number: true },
    });
    number = (max._max.number ?? 0) + 1;
  }

  const existing = await prisma.table.findUnique({
    where: { restaurantId_number: { restaurantId, number } },
  });
  if (existing) {
    throw new TableError("Table number already exists", 409);
  }

  const table = await prisma.$transaction(async (tx) => {
    const record = await tx.table.create({
      data: {
        restaurantId,
        number,
        label: input.label,
        capacity: input.capacity ?? 4,
        qrToken: randomBytes(16).toString("hex"),
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId,
        entityType: "Table",
        entityId: record.id,
        action: "OWNER_CREATED_TABLE",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { number, label: input.label },
      },
    });

    return record;
  });

  return {
    id: table.id,
    number: table.number,
    label: table.label,
    capacity: table.capacity,
    isActive: table.isActive,
  };
}

export async function updateTable(
  tableId: string,
  input: UpdateTableInput,
  staff: StaffSessionData
) {
  const existing = await prisma.table.findFirst({
    where: { id: tableId, restaurantId: staff.restaurantId },
  });

  if (!existing) {
    throw new TableError("Table not found", 404);
  }

  const table = await prisma.$transaction(async (tx) => {
    const record = await tx.table.update({
      where: { id: tableId },
      data: {
        label: input.label,
        capacity: input.capacity,
        isActive: input.isActive,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "Table",
        entityId: tableId,
        action: "OWNER_UPDATED_TABLE",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { before: existing, after: input },
      },
    });

    return record;
  });

  return {
    id: table.id,
    number: table.number,
    label: table.label,
    capacity: table.capacity,
    isActive: table.isActive,
  };
}

export type { CreateTableInput, UpdateTableInput };
