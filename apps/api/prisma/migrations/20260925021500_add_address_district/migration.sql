-- AlterTable
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "district" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Address_state_district_idx" ON "Address"("state", "district");
