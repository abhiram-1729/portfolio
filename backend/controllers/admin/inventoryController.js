import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { sendNotification } from '../../services/notificationService.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import fs from 'fs';

// Item Master
export const getItems = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };
    
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
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
      }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
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
      minShopAmount
    } = req.body;

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
      landingPrice: parseNumber(landingPrice),
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
      brandId
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
      brandId: finalBrandId || undefined
    };

    const item = await prisma.product.update({
      where: { id },
      data: updateData
    });

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

    // Cascade delete all child records in dependency order
    await prisma.orderItem.deleteMany({ where: { productId: id } });
    await prisma.stockTransaction.deleteMany({ where: { productId: id } });
    await prisma.vehicleStock.deleteMany({ where: { productId: id } });
    await prisma.warehouseInventory.deleteMany({ where: { productId: id } });
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    await prisma.refillItem.deleteMany({ where: { productId: id } });
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
    const { vehicleId, items } = req.body; // items = [{ productId, quantity }]
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { storeId: true }
    });
    const storeId = vehicle?.storeId;

    for (const item of items) {
      const q = parseInt(item.quantity);

      // Create transaction
      await prisma.stockTransaction.create({
        data: {
          tenantId: req.user.tenantId,
          storeId,
          type: 'LOAD',
          vehicleId,
          productId: item.productId,
          quantity: q
        }
      });

      // Update vehicle stock
      await prisma.vehicleStock.upsert({
        where: {
          vehicleId_productId: { vehicleId, productId: item.productId }
        },
        update: {
          quantity: { increment: q },
          openingQuantity: { increment: q }
        },
        create: {
          tenantId: req.user.tenantId,
          storeId,
          vehicleId,
          productId: item.productId,
          quantity: q,
          openingQuantity: q
        }
      });
    }

    res.json({ message: 'Stock loaded successfully' });

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
    console.error(error);
    res.status(500).json({ message: 'Error loading stock', error: error.message });
  }
};

// Stock Return (Evening)
export const returnStock = async (req, res) => {
  try {
    const { vehicleId, items } = req.body;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { storeId: true }
    });
    const storeId = vehicle?.storeId;

    for (const item of items) {
      const q = parseInt(item.quantity);

      // Create transaction
      await prisma.stockTransaction.create({
        data: {
          tenantId: req.user.tenantId,
          storeId,
          type: 'RETURN',
          vehicleId,
          productId: item.productId,
          quantity: q
        }
      });

      // Update vehicle stock
      await prisma.vehicleStock.update({
        where: {
          vehicleId_productId: { vehicleId, productId: item.productId }
        },
        data: {
          quantity: { decrement: q },
          openingQuantity: { decrement: q }
        }
      });
    }

    res.json({ message: 'Stock returned successfully' });

    sendNotification({
      vehicleIds: [vehicleId],
      roles: ['ADMIN'],
      title: 'Stock Returned',
      message: `Evening stock return processed for vehicle.`,
      type: 'inventory',
      priority: 'low',
      metadata: { vehicleId }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error returning stock', error: error.message });
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

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    console.log(`[BulkCreate] Attempting to create ${products.length} products`);

    for (const prod of products) {
      if (!prod.name) {
        console.warn(`[BulkCreate] Skipping product with missing name:`, prod);
        continue;
      }

      // 1. Resolve Category
      let targetCategoryId = defaultCategory.id;
      if (prod.categoryName !== undefined && prod.categoryName !== null && prod.categoryName !== '') {
        const catNameStr = String(prod.categoryName);
        let cat = await prisma.category.findFirst({
          where: { tenantId, name: catNameStr, storeId: null }
        });
        if (!cat) {
          cat = await prisma.category.create({
            data: { tenantId, name: catNameStr }
          });
        }
        targetCategoryId = cat.id;
      }

      // 2. Resolve Sub-Category
      let targetSubCategoryId = defaultSub.id;
      if (prod.subCategoryName !== undefined && prod.subCategoryName !== null && prod.subCategoryName !== '' && targetCategoryId) {
        const subNameStr = String(prod.subCategoryName);
        let sub = await prisma.subCategory.findFirst({
          where: { categoryId: targetCategoryId, name: subNameStr, tenantId }
        });
        if (!sub) {
          sub = await prisma.subCategory.create({
            data: { categoryId: targetCategoryId, name: subNameStr, tenantId }
          });
        }
        targetSubCategoryId = sub.id;
      }

      // 3. Resolve Unit
      let targetUnitId = null;
      if (prod.unitType !== undefined && prod.unitType !== null && prod.unitType !== '') {
        const unitStr = String(prod.unitType);
        let unit = await prisma.unit.findFirst({
          where: { tenantId, type: unitStr, storeId: null }
        });
        if (!unit) {
          unit = await prisma.unit.create({
            data: { tenantId, name: unitStr, type: unitStr }
          });
        }
        targetUnitId = unit.id;
      }

      const itemData = {
        tenantId: tenantId,
        name: prod.name,
        description: prod.description || '',
        mrp: parseNumber(prod.mrp),
        price: parseNumber(prod.price) || 0,
        landingPrice: parseNumber(prod.landingPrice),
        discount: parseNumber(prod.discount),
        status: prod.status || 'ACTIVE',
        image: null,
        categoryId: targetCategoryId,
        subCategoryId: targetSubCategoryId,
        brandId: prod.brandId || defaultBrand.id,
        unitId: targetUnitId,
        unitValue: parseNumber(prod.unitValue),
        gst: parseNumber(prod.gst) || 0,
        isFree: prod.isFree === true || prod.isFree === 'true',
        minShopAmount: parseNumber(prod.minShopAmount) || 0,
      };

      try {
        const item = await prisma.product.create({
          data: itemData
        });
        createdItems.push(item);
      } catch (err) {
        console.error(`[BulkCreate] Failed to create product: ${prod.name}`, err.message);
        // Continue with other products
      }
    }

    res.status(201).json({ message: `Successfully created ${createdItems.length} items`, count: createdItems.length });
  } catch (error) {
    console.error('❌ Bulk Create Item Error:', error);
    res.status(500).json({ message: 'Error bulk creating items', error: error.message });
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
      select: { storeId: true }
    });
    const storeId = vehicle?.storeId;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid items data' });
    }

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

      for (const item of items) {
        const q = parseInt(item.quantity);
        
        // Get current stock for historical record
        const currentStock = await tx.vehicleStock.findUnique({
          where: { vehicleId_productId: { vehicleId: id, productId: item.productId } }
        });

        // 2. Create Audit Item
        await tx.stockAuditItem.create({
          data: {
            auditId: audit.id,
            productId: item.productId,
            oldQuantity: currentStock?.quantity || 0,
            newQuantity: q
          }
        });

        // 3. Log the audit as a special transaction
        await tx.stockTransaction.create({
          data: {
            tenantId: req.user.tenantId,
            storeId,
            type: 'AUDIT',
            vehicleId: id,
            productId: item.productId,
            quantity: q,
            date: new Date()
          }
        });

        // 4. Hard update the stock to the new audited value
        await tx.vehicleStock.upsert({
          where: {
            vehicleId_productId: { vehicleId: id, productId: item.productId }
          },
          update: { 
            quantity: q,
            openingQuantity: q 
          },
          create: { 
            tenantId: req.user.tenantId,
            storeId,
            vehicleId: id, 
            productId: item.productId, 
            quantity: q,
            openingQuantity: q
          }
        });
      }
    }, {
      maxWait: 20000, // Wait up to 20s to acquire connection
      timeout: 60000  // Allow up to 60s for the entire audit to process
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
        vehicle: { select: { vehicleNumber: true, vehicleName: true } },
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
    // Explicitly override Prisma's default 5000ms timeout with massive limits
    await prisma.$transaction(async (tx) => {
      for (const item of finalItemsToProcess) {
        // Log transaction
        await tx.stockTransaction.create({
          data: {
            tenantId: request.tenantId,
            storeId: request.storeId,
            date: new Date(),
            type: 'LOAD',
            vehicleId: request.vehicleId,
            productId: item.productId,
            quantity: item.quantity
          }
        });

        // Update vehicle stock
        await tx.vehicleStock.upsert({
          where: { vehicleId_productId: { vehicleId: request.vehicleId, productId: item.productId } },
          update: { 
            quantity: { increment: item.quantity }
          },
          create: { 
            tenantId: request.tenantId,
            storeId: request.storeId,
            vehicleId: request.vehicleId, 
            productId: item.productId, 
            quantity: item.quantity,
            openingQuantity: item.quantity
          }
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
          data: { status: 'APPROVED' }
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
      maxWait: 50000,  // Wait up to 50 seconds to acquire a connection
      timeout: 120000  // Allow up to 120 seconds to process the transaction
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

    if (!request) return res.status(404).json({ message: 'Refill request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request is already processed' });

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
