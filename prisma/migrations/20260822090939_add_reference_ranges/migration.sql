-- CreateTable
CREATE TABLE "reference_ranges" (
    "id" TEXT NOT NULL,
    "analyteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gender" "Gender",
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minValue" DECIMAL(20,10),
    "maxValue" DECIMAL(20,10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reference_ranges_analyteId_idx" ON "reference_ranges"("analyteId");

-- AddForeignKey
ALTER TABLE "reference_ranges" ADD CONSTRAINT "reference_ranges_analyteId_fkey" FOREIGN KEY ("analyteId") REFERENCES "analytes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
