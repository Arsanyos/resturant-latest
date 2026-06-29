import { TipStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getShiftDate } from "@/lib/waiter/shift";

export async function getShiftTipSummary(staffId: string) {
  const shiftStart = getShiftDate();
  const shiftEnd = new Date(shiftStart);
  shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);

  const tips = await prisma.tip.findMany({
    where: {
      recipientStaffId: staffId,
      status: TipStatus.PAID,
      createdAt: { gte: shiftStart, lt: shiftEnd },
    },
    select: { amount: true },
  });

  const tipTotal = tips.reduce((sum, tip) => sum + Number(tip.amount), 0);

  return {
    tipCount: tips.length,
    tipTotal,
  };
}
