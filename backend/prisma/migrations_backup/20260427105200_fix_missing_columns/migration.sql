-- CreateTable
CREATE TABLE "LocationCheckIn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "villageName" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocationMatched" BOOLEAN NOT NULL DEFAULT true,
    "storeId" TEXT,

    CONSTRAINT "LocationCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "userId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "long" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "storeId" TEXT,
    "radius" INTEGER NOT NULL DEFAULT 500,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "userId" TEXT NOT NULL,
    "shiftLogId" TEXT NOT NULL,
    "villageId" TEXT,
    "villageName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLong" DOUBLE PRECISION NOT NULL,
    "endLat" DOUBLE PRECISION,
    "endLong" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillageActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL DEFAULT 'VillagKart',
    "gstNo" TEXT,
    "contactNo" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxRates" TEXT NOT NULL DEFAULT '0,5,12,18',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCoverage" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "routeId" TEXT,
    "date" TEXT NOT NULL,
    "villageName" TEXT NOT NULL,
    "morningDone" BOOLEAN NOT NULL DEFAULT false,
    "eveningDone" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "DailyCoverage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LocationCheckIn" ADD COLUMN     "subLocation" TEXT;

-- AlterTable
ALTER TABLE "LocationLog" ADD COLUMN     "subLocation" TEXT;

-- AlterTable
ALTER TABLE "Village" ADD COLUMN     "boundary" JSONB,
ADD COLUMN     "isPolygon" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VillageActivity" ADD COLUMN     "subLocation" TEXT;

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN "shifts" JSONB,
ADD COLUMN "shiftMode" TEXT NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "DailyCoverage" ADD COLUMN "shiftStatus" JSONB;
