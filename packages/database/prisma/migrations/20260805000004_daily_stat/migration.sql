-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_date_category_eventType_key" ON "DailyStat"("date", "category", "eventType");

-- CreateIndex
CREATE INDEX "DailyStat_date_idx" ON "DailyStat"("date");

-- CreateIndex
CREATE INDEX "DailyStat_category_idx" ON "DailyStat"("category");

-- CreateIndex
CREATE INDEX "DailyStat_eventType_idx" ON "DailyStat"("eventType");