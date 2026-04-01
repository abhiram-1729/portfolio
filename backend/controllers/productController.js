import prisma from '../utils/prisma.js';

// @desc    Get all products or search by keyword
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        const { search, categoryId, warehouseId, vehicleId } = req.query;

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

        // Filter by Warehouse
        if (warehouseId) {
            query.where.WarehouseInventory = {
                some: { warehouseId, quantity: { gt: 0 } }
            };
            query.include.WarehouseInventory = {
                where: { warehouseId }
            };
        }

        // Filter by Vehicle Stock
        if (vehicleId) {
            query.where.vehicleStocks = {
                some: { vehicleId, quantity: { gt: 0 } }
            };
            query.include.vehicleStocks = {
                where: { vehicleId }
            };
        }

        const products = await prisma.product.findMany(query);
        
        // Flatten stock info for easier frontend consumption
        const result = products.map(p => ({
            ...p,
            stock: vehicleId 
                ? (p.vehicleStocks?.[0]?.quantity || 0) 
                : (warehouseId ? (p.WarehouseInventory?.[0]?.quantity || 0) : null)
        }));

        res.json(result);
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
