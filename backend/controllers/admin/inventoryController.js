import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';

// Item Master
export const getItems = async (req, res) => {
  try {
    const items = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
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
      gst
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
      gst: parseNumber(gst) || 0,
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
      gst 
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
          quantity: { increment: q }
        },
        create: {
          vehicleId,
          productId: item.productId,
          quantity: q
        }
      });
    }

    res.json({ message: 'Stock loaded successfully' });
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
          quantity: { decrement: q } 
        }
      });
    }

    res.json({ message: 'Stock returned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error returning stock', error: error.message });
  }
};

export const getVehicleInventory = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId
    const inventory = await prisma.vehicleStock.findMany({
      where: { vehicleId: id },
      include: {
        product: { select: { name: true, image: true, price: true, mrp: true, discount: true } }
      }
    });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle inventory', error: error.message });
  }
};
