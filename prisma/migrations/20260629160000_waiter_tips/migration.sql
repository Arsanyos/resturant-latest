-- CreateEnum
CREATE TYPE "TipStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "recipientStaffId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "TipStatus" NOT NULL DEFAULT 'PENDING',
    "telebirrRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tip_sessionId_key" ON "Tip"("sessionId");

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_recipientStaffId_fkey" FOREIGN KEY ("recipientStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
