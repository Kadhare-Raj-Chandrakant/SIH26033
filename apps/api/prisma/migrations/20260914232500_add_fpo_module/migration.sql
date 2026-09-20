-- CreateEnum
CREATE TYPE "FpoLegalStructure" AS ENUM ('PRODUCER_COMPANY', 'COOPERATIVE', 'SECTION_8', 'OTHER');

-- CreateEnum
CREATE TYPE "FpoStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FpoMembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'LEFT');

-- CreateEnum
CREATE TYPE "FpoListingStatus" AS ENUM ('COMMITTED', 'COLLECTED', 'AGGREGATED', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FpoBatchStatus" AS ENUM ('OPEN', 'SEALED', 'MATCHED', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FpoBuyRequestStatus" AS ENUM ('OPEN', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FpoSettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISTRIBUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('INDIVIDUAL', 'FPO_BULK');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'INDIVIDUAL';

-- CreateTable
CREATE TABLE "FpoOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "legalStructure" "FpoLegalStructure" NOT NULL,
    "status" "FpoStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "registrationDate" TIMESTAMP(3),
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "bankAccountNumber" TEXT,
    "ifscCode" TEXT,
    "bankName" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpoMembership" (
    "id" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "status" "FpoMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "shareCapital" DECIMAL(10,2),
    "joinedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpoListing" (
    "id" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "quantityQuintals" DECIMAL(10,2) NOT NULL,
    "qualityGrade" TEXT,
    "expectedHarvestDate" TIMESTAMP(3),
    "actualCollectedQty" DECIMAL(10,2),
    "notes" TEXT,
    "status" "FpoListingStatus" NOT NULL DEFAULT 'COMMITTED',
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpoAggregationBatch" (
    "id" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "totalQuantity" DECIMAL(10,2) NOT NULL,
    "qualityGrade" TEXT,
    "status" "FpoBatchStatus" NOT NULL DEFAULT 'OPEN',
    "sealedAt" TIMESTAMP(3),
    "buyRequestId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoAggregationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpoBuyRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "fpoId" TEXT,
    "commodity" TEXT NOT NULL,
    "requiredQuantity" DECIMAL(10,2) NOT NULL,
    "filledQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "targetPrice" DECIMAL(10,2),
    "deliveryCity" TEXT,
    "maxDistanceKm" DOUBLE PRECISION,
    "qualityRequirements" TEXT,
    "notes" TEXT,
    "status" "FpoBuyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoBuyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpoSettlement" (
    "id" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "adminId" TEXT,
    "orderId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "fpoCommission" DECIMAL(10,2) NOT NULL,
    "transportCost" DECIMAL(10,2) NOT NULL,
    "handlingCost" DECIMAL(10,2) NOT NULL,
    "otherDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netDistributable" DECIMAL(10,2) NOT NULL,
    "status" "FpoSettlementStatus" NOT NULL DEFAULT 'PENDING',
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpoFarmerPayment" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "ratePerQuintal" DECIMAL(10,2) NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "status" "FpoSettlementStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoFarmerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FpoOrganization_registrationNumber_key" ON "FpoOrganization"("registrationNumber");

-- CreateIndex
CREATE INDEX "FpoOrganization_state_district_idx" ON "FpoOrganization"("state", "district");

-- CreateIndex
CREATE INDEX "FpoOrganization_status_idx" ON "FpoOrganization"("status");

-- CreateIndex
CREATE INDEX "FpoMembership_farmerId_status_idx" ON "FpoMembership"("farmerId", "status");

-- CreateIndex
CREATE INDEX "FpoMembership_fpoId_idx" ON "FpoMembership"("fpoId");

-- CreateIndex
CREATE UNIQUE INDEX "FpoMembership_fpoId_farmerId_key" ON "FpoMembership"("fpoId", "farmerId");

-- CreateIndex
CREATE INDEX "FpoListing_fpoId_status_idx" ON "FpoListing"("fpoId", "status");

-- CreateIndex
CREATE INDEX "FpoListing_farmerId_idx" ON "FpoListing"("farmerId");

-- CreateIndex
CREATE INDEX "FpoListing_commodity_idx" ON "FpoListing"("commodity");

-- CreateIndex
CREATE UNIQUE INDEX "FpoAggregationBatch_batchNumber_key" ON "FpoAggregationBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "FpoAggregationBatch_fpoId_status_idx" ON "FpoAggregationBatch"("fpoId", "status");

-- CreateIndex
CREATE INDEX "FpoAggregationBatch_commodity_status_idx" ON "FpoAggregationBatch"("commodity", "status");

-- CreateIndex
CREATE INDEX "FpoBuyRequest_status_commodity_idx" ON "FpoBuyRequest"("status", "commodity");

-- CreateIndex
CREATE INDEX "FpoBuyRequest_buyerId_idx" ON "FpoBuyRequest"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "FpoSettlement_orderId_key" ON "FpoSettlement"("orderId");

-- CreateIndex
CREATE INDEX "FpoSettlement_fpoId_idx" ON "FpoSettlement"("fpoId");

-- CreateIndex
CREATE INDEX "FpoSettlement_batchId_idx" ON "FpoSettlement"("batchId");

-- CreateIndex
CREATE INDEX "FpoFarmerPayment_settlementId_idx" ON "FpoFarmerPayment"("settlementId");

-- CreateIndex
CREATE INDEX "FpoFarmerPayment_farmerId_idx" ON "FpoFarmerPayment"("farmerId");

-- CreateIndex
CREATE INDEX "FpoFarmerPayment_listingId_idx" ON "FpoFarmerPayment"("listingId");

-- AddForeignKey
ALTER TABLE "FpoOrganization" ADD CONSTRAINT "FpoOrganization_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoMembership" ADD CONSTRAINT "FpoMembership_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FpoOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoMembership" ADD CONSTRAINT "FpoMembership_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoListing" ADD CONSTRAINT "FpoListing_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FpoOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoListing" ADD CONSTRAINT "FpoListing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoListing" ADD CONSTRAINT "FpoListing_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FpoAggregationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoAggregationBatch" ADD CONSTRAINT "FpoAggregationBatch_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FpoOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoAggregationBatch" ADD CONSTRAINT "FpoAggregationBatch_buyRequestId_fkey" FOREIGN KEY ("buyRequestId") REFERENCES "FpoBuyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoBuyRequest" ADD CONSTRAINT "FpoBuyRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoBuyRequest" ADD CONSTRAINT "FpoBuyRequest_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FpoOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoSettlement" ADD CONSTRAINT "FpoSettlement_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FpoOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoSettlement" ADD CONSTRAINT "FpoSettlement_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoSettlement" ADD CONSTRAINT "FpoSettlement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FpoAggregationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoFarmerPayment" ADD CONSTRAINT "FpoFarmerPayment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "FpoSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoFarmerPayment" ADD CONSTRAINT "FpoFarmerPayment_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoFarmerPayment" ADD CONSTRAINT "FpoFarmerPayment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "FpoListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
