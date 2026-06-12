/*
  Warnings:

  - The values [BLOOD,SHOTS] on the enum `EventType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('BLOOD', 'FIRE', 'HUNTING', 'SHOTS', 'VACCINATION', 'DEAD_ANIMAL', 'AGGRESSIVE_ANIMAL', 'BLOCKED_PATH', 'ILLEGAL_DUMP', 'SHOTS_HEARD', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "EventType_new" AS ENUM ('FIRE', 'HUNTING', 'VACCINATION');
ALTER TABLE "Event" ALTER COLUMN "type" TYPE "EventType_new" USING ("type"::text::"EventType_new");
ALTER TYPE "EventType" RENAME TO "EventType_old";
ALTER TYPE "EventType_new" RENAME TO "EventType";
DROP TYPE "public"."EventType_old";
COMMIT;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
