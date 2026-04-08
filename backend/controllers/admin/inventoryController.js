import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { sendNotification } from '../../services/notificationService.js';


// Item Master
export const getItems = async (req, res) => {
  try {
    const items = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        unit: { select: { name: true, type: true } },
      }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

export const createItem = async (req, res) => {
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
      if (!imageUrl) {
        return res.status(500).json({ message: 'Failed to upload image to storage' });
      }
    }

    // Convert strings to floats safely, returning undefined for empty strings so Prisma ignores them
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
      const defaultCategory = await prisma.category.upsert({
        where: { name: 'Uncategorized' },
        update: {},
        create: { name: 'Uncategorized' }
      });
      finalCategoryId = defaultCategory.id;
    }

    if (!finalSubCategoryId || finalSubCategoryId === 'default') {
      let defaultSub = await prisma.subCategory.findFirst({
        where: { name: 'Uncategorized', categoryId: finalCategoryId }
      });
      if (!defaultSub) {
        defaultSub = await prisma.subCategory.create({
          data: { name: 'Uncategorized', categoryId: finalCategoryId }
        });
      }
      finalSubCategoryId = defaultSub.id;
    }

    if (!finalBrandId || finalBrandId === 'default') {
      const defaultBrand = await prisma.brand.upsert({
        where: { name: 'Unbranded' },
        update: {},
        create: { name: 'Unbranded' }
      });
      finalBrandId = defaultBrand.id;
    }

    const itemData = {
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
    };

    const item = await prisma.product.create({
      data: itemData
    });

    res.status(201).json({ message: 'Item created successfully', item });
  } catch (error) {
    console.error('❌ Create Item Error:', error);
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
      categoryId: categoryId || undefined,
      subCategoryId: subCategoryId || undefined,
      brandId: brandId || undefined
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

    for (const item of items) {
      const q = parseInt(item.quantity);

      // Create transaction
      await prisma.stockTransaction.create({
        data: {
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

    for (const item of items) {
      const q = parseInt(item.quantity);

      // Create transaction
      await prisma.stockTransaction.create({
        data: {
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
    const products = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: 'Products data must be an array' });
    }

    const createdItems = [];

    // Ensure default relations exist
    const defaultCategory = await prisma.category.upsert({
      where: { name: 'Uncategorized' },
      update: {},
      create: { name: 'Uncategorized' }
    });

    const defaultBrand = await prisma.brand.upsert({
      where: { name: 'Unbranded' },
      update: {},
      create: { name: 'Unbranded' }
    });

    let defaultSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: defaultCategory.id }
    });
    if (!defaultSub) {
      defaultSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: defaultCategory.id }
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

      const itemData = {
        name: prod.name,
        description: prod.description || '',
        mrp: parseNumber(prod.mrp),
        price: parseNumber(prod.price) || 0,
        landingPrice: parseNumber(prod.landingPrice),
        discount: parseNumber(prod.discount),
        status: prod.status || 'ACTIVE',
        image: null,
        categoryId: prod.categoryId || defaultCategory.id,
        subCategoryId: prod.subCategoryId || defaultSub.id,
        brandId: prod.brandId || defaultBrand.id,
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
      where: { vehicleId: id },
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

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid items data' });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const q = parseInt(item.quantity);
        
        // Log the audit as a special transaction
        await tx.stockTransaction.create({
          data: {
            type: 'AUDIT',
            vehicleId: id,
            productId: item.productId,
            quantity: q,
            date: new Date()
          }
        });

        // Hard update the stock to the new audited value
        await tx.vehicleStock.upsert({
          where: {
            vehicleId_productId: { vehicleId: id, productId: item.productId }
          },
          update: { 
            quantity: q,
            openingQuantity: q 
          },
          create: { 
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
    const requests = await prisma.refillRequest.findMany({
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
    const request = await prisma.refillRequest.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!request) return res.status(404).json({ message: 'Refill request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request is already processed' });

    // 1. Fetch all products first (outside transaction for speed)
    const productIds = request.items.map(item => item.productId);
    const validProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true }
    });
    const validProductIds = new Set(validProducts.map(p => p.id));

    // 2. Filter valid items and CONSOLIDATE duplicates (prevents row locking issues)
    const consolidatedMap = {};
    request.items.forEach(item => {
      if (!validProductIds.has(item.productId)) {
        console.warn(`[RefillApproval] Skipping invalid product ID: ${item.productId}`);
        return;
      }
      
      if (!consolidatedMap[item.productId]) {
        consolidatedMap[item.productId] = 0;
      }
      consolidatedMap[item.productId] += item.quantity;
    });

    const itemsToProcess = Object.entries(consolidatedMap).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    // 3. Run stock updates in a highly-resilient atomic transaction
    // Explicitly override Prisma's default 5000ms timeout with massive limits
    await prisma.$transaction(async (tx) => {
      for (const item of itemsToProcess) {
        // Log transaction
        await tx.stockTransaction.create({
          data: {
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
            vehicleId: request.vehicleId, 
            productId: item.productId, 
            quantity: item.quantity,
            openingQuantity: item.quantity
          }
        });
      }

      await tx.refillRequest.update({
        where: { id },
        data: { status: 'APPROVED' }
      });
    }, {
      maxWait: 50000,  // Wait up to 50 seconds to acquire a connection
      timeout: 120000  // Allow up to 120 seconds to process the transaction
    });


    res.json({ message: 'Refill request approved and stock loaded successfully' });

    sendNotification({
      userIds: [request.userId],
      roles: ['ADMIN'],
      title: 'Refill Request Approved',
      message: `Your refill request has been approved.`,
      type: 'inventory',
      priority: 'medium',
      metadata: { requestId: request.id, vehicleId: request.vehicleId }
    });
  } catch (error) {
    console.error('❌ Error approving refill request:', error);
    import('fs').then(fs => {
      fs.writeFileSync('approve_refill_error.log', new Date().toISOString() + '\\n' + String(error.stack || error) + '\\n\\n', { flag: 'a' });
    });
    res.status(500).json({ message: 'Error approving refill request', error: error.message });
  }
};

export const rejectRefillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.refillRequest.findUnique({ where: { id } });

    if (!request) return res.status(404).json({ message: 'Refill request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request is already processed' });

    await prisma.refillRequest.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Refill request rejected' });

    sendNotification({
      userIds: [request.userId],
      title: 'Refill Request Rejected',
      message: `Your refill request for vehicle has been rejected. Contact Admin for details.`,
      type: 'inventory',
      priority: 'high',
      metadata: { requestId: request.id, vehicleId: request.vehicleId }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting refill request', error: error.message });
  }
};
