-- CreateTable
CREATE TABLE "AiPredictionLog" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "userId" TEXT,
    "inputFeatures" JSONB NOT NULL,
    "predictionOutput" JSONB NOT NULL,
    "actualOutcome" JSONB,
    "userDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPredictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiPredictionLog_modelName_modelVersion_idx" ON "AiPredictionLog"("modelName", "modelVersion");

-- CreateIndex
CREATE INDEX "AiPredictionLog_userId_idx" ON "AiPredictionLog"("userId");

-- CreateIndex
CREATE INDEX "AiPredictionLog_createdAt_idx" ON "AiPredictionLog"("createdAt");
