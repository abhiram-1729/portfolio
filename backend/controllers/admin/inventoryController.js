import prisma from '../../utils/prisma.js';

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
      brandId 
    } = req.body;
    
    // In a real scenario, handle default relations if category/sub/brand IDs aren't provided
    // For now we assume they are provided or we handle a default one.

    const item = await prisma.product.create({
      data: {
        name,
        description,
        mrp: mrp ? parseFloat(mrp) : undefined,
        price: parseFloat(price),
        landingPrice: landingPrice ? parseFloat(landingPrice) : undefined,
        discount: discount ? parseFloat(discount) : undefined,
        status: status || 'ACTIVE',
        image,
        categoryId,
        subCategoryId,
        brandId,
      }
    });

    res.status(201).json({ message: 'Item created successfully', item });
  } catch (error) {
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
      image 
    } = req.body;

    const item = await prisma.product.update({
      where: { id },
      data: {
        name,
        mrp: mrp ? parseFloat(mrp) : undefined,
        price: price ? parseFloat(price) : undefined,
        landingPrice: landingPrice ? parseFloat(landingPrice) : undefined,
        discount: discount ? parseFloat(discount) : undefined,
        status,
        image,
      }
    });

    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
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
