-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROCUREMENT_OFFICER', 'FPO', 'FARMER', 'BUYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('REGISTERED', 'READY_FOR_INSPECTION', 'INSPECTION_IN_PROGRESS', 'GRADED', 'CERTIFIED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('CREATED', 'SAMPLE_ASSIGNED', 'SENSOR_STABILIZING', 'CAPTURED', 'AI_PROCESSING', 'FUSION_PROCESSING', 'GRADED', 'CERTIFICATE_GENERATED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('GRADE_A', 'URS', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('VISION', 'GAS', 'ENVIRONMENT', 'FUSION');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DefectType" AS ENUM ('HEALTHY', 'DAMAGED', 'ROTTEN', 'SPROUTED', 'UNDERSIZED', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AiMode" AS ENUM ('MOCK', 'REAL');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StabilizationStatus" AS ENUM ('IDLE', 'STABILIZING', 'STABLE', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "fpoId" TEXT,
    "centreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fpos" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "district" TEXT,
    "state" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fpos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "farmerCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "village" TEXT,
    "district" TEXT,
    "state" TEXT,
    "fpoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyName" TEXT NOT NULL,
    "buyerCode" TEXT NOT NULL,
    "location" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_centres" (
    "id" TEXT NOT NULL,
    "centreCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "district" TEXT,
    "state" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_centres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "fpoId" TEXT,
    "centreId" TEXT,
    "crop" TEXT NOT NULL DEFAULT 'ONION',
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "harvestDate" TIMESTAMP(3),
    "status" "LotStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "officerId" TEXT,
    "centreId" TEXT,
    "fpoId" TEXT,
    "status" "InspectionStatus" NOT NULL DEFAULT 'CREATED',
    "stabilizationStatus" "StabilizationStatus" NOT NULL DEFAULT 'IDLE',
    "stabilizationStartedAt" TIMESTAMP(3),
    "stabilizationEndsAt" TIMESTAMP(3),
    "qualityScore" DOUBLE PRECISION,
    "grade" "Grade",
    "riskLevel" "RiskLevel",
    "gradeAPercentage" DOUBLE PRECISION,
    "ursPercentage" DOUBLE PRECISION,
    "rejectedPercentage" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "earlySpoilage" BOOLEAN NOT NULL DEFAULT false,
    "fusionConfigVersion" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_samples" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "sampleCode" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 100,
    "weight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_assets" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "sampleId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_devices" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GAS_POD',
    "centreId" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "firmwareVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "boundInspectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iot_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_readings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "inspectionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "gas1" DOUBLE PRECISION,
    "gas2" DOUBLE PRECISION,
    "gas3" DOUBLE PRECISION,
    "airQuality" DOUBLE PRECISION,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iot_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "analysisType" "AnalysisType" NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'onionsure',
    "mode" "AiMode" NOT NULL DEFAULT 'MOCK',
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "processingTimeMs" INTEGER,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_detections" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "defectType" "DefectType" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "count" INTEGER NOT NULL DEFAULT 0,
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "percentage" DOUBLE PRECISION,
    "boundingBoxesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fusion_results" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "visionQuality" DOUBLE PRECISION,
    "visionConfidence" DOUBLE PRECISION,
    "gasQuality" DOUBLE PRECISION,
    "gasConfidence" DOUBLE PRECISION,
    "environmentQuality" DOUBLE PRECISION,
    "environmentConfidence" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "earlySpoilage" BOOLEAN NOT NULL DEFAULT false,
    "explanationJson" JSONB,
    "weightsJson" JSONB,
    "fusionConfigVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fusion_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_thresholds" (
    "id" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "minGradeAPercentage" DOUBLE PRECISION,
    "maxGradeAPercentage" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fusion_configs" (
    "id" TEXT NOT NULL,
    "visionWeight" DOUBLE PRECISION NOT NULL,
    "gasWeight" DOUBLE PRECISION NOT NULL,
    "environmentWeight" DOUBLE PRECISION NOT NULL,
    "earlySpoilageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fusion_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "lotId" TEXT,
    "snapshotJson" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "qrData" TEXT,
    "grade" "Grade",
    "qualityScore" DOUBLE PRECISION,
    "riskLevel" "RiskLevel",
    "gradeAPercentage" DOUBLE PRECISION,
    "ursPercentage" DOUBLE PRECISION,
    "rejectedPercentage" DOUBLE PRECISION,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "CertificateStatus" NOT NULL DEFAULT 'VALID',
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fpos_code_key" ON "fpos"("code");

-- CreateIndex
CREATE INDEX "fpos_code_idx" ON "fpos"("code");

-- CreateIndex
CREATE UNIQUE INDEX "farmers_userId_key" ON "farmers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farmers_farmerCode_key" ON "farmers"("farmerCode");

-- CreateIndex
CREATE INDEX "farmers_fpoId_idx" ON "farmers"("fpoId");

-- CreateIndex
CREATE INDEX "farmers_farmerCode_idx" ON "farmers"("farmerCode");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_userId_key" ON "buyers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_buyerCode_key" ON "buyers"("buyerCode");

-- CreateIndex
CREATE INDEX "buyers_buyerCode_idx" ON "buyers"("buyerCode");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_centres_centreCode_key" ON "procurement_centres"("centreCode");

-- CreateIndex
CREATE INDEX "procurement_centres_centreCode_idx" ON "procurement_centres"("centreCode");

-- CreateIndex
CREATE UNIQUE INDEX "lots_lotNumber_key" ON "lots"("lotNumber");

-- CreateIndex
CREATE INDEX "lots_lotNumber_idx" ON "lots"("lotNumber");

-- CreateIndex
CREATE INDEX "lots_farmerId_idx" ON "lots"("farmerId");

-- CreateIndex
CREATE INDEX "lots_fpoId_idx" ON "lots"("fpoId");

-- CreateIndex
CREATE INDEX "lots_centreId_idx" ON "lots"("centreId");

-- CreateIndex
CREATE INDEX "lots_status_idx" ON "lots"("status");

-- CreateIndex
CREATE INDEX "lots_createdAt_idx" ON "lots"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_inspectionNumber_key" ON "inspections"("inspectionNumber");

-- CreateIndex
CREATE INDEX "inspections_inspectionNumber_idx" ON "inspections"("inspectionNumber");

-- CreateIndex
CREATE INDEX "inspections_lotId_idx" ON "inspections"("lotId");

-- CreateIndex
CREATE INDEX "inspections_officerId_idx" ON "inspections"("officerId");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_grade_idx" ON "inspections"("grade");

-- CreateIndex
CREATE INDEX "inspections_createdAt_idx" ON "inspections"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_samples_inspectionId_key" ON "inspection_samples"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_samples_sampleCode_key" ON "inspection_samples"("sampleCode");

-- CreateIndex
CREATE INDEX "image_assets_inspectionId_idx" ON "image_assets"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "iot_devices_deviceCode_key" ON "iot_devices"("deviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "iot_devices_boundInspectionId_key" ON "iot_devices"("boundInspectionId");

-- CreateIndex
CREATE INDEX "iot_devices_deviceCode_idx" ON "iot_devices"("deviceCode");

-- CreateIndex
CREATE INDEX "iot_devices_status_idx" ON "iot_devices"("status");

-- CreateIndex
CREATE INDEX "iot_readings_deviceId_idx" ON "iot_readings"("deviceId");

-- CreateIndex
CREATE INDEX "iot_readings_inspectionId_idx" ON "iot_readings"("inspectionId");

-- CreateIndex
CREATE INDEX "iot_readings_timestamp_idx" ON "iot_readings"("timestamp");

-- CreateIndex
CREATE INDEX "ai_analyses_inspectionId_idx" ON "ai_analyses"("inspectionId");

-- CreateIndex
CREATE INDEX "ai_analyses_analysisType_idx" ON "ai_analyses"("analysisType");

-- CreateIndex
CREATE INDEX "defect_detections_aiAnalysisId_idx" ON "defect_detections"("aiAnalysisId");

-- CreateIndex
CREATE UNIQUE INDEX "fusion_results_inspectionId_key" ON "fusion_results"("inspectionId");

-- CreateIndex
CREATE INDEX "fusion_results_inspectionId_idx" ON "fusion_results"("inspectionId");

-- CreateIndex
CREATE INDEX "quality_thresholds_grade_idx" ON "quality_thresholds"("grade");

-- CreateIndex
CREATE INDEX "fusion_configs_version_idx" ON "fusion_configs"("version");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateNumber_key" ON "certificates"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationToken_key" ON "certificates"("verificationToken");

-- CreateIndex
CREATE INDEX "certificates_certificateNumber_idx" ON "certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "certificates_verificationToken_idx" ON "certificates"("verificationToken");

-- CreateIndex
CREATE INDEX "certificates_inspectionId_idx" ON "certificates"("inspectionId");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "fpos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "procurement_centres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "fpos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "fpos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "procurement_centres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "procurement_centres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "fpos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_samples" ADD CONSTRAINT "inspection_samples_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "procurement_centres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_boundInspectionId_fkey" FOREIGN KEY ("boundInspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_readings" ADD CONSTRAINT "iot_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "iot_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_readings" ADD CONSTRAINT "iot_readings_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_detections" ADD CONSTRAINT "defect_detections_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "ai_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fusion_results" ADD CONSTRAINT "fusion_results_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fusion_configs" ADD CONSTRAINT "fusion_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
