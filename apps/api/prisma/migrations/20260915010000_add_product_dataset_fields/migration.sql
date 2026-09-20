-- AlterTable
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "farmerName" TEXT,
ADD COLUMN IF NOT EXISTS "farmName" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "district" TEXT,
ADD COLUMN IF NOT EXISTS "marketMandi" TEXT,
ADD COLUMN IF NOT EXISTS "varietyType" TEXT,
ADD COLUMN IF NOT EXISTS "sellingUnit" TEXT DEFAULT 'Rs./Quintal',
ADD COLUMN IF NOT EXISTS "officialMandiModalPriceInr" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "illustrativeFarmerListingReferenceInr" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "officialPriceDate" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "primaryImage" TEXT;

-- AlterTable Default
ALTER TABLE "Product" ALTER COLUMN "price" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_state_idx" ON "Product"("state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_district_idx" ON "Product"("district");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_marketMandi_idx" ON "Product"("marketMandi");
