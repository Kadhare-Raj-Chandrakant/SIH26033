-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SellerProfile_verificationStatus_idx" ON "SellerProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
