-- CreateTable
CREATE TABLE "QuoteCache" (
    "key" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "previousClose" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "QuoteCache_expiresAt_idx" ON "QuoteCache"("expiresAt");

-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN "priceStale" BOOLEAN NOT NULL DEFAULT false;
