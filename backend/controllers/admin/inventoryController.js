import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { sendNotification } from '../../services/notificationService.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';
import { logActivity } from '../../utils/activityLogger.js';

// Global caches for bulk operations
const catCache = new Map();
const subCache = new Map();
const unitCache = new Map();

// Item Master
// Consolidated Init Data (Mega-Fetch)
export const getInventoryInitData = async (req, res) => {
  try {
    const { storeId } = req.query;
    const tenantId = req.user.tenantId;

    // Filter logic for Products
    const productWhere = { tenantId };
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      productWhere.OR = [{ storeId: storeId }, { storeId: null }];
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      productWhere.OR = [{ storeId: req.user.storeId }, { storeId: null }];
    }

    // Parallel fetching for performance
    const [products, categories, subCategories, units, vehicles, settings, refillRequests] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: {
          category: { select: { name: true } },
          subCategory: { select: { name: true } },
          unit: { select: { name: true, type: true } },
          WarehouseInventory: { select: { quantity: true } },
          vehicleStocks: { select: { quantity: true } }
        }
      }),
      prisma.category.findMany({ where: { tenantId } }),
      prisma.subCategory.findMany({ where: { tenantId } }),
      prisma.unit.findMany({ where: { tenantId } }),
      prisma.vehicle.findMany({ 
        where: { tenantId, ...(storeId && storeId !== 'null' ? { storeId } : {}) },
        include: {
          assignedUsers: { where: { status: 'ACTIVE' }, select: { id: true, name: true } }
        }
      }),
      prisma.businessSettings.findMany({ 
        where: { 
          tenantId,
          ...(storeId && storeId !== 'null' ? { storeId } : { storeId: null })
        } 
      }),
      prisma.refillRequest.findMany({
        where: { tenantId, status: 'PENDING', ...(storeId && storeId !== 'null' ? { storeId } : {}) },
        include: { 
          items: true,
          user: { select: { id: true, name: true } },
          vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } }
        }
      })
    ]);

    // 1. Process items to sum warehouse quantity
    const processedItems = products.map(item => {
      const warehouseQty = item.WarehouseInventory?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      const vehicleQty = item.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      const effectiveWarehouseQty = warehouseQty > 0 ? warehouseQty : (item.stock ?? 0);
      const totalQty = effectiveWarehouseQty + vehicleQty;

      return {
        ...item,
        warehouseStock: effectiveWarehouseQty,
        vehicleStock: vehicleQty,
        totalStock: totalQty,
        stock: effectiveWarehouseQty
      };
    });

    // 2. Fetch Vehicle Stock for all vehicles at once (The "Mega-Fix" for per-vehicle requests)
    const vehicleIds = vehicles.map(v => v.id);
    const allVehicleStock = await prisma.vehicleStock.findMany({
      where: { vehicleId: { in: vehicleIds } },
      include: {
        product: {
          select: {
            name: true,
            skuCode: true,
            price: true,
            unit: { select: { name: true } }
          }
        }
      }
    });

    // Group vehicle stock by vehicleId
    const vehicleStockMap = {};
    allVehicleStock.forEach(stock => {
      if (!vehicleStockMap[stock.vehicleId]) {
        vehicleStockMap[stock.vehicleId] = [];
      }
      vehicleStockMap[stock.vehicleId].push(stock);
    });

    res.json({
      items: processedItems,
      categories,
      subCategories,
      units,
      vehicles,
      vehicleStock: vehicleStockMap,
      settings,
      refillRequests,
      success: true
    });

  } catch (error) {
    console.error('❌ getInventoryInitData Error:', error.message);
    res.status(500).json({ 
      message: 'Error fetching inventory initialization data', 
      error: error.message,
      success: false 
    });
  }
};

export const getItems = async (req, res) => {
  try {
    const { storeId, all } = req.query;
    const where = { tenantId: req.user.tenantId };
    
    if (all === 'true') {
      // Show everything for the tenant, no storeId filter
    } else if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const items = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        subCategory: { select: { name: true } },
        unit: { select: { name: true, type: true } },
        store: { select: { name: true } },
        WarehouseInventory: {
          select: { quantity: true }
        },
        vehicleStocks: {
          select: { quantity: true }
        }
      }
    });

    // Map each item and provide a comprehensive stock breakdown
    const processedItems = items.map(item => {
      const warehouseQty = item.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);
      const vehicleQty = item.vehicleStocks.reduce((acc, curr) => acc + curr.quantity, 0);
      const effectiveWarehouseQty = warehouseQty > 0 ? warehouseQty : (item.stock ?? 0);
      const totalQty = effectiveWarehouseQty + vehicleQty;
      
      return {
        ...item,
        warehouseStock: effectiveWarehouseQty,
        vehicleStock: vehicleQty,
        totalStock: totalQty,
        storeName: item.store?.name || 'Global Registry',
        stock: effectiveWarehouseQty // Keep 'stock' as effectiveWarehouseQty for backward compatibility where needed
      };
    });

    res.json(processedItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

export const bulkImportItems = async (req, res) => {
  try {
    const { transfers, targetStoreId } = req.body;
    const tenantId = req.user.tenantId;

    if (!transfers || !Array.isArray(transfers) || !targetStoreId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const results = await prisma.$transaction(async (tx) => {
      const processed = [];

      // Get or create default warehouse for the tenant
      let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
      if (!warehouse) {
        warehouse = await tx.warehouse.create({
          data: { tenantId, name: 'Main Warehouse', location: 'Default' }
        });
      }

      for (const transfer of transfers) {
        const { productId, quantity } = transfer;

        if (quantity <= 0) continue;

        // 1. Get Source Product & its Warehouse Stock
        const sourceProd = await tx.product.findUnique({
          where: { id: productId },
          include: { WarehouseInventory: true }
        });

        if (!sourceProd) {
          throw new Error(`Source product ${productId} not found`);
        }

        const sourceTotalStock = sourceProd.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);

        if (sourceTotalStock < quantity) {
          throw new Error(`Insufficient warehouse stock for ${sourceProd.name}. Available: ${sourceTotalStock}, Requested: ${quantity}`);
        }

        // 2. Find or Create Target Product
        let targetProd = await tx.product.findFirst({
          where: {
            tenantId,
            storeId: targetStoreId,
            OR: [
              { name: sourceProd.name },
              { barcode: sourceProd.barcode && sourceProd.barcode !== '' ? sourceProd.barcode : undefined }
            ].filter(Boolean)
          }
        });

        if (!targetProd) {
          targetProd = await tx.product.create({
            data: {
              name: sourceProd.name,
              description: sourceProd.description,
              mrp: sourceProd.mrp,
              price: sourceProd.price,
              landingPrice: sourceProd.landingPrice,
              discount: sourceProd.discount,
              discountType: sourceProd.discountType,
              status: sourceProd.status,
              image: sourceProd.image,
              categoryId: sourceProd.categoryId,
              subCategoryId: sourceProd.subCategoryId,
              brandId: sourceProd.brandId,
              unitId: sourceProd.unitId,
              unitValue: sourceProd.unitValue,
              gst: sourceProd.gst,
              isFree: sourceProd.isFree,
              minShopAmount: sourceProd.minShopAmount,
              barcode: sourceProd.barcode,
              skuCode: sourceProd.skuCode,
              minStockAlert: sourceProd.minStockAlert,
              tenantId,
              storeId: targetStoreId,
              stock: 0, // Will be updated via WarehouseInventory logic below
            }
          });
        }

        // 3. Update Warehouse Inventory for Target Product
        await tx.warehouseInventory.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: warehouse.id,
              productId: targetProd.id
            }
          },
          update: { quantity: { increment: quantity } },
          create: {
            tenantId,
            warehouseId: warehouse.id,
            productId: targetProd.id,
            quantity: quantity
          }
        });

        // 4. Update Product Master stock for Target (Aggregate)
        await tx.product.update({
          where: { id: targetProd.id },
          data: { stock: { increment: quantity } }
        });

        // 5. Deduct from Source Warehouse Inventory
        // We pick the first warehouse record that has stock for simplicity, or specific one if known
        // Here we just use the default warehouse as most items are there
        const sourceWI = await tx.warehouseInventory.findFirst({
          where: { productId: sourceProd.id, warehouseId: warehouse.id }
        });

        if (sourceWI && sourceWI.quantity >= quantity) {
          await tx.warehouseInventory.update({
            where: { id: sourceWI.id },
            data: { quantity: { decrement: quantity } }
          });
        } else {
          // If not in default warehouse, find any that has stock
          const anyWI = await tx.warehouseInventory.findFirst({
            where: { productId: sourceProd.id, quantity: { gte: quantity } }
          });
          if (anyWI) {
            await tx.warehouseInventory.update({
              where: { id: anyWI.id },
              data: { quantity: { decrement: quantity } }
            });
          }
        }

        // 6. Deduct from Source Product Master stock (Aggregate)
        await tx.product.update({
          where: { id: sourceProd.id },
          data: { stock: { decrement: quantity } }
        });

        processed.push(targetProd);
      }

      return processed;
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.json({ 
      success: true,
      message: `Successfully synced ${results.length} products and updated Warehouse inventory.`, 
      syncedCount: results.length 
    });
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ message: error.message || 'Error syncing items' });
  }
};

export const createItem = async (req, res) => {
  const tenantId = req.user?.tenantId || getTenantId();
  try {
    const {
      name,
      description,
      mrp,
      price,
      landingPrice,
      discount,
      status,
      image,
      categoryId,
      subCategoryId,
      brandId,
      unitId,
      unitValue,
      gst,
      isFree,
      minShopAmount,
      barcode,
      skuCode,
      purchasePrice
    } = req.body;

    const finalLandingPrice = landingPrice || purchasePrice;

    // Ensure we have a valid tenantId
    const finalTenantId = tenantId || req.user?.tenantId || 'VK001';

    // Emergency Logging
    fs.appendFileSync('inventory_trace.log', `[${new Date().toISOString()}] Creating Item: ${name} | Tenant: ${finalTenantId} | User: ${req.user?.id}\n`);

    // Handle image upload to Supabase if file is present
    let imageUrl = image || null;
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'product-images',
        'products'
      );
    }

    // Convert strings to floats safely
    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    // Handle default relations since they are required in Prisma Schema
    let finalCategoryId = categoryId;
    let finalSubCategoryId = subCategoryId;
    let finalBrandId = brandId;

    if (!finalCategoryId || finalCategoryId === 'default') {
      let defaultCategory = await prisma.category.findFirst({
        where: { tenantId: finalTenantId, name: 'Uncategorized', storeId: null }
      });
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: { name: 'Uncategorized', tenantId: finalTenantId, storeId: null }
        });
      }
      finalCategoryId = defaultCategory.id;
    }

    if (!finalSubCategoryId || finalSubCategoryId === 'default') {
      let defaultSub = await prisma.subCategory.findFirst({
        where: { name: 'Uncategorized', categoryId: finalCategoryId, tenantId: finalTenantId }
      });
      if (!defaultSub) {
        defaultSub = await prisma.subCategory.create({
          data: { name: 'Uncategorized', categoryId: finalCategoryId, tenantId: finalTenantId }
        });
      }
      finalSubCategoryId = defaultSub.id;
    }

    if (!finalBrandId || finalBrandId === 'default') {
      const defaultBrand = await prisma.brand.upsert({
        where: { tenantId_name: { tenantId: finalTenantId, name: 'Unbranded' } },
        update: {},
        create: { name: 'Unbranded', tenantId: finalTenantId }
      });
      finalBrandId = defaultBrand.id;
    }

    const itemData = {
      tenantId: finalTenantId,
      name,
      description,
      mrp: parseNumber(mrp),
      price: parseNumber(price) || 0,
      landingPrice: parseNumber(finalLandingPrice),
      discount: parseNumber(discount),
      status: status || 'ACTIVE',
      image: imageUrl,
      categoryId: finalCategoryId,
      subCategoryId: finalSubCategoryId,
      brandId: finalBrandId,
      unitId: unitId || undefined,
      unitValue: parseNumber(unitValue),
      gst: parseNumber(gst) || 0,
      isFree: isFree === 'true' || isFree === true,
      minShopAmount: parseNumber(minShopAmount) || 0,
      barcode: barcode || null,
      skuCode: skuCode || null,
      storeId: (req.body.storeId && req.body.storeId !== 'null' && req.body.storeId !== '') ? req.body.storeId : req.user.storeId
    };

    // Generate display ID for item (VK-ITM-[CATEGORY]-[NUMBER])
    const categoryForId = await prisma.category.findUnique({ where: { id: finalCategoryId }, select: { name: true } });
    const catCode = (categoryForId?.name || 'GEN').substring(0, 4).toUpperCase();
    const displayId = await generateId({
      entity: 'ITM',
      tenantId: finalTenantId,
      storeId: itemData.storeId,
      categoryCode: catCode
    });
    itemData.displayId = displayId;

    const item = await prisma.product.create({
      data: itemData
    });

    // Handle initial stock if provided (using raw SQL to bypass stale client validation)
    const initialStock = parseInt(req.body.stock) || 0;
    if (initialStock > 0) {
      await prisma.$executeRawUnsafe(`UPDATE "Product" SET "stock" = ${initialStock} WHERE "id" = '${item.id}'`);
      
      // Also ensure at least one WarehouseInventory record exists if we have a warehouse
      let warehouse = await prisma.warehouse.findFirst({
        where: { tenantId: finalTenantId }
      });

      if (!warehouse) {
        warehouse = await prisma.warehouse.create({
          data: { tenantId: finalTenantId, name: 'Main Warehouse', location: 'Default' }
        });
      }

      if (warehouse) {
        await prisma.warehouseInventory.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.id } },
          update: { quantity: initialStock },
          create: {
            tenantId: finalTenantId,
            warehouseId: warehouse.id,
            productId: item.id,
            quantity: initialStock
          }
        });
      }
      
      console.log(`[Inventory] Initial stock set for ${item.name}: ${initialStock}`);
    }

    res.status(201).json({ message: 'Item created successfully', item });
  } catch (error) {
    console.error('❌ Create Item Error:', error);
    try {
      const fs = await import('fs');
      fs.appendFileSync('emergency_debug.log', `[${new Date().toISOString()}] CREATE ITEM ERROR:\n${error.message}\n${error.stack}\n\n`);
    } catch (e) {}
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mrp,
      price,
      landingPrice,
      discount,
      status,
      image,
      gst,
      isFree,
      minShopAmount,
      unitId,
      unitValue,
      categoryId,
      subCategoryId,
      brandId,
      barcode,
      skuCode,
      storeId,
      stock
    } = req.body;

    // Ensure we have a valid tenantId
    const finalTenantId = req.user?.tenantId || getTenantId() || 'VK001';

    // Handle image upload to Supabase if file is present
    let imageUrl = image || undefined;
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'product-images',
        'products'
      );
      if (!imageUrl) {
        return res.status(500).json({ message: 'Failed to upload image to storage' });
      }
    }

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    // Handle default relations logic similar to createItem
    let finalCategoryId = categoryId;
    let finalSubCategoryId = subCategoryId;
    let finalBrandId = brandId;

    if (finalCategoryId === 'default') {
      let defaultCategory = await prisma.category.findFirst({
        where: { tenantId: finalTenantId, name: 'Uncategorized', storeId: null }
      });
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: { name: 'Uncategorized', tenantId: finalTenantId, storeId: null }
        });
      }
      finalCategoryId = defaultCategory.id;
    }

    if (finalSubCategoryId === 'default') {
      let defaultSub = await prisma.subCategory.findFirst({
        where: { name: 'Uncategorized', categoryId: finalCategoryId || undefined, tenantId: finalTenantId }
      });
      if (!defaultSub && finalCategoryId) {
        defaultSub = await prisma.subCategory.create({
          data: { name: 'Uncategorized', categoryId: finalCategoryId, tenantId: finalTenantId }
        });
      }
      finalSubCategoryId = defaultSub?.id;
    }

    if (finalBrandId === 'default') {
      const defaultBrand = await prisma.brand.upsert({
        where: { tenantId_name: { tenantId: finalTenantId, name: 'Unbranded' } },
        update: {},
        create: { name: 'Unbranded', tenantId: finalTenantId }
      });
      finalBrandId = defaultBrand.id;
    }

    const updateData = {
      name,
      mrp: parseNumber(mrp),
      price: parseNumber(price),
      landingPrice: parseNumber(landingPrice),
      discount: parseNumber(discount),
      status,
      image: imageUrl,
      gst: parseNumber(gst),
      isFree: isFree === undefined ? undefined : (isFree === 'true' || isFree === true),
      minShopAmount: parseNumber(minShopAmount),
      unitId: unitId || undefined,
      unitValue: parseNumber(unitValue),
      categoryId: finalCategoryId || undefined,
      subCategoryId: finalSubCategoryId || undefined,
      brandId: finalBrandId || undefined,
      barcode: barcode === undefined ? undefined : (barcode || null),
      skuCode: skuCode === undefined ? undefined : (skuCode || null),
      storeId: (storeId && storeId !== 'null' && storeId !== '') ? storeId : undefined
    };

    const item = await prisma.product.update({
      where: { id },
      data: updateData
    });

    // Handle manual stock override if provided
    if (stock !== undefined) {
      const newStock = parseInt(stock) || 0;
      await prisma.$executeRawUnsafe(`UPDATE "Product" SET "stock" = ${newStock} WHERE "id" = '${id}'`);
      
      // Ensure a warehouse exists for this tenant
      let warehouse = await prisma.warehouse.findFirst({
        where: { tenantId: finalTenantId }
      });

      if (!warehouse) {
        warehouse = await prisma.warehouse.create({
          data: { tenantId: finalTenantId, name: 'Main Warehouse', location: 'Default' }
        });
      }

      // Upsert WarehouseInventory to ensure the 'getItems' mapping reflects the override
      await prisma.warehouseInventory.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: id
          }
        },
        update: { quantity: newStock },
        create: {
          id: `wi_${id.substring(0, 8)}_${warehouse.id.substring(0, 8)}`,
          tenantId: finalTenantId,
          warehouseId: warehouse.id,
          productId: id,
          quantity: newStock
        }
      });

      // If there are other warehouses, set them to 0 to maintain consistency
      await prisma.warehouseInventory.updateMany({
        where: { 
          productId: id, 
          warehouseId: { not: warehouse.id },
          tenantId: finalTenantId
        },
        data: { quantity: 0 }
      });

      console.log(`[Inventory] Manual stock override for ${item.name}: ${newStock}`);
    }

    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
    console.error('❌ Update Item Error:', error);
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.product.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Cascade delete all child records in dependency order to avoid foreign key constraints
    const where = { productId: id };
    
    await prisma.cartItem.deleteMany({ where });
    await prisma.orderItem.deleteMany({ where });
    await prisma.orderReturn.deleteMany({ where });
    await prisma.stockTransaction.deleteMany({ where });
    await prisma.vehicleStock.deleteMany({ where });
    await prisma.warehouseInventory.deleteMany({ where });
    await prisma.productVariant.deleteMany({ where });
    await prisma.refillItem.deleteMany({ where });
    await prisma.stockAuditItem.deleteMany({ where });
    await prisma.vendorItemMapping.deleteMany({ where });
    await prisma.purchaseOrderItem.deleteMany({ where });
    await prisma.goodsReceiptItem.deleteMany({ where });
    await prisma.purchaseInvoiceItem.deleteMany({ where });
    await prisma.damageEntry.deleteMany({ where });
    await prisma.procurementStockLedger.deleteMany({ where });

    // Finally delete the product
    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting item:', error.message);
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};

// Stock Loading (Morning)
export const loadStock = async (req, res) => {
  try {
    const { vehicleId, items } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required' });
    }

    // 0. Deduplicate items by productId and sum quantities to prevent SQL conflicts
    const uniqueItemsMap = new Map();
    for (const item of items) {
      const q = parseFloat(item.quantity) || 0;
      if (q <= 0) continue;
      const existing = uniqueItemsMap.get(item.productId) || 0;
      uniqueItemsMap.set(item.productId, existing + q);
    }
    const processedItemsList = Array.from(uniqueItemsMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));

    if (processedItemsList.length === 0) {
      return res.status(400).json({ message: 'No valid items to load' });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, storeId: true, vehicleNumber: true, displayId: true }
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const storeId = vehicle.storeId;

    // 1. Pre-fetch products WITH their warehouse inventories
    const productIds = processedItemsList.map(i => i.productId);
    const products = await prisma.product.findMany({ 
      where: { id: { in: productIds } },
      include: { WarehouseInventory: true }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // 2. Validate stock availability for all items before starting transaction
    for (const item of processedItemsList) {
      const q = item.quantity;
      
      const prod = productMap.get(item.productId);
      if (!prod) throw new Error(`Product ${item.productId} not found`);

      // Calculate effective stock exactly like getItems does
      const totalWarehouseQty = (prod.WarehouseInventory || []).reduce((acc, curr) => acc + curr.quantity, 0);
      const effectiveStock = totalWarehouseQty > 0 ? totalWarehouseQty : (prod.stock || 0);

      if (Math.floor(q) > effectiveStock) {
        throw new Error(`VALIDATION:Insufficient stock for ${prod.name}. Available: ${effectiveStock}`);
      }
    }

    await prisma.$transaction(async (tx) => {
      const transactionsData = [];
      const vehicleStockValues = [];
      const productUpdateValues = [];
      const wiUpdateValues = [];
      for (const item of processedItemsList) {
        const q = item.quantity;
        const cleanQty = Math.floor(q);

        console.log(`[LoadStock] Checking product: ${item.productId}`);
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) {
          throw new Error(`VALIDATION:Product ${item.productId} not found`);
        }
        if (Math.floor(q) > (prod.stock || 0)) {
          throw new Error(`VALIDATION:Insufficient stock for ${prod.name}. Available: ${prod.stock}`);
        }

        console.log(`[LoadStock] Creating transaction record`);
        await tx.stockTransaction.create({
          data: {
            tenantId: req.user.tenantId,
            storeId,
            userId: req.user.id,
            type: 'LOAD',
            vehicleId,
            productId: item.productId,
            quantity: q
          }
        });

        console.log(`[LoadStock] Updating vehicle stock (upsert)`);
        await tx.vehicleStock.upsert({
          where: {
            vehicleId_productId: { vehicleId, productId: item.productId }
          },
          update: {
            quantity: { increment: Math.floor(q) },
            openingQuantity: { increment: Math.floor(q) }
          },
          create: {
            tenantId: req.user.tenantId,
            storeId,
            vehicleId,
            productId: item.productId,
            quantity: Math.floor(q),
            openingQuantity: Math.floor(q)
          }
        });

        console.log(`[LoadStock] Decrementing WarehouseInventory`);
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });
        
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { decrement: cleanQty } }
          });
        } else {
          // Fallback if no WarehouseInventory record exists (rare case)
          // Create one so future queries find it
          let warehouse = await tx.warehouse.findFirst({ where: { tenantId: req.user.tenantId } });
          if (!warehouse) {
            warehouse = await tx.warehouse.create({
              data: { tenantId: req.user.tenantId, name: 'Main Warehouse', location: 'Default' }
            });
          }
          await tx.warehouseInventory.create({
            data: {
              tenantId: req.user.tenantId,
              warehouseId: warehouse.id,
              productId: item.productId,
              quantity: -cleanQty
            }
          });
        }

        console.log(`[LoadStock] Syncing Product.stock`);
        const allWi = await tx.warehouseInventory.findMany({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });
        const totalQty = allWi.reduce((acc, curr) => acc + curr.quantity, 0);
        
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalQty }
        });
        console.log(`[LoadStock] Item Success`);
      }
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    res.json({ message: 'Stock loaded successfully' });

    // Find the user assigned to this vehicle to track as targetUserId
    const assignedUser = await prisma.user.findFirst({
      where: { assignedVehicleId: vehicleId, status: 'ACTIVE' },
      select: { id: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId,
      action: 'STOCK_LOADING',
      details: `Loaded morning stock for vehicle ${vehicle?.vehicleNumber || vehicle?.displayId || vehicleId}. Total items: ${items.length}`,
      targetUserId: assignedUser?.id,
      metadata: { vehicleId, itemCount: items.length }
    });

    sendNotification({
      vehicleIds: [vehicleId],
      roles: ['ADMIN'],
      title: 'Stock Loaded',
      message: `New stock has been loaded to vehicle.`,
      type: 'inventory',
      priority: 'low',
      metadata: { vehicleId }
    });
    } catch (error) {
    console.error('❌ loadStock Crash:', error);
    
    const errorMessage = error.message || '';
    
    // 1. Handle our custom business logic validation errors
    if (errorMessage.match(/VALIDATION:/i)) {
      const parts = errorMessage.split(/VALIDATION:/i);
      const cleanMessage = parts[parts.length - 1].trim();
      return res.status(400).json({ message: cleanMessage });
    }

    res.status(500).json({ 
      message: 'Error loading stock', 
      error: errorMessage,
      code: error.code
    });
  }
};

export const getLoadHistory = async (req, res) => {
  try {
    const { storeFilterId, startDate, endDate } = req.query;

    const whereClause = {
      tenantId: req.user.tenantId,
      type: 'LOAD'
    };

    if (storeFilterId) whereClause.storeId = storeFilterId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else {
      // Default to last 7 days if not provided
      const start = new Date();
      start.setDate(start.getDate() - 7);
      whereClause.date = { gte: start };
    }

    const history = await prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        vehicle: { select: { vehicleNumber: true, displayId: true } },
        product: { select: { name: true, skuCode: true, unit: { select: { name: true } } } },
        user: { select: { name: true, role: true } }
      },
      orderBy: { date: 'desc' },
      take: 500
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching load history', error: error.message });
  }
};

// Stock Return (Evening)
export const returnStock = async (req, res) => {
  try {
    const { vehicleId, items } = req.body;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, storeId: true, vehicleNumber: true, displayId: true }
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const storeId = vehicle.storeId;

    // 1. Pre-fetch warehouse inventories for bulk updates
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { WarehouseInventory: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    await prisma.$transaction(async (tx) => {
      const transactionsData = [];
      const vehicleUpdateValues = [];
      const productUpdateValues = [];
      const wiUpdateValues = [];

      for (const item of items) {
        const q = parseFloat(item.quantity);
        if (isNaN(q) || q <= 0) continue;
        const cleanQty = Math.floor(q);
        
        const prod = productMap.get(item.productId);

        // Transaction record
        transactionsData.push({
          tenantId: req.user.tenantId,
          storeId,
          userId: req.user.id,
          type: 'RETURN',
          vehicleId,
          productId: item.productId,
          quantity: cleanQty
        });

        // 🆕 Decrement Vehicle Stock
        await tx.vehicleStock.update({
          where: { vehicleId_productId: { vehicleId, productId: item.productId } },
          data: { quantity: { decrement: cleanQty } }
        });
        
        // 🆕 INCREMENT WarehouseInventory
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });

        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { increment: cleanQty } }
          });
        } else {
          // If no WarehouseInventory record exists, create one
          let warehouse = await tx.warehouse.findFirst({ where: { tenantId: req.user.tenantId } });
          if (!warehouse) {
            warehouse = await tx.warehouse.create({
              data: { tenantId: req.user.tenantId, name: 'Main Warehouse', location: 'Default' }
            });
          }
          await tx.warehouseInventory.create({
            data: {
              tenantId: req.user.tenantId,
              warehouseId: warehouse.id,
              productId: item.productId,
              quantity: cleanQty
            }
          });
        }

        // 🆕 SYNC Product.stock (Source of Truth is now the sum of all WarehouseInventory)
        const allWi = await tx.warehouseInventory.findMany({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });
        const totalQty = allWi.reduce((acc, curr) => acc + curr.quantity, 0);
        
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalQty }
        });
      }
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    res.json({ message: 'Stock returned successfully' });

    // Find the user assigned to this vehicle to track as targetUserId
    const assignedUser = await prisma.user.findFirst({
      where: { assignedVehicleId: vehicleId, status: 'ACTIVE' },
      select: { id: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId,
      action: 'STOCK_RETURNING',
      details: `Returned evening stock for vehicle ${vehicle?.vehicleNumber || vehicle?.displayId || vehicleId}. Total items: ${items.length}`,
      targetUserId: assignedUser?.id,
      metadata: { vehicleId, itemCount: items.length }
    });

    sendNotification({
      vehicleIds: [vehicleId],
      roles: ['ADMIN'],
      title: 'Stock Returned',
      message: `Stock has been returned from vehicle.`,
      type: 'inventory',
      priority: 'low',
      metadata: { vehicleId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error returning stock', error: error.message });
  }
};

export const getReturnHistory = async (req, res) => {
  try {
    const { storeFilterId, startDate, endDate } = req.query;

    const whereClause = {
      tenantId: req.user.tenantId,
      type: 'RETURN'
    };

    if (storeFilterId) whereClause.storeId = storeFilterId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      whereClause.date = { gte: start };
    }

    const history = await prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        vehicle: { select: { vehicleNumber: true, displayId: true } },
        product: { select: { name: true, skuCode: true, unit: { select: { name: true } } } },
        user: { select: { name: true, role: true } }
      },
      orderBy: { date: 'desc' },
      take: 500
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching return history', error: error.message });
  }
};

export const bulkCreateItems = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId() || 'VK001';
    const products = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: 'Products data must be an array' });
    }

    const createdItems = [];

    // Ensure default relations exist
    let defaultCategory = await prisma.category.findFirst({
      where: { tenantId, name: 'Uncategorized', storeId: null }
    });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'Uncategorized', tenantId, storeId: null }
      });
    }

    const defaultBrand = await prisma.brand.upsert({
      where: { tenantId_name: { tenantId, name: 'Unbranded' } },
      update: {},
      create: { name: 'Unbranded', tenantId }
    });

    let defaultSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
    });
    if (!defaultSub) {
      defaultSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
      });
    }

    // 1. Pre-fetch all existing relations for this tenant to populate caches instantly
    const [existingCats, existingUnits] = await Promise.all([
      prisma.category.findMany({ where: { tenantId, storeId: null } }),
      prisma.unit.findMany({ where: { tenantId, storeId: null } })
    ]);

    // Populate caches with existing data
    existingCats.forEach(c => catCache.set(c.name.trim(), c.id));
    existingUnits.forEach(u => unitCache.set(u.type.trim(), u.id));

    // Pre-fetch all local subcategories
    const existingSubs = await prisma.subCategory.findMany({
      where: { categoryId: { in: existingCats.map(c => c.id) }, tenantId }
    });
    existingSubs.forEach(s => subCache.set(`${s.categoryId}_${s.name.trim()}`, s.id));

    // 2. Pre-process relations in high-speed batches to avoid individual DB Round-Trips
    const uniqueCatNames = [...new Set(products.filter(p => p.categoryName).map(p => String(p.categoryName).trim()))];
    const uniqueUnitTypes = [...new Set(products.filter(p => p.unitType).map(p => String(p.unitType).trim()))];

    // Find and bulk-create missing Categories
    const missingCats = uniqueCatNames.filter(name => !catCache.has(name));
    if (missingCats.length > 0) {
      await prisma.category.createMany({
        data: missingCats.map(name => ({ tenantId, name })),
        skipDuplicates: true
      });
      const updatedCats = await prisma.category.findMany({ where: { tenantId, name: { in: missingCats }, storeId: null } });
      updatedCats.forEach(c => catCache.set(c.name.trim(), c.id));
    }

    // Now resolve Sub-Categories
    const subPairs = [];
    products.forEach(p => {
      if (p.categoryName && p.subCategoryName) {
        const cId = catCache.get(String(p.categoryName).trim());
        if (cId) subPairs.push({ categoryId: cId, name: String(p.subCategoryName).trim() });
      }
    });
    const uniqueSubPairs = Array.from(new Set(subPairs.map(s => `${s.categoryId}|${s.name}`)))
      .map(str => ({ categoryId: str.split('|')[0], name: str.split('|')[1] }));

    const missingSubs = uniqueSubPairs.filter(s => !subCache.has(`${s.categoryId}_${s.name}`));
    if (missingSubs.length > 0) {
      await prisma.subCategory.createMany({
        data: missingSubs.map(s => ({ ...s, tenantId })),
        skipDuplicates: true
      });
      const updatedSubs = await prisma.subCategory.findMany({
        where: { tenantId, name: { in: missingSubs.map(s => s.name) }, categoryId: { in: missingSubs.map(s => s.categoryId) } }
      });
      updatedSubs.forEach(s => subCache.set(`${s.categoryId}_${s.name.trim()}`, s.id));
    }

    // Resolve missing Units
    const missingUnits = uniqueUnitTypes.filter(type => !unitCache.has(type));
    if (missingUnits.length > 0) {
      await prisma.unit.createMany({
        data: missingUnits.map(type => ({ tenantId, name: type, type })),
        skipDuplicates: true
      });
      const updatedUnits = await prisma.unit.findMany({ where: { tenantId, type: { in: missingUnits }, storeId: null } });
      updatedUnits.forEach(u => unitCache.set(u.type.trim(), u.id));
    }

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    console.log(`[TurboBulk] Final Phase: Mapping ${products.length} products...`);
    const itemDataArray = [];

    for (const prod of products) {
      if (!prod.name) continue;

      let targetCategoryId = defaultCategory.id;
      if (prod.categoryName) {
        targetCategoryId = catCache.get(String(prod.categoryName).trim()) || defaultCategory.id;
      }

      let targetSubCategoryId = defaultSub.id;
      if (prod.subCategoryName && targetCategoryId) {
        targetSubCategoryId = subCache.get(`${targetCategoryId}_${String(prod.subCategoryName).trim()}`) || defaultSub.id;
      }

      let targetUnitId = null;
      if (prod.unitType) {
        targetUnitId = unitCache.get(String(prod.unitType).trim()) || null;
      }

      itemDataArray.push({
        tenantId,
        storeId: req.user?.storeId || null,
        name: prod.name,
        description: prod.description || '',
        mrp: parseNumber(prod.mrp),
        price: parseNumber(prod.price) || 0,
        landingPrice: parseNumber(prod.landingPrice),
        discount: parseNumber(prod.discount),
        status: prod.status || 'ACTIVE',
        categoryId: targetCategoryId,
        subCategoryId: targetSubCategoryId,
        brandId: prod.brandId || defaultBrand.id,
        unitId: targetUnitId,
        unitValue: parseNumber(prod.unitValue),
        gst: parseNumber(prod.gst) || 0,
        isFree: prod.isFree === true || prod.isFree === 'true',
        minShopAmount: parseNumber(prod.minShopAmount) || 0,
      });
    }
    
    let insertCount = 0;
    if(itemDataArray.length > 0) {
       const chunkSize = 500;
       for (let i = 0; i < itemDataArray.length; i += chunkSize) {
         const chunk = itemDataArray.slice(i, i + chunkSize);
         const result = await prisma.product.createMany({
            data: chunk,
            skipDuplicates: true
         });
         insertCount += result.count;
       }
    }

    res.status(201).json({ message: `Successfully created ${insertCount} items`, count: insertCount });
  } catch (error) {
    console.error('❌ Bulk Create Item Error:', error);
    res.status(500).json({ message: 'Error bulk creating items', error: error.message });
  }
};

export const importZipInventory = async (req, res) => {
  const tempDir = path.join('uploads', 'tmp', `zip-${Date.now()}`);
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No ZIP file uploaded' });
    }

    const tenantId = req.user?.tenantId || getTenantId() || 'VK001';
    const storeId = req.user?.storeId || null;

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract ZIP
    console.log(`[ZIP Import] Processing file: ${req.file.originalname} for Tenant: ${tenantId}`);
    const zip = new AdmZip(req.file.buffer);
    zip.extractAllTo(tempDir, true);

    // Find Excel file and Images folder
    let files = fs.readdirSync(tempDir);
    console.log(`[ZIP Import] Extracted ${files.length} items to ${tempDir}`);
    
    // If there's only one item and it's a directory, go inside it
    if (files.length === 1 && fs.statSync(path.join(tempDir, files[0])).isDirectory()) {
      const subDir = path.join(tempDir, files[0]);
      console.log(`[ZIP Import] Single top-level directory detected: ${files[0]}. Descending...`);
      // Copy contents back to tempDir or just adjust tempDir?
      // Adjusting paths is easier
      const subFiles = fs.readdirSync(subDir);
      subFiles.forEach(f => {
        fs.renameSync(path.join(subDir, f), path.join(tempDir, f));
      });
      files = fs.readdirSync(tempDir);
    }

    const excelFile = files.find(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
    const imageFolder = files.find(f => f.toLowerCase() === 'images' || f.toLowerCase() === 'product_images');
    const imageFolderPath = imageFolder ? path.join(tempDir, imageFolder) : tempDir;

    if (!excelFile) {
      throw new Error('No Excel/CSV file found in ZIP');
    }

    // Parse Excel
    const excelFilePath = path.join(tempDir, excelFile);
    const fileBuffer = fs.readFileSync(excelFilePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Pre-create relations (similar to bulkCreateItems)
    // Ensure default relations exist
    let defaultCategory = await prisma.category.findFirst({
      where: { tenantId, name: 'Uncategorized', storeId: null }
    });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'Uncategorized', tenantId, storeId: null }
      });
    }

    const defaultBrand = await prisma.brand.upsert({
      where: { tenantId_name: { tenantId, name: 'Unbranded' } },
      update: {},
      create: { name: 'Unbranded', tenantId }
    });

    let defaultSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
    });
    if (!defaultSub) {
      defaultSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
      });
    }

    // Populate Caches
    const [existingCats, existingUnits] = await Promise.all([
      prisma.category.findMany({ where: { tenantId, storeId: null } }),
      prisma.unit.findMany({ where: { tenantId, storeId: null } })
    ]);
    existingCats.forEach(c => catCache.set(c.name.trim(), c.id));
    existingUnits.forEach(u => unitCache.set(u.type.trim(), u.id));

    const existingSubs = await prisma.subCategory.findMany({
      where: { categoryId: { in: existingCats.map(c => c.id) }, tenantId }
    });
    existingSubs.forEach(s => subCache.set(`${s.categoryId}_${s.name.trim()}`, s.id));

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const keys = Object.keys(row);
        const findKey = (search) => keys.find(k => k.toLowerCase().includes(search.toLowerCase()));

        const nameKey = findKey('product name') || findKey('name') || keys[0];
        if (!row[nameKey]) continue;

        const imgFilenameKey = findKey('image filename') || findKey('image') || findKey('filename');
        const categoryKey = findKey('category');
        const subCategoryKey = findKey('sub-category') || findKey('sub category');
        const unitTypeKey = findKey('unit type');
        
        let imageUrl = null;
        if (imgFilenameKey && row[imgFilenameKey]) {
          const imgPath = path.join(imageFolderPath, row[imgFilenameKey]);
          if (fs.existsSync(imgPath)) {
            const fileBuffer = fs.readFileSync(imgPath);
            const mimeType = row[imgFilenameKey].toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            imageUrl = await uploadToSupabase(fileBuffer, row[imgFilenameKey], mimeType, 'product-images', 'products');
          }
        }

        let categoryId = defaultCategory.id;
        if (categoryKey && row[categoryKey]) {
          const catName = String(row[categoryKey]).trim();
          if (catCache.has(catName)) {
            categoryId = catCache.get(catName);
          } else {
            const newCat = await prisma.category.create({ data: { tenantId, name: catName } });
            catCache.set(catName, newCat.id);
            categoryId = newCat.id;
          }
        }

        let subCategoryId = defaultSub.id;
        if (subCategoryKey && row[subCategoryKey] && categoryId) {
          const subName = String(row[subCategoryKey]).trim();
          const cacheKey = `${categoryId}_${subName}`;
          if (subCache.has(cacheKey)) {
            subCategoryId = subCache.get(cacheKey);
          } else {
            const newSub = await prisma.subCategory.create({ data: { tenantId, categoryId, name: subName } });
            subCache.set(cacheKey, newSub.id);
            subCategoryId = newSub.id;
          }
        }

        let unitId = null;
        if (unitTypeKey && row[unitTypeKey]) {
          const unitType = String(row[unitTypeKey]).trim();
          if (unitCache.has(unitType)) {
            unitId = unitCache.get(unitType);
          } else {
            const newUnit = await prisma.unit.create({ data: { tenantId, type: unitType, name: unitType } });
            unitCache.set(unitType, newUnit.id);
            unitId = newUnit.id;
          }
        }

        const catCode = (row[categoryKey] || 'GEN').toString().substring(0, 4).toUpperCase();
        const displayId = await generateId({ entity: 'ITM', tenantId, storeId, categoryCode: catCode });

        await prisma.product.create({
          data: {
            tenantId,
            storeId,
            displayId,
            name: row[nameKey],
            description: row[findKey('description')] || '',
            mrp: parseNumber(row[findKey('mrp')]),
            price: parseNumber(row[findKey('selling price') || findKey('price')]) || 0,
            landingPrice: parseNumber(row[findKey('landing price') || findKey('purchase price')]),
            discount: parseNumber(row[findKey('discount')]),
            gst: parseNumber(row[findKey('gst')]) || 0,
            unitValue: parseNumber(row[findKey('unit value')]),
            unitId,
            categoryId,
            subCategoryId,
            brandId: defaultBrand.id,
            image: imageUrl,
            status: 'ACTIVE'
          }
        });
        successCount++;
      } catch (err) {
        console.error(`Error importing row: ${row.name}`, err);
        errorCount++;
      }
    }

    res.json({ message: 'ZIP Import complete', success: successCount, failed: errorCount });
  } catch (error) {
    console.error('❌ ZIP Import Error:', error);
    try {
      fs.appendFileSync('zip_import_error.log', `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`);
    } catch (e) {}
    res.status(500).json({ message: error.message });
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  }
};

export const bulkDeleteItems = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Product IDs must be provided as a non-empty array' });
    }

    // Cascade delete all child records for these items in dependency order
    await prisma.orderItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.stockTransaction.deleteMany({ where: { productId: { in: ids } } });
    await prisma.vehicleStock.deleteMany({ where: { productId: { in: ids } } });
    await prisma.warehouseInventory.deleteMany({ where: { productId: { in: ids } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });
    await prisma.refillItem.deleteMany({ where: { productId: { in: ids } } });
    const deleteResult = await prisma.product.deleteMany({ where: { id: { in: ids } } });

    res.json({ message: `Successfully deleted ${deleteResult.count} items`, count: deleteResult.count });
  } catch (error) {
    console.error('❌ Bulk Delete Item Error:', error);
    res.status(500).json({ message: 'Error bulk deleting items', error: error.message });
  }
};

export const getVehicleInventory = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId
    const inventory = await prisma.vehicleStock.findMany({
      where: { 
        vehicleId: id,
        tenantId: req.user.tenantId,
        // Optional: filter by storeId if needed, but vehicle is usually unique anyway
      },
      include: {
        product: { 
          include: { 
            unit: true,
            category: true,
            brand: true,
            subCategory: true
          }
        }
      }
    });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle inventory', error: error.message });
  }
};

export const auditVehicleStock = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId
    const { items } = req.body; // items = [{ productId, quantity }]
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, storeId: true, vehicleNumber: true, displayId: true }
    });
    const storeId = vehicle?.storeId;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid items data' });
    }

    console.log('Starting Optimized Audit for vehicle:', id);
    
    // Pre-fetch all current stocks to avoid N+1 queries in transaction
    const existingStocks = await prisma.vehicleStock.findMany({
      where: { 
        vehicleId: id,
        productId: { in: items.map(i => i.productId) }
      }
    });
    // Create a map for O(1) lookup
    const stockMap = new Map(existingStocks.map(s => [s.productId, s.quantity]));

    await prisma.$transaction(async (tx) => {
      // 1. Create a parent Audit record
      const audit = await tx.stockAudit.create({
        data: {
          tenantId: req.user.tenantId,
          storeId,
          vehicleId: id,
          userId: req.user.id,
          remark: req.body.remark || 'Manual Audit'
        }
      });

      // 2. Prepare data for batch operations
      const auditItemsData = [];
      const transactionsData = [];
      const stockUpsertValues = [];
      
      for (const item of items) {
        const q = parseFloat(item.quantity);
        if (isNaN(q)) continue;

        const currentQty = stockMap.get(item.productId) || 0;
        const cleanQty = Math.floor(q);

        auditItemsData.push({
          tenantId: req.user.tenantId,
          auditId: audit.id,
          productId: item.productId,
          oldQuantity: Math.floor(currentQty),
          newQuantity: cleanQty
        });

        transactionsData.push({
          tenantId: req.user.tenantId,
          storeId,
          type: 'AUDIT',
          vehicleId: id,
          productId: item.productId,
          quantity: cleanQty,
          date: new Date()
        });

        // Prepare raw values for bulk upsert
        const randomId = `vstk_${Math.random().toString(36).substring(2, 15)}`;
        const storeVal = storeId ? `'${storeId}'` : 'NULL';
        stockUpsertValues.push(`('${randomId}', '${req.user.tenantId}', ${storeVal}, '${id}', '${item.productId}', ${cleanQty}, ${cleanQty})`);
      }

      // 3. Ultra-Fast Bulk Upsert using Raw SQL (PostgreSQL)
      if (stockUpsertValues.length > 0) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "VehicleStock" ("id", "tenantId", "storeId", "vehicleId", "productId", "quantity", "openingQuantity")
          VALUES ${stockUpsertValues.join(',')}
          ON CONFLICT ("vehicleId", "productId")
          DO UPDATE SET 
            "quantity" = EXCLUDED."quantity",
            "openingQuantity" = EXCLUDED."openingQuantity"
        `);
      }
      
      if (auditItemsData.length > 0) {
        await tx.stockAuditItem.createMany({ data: auditItemsData });
        await tx.stockTransaction.createMany({ data: transactionsData });
      }
    }, {
      maxWait: 30000,
      timeout: 120000
    });
    console.log('Prisma Transaction committed successfully.');

    // Find the user assigned to this vehicle to track as targetUserId
    const assignedUser = await prisma.user.findFirst({
      where: { assignedVehicleId: id, status: 'ACTIVE' },
      select: { id: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId,
      action: 'STOCK_AUDITED',
      details: `Audited stock for vehicle ${vehicle?.vehicleNumber || vehicle?.displayId || id}. Items: ${items.length}`,
      targetUserId: assignedUser?.id,
      metadata: { vehicleId: id, itemCount: items.length, remark: req.body.remark }
    });

    res.json({ message: 'Inventory audited successfully' });
  } catch (error) {
    console.error('❌ Audit Error:', error);
    res.status(500).json({ message: 'Error auditing stock', error: error.message });
  }
};

export const getRefillRequests = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const requests = await prisma.refillRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { 
              include: { 
                unit: true,
                category: true
              } 
            }
          }
        }
      }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching refill requests', error: error.message });
  }
};

export const approveRefillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedItemIds, quantities, remarks } = req.body;

    const request = await prisma.refillRequest.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!request) return res.status(404).json({ message: 'Refill request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request is already processed' });

    // 1. Fetch all products first (outside transaction for speed)
    let itemsToProcess = request.items;
    if (approvedItemIds && Array.isArray(approvedItemIds)) {
      itemsToProcess = itemsToProcess.filter(item => approvedItemIds.includes(item.id));
    }

    // Process overrides safely
    itemsToProcess = itemsToProcess.map(item => {
      let finalQty = item.quantity;
      if (quantities && quantities[item.id] !== undefined && quantities[item.id] !== '') {
        const parsed = parseInt(quantities[item.id], 10);
        if (!isNaN(parsed) && parsed >= 0) finalQty = parsed;
      }
      return {
        ...item,
        originalQuantity: item.quantity,
        quantity: finalQty, // override for loading stock
        adminRemark: remarks?.[item.id] || null
      };
    });

    const productIds = itemsToProcess.map(item => item.productId);
    const validProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    });
    const validProductIds = new Set(validProducts.map(p => p.id));

    // 2. Filter valid items and CONSOLIDATE duplicates (prevents row locking issues)
    const consolidatedMap = {};
    itemsToProcess.forEach(item => {
      if (!validProductIds.has(item.productId)) {
        console.warn(`[RefillApproval] Skipping invalid product ID: ${item.productId}`);
        return;
      }
      
      if (!consolidatedMap[item.productId]) {
        consolidatedMap[item.productId] = { quantity: 0, name: validProducts.find(p => p.id === item.productId)?.name };
      }
      consolidatedMap[item.productId].quantity += item.quantity;
    });

    const finalItemsToProcess = Object.entries(consolidatedMap).map(([productId, data]) => ({
      productId,
      quantity: data.quantity,
      name: data.name
    }));

    // 3. Run stock updates in a highly-resilient atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Bulk Log Transactions
      if (finalItemsToProcess.length > 0) {
        await tx.stockTransaction.createMany({
          data: finalItemsToProcess.map(item => ({
            tenantId: request.tenantId,
            storeId: request.storeId,
            userId: req.user.id,
            date: new Date(),
            type: 'REFILL',
            vehicleId: request.vehicleId,
            productId: item.productId,
            quantity: item.quantity
          }))
        });
      }

      // 2. Fetch existing vehicle stocks to decide between update and create
      const existingStocks = await tx.vehicleStock.findMany({
        where: { 
          vehicleId: request.vehicleId,
          productId: { in: finalItemsToProcess.map(i => i.productId) }
        }
      });
      const existingProductIds = new Set(existingStocks.map(s => s.productId));

      // 3. Update Stocks
      for (const item of finalItemsToProcess) {
        if (existingProductIds.has(item.productId)) {
          await tx.vehicleStock.update({
            where: { vehicleId_productId: { vehicleId: request.vehicleId, productId: item.productId } },
            data: { quantity: { increment: item.quantity } }
          });
        } else {
          await tx.vehicleStock.create({
            data: {
              tenantId: request.tenantId,
              storeId: request.storeId,
              vehicleId: request.vehicleId,
              productId: item.productId,
              quantity: item.quantity,
              openingQuantity: item.quantity
            }
          });
        }

        // 🆕 Decrement WarehouseInventory
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId: request.tenantId }
        });

        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { decrement: Math.floor(item.quantity) } }
          });
        }

        // Sync Product.stock
        const allWi = await tx.warehouseInventory.findMany({
          where: { productId: item.productId, tenantId: request.tenantId }
        });
        const totalQty = allWi.reduce((acc, curr) => acc + curr.quantity, 0);

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalQty }
        });
      }


      const processedItemIds = itemsToProcess.map(i => i.id);
      
      if (processedItemIds.length < request.items.length) {
        // Partial Approval
        // Remove items from the current pending request
        await tx.refillItem.deleteMany({
          where: { id: { in: processedItemIds } }
        });

        // Create a new request for the approved items to keep historical records
        await tx.refillRequest.create({
          data: {
            tenantId: request.tenantId,
            vehicleId: request.vehicleId,
            userId: request.userId,
            approvedById: req.user.id,
            status: 'APPROVED',
            parentId: request.parentId || request.id,
            items: {
              create: finalItemsToProcess.map(item => ({
                tenantId: item.tenantId || request.tenantId,
                productId: item.productId,
                quantity: item.quantity,
                requestedQuantity: item.originalQuantity || item.quantity,
                adminRemark: item.adminRemark
              }))
            }
          }
        });
      } else {
        // Full Approval
        await tx.refillRequest.update({
          where: { id },
          data: { 
            status: 'APPROVED',
            approvedById: req.user.id
          }
        });

        // Update items to store the requested quantity if not already set
        for (const item of finalItemsToProcess) {
          await tx.refillItem.updateMany({
            where: { refillRequestId: id, productId: item.productId },
            data: { 
              quantity: item.quantity,
              requestedQuantity: item.originalQuantity || item.quantity,
              adminRemark: item.adminRemark
            }
          });
        }
      }
    }, {
      maxWait: 50000,
      timeout: 120000
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: request.storeId,
      action: 'REFILL_APPROVED',
      details: `Approved refill request ${id} for vehicle ${request.vehicleId}. Items: ${itemsToProcess.length}`,
      targetUserId: request.userId,
      metadata: { 
        refillRequestId: id, 
        vehicleId: request.vehicleId, 
        agentId: request.userId,
        itemCount: itemsToProcess.length 
      }
    });

    // Send immediate response to the client so UI updates instantly
    res.json({ message: 'Refill request approved and stock loaded successfully' });

    // Consolidated notification logic: aggregate from all related requests (Run in background)
    Promise.resolve().then(async () => {
      try {
        const rootId = request.parentId || request.id;
        const allRelatedRequests = await prisma.refillRequest.findMany({
          where: {
            OR: [{ id: rootId }, { parentId: rootId }]
          },
          select: {
            status: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                requestedQuantity: true,
                adminRemark: true,
                product: { select: { name: true } }
              }
            }
          }
        });

    // Flatten all items from this flow
    const itemMap = new Map();
    allRelatedRequests.forEach(req => {
      req.items.forEach(item => {
        const key = item.productId;
        const requested = item.requestedQuantity || item.quantity;
        const approved = req.status === 'APPROVED' ? item.quantity : 0;
        
        let status = req.status; // PENDING, APPROVED, REJECTED
        if (req.status === 'APPROVED' && item.quantity < requested) {
          status = 'PARTIAL';
        }

        // Priority logic for statuses: APPROVED/REJECTED/PARTIAL override PENDING
        if (!itemMap.has(key) || status !== 'PENDING') {
          itemMap.set(key, {
            name: item.product?.name || 'Product',
            requested,
            approved,
            status,
            adminRemark: item.adminRemark
          });
        }
      });
    });

    const refillItemsSummary = Array.from(itemMap.values());

    await prisma.notification.deleteMany({
      where: {
        userId: request.userId,
        type: 'inventory',
        isRead: false,
        metadata: { path: ['rootId'], equals: rootId }
      }
    });

        sendNotification({
          userIds: [request.userId],
          title: 'Refill Request Reviewed',
          message: `Your refill request review is in progress.`,
          type: 'inventory',
          priority: 'high',
          metadata: { 
            requestId: request.id, 
            rootId: rootId,
            vehicleId: request.vehicleId,
            refillItems: refillItemsSummary 
          }
        });
      } catch (notifError) {
        console.error('Error in background notification logic for approve:', notifError);
      }
    });

  } catch (error) {
    console.error('❌ Error approving refill request:', error);
    import('fs').then(fs => {
      fs.writeFileSync('approve_refill_error.log', new Date().toISOString() + '\\n' + String(error.stack || error) + '\\n\\n', { flag: 'a' });
    });
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error approving refill request', error: error.message });
    }
  }
};

export const rejectRefillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedItemIds } = req.body;

    const request = await prisma.refillRequest.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!request) {
      console.log('Reject Refill Failed: Not found', id);
      return res.status(404).json({ message: 'Refill request not found' });
    }
    if (request.status !== 'PENDING') {
      console.log('Reject Refill Failed: Already processed', id, 'Status:', request.status);
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    let itemsToProcess = request.items;
    if (rejectedItemIds && Array.isArray(rejectedItemIds)) {
      itemsToProcess = itemsToProcess.filter(item => rejectedItemIds.includes(item.id));
    }

    const processedItemIds = itemsToProcess.map(i => i.id);

    await prisma.$transaction(async (tx) => {
      if (processedItemIds.length < request.items.length) {
        // Partial Rejection
        await tx.refillItem.deleteMany({
          where: { id: { in: processedItemIds } }
        });

        await tx.refillRequest.create({
          data: {
            tenantId: request.tenantId,
            vehicleId: request.vehicleId,
            userId: request.userId,
            status: 'REJECTED',
            parentId: request.parentId || request.id,
            items: {
              create: itemsToProcess.map(item => ({
                tenantId: item.tenantId || request.tenantId,
                productId: item.productId,
                quantity: 0,
                requestedQuantity: item.requestedQuantity || item.quantity
              }))
            }
          }
        });
      } else {
        // Full Rejection
        await tx.refillRequest.update({
          where: { id },
          data: { status: 'REJECTED' }
        });
      }
    });

    res.json({ message: 'Refill request rejected' });

    // Consolidated notification logic: aggregate from all related requests (Run in background)
    Promise.resolve().then(async () => {
      try {
        const rootId = request.parentId || request.id;
        const allRelatedRequests = await prisma.refillRequest.findMany({
          where: {
            OR: [{ id: rootId }, { parentId: rootId }]
          },
          select: {
            status: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                requestedQuantity: true,
                adminRemark: true,
                product: { select: { name: true } }
              }
            }
          }
        });

        const itemMap = new Map();
    allRelatedRequests.forEach(req => {
      req.items.forEach(item => {
        const key = item.productId;
        const requested = item.requestedQuantity || item.quantity;
        const approved = req.status === 'APPROVED' ? item.quantity : 0;
        
        let status = req.status;
        if (req.status === 'APPROVED' && item.quantity < requested) {
          status = 'PARTIAL';
        }

        if (!itemMap.has(key) || status !== 'PENDING') {
          itemMap.set(key, {
            name: item.product?.name || 'Product',
            requested,
            approved,
            status,
            adminRemark: item.adminRemark
          });
        }
      });
    });

    const refillItemsSummary = Array.from(itemMap.values());

    await prisma.notification.deleteMany({
      where: {
        userId: request.userId,
        type: 'inventory',
        isRead: false,
        metadata: { path: ['rootId'], equals: rootId }
      }
    });

        sendNotification({
          userIds: [request.userId],
          title: 'Refill Request Updated',
          message: `Your refill request review is in progress.`,
          type: 'inventory',
          priority: 'high',
          metadata: { 
            requestId: request.id, 
            rootId: rootId,
            vehicleId: request.vehicleId,
            refillItems: refillItemsSummary 
          }
        });
      } catch (notifError) {
        console.error('Error in background notification logic for reject:', notifError);
      }
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error rejecting refill request', error: error.message });
    }
  }
};

export const getAuditHistory = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const audits = await prisma.stockAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { vehicleNumber: true, vehicleName: true } },
        user: { select: { name: true } },
        items: {
          include: {
            product: { 
              include: { 
                unit: true
              } 
            }
          }
        }
      }
    });

    res.json(audits);
  } catch (error) {
    console.error('getAuditHistory error:', error);
    res.status(500).json({ message: 'Error fetching audit history', error: error.message });
  }
};

// Update Product Stock Count
export const updateProductStock = async (req, res) => {
  try {
    const { productId, quantity, mode } = req.body;
    const finalTenantId = req.user?.tenantId || getTenantId();

    console.log(`[Inventory] Stock Update Request: Product=${productId}, Qty=${quantity}, Mode=${mode}, Tenant=${finalTenantId}`);

    if (!productId || quantity === undefined) {
      return res.status(400).json({ message: 'productId and quantity are required' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty)) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Find Product
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found in database');

      // 2. Update Product main stock using raw SQL to bypass stale Prisma client validation
      if (mode === 'add') {
        await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = "stock" + ${qty} WHERE "id" = '${productId}'`);
      } else {
        await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = ${qty} WHERE "id" = '${productId}'`);
      }
      
      const prod = await tx.product.findUnique({ where: { id: productId } });
      if (!prod) throw new Error('Product not found after update');

      console.log(`[Inventory] Primary stock updated for ${prod.name}. New total: ${prod.stock}`);

      // 3. Find/Create Warehouse
      let warehouse = await tx.warehouse.findFirst({
        where: { tenantId: finalTenantId }
      });

      if (!warehouse) {
        console.log(`[Inventory] No warehouse found for tenant ${finalTenantId}, creating default.`);
        warehouse = await tx.warehouse.create({
          data: {
            tenantId: finalTenantId,
            name: 'Main Warehouse',
            location: 'System Generated'
          }
        });
      }

      // 4. Update Warehouse Inventory
      const existingWI = await tx.warehouseInventory.findFirst({
        where: { 
          warehouseId: warehouse.id,
          productId: productId 
        }
      });

      if (existingWI) {
        await tx.warehouseInventory.update({
          where: { id: existingWI.id },
          data: {
            quantity: mode === 'add' ? { increment: qty } : qty
          }
        });
      } else {
        await tx.warehouseInventory.create({
          data: {
            tenantId: finalTenantId,
            warehouseId: warehouse.id,
            productId: productId,
            quantity: qty
          }
        });
      }

      console.log(`[Inventory] Warehouse Inventory synced for warehouse ${warehouse.id}`);

      // 5. Return updated product with relations for UI
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          subCategory: true,
          unit: true,
          brand: true,
        }
      });
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    // Log Activity (Non-blocking or outside transaction is fine)
    await logActivity({
      tenantId: finalTenantId,
      userId: req.user.id,
      storeId: req.user.storeId || null,
      action: 'STOCK_UPDATE',
      entity: 'PRODUCT',
      entityId: productId,
      description: `Stock ${mode === 'add' ? 'added' : 'set'}: ${qty} units for ${updatedProduct.name}. New total: ${updatedProduct.stock}`,
    }).catch(err => console.warn('[Inventory] Log activity failed:', err.message));

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('❌ updateProductStock Error Details:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
};
export const getRefillHistory = async (req, res) => {
  try {
    const { storeFilterId, startDate, endDate } = req.query;

    const whereClause = {
      tenantId: req.user.tenantId,
      type: 'REFILL'
    };

    if (storeFilterId) whereClause.storeId = storeFilterId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      whereClause.date = { gte: start };
    }

    const history = await prisma.stockTransaction.findMany({
      where: whereClause,
      include: {
        vehicle: { select: { vehicleNumber: true, displayId: true } },
        product: { select: { name: true, skuCode: true, unit: { select: { name: true } } } },
        user: { select: { name: true, role: true } }
      },
      orderBy: { date: 'desc' },
      take: 500
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching refill history', error: error.message });
  }
};
