-- CreateTable
CREATE TABLE "BdlSync" (
    "dataset" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BdlSync_pkey" PRIMARY KEY ("dataset")
);
