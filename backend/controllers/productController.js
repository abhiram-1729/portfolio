import prisma from '../utils/prisma.js';

// @desc    Get all products or search by keyword
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        const { search, categoryId, warehouseId } = req.query;

        const query = {
            where: {},
            include: {
                category: true,
                subCategory: true,
                brand: true,
                variants: true,
            },
        };

        if (search) {
            query.where.name = {
                contains: search,
                mode: 'insensitive',
            };
        }

        if (categoryId) {
            query.where.categoryId = categoryId;
        }

        // If warehouseId is provided, only return products that have inventory in that warehouse
        if (warehouseId) {
            query.where.WarehouseInventory = {
                some: {
                    warehouseId: warehouseId,
                    quantity: { gt: 0 }
                }
            };
        }

        const products = await prisma.product.findMany(query);
        res.json(products);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: {
                category: true,
                subCategory: true,
                brand: true,
                variants: true,
            },
        });

        if (product) {
            res.json(product);
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};
