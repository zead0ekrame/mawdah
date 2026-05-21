-- CreateTable
CREATE TABLE "AlgorithmWeights" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "religious" DOUBLE PRECISION NOT NULL DEFAULT 0.28,
    "geographic" DOUBLE PRECISION NOT NULL DEFAULT 0.22,
    "postMarriage" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "family" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "education" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "physical" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "totalDecisions" INTEGER NOT NULL DEFAULT 0,
    "lastTrainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlgorithmWeights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightUpdateLog" (
    "id" TEXT NOT NULL,
    "religious" DOUBLE PRECISION NOT NULL,
    "geographic" DOUBLE PRECISION NOT NULL,
    "postMarriage" DOUBLE PRECISION NOT NULL,
    "family" DOUBLE PRECISION NOT NULL,
    "education" DOUBLE PRECISION NOT NULL,
    "physical" DOUBLE PRECISION NOT NULL,
    "decisionBatch" INTEGER NOT NULL,
    "trigger" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightUpdateLog_pkey" PRIMARY KEY ("id")
);
