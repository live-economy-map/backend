-- CreateEnum
CREATE TYPE "DataSourceKey" AS ENUM ('VIIRS', 'GHSL', 'RWI', 'GDELT');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceTier" AS ENUM ('OFFICIAL', 'MARKET_REPORT', 'INFRASTRUCTURE', 'LOCAL_NEWS');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "key" "DataSourceKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GridCell" (
    "id" TEXT NOT NULL,
    "cellRow" INTEGER NOT NULL,
    "cellCol" INTEGER NOT NULL,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "boundaryGeoJson" JSONB NOT NULL,
    "areaLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GridCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalValue" (
    "id" TEXT NOT NULL,
    "gridCellId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "normalizedValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreWeightConfig" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreWeightConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceWeight" (
    "id" TEXT NOT NULL,
    "scoreWeightConfigId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SourceWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositeScoreSnapshot" (
    "id" TEXT NOT NULL,
    "gridCellId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "scoreWeightConfigId" TEXT NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompositeScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "gridCellId" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "evidenceDescription" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "evidenceTier" "EvidenceTier",
    "scoreRiseDate" TIMESTAMP(3) NOT NULL,
    "confirmedDate" TIMESTAMP(3) NOT NULL,
    "beforeImageUrl" TEXT,
    "afterImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_key_key" ON "DataSource"("key");

-- CreateIndex
CREATE INDEX "DataSource_isActive_idx" ON "DataSource"("isActive");

-- CreateIndex
CREATE INDEX "PipelineRun_dataSourceId_startedAt_idx" ON "PipelineRun"("dataSourceId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GridCell_cellRow_cellCol_key" ON "GridCell"("cellRow", "cellCol");

-- CreateIndex
CREATE INDEX "SignalValue_period_idx" ON "SignalValue"("period");

-- CreateIndex
CREATE UNIQUE INDEX "SignalValue_gridCellId_dataSourceId_period_key" ON "SignalValue"("gridCellId", "dataSourceId", "period");

-- CreateIndex
CREATE INDEX "ScoreWeightConfig_isActive_idx" ON "ScoreWeightConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SourceWeight_scoreWeightConfigId_dataSourceId_key" ON "SourceWeight"("scoreWeightConfigId", "dataSourceId");

-- CreateIndex
CREATE INDEX "CompositeScoreSnapshot_period_idx" ON "CompositeScoreSnapshot"("period");

-- CreateIndex
CREATE UNIQUE INDEX "CompositeScoreSnapshot_gridCellId_period_scoreWeightConfigI_key" ON "CompositeScoreSnapshot"("gridCellId", "period", "scoreWeightConfigId");

-- CreateIndex
CREATE INDEX "CaseStudy_isPublished_idx" ON "CaseStudy"("isPublished");

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalValue" ADD CONSTRAINT "SignalValue_gridCellId_fkey" FOREIGN KEY ("gridCellId") REFERENCES "GridCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalValue" ADD CONSTRAINT "SignalValue_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreWeightConfig" ADD CONSTRAINT "ScoreWeightConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceWeight" ADD CONSTRAINT "SourceWeight_scoreWeightConfigId_fkey" FOREIGN KEY ("scoreWeightConfigId") REFERENCES "ScoreWeightConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceWeight" ADD CONSTRAINT "SourceWeight_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeScoreSnapshot" ADD CONSTRAINT "CompositeScoreSnapshot_gridCellId_fkey" FOREIGN KEY ("gridCellId") REFERENCES "GridCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositeScoreSnapshot" ADD CONSTRAINT "CompositeScoreSnapshot_scoreWeightConfigId_fkey" FOREIGN KEY ("scoreWeightConfigId") REFERENCES "ScoreWeightConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_gridCellId_fkey" FOREIGN KEY ("gridCellId") REFERENCES "GridCell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
