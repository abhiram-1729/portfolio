import prisma from '../../utils/prisma.js';

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
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
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category Name is required' });

    const category = await prisma.category.create({
      data: { name }
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Category name already exists' });
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
    console.log('--- BEGIN SMART DELETE ---', id);
    
    // 1. Find or create the "Uncategorized" fallback category
    let uncategorized = await prisma.category.findUnique({ where: { name: 'Uncategorized' } });
    if (!uncategorized) {
      uncategorized = await prisma.category.create({ data: { name: 'Uncategorized' } });
    }

    // 2. Need a fallback SubCategory
    let uncategorizedSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: uncategorized.id }
    });
    if (!uncategorizedSub) {
      uncategorizedSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: uncategorized.id }
      });
    }

    if (id === uncategorized.id) {
      return res.status(400).json({ message: 'Cannot delete the system-protected Uncategorized category' });
    }

    // 3. FORCE MIGRATE PRODUCTS FIRST (Not in transaction, to ensure they are detached)
    const updateResult = await prisma.product.updateMany({
      where: { categoryId: id },
      data: { 
        categoryId: uncategorized.id,
        subCategoryId: uncategorizedSub.id 
      }
    });
    console.log(`Migrated ${updateResult.count} products to fallback category.`);

    // 4. NOW RUN TRANSACTION FOR CLEANUP
    await prisma.$transaction([
      prisma.subCategory.deleteMany({
        where: { categoryId: id }
      }),
      prisma.category.delete({
        where: { id }
      })
    ]);
    
    res.json({ message: 'Category removed. Any items in it were moved to Uncategorized.' });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
