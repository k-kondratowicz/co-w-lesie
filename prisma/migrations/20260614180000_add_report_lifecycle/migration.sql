-- CreateEnum
CREATE TYPE "VoteKind" AS ENUM ('CONFIRM', 'FLAG');

-- AlterTable
ALTER TABLE "Report"
  ADD COLUMN "confirmations" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "flags" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReportVote" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kind" "VoteKind" NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportVote_reportId_idx" ON "ReportVote"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportVote_reportId_ipHash_key" ON "ReportVote"("reportId", "ipHash");

-- AddForeignKey
ALTER TABLE "ReportVote" ADD CONSTRAINT "ReportVote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
