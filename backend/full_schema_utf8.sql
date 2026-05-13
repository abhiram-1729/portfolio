-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAR', 'PAN', 'LICENSE', 'VOTER_ID', 'PASSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpensePaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CONSUMER', 'ADMIN', 'SALES_AGENT', 'SUPERVISOR', 'HELPER', 'SUPER_ADMIN', 'TENANT_OWNER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RefillStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('LOAD', 'RETURN', 'AUDIT', 'DAMAGE', 'REFILL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'CASH_UPI', 'CREDIT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VgeLevel" AS ENUM ('NONE', 'STARTER', 'PERFORMER', 'ACHIEVER', 'CHAMPION', 'STAR', 'SUPER_STAR');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('ELECTRONIC', 'NON_ELECTRONIC', 'POS_MACHINE', 'WEIGHING_MACHINE', 'FREEZER', 'SHELF', 'DELIVERY_BAG', 'TABLET');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'REPAIR_NEEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'USED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AssetIssueType" AS ENUM ('NOT_WORKING', 'DAMAGED', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssetRequestType" AS ENUM ('REPLACEMENT', 'NEW_ASSET', 'NEW_REQUIREMENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('CREATED', 'APPROVED', 'ORDERED', 'DELIVERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GRNStatus" AS ENUM ('PARTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'PARTIAL_PAID');

-- CreateEnum
CREATE TYPE "VendorPaymentMode" AS ENUM ('CASH', 'BANK', 'UPI');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'DAMAGE');

-- CreateEnum
CREATE TYPE "VendorLedgerType" AS ENUM ('PURCHASE', 'PAYMENT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('DAMAGED', 'EXPIRED', 'LEAKAGE', 'LOST');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "SelfResponsibility" AS ENUM ('SELF', 'SYSTEM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AdminResponsibility" AS ENUM ('VGE_RESPONSIBLE', 'NEGLIGENCE', 'INTENTIONAL', 'MIS_HANDLING', 'NOT_RESPONSIBLE');

-- CreateEnum
CREATE TYPE "DeductionMode" AS ENUM ('FULL', 'PARTIAL', 'WAIVED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('REGULAR', 'PREMIUM', 'HIGH_VALUE', 'ONLINE', 'ROUTE_WISE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VehicleDamageSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VehicleDamageStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'REPAIR_SCHEDULED', 'IN_REPAIR', 'REPAIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('COUPON', 'COMBO', 'BOGO', 'ROUTE_BASED', 'VILLAGE_BASED', 'FESTIVAL', 'FLAT_DISCOUNT', 'PERCENTAGE_DISCOUNT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT_AMOUNT', 'FIXED_PRICE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "planName" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mobile" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CONSUMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedVehicleId" TEXT,
    "dailyTarget" DOUBLE PRECISION DEFAULT 10000,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "fcmToken" TEXT,
    "baseSalary" DOUBLE PRECISION DEFAULT 12000,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "vgeType" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "storeId" TEXT,
    "displayId" TEXT,
    "customRoleId" TEXT,
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "shiftId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "portalType" TEXT NOT NULL DEFAULT 'ADMIN',

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mrp" DOUBLE PRECISION,
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "discount" DOUBLE PRECISION,
    "landingPrice" DOUBLE PRECISION,
    "gst" DOUBLE PRECISION DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "minShopAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitId" TEXT,
    "unitValue" DOUBLE PRECISION,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "barcode" TEXT,
    "minStockAlert" INTEGER DEFAULT 0,
    "purchasePrice" DOUBLE PRECISION DEFAULT 0,
    "skuCode" TEXT,
    "displayId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "productId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseInventory" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "WarehouseInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMode" "PaymentMode",
    "mobile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT,
    "orderNumber" SERIAL NOT NULL,
    "customerName" TEXT,
    "coverageType" "CoverageType",
    "routeId" TEXT,
    "villageName" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "displayId" TEXT,
    "cashAmount" DOUBLE PRECISION DEFAULT 0,
    "upiAmount" DOUBLE PRECISION DEFAULT 0,
    "customerId" TEXT,
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliverySlot" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "appliedPromotionId" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "landingPrice" DOUBLE PRECISION,
    "gst" DOUBLE PRECISION DEFAULT 0,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "promotionId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "cashAmount" DOUBLE PRECISION DEFAULT 0,
    "upiAmount" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "insuranceDocument" TEXT,
    "permitDocument" TEXT,
    "rcDocument" TEXT,
    "vehicleName" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "displayId" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStock" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "openingQuantity" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "VehicleStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TransactionType" NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "userId" TEXT,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "villages" TEXT[],
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteCycle" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "villageName" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "RouteCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteAssignment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "afternoonSession" TEXT,
    "morningSession" TEXT,
    "schedule" JSONB,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "RouteAssignment_pkey" PRIMARY KEY ("id")
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
    "boundary" JSONB,
    "isPolygon" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningCash" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "denominations" JSONB NOT NULL,
    "totalOpeningCash" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "shift" INTEGER NOT NULL DEFAULT 1,
    "isNoService" BOOLEAN NOT NULL DEFAULT false,
    "storeId" TEXT,

    CONSTRAINT "OpeningCash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingCash" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingCash" DOUBLE PRECISION NOT NULL,
    "cashSales" DOUBLE PRECISION NOT NULL,
    "expectedCash" DOUBLE PRECISION NOT NULL,
    "actualCash" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "denominations" JSONB NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "shift" INTEGER NOT NULL DEFAULT 1,
    "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isNoService" BOOLEAN NOT NULL DEFAULT false,
    "storeId" TEXT,
    "cardSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upiSales" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ClosingCash_pkey" PRIMARY KEY ("id")
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
    "shifts" JSONB,
    "shiftMode" TEXT NOT NULL DEFAULT 'STANDARD',
    "deliveryRadius" DOUBLE PRECISION DEFAULT 20,
    "deliveryRadiusEnforced" BOOLEAN NOT NULL DEFAULT true,
    "deliverySlabs" JSONB,
    "deliverySlots" JSONB,
    "surcharges" JSONB,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCashSummary" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submittedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "cardSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upiSales" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailyCashSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCashRegister" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingCash" DOUBLE PRECISION NOT NULL,
    "openingDenominations" JSONB NOT NULL,
    "expectedClosingCash" DOUBLE PRECISION,
    "actualClosingCash" DOUBLE PRECISION,
    "closingDifference" DOUBLE PRECISION,
    "closingDenominations" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedById" TEXT,
    "openedById" TEXT,
    "closingRemarks" TEXT,

    CONSTRAINT "StoreCashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreDeposit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "denominations" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "ExpensePaymentMode" NOT NULL,
    "description" TEXT,
    "billImage" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "displayId" TEXT,
    "billDate" TEXT,
    "paidDate" TEXT,
    "paidTo" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "denominations" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "CashTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DOUBLE PRECISION,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSubCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "expenseCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseSubCategory_pkey" PRIMARY KEY ("id")
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
    "shiftStatus" JSONB,

    CONSTRAINT "DailyCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'low',
    "role" "UserRole",
    "vehicleId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefillRequest" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RefillStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "parentId" TEXT,
    "accuracy" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,
    "long" DOUBLE PRECISION,
    "photo" TEXT,
    "approvedById" TEXT,

    CONSTRAINT "RefillRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefillItem" (
    "id" TEXT NOT NULL,
    "refillRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "adminRemark" TEXT,
    "requestedQuantity" INTEGER,
    "storeId" TEXT,

    CONSTRAINT "RefillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VgeDailyPerformance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRegistrations" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "eligibleSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slabsCount" INTEGER NOT NULL DEFAULT 0,
    "salesIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "routeId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'NONE',

    CONSTRAINT "VgeDailyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VgeMonthlySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRegistrations" INTEGER NOT NULL DEFAULT 0,
    "totalIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "avgLevel" TEXT,
    "bestLevel" "VgeLevel" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "routeId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "VgeMonthlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VgeIncentiveConfig" (
    "id" TEXT NOT NULL,
    "minSalesThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "minRegThreshold" INTEGER NOT NULL DEFAULT 5,
    "salesSlabSize" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "firstSlabCount" INTEGER NOT NULL DEFAULT 2,
    "firstSlabIncentive" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "remainingSlabIncentive" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "firstRegCount" INTEGER NOT NULL DEFAULT 10,
    "firstRegIncentive" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "remainingRegIncentive" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "starterThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "performerThreshold" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "achieverThreshold" DOUBLE PRECISION NOT NULL DEFAULT 20000,
    "championThreshold" DOUBLE PRECISION NOT NULL DEFAULT 25000,
    "starThreshold" DOUBLE PRECISION NOT NULL DEFAULT 30000,
    "superStarThreshold" DOUBLE PRECISION NOT NULL DEFAULT 35000,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "rules" JSONB NOT NULL DEFAULT '[]',
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "storeId" TEXT,

    CONSTRAINT "VgeIncentiveConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "brand" TEXT,
    "image" TEXT,
    "description" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "categoryId" TEXT,
    "assetType" TEXT,
    "storeId" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetUnit" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "vehicleId" TEXT,

    CONSTRAINT "AssetUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "assetUnitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnDate" TIMESTAMP(3),
    "assignCondition" "AssetCondition" NOT NULL DEFAULT 'NEW',
    "returnCondition" "AssetCondition",
    "returnRemarks" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "vehicleId" TEXT,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetIssue" (
    "id" TEXT NOT NULL,
    "assetUnitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issueType" "AssetIssueType" NOT NULL,
    "description" TEXT,
    "photos" TEXT[],
    "status" "AssetIssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "AssetIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "userId" TEXT NOT NULL,
    "type" "AssetRequestType" NOT NULL,
    "assetId" TEXT,
    "assetUnitId" TEXT,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetRequest_pkey" PRIMARY KEY ("id")
);

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
    "subLocation" TEXT,

    CONSTRAINT "LocationCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hubCode" TEXT NOT NULL DEFAULT 'HUB',
    "stateCode" TEXT NOT NULL DEFAULT 'AP',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "creatorId" TEXT,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "denominations" JSONB,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,

    CONSTRAINT "StockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditItem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "StockAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vendorName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "contactPerson" TEXT,
    "creditDays" INTEGER NOT NULL DEFAULT 30,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayId" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorItemMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorItemMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "poNumber" SERIAL NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "remarks" TEXT,
    "status" "POStatus" NOT NULL DEFAULT 'CREATED',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayId" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "poId" TEXT NOT NULL,
    "grnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GRNStatus" NOT NULL DEFAULT 'PARTIAL',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayId" TEXT,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "grnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vendorId" TEXT NOT NULL,
    "poId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transportCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PurchaseInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayId" TEXT,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expDate" TIMESTAMP(3),
    "mfgDate" TIMESTAMP(3),
    "netCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalBeforeTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION DEFAULT 0,
    "taxType" TEXT,
    "unitCostBeforeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCostBeforeTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitSellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementStockLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "refType" TEXT,
    "balanceAfter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcurementStockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vendorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "VendorLedgerType" NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vendorId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "mode" "VendorPaymentMode" NOT NULL,
    "referenceNo" TEXT,
    "isAdvance" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayId" TEXT,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPaymentAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "entity" TEXT NOT NULL,
    "hub" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'ALL',
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT,
    "targetUserId" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDeposit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "branchName" TEXT NOT NULL,
    "receiptImage" TEXT,
    "depositedBy" TEXT NOT NULL,
    "adminId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageEntry" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vehicleId" TEXT,
    "reportedById" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "damageType" "DamageType" NOT NULL,
    "selfResponsibility" "SelfResponsibility" NOT NULL DEFAULT 'UNKNOWN',
    "reason" TEXT NOT NULL,
    "images" TEXT[],
    "geoLatitude" DOUBLE PRECISION,
    "geoLongitude" DOUBLE PRECISION,
    "status" "DamageStatus" NOT NULL DEFAULT 'PENDING',
    "adminResponsibility" "AdminResponsibility",
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminRemarks" TEXT,
    "purchaseCost" DOUBLE PRECISION,
    "totalLoss" DOUBLE PRECISION,
    "stockAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageDeduction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "damageEntryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "DeductionMode" NOT NULL DEFAULT 'FULL',
    "percentage" DOUBLE PRECISION DEFAULT 100,
    "deductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "appliedById" TEXT,
    "appliedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReturn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "returnQty" INTEGER NOT NULL,
    "returnAmount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "returnedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "date" TEXT NOT NULL,
    "shift" INTEGER NOT NULL DEFAULT 1,
    "agentId" TEXT,
    "vehicleId" TEXT,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReturns" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upiSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalReturnOrders" INTEGER NOT NULL DEFAULT 0,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionSales_pkey" PRIMARY KEY ("id")
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
    "subLocation" TEXT,

    CONSTRAINT "LocationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "date" TEXT NOT NULL,
    "punchInTime" TIMESTAMP(3) NOT NULL,
    "punchOutTime" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "punchInLat" DOUBLE PRECISION,
    "punchInLng" DOUBLE PRECISION,
    "punchOutLat" DOUBLE PRECISION,
    "punchOutLng" DOUBLE PRECISION,
    "totalHours" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "punchInPhoto" TEXT,
    "punchOutPhoto" TEXT,
    "punchInLocation" TEXT,
    "punchOutLocation" TEXT,
    "exceptionId" TEXT,
    "graceApplied" INTEGER,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lateEntryConfigId" TEXT,
    "lateMinutes" INTEGER,
    "shiftStartTime" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "date" TEXT NOT NULL,
    "shift" INTEGER NOT NULL DEFAULT 1,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLong" DOUBLE PRECISION NOT NULL,
    "startFacePhoto" TEXT,
    "endLat" DOUBLE PRECISION,
    "endLong" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftLog_pkey" PRIMARY KEY ("id")
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
    "subLocation" TEXT,

    CONSTRAINT "VillageActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateEntryConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'COMPANY',
    "scopeValue" TEXT,
    "graceMins" INTEGER NOT NULL DEFAULT 10,
    "penaltyType" TEXT NOT NULL DEFAULT 'COUNT',
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LateEntryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "userId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "configId" TEXT,
    "date" TEXT NOT NULL,
    "shiftStart" TEXT NOT NULL,
    "checkinTime" TIMESTAMP(3) NOT NULL,
    "lateMinutes" INTEGER NOT NULL,
    "monthlyCount" INTEGER NOT NULL,
    "penaltyApplied" TEXT NOT NULL DEFAULT 'NONE',
    "penaltyValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isWaived" BOOLEAN NOT NULL DEFAULT false,
    "waivedById" TEXT,
    "waivedReason" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateEntryException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "lateEntryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LateEntryException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "annualLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sickLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "casualLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lopDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "halfDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAuditLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "assetUnitId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "auditedByUserId" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "physicalCondition" TEXT NOT NULL DEFAULT 'GOOD',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDepreciation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "costBasis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salvageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usefulLifeYears" INTEGER NOT NULL DEFAULT 5,
    "method" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "ratePercentage" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "currentBookVal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetDepreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "address" TEXT,
    "villageId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "segment" "CustomerSegment" NOT NULL DEFAULT 'REGULAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "date" TEXT NOT NULL,
    "odometer" DOUBLE PRECISION NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "ExpensePaymentMode" NOT NULL,
    "billImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "date" TEXT NOT NULL,
    "odometer" DOUBLE PRECISION NOT NULL,
    "serviceType" TEXT NOT NULL,
    "details" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "mechanicName" TEXT,
    "billImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePhysicalDamage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "damageType" TEXT NOT NULL,
    "severity" "VehicleDamageSeverity" NOT NULL DEFAULT 'MINOR',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "images" TEXT[],
    "estimatedCost" DOUBLE PRECISION DEFAULT 0,
    "actualCost" DOUBLE PRECISION,
    "status" "VehicleDamageStatus" NOT NULL DEFAULT 'REPORTED',
    "repairDate" TIMESTAMP(3),
    "repairNotes" TEXT,
    "odometerReading" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiclePhysicalDamage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTrip" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift" INTEGER NOT NULL DEFAULT 1,
    "status" "TripStatus" NOT NULL DEFAULT 'OPEN',
    "startOdometer" DOUBLE PRECISION,
    "endOdometer" DOUBLE PRECISION,
    "openingCash" DOUBLE PRECISION DEFAULT 0,
    "closingCash" DOUBLE PRECISION DEFAULT 0,
    "totalSales" DOUBLE PRECISION DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,

    CONSTRAINT "VehicleTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "type" "PromotionType" NOT NULL,
    "discountType" "DiscountType",
    "discountValue" DOUBLE PRECISION,
    "minOrderAmount" DOUBLE PRECISION DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "userUsageLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetProductIds" TEXT[],
    "targetCategoryIds" TEXT[],
    "targetRouteIds" TEXT[],
    "targetVillageNames" TEXT[],
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "comboProducts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayId_key" ON "User"("displayId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_assignedVehicleId_idx" ON "User"("assignedVehicleId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_customRoleId_idx" ON "User"("customRoleId");

-- CreateIndex
CREATE INDEX "UserDocument_userId_idx" ON "UserDocument"("userId");

-- CreateIndex
CREATE INDEX "CustomRole_tenantId_idx" ON "CustomRole"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_tenantId_name_key" ON "CustomRole"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_storeId_name_key" ON "Category"("tenantId", "storeId", "name");

-- CreateIndex
CREATE INDEX "SubCategory_tenantId_idx" ON "SubCategory"("tenantId");

-- CreateIndex
CREATE INDEX "Brand_tenantId_idx" ON "Brand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_tenantId_name_key" ON "Brand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_displayId_key" ON "Product"("displayId");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_subCategoryId_idx" ON "Product"("subCategoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_unitId_idx" ON "Product"("unitId");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "ProductVariant_tenantId_idx" ON "ProductVariant"("tenantId");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");

-- CreateIndex
CREATE INDEX "WarehouseInventory_tenantId_idx" ON "WarehouseInventory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseInventory_warehouseId_productId_key" ON "WarehouseInventory"("warehouseId", "productId");

-- CreateIndex
CREATE INDEX "Cart_tenantId_idx" ON "Cart"("tenantId");

-- CreateIndex
CREATE INDEX "CartItem_tenantId_idx" ON "CartItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_displayId_key" ON "Order"("displayId");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_agentId_idx" ON "Order"("agentId");

-- CreateIndex
CREATE INDEX "Order_vehicleId_idx" ON "Order"("vehicleId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_routeId_idx" ON "Order"("routeId");

-- CreateIndex
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "OrderItem_tenantId_idx" ON "OrderItem"("tenantId");

-- CreateIndex
CREATE INDEX "OrderItem_storeId_idx" ON "OrderItem"("storeId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_storeId_idx" ON "Payment"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_displayId_key" ON "Vehicle"("displayId");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_tenantId_vehicleNumber_key" ON "Vehicle"("tenantId", "vehicleNumber");

-- CreateIndex
CREATE INDEX "VehicleStock_tenantId_idx" ON "VehicleStock"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleStock_storeId_idx" ON "VehicleStock"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleStock_vehicleId_productId_key" ON "VehicleStock"("vehicleId", "productId");

-- CreateIndex
CREATE INDEX "StockTransaction_tenantId_idx" ON "StockTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "StockTransaction_storeId_idx" ON "StockTransaction"("storeId");

-- CreateIndex
CREATE INDEX "StockTransaction_date_idx" ON "StockTransaction"("date");

-- CreateIndex
CREATE INDEX "StockTransaction_type_idx" ON "StockTransaction"("type");

-- CreateIndex
CREATE INDEX "StockTransaction_vehicleId_idx" ON "StockTransaction"("vehicleId");

-- CreateIndex
CREATE INDEX "StockTransaction_productId_idx" ON "StockTransaction"("productId");

-- CreateIndex
CREATE INDEX "StockTransaction_userId_idx" ON "StockTransaction"("userId");

-- CreateIndex
CREATE INDEX "Route_tenantId_idx" ON "Route"("tenantId");

-- CreateIndex
CREATE INDEX "Route_status_idx" ON "Route"("status");

-- CreateIndex
CREATE INDEX "Route_storeId_idx" ON "Route"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_tenantId_storeId_routeName_key" ON "Route"("tenantId", "storeId", "routeName");

-- CreateIndex
CREATE INDEX "RouteCycle_tenantId_idx" ON "RouteCycle"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteCycle_routeId_dayOfWeek_key" ON "RouteCycle"("routeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "RouteAssignment_tenantId_idx" ON "RouteAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "RouteAssignment_vehicleId_status_idx" ON "RouteAssignment"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "RouteAssignment_userId_status_idx" ON "RouteAssignment"("userId", "status");

-- CreateIndex
CREATE INDEX "Village_tenantId_idx" ON "Village"("tenantId");

-- CreateIndex
CREATE INDEX "Village_storeId_idx" ON "Village"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Village_tenantId_storeId_name_key" ON "Village"("tenantId", "storeId", "name");

-- CreateIndex
CREATE INDEX "OpeningCash_tenantId_idx" ON "OpeningCash"("tenantId");

-- CreateIndex
CREATE INDEX "OpeningCash_storeId_idx" ON "OpeningCash"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningCash_vehicleId_date_shift_key" ON "OpeningCash"("vehicleId", "date", "shift");

-- CreateIndex
CREATE INDEX "ClosingCash_tenantId_idx" ON "ClosingCash"("tenantId");

-- CreateIndex
CREATE INDEX "ClosingCash_storeId_idx" ON "ClosingCash"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingCash_vehicleId_date_shift_key" ON "ClosingCash"("vehicleId", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSettings_storeId_key" ON "BusinessSettings"("storeId");

-- CreateIndex
CREATE INDEX "BusinessSettings_tenantId_idx" ON "BusinessSettings"("tenantId");

-- CreateIndex
CREATE INDEX "BusinessSettings_storeId_idx" ON "BusinessSettings"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSettings_tenantId_storeId_key" ON "BusinessSettings"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "DailyCashSummary_tenantId_idx" ON "DailyCashSummary"("tenantId");

-- CreateIndex
CREATE INDEX "DailyCashSummary_date_idx" ON "DailyCashSummary"("date");

-- CreateIndex
CREATE INDEX "DailyCashSummary_userId_idx" ON "DailyCashSummary"("userId");

-- CreateIndex
CREATE INDEX "DailyCashSummary_storeId_idx" ON "DailyCashSummary"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCashSummary_vehicleId_date_key" ON "DailyCashSummary"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "StoreCashRegister_tenantId_idx" ON "StoreCashRegister"("tenantId");

-- CreateIndex
CREATE INDEX "StoreCashRegister_openedById_idx" ON "StoreCashRegister"("openedById");

-- CreateIndex
CREATE INDEX "StoreCashRegister_closedById_idx" ON "StoreCashRegister"("closedById");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCashRegister_storeId_date_key" ON "StoreCashRegister"("storeId", "date");

-- CreateIndex
CREATE INDEX "StoreDeposit_tenantId_idx" ON "StoreDeposit"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreDeposit_storeId_date_shift_key" ON "StoreDeposit"("storeId", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_displayId_key" ON "Expense"("displayId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_vehicleId_idx" ON "Expense"("vehicleId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_storeId_idx" ON "Expense"("storeId");

-- CreateIndex
CREATE INDEX "CashTransfer_tenantId_idx" ON "CashTransfer"("tenantId");

-- CreateIndex
CREATE INDEX "CashTransfer_userId_idx" ON "CashTransfer"("userId");

-- CreateIndex
CREATE INDEX "CashTransfer_storeId_idx" ON "CashTransfer"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransfer_vehicleId_date_key" ON "CashTransfer"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_idx" ON "ExpenseCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON "ExpenseCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ExpenseSubCategory_tenantId_idx" ON "ExpenseSubCategory"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseSubCategory_expenseCategoryId_idx" ON "ExpenseSubCategory"("expenseCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSubCategory_tenantId_expenseCategoryId_name_key" ON "ExpenseSubCategory"("tenantId", "expenseCategoryId", "name");

-- CreateIndex
CREATE INDEX "DailyCoverage_tenantId_idx" ON "DailyCoverage"("tenantId");

-- CreateIndex
CREATE INDEX "DailyCoverage_date_idx" ON "DailyCoverage"("date");

-- CreateIndex
CREATE INDEX "DailyCoverage_storeId_idx" ON "DailyCoverage"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCoverage_vehicleId_date_key" ON "DailyCoverage"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_role_idx" ON "Notification"("role");

-- CreateIndex
CREATE INDEX "Notification_storeId_idx" ON "Notification"("storeId");

-- CreateIndex
CREATE INDEX "RefillRequest_tenantId_idx" ON "RefillRequest"("tenantId");

-- CreateIndex
CREATE INDEX "RefillRequest_vehicleId_idx" ON "RefillRequest"("vehicleId");

-- CreateIndex
CREATE INDEX "RefillRequest_userId_idx" ON "RefillRequest"("userId");

-- CreateIndex
CREATE INDEX "RefillRequest_status_idx" ON "RefillRequest"("status");

-- CreateIndex
CREATE INDEX "RefillRequest_storeId_idx" ON "RefillRequest"("storeId");

-- CreateIndex
CREATE INDEX "RefillRequest_parentId_idx" ON "RefillRequest"("parentId");

-- CreateIndex
CREATE INDEX "RefillItem_tenantId_idx" ON "RefillItem"("tenantId");

-- CreateIndex
CREATE INDEX "RefillItem_refillRequestId_idx" ON "RefillItem"("refillRequestId");

-- CreateIndex
CREATE INDEX "RefillItem_productId_idx" ON "RefillItem"("productId");

-- CreateIndex
CREATE INDEX "RefillItem_storeId_idx" ON "RefillItem"("storeId");

-- CreateIndex
CREATE INDEX "VgeDailyPerformance_tenantId_idx" ON "VgeDailyPerformance"("tenantId");

-- CreateIndex
CREATE INDEX "VgeDailyPerformance_date_idx" ON "VgeDailyPerformance"("date");

-- CreateIndex
CREATE INDEX "VgeDailyPerformance_userId_idx" ON "VgeDailyPerformance"("userId");

-- CreateIndex
CREATE INDEX "VgeDailyPerformance_level_idx" ON "VgeDailyPerformance"("level");

-- CreateIndex
CREATE INDEX "VgeDailyPerformance_storeId_idx" ON "VgeDailyPerformance"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "VgeDailyPerformance_userId_date_key" ON "VgeDailyPerformance"("userId", "date");

-- CreateIndex
CREATE INDEX "VgeMonthlySummary_tenantId_idx" ON "VgeMonthlySummary"("tenantId");

-- CreateIndex
CREATE INDEX "VgeMonthlySummary_month_idx" ON "VgeMonthlySummary"("month");

-- CreateIndex
CREATE INDEX "VgeMonthlySummary_storeId_idx" ON "VgeMonthlySummary"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "VgeMonthlySummary_userId_month_key" ON "VgeMonthlySummary"("userId", "month");

-- CreateIndex
CREATE INDEX "VgeIncentiveConfig_tenantId_idx" ON "VgeIncentiveConfig"("tenantId");

-- CreateIndex
CREATE INDEX "VgeIncentiveConfig_storeId_idx" ON "VgeIncentiveConfig"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "VgeIncentiveConfig_tenantId_storeId_key" ON "VgeIncentiveConfig"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "Unit_tenantId_idx" ON "Unit"("tenantId");

-- CreateIndex
CREATE INDEX "Unit_storeId_idx" ON "Unit"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_tenantId_storeId_name_key" ON "Unit"("tenantId", "storeId", "name");

-- CreateIndex
CREATE INDEX "Asset_tenantId_idx" ON "Asset"("tenantId");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- CreateIndex
CREATE INDEX "Asset_storeId_idx" ON "Asset"("storeId");

-- CreateIndex
CREATE INDEX "AssetCategory_tenantId_idx" ON "AssetCategory"("tenantId");

-- CreateIndex
CREATE INDEX "AssetCategory_storeId_idx" ON "AssetCategory"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_tenantId_name_key" ON "AssetCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "AssetUnit_tenantId_idx" ON "AssetUnit"("tenantId");

-- CreateIndex
CREATE INDEX "AssetUnit_assetId_idx" ON "AssetUnit"("assetId");

-- CreateIndex
CREATE INDEX "AssetUnit_status_idx" ON "AssetUnit"("status");

-- CreateIndex
CREATE INDEX "AssetUnit_vehicleId_idx" ON "AssetUnit"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetUnit_assetId_serialNumber_key" ON "AssetUnit"("assetId", "serialNumber");

-- CreateIndex
CREATE INDEX "AssetAssignment_tenantId_idx" ON "AssetAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "AssetAssignment_assetUnitId_idx" ON "AssetAssignment"("assetUnitId");

-- CreateIndex
CREATE INDEX "AssetAssignment_userId_idx" ON "AssetAssignment"("userId");

-- CreateIndex
CREATE INDEX "AssetAssignment_isActive_idx" ON "AssetAssignment"("isActive");

-- CreateIndex
CREATE INDEX "AssetAssignment_vehicleId_idx" ON "AssetAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "AssetIssue_tenantId_idx" ON "AssetIssue"("tenantId");

-- CreateIndex
CREATE INDEX "AssetIssue_assetUnitId_idx" ON "AssetIssue"("assetUnitId");

-- CreateIndex
CREATE INDEX "AssetIssue_userId_idx" ON "AssetIssue"("userId");

-- CreateIndex
CREATE INDEX "AssetIssue_status_idx" ON "AssetIssue"("status");

-- CreateIndex
CREATE INDEX "AssetRequest_tenantId_idx" ON "AssetRequest"("tenantId");

-- CreateIndex
CREATE INDEX "AssetRequest_userId_idx" ON "AssetRequest"("userId");

-- CreateIndex
CREATE INDEX "AssetRequest_status_idx" ON "AssetRequest"("status");

-- CreateIndex
CREATE INDEX "LocationCheckIn_tenantId_idx" ON "LocationCheckIn"("tenantId");

-- CreateIndex
CREATE INDEX "LocationCheckIn_userId_idx" ON "LocationCheckIn"("userId");

-- CreateIndex
CREATE INDEX "LocationCheckIn_date_idx" ON "LocationCheckIn"("date");

-- CreateIndex
CREATE INDEX "LocationCheckIn_storeId_idx" ON "LocationCheckIn"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE INDEX "Store_tenantId_idx" ON "Store"("tenantId");

-- CreateIndex
CREATE INDEX "SafeTransaction_storeId_date_idx" ON "SafeTransaction"("storeId", "date");

-- CreateIndex
CREATE INDEX "StockAudit_tenantId_idx" ON "StockAudit"("tenantId");

-- CreateIndex
CREATE INDEX "StockAudit_storeId_idx" ON "StockAudit"("storeId");

-- CreateIndex
CREATE INDEX "StockAudit_vehicleId_idx" ON "StockAudit"("vehicleId");

-- CreateIndex
CREATE INDEX "StockAudit_userId_idx" ON "StockAudit"("userId");

-- CreateIndex
CREATE INDEX "StockAuditItem_auditId_idx" ON "StockAuditItem"("auditId");

-- CreateIndex
CREATE INDEX "StockAuditItem_productId_idx" ON "StockAuditItem"("productId");

-- CreateIndex
CREATE INDEX "StockAuditItem_tenantId_idx" ON "StockAuditItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_displayId_key" ON "Vendor"("displayId");

-- CreateIndex
CREATE INDEX "Vendor_tenantId_idx" ON "Vendor"("tenantId");

-- CreateIndex
CREATE INDEX "Vendor_storeId_idx" ON "Vendor"("storeId");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_tenantId_mobile_key" ON "Vendor"("tenantId", "mobile");

-- CreateIndex
CREATE INDEX "VendorItemMapping_tenantId_idx" ON "VendorItemMapping"("tenantId");

-- CreateIndex
CREATE INDEX "VendorItemMapping_storeId_idx" ON "VendorItemMapping"("storeId");

-- CreateIndex
CREATE INDEX "VendorItemMapping_vendorId_idx" ON "VendorItemMapping"("vendorId");

-- CreateIndex
CREATE INDEX "VendorItemMapping_productId_idx" ON "VendorItemMapping"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorItemMapping_vendorId_productId_key" ON "VendorItemMapping"("vendorId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_displayId_key" ON "PurchaseOrder"("displayId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_storeId_idx" ON "PurchaseOrder"("storeId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_tenantId_idx" ON "PurchaseOrderItem"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_poId_idx" ON "PurchaseOrderItem"("poId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_displayId_key" ON "GoodsReceipt"("displayId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_tenantId_idx" ON "GoodsReceipt"("tenantId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_storeId_idx" ON "GoodsReceipt"("storeId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_poId_idx" ON "GoodsReceipt"("poId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_tenantId_idx" ON "GoodsReceiptItem"("tenantId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_grnId_idx" ON "GoodsReceiptItem"("grnId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_productId_idx" ON "GoodsReceiptItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_displayId_key" ON "PurchaseInvoice"("displayId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_tenantId_idx" ON "PurchaseInvoice"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_storeId_idx" ON "PurchaseInvoice"("storeId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_vendorId_idx" ON "PurchaseInvoice"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_poId_idx" ON "PurchaseInvoice"("poId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_status_idx" ON "PurchaseInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_tenantId_invoiceNumber_key" ON "PurchaseInvoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_tenantId_idx" ON "PurchaseInvoiceItem"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_invoiceId_idx" ON "PurchaseInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_productId_idx" ON "PurchaseInvoiceItem"("productId");

-- CreateIndex
CREATE INDEX "ProcurementStockLedger_tenantId_idx" ON "ProcurementStockLedger"("tenantId");

-- CreateIndex
CREATE INDEX "ProcurementStockLedger_storeId_idx" ON "ProcurementStockLedger"("storeId");

-- CreateIndex
CREATE INDEX "ProcurementStockLedger_productId_idx" ON "ProcurementStockLedger"("productId");

-- CreateIndex
CREATE INDEX "ProcurementStockLedger_type_idx" ON "ProcurementStockLedger"("type");

-- CreateIndex
CREATE INDEX "ProcurementStockLedger_createdAt_idx" ON "ProcurementStockLedger"("createdAt");

-- CreateIndex
CREATE INDEX "VendorLedger_tenantId_idx" ON "VendorLedger"("tenantId");

-- CreateIndex
CREATE INDEX "VendorLedger_storeId_idx" ON "VendorLedger"("storeId");

-- CreateIndex
CREATE INDEX "VendorLedger_vendorId_idx" ON "VendorLedger"("vendorId");

-- CreateIndex
CREATE INDEX "VendorLedger_date_idx" ON "VendorLedger"("date");

-- CreateIndex
CREATE INDEX "VendorLedger_type_idx" ON "VendorLedger"("type");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayment_displayId_key" ON "VendorPayment"("displayId");

-- CreateIndex
CREATE INDEX "VendorPayment_tenantId_idx" ON "VendorPayment"("tenantId");

-- CreateIndex
CREATE INDEX "VendorPayment_storeId_idx" ON "VendorPayment"("storeId");

-- CreateIndex
CREATE INDEX "VendorPayment_vendorId_idx" ON "VendorPayment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayment_paymentDate_idx" ON "VendorPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "VendorPaymentAllocation_tenantId_idx" ON "VendorPaymentAllocation"("tenantId");

-- CreateIndex
CREATE INDEX "VendorPaymentAllocation_paymentId_idx" ON "VendorPaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "VendorPaymentAllocation_invoiceId_idx" ON "VendorPaymentAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "IdSequence_tenantId_idx" ON "IdSequence"("tenantId");

-- CreateIndex
CREATE INDEX "IdSequence_entity_hub_idx" ON "IdSequence"("entity", "hub");

-- CreateIndex
CREATE UNIQUE INDEX "IdSequence_tenantId_entity_hub_period_key" ON "IdSequence"("tenantId", "entity", "hub", "period");

-- CreateIndex
CREATE INDEX "ActivityLog_tenantId_idx" ON "ActivityLog"("tenantId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_storeId_idx" ON "ActivityLog"("storeId");

-- CreateIndex
CREATE INDEX "BankDeposit_tenantId_idx" ON "BankDeposit"("tenantId");

-- CreateIndex
CREATE INDEX "BankDeposit_storeId_idx" ON "BankDeposit"("storeId");

-- CreateIndex
CREATE INDEX "BankDeposit_date_idx" ON "BankDeposit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DamageEntry_displayId_key" ON "DamageEntry"("displayId");

-- CreateIndex
CREATE INDEX "DamageEntry_tenantId_idx" ON "DamageEntry"("tenantId");

-- CreateIndex
CREATE INDEX "DamageEntry_storeId_idx" ON "DamageEntry"("storeId");

-- CreateIndex
CREATE INDEX "DamageEntry_vehicleId_idx" ON "DamageEntry"("vehicleId");

-- CreateIndex
CREATE INDEX "DamageEntry_reportedById_idx" ON "DamageEntry"("reportedById");

-- CreateIndex
CREATE INDEX "DamageEntry_productId_idx" ON "DamageEntry"("productId");

-- CreateIndex
CREATE INDEX "DamageEntry_status_idx" ON "DamageEntry"("status");

-- CreateIndex
CREATE INDEX "DamageEntry_createdAt_idx" ON "DamageEntry"("createdAt");

-- CreateIndex
CREATE INDEX "DamageEntry_damageType_idx" ON "DamageEntry"("damageType");

-- CreateIndex
CREATE UNIQUE INDEX "DamageDeduction_damageEntryId_key" ON "DamageDeduction"("damageEntryId");

-- CreateIndex
CREATE INDEX "DamageDeduction_tenantId_idx" ON "DamageDeduction"("tenantId");

-- CreateIndex
CREATE INDEX "DamageDeduction_storeId_idx" ON "DamageDeduction"("storeId");

-- CreateIndex
CREATE INDEX "DamageDeduction_userId_idx" ON "DamageDeduction"("userId");

-- CreateIndex
CREATE INDEX "DamageDeduction_damageEntryId_idx" ON "DamageDeduction"("damageEntryId");

-- CreateIndex
CREATE INDEX "DamageDeduction_month_idx" ON "DamageDeduction"("month");

-- CreateIndex
CREATE INDEX "DamageDeduction_status_idx" ON "DamageDeduction"("status");

-- CreateIndex
CREATE INDEX "OrderReturn_tenantId_idx" ON "OrderReturn"("tenantId");

-- CreateIndex
CREATE INDEX "OrderReturn_storeId_idx" ON "OrderReturn"("storeId");

-- CreateIndex
CREATE INDEX "OrderReturn_orderId_idx" ON "OrderReturn"("orderId");

-- CreateIndex
CREATE INDEX "OrderReturn_productId_idx" ON "OrderReturn"("productId");

-- CreateIndex
CREATE INDEX "OrderReturn_createdAt_idx" ON "OrderReturn"("createdAt");

-- CreateIndex
CREATE INDEX "SessionSales_tenantId_idx" ON "SessionSales"("tenantId");

-- CreateIndex
CREATE INDEX "SessionSales_storeId_idx" ON "SessionSales"("storeId");

-- CreateIndex
CREATE INDEX "SessionSales_date_idx" ON "SessionSales"("date");

-- CreateIndex
CREATE INDEX "SessionSales_agentId_idx" ON "SessionSales"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSales_tenantId_storeId_date_shift_agentId_key" ON "SessionSales"("tenantId", "storeId", "date", "shift", "agentId");

-- CreateIndex
CREATE INDEX "LocationLog_tenantId_idx" ON "LocationLog"("tenantId");

-- CreateIndex
CREATE INDEX "LocationLog_userId_idx" ON "LocationLog"("userId");

-- CreateIndex
CREATE INDEX "LocationLog_timestamp_idx" ON "LocationLog"("timestamp");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");

-- CreateIndex
CREATE INDEX "Attendance_userId_idx" ON "Attendance"("userId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_storeId_idx" ON "Attendance"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "ShiftLog_tenantId_idx" ON "ShiftLog"("tenantId");

-- CreateIndex
CREATE INDEX "ShiftLog_userId_idx" ON "ShiftLog"("userId");

-- CreateIndex
CREATE INDEX "ShiftLog_date_idx" ON "ShiftLog"("date");

-- CreateIndex
CREATE INDEX "ShiftLog_storeId_idx" ON "ShiftLog"("storeId");

-- CreateIndex
CREATE INDEX "VillageActivity_tenantId_idx" ON "VillageActivity"("tenantId");

-- CreateIndex
CREATE INDEX "VillageActivity_userId_idx" ON "VillageActivity"("userId");

-- CreateIndex
CREATE INDEX "VillageActivity_shiftLogId_idx" ON "VillageActivity"("shiftLogId");

-- CreateIndex
CREATE INDEX "LateEntryConfig_tenantId_idx" ON "LateEntryConfig"("tenantId");

-- CreateIndex
CREATE INDEX "LateEntryConfig_storeId_idx" ON "LateEntryConfig"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "LateEntry_attendanceId_key" ON "LateEntry"("attendanceId");

-- CreateIndex
CREATE INDEX "LateEntry_tenantId_idx" ON "LateEntry"("tenantId");

-- CreateIndex
CREATE INDEX "LateEntry_userId_idx" ON "LateEntry"("userId");

-- CreateIndex
CREATE INDEX "LateEntry_date_idx" ON "LateEntry"("date");

-- CreateIndex
CREATE INDEX "LateEntry_storeId_idx" ON "LateEntry"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "LateEntryException_lateEntryId_key" ON "LateEntryException"("lateEntryId");

-- CreateIndex
CREATE INDEX "LateEntryException_tenantId_idx" ON "LateEntryException"("tenantId");

-- CreateIndex
CREATE INDEX "LateEntryException_userId_idx" ON "LateEntryException"("userId");

-- CreateIndex
CREATE INDEX "LateEntryException_status_idx" ON "LateEntryException"("status");

-- CreateIndex
CREATE INDEX "LeaveBalance_tenantId_idx" ON "LeaveBalance"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_userId_month_key" ON "LeaveBalance"("userId", "month");

-- CreateIndex
CREATE INDEX "Shift_tenantId_idx" ON "Shift"("tenantId");

-- CreateIndex
CREATE INDEX "AssetAuditLog_assetId_idx" ON "AssetAuditLog"("assetId");

-- CreateIndex
CREATE INDEX "AssetAuditLog_assetUnitId_idx" ON "AssetAuditLog"("assetUnitId");

-- CreateIndex
CREATE INDEX "AssetAuditLog_auditedByUserId_idx" ON "AssetAuditLog"("auditedByUserId");

-- CreateIndex
CREATE INDEX "AssetAuditLog_tenantId_idx" ON "AssetAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AssetDepreciation_assetId_idx" ON "AssetDepreciation"("assetId");

-- CreateIndex
CREATE INDEX "AssetDepreciation_tenantId_idx" ON "AssetDepreciation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_mobile_key" ON "Customer"("mobile");

-- CreateIndex
CREATE INDEX "Customer_mobile_idx" ON "Customer"("mobile");

-- CreateIndex
CREATE INDEX "Customer_storeId_idx" ON "Customer"("storeId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_villageId_idx" ON "Customer"("villageId");

-- CreateIndex
CREATE INDEX "FuelLog_storeId_idx" ON "FuelLog"("storeId");

-- CreateIndex
CREATE INDEX "FuelLog_tenantId_idx" ON "FuelLog"("tenantId");

-- CreateIndex
CREATE INDEX "FuelLog_tripId_idx" ON "FuelLog"("tripId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_storeId_idx" ON "MaintenanceLog"("storeId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_tenantId_idx" ON "MaintenanceLog"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_tripId_idx" ON "MaintenanceLog"("tripId");

-- CreateIndex
CREATE INDEX "VehiclePhysicalDamage_status_idx" ON "VehiclePhysicalDamage"("status");

-- CreateIndex
CREATE INDEX "VehiclePhysicalDamage_tenantId_idx" ON "VehiclePhysicalDamage"("tenantId");

-- CreateIndex
CREATE INDEX "VehiclePhysicalDamage_vehicleId_idx" ON "VehiclePhysicalDamage"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleTrip_storeId_idx" ON "VehicleTrip"("storeId");

-- CreateIndex
CREATE INDEX "VehicleTrip_tenantId_idx" ON "VehicleTrip"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleTrip_vehicleId_date_shift_key" ON "VehicleTrip"("vehicleId", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_tenantId_idx" ON "Promotion"("tenantId");

-- CreateIndex
CREATE INDEX "Promotion_code_idx" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_type_idx" ON "Promotion"("type");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

