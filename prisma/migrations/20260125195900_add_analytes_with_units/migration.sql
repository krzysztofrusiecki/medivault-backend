-- CreateEnum
CREATE TYPE "AnalyteValueType" AS ENUM ('NUMERIC', 'TEXT');

-- CreateTable
CREATE TABLE "analytes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueType" "AnalyteValueType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyte_units" (
    "id" TEXT NOT NULL,
    "analyteId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "factorToCanonical" DECIMAL(20,10) NOT NULL,
    "offset" DECIMAL(20,10) NOT NULL DEFAULT 0,

    CONSTRAINT "analyte_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analytes_slug_key" ON "analytes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "analyte_units_analyteId_unit_key" ON "analyte_units"("analyteId", "unit");

-- AddForeignKey
ALTER TABLE "analyte_units" ADD CONSTRAINT "analyte_units_analyteId_fkey" FOREIGN KEY ("analyteId") REFERENCES "analytes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
