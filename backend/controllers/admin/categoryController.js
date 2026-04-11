import prisma from '../../utils/prisma.js';

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const { storeId: queryStoreId } = req.query;
    const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : (req.user.storeId || null);
    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const { name, storeId: bodyStoreId } = req.body;
    const storeId = bodyStoreId || req.user.storeId || null;
    if (!name) return res.status(400).json({ message: 'Category Name is required' });

    const category = await prisma.category.create({
      data: { 
        name,
        storeId
      }
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Category name already exists in this context' });
    }
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

// Update a category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { name }
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

// Delete a category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId || null; // Force to current user's store for safety
    const tenantId = req.user.tenantId;

    // 1. Find or create the context-specific "Uncategorized" fallback category
    let uncategorized;
    try {
      uncategorized = await prisma.category.findFirst({ 
        where: { name: 'Uncategorized', storeId, tenantId } 
      });
      
      if (!uncategorized) {
        uncategorized = await prisma.category.create({ 
          data: { 
            name: 'Uncategorized', 
            tenantId,
            storeId
          } 
        });
      }
    } catch (unCatError) {
      console.error('Uncategorized Category Resolution Error:', unCatError);
      return res.status(500).json({ message: 'Error establishing fallback category', error: unCatError.message });
    }

    // 2. Need a fallback SubCategory
    let uncategorizedSub;
    try {
      uncategorizedSub = await prisma.subCategory.findFirst({
        where: { name: 'Uncategorized', categoryId: uncategorized.id }
      });
      if (!uncategorizedSub) {
        uncategorizedSub = await prisma.subCategory.create({
          data: { name: 'Uncategorized', categoryId: uncategorized.id, tenantId }
        });
      }
    } catch (subCatError) {
      console.error('Uncategorized SubCategory Resolution Error:', subCatError);
      return res.status(500).json({ message: 'Error establishing fallback sub-category', error: subCatError.message });
    }

    if (id === uncategorized.id) {
      return res.status(400).json({ message: 'Cannot delete the context-specific Uncategorized category' });
    }

    // 3. FORCE MIGRATE PRODUCTS FIRST
    try {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { 
          categoryId: uncategorized.id,
          subCategoryId: uncategorizedSub.id 
        }
      });
    } catch (migError) {
      console.error('Category Product Migration Error:', migError);
      return res.status(500).json({ message: 'Failed to migrate products before deletion', error: migError.message });
    }

    // 4. TRANSACTION CLEANUP
    try {
      await prisma.$transaction([
        prisma.subCategory.deleteMany({ where: { categoryId: id } }),
        prisma.category.delete({ where: { id } })
      ]);
    } catch (transError) {
      console.error('Category Deletion Transaction Error:', transError);
      if (transError.code === 'P2003') {
        return res.status(400).json({ message: 'Cannot delete category: related records still exist.' });
      }
      throw transError; // Let main catch handle it
    }
    
    res.json({ message: 'Category removed. Any items in it were moved to Uncategorized.' });
  } catch (error) {
    console.error('Delete Category Main Error:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
