-- CreateTable
CREATE TABLE "SavedArea" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "name" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedArea_visitorId_idx" ON "SavedArea"("visitorId");
