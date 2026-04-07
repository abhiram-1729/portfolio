import prisma from '../utils/prisma.js';

// @desc    Get all products or search by keyword
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        let { search, categoryId, warehouseId, vehicleId } = req.query;

        // Sanitize inputs
        search = typeof search === 'string' ? search.trim() : null;
        categoryId = typeof categoryId === 'string' ? categoryId.trim() : null;
        warehouseId = typeof warehouseId === 'string' ? warehouseId.trim() : null;
        vehicleId = typeof vehicleId === 'string' ? vehicleId.trim() : null;

        const showAll = req.query.showAll === 'true';

        // AUTO-FILTER: If user is an Agent, restrict to their vehicle by default (unless requesting full catalog)
        if (req.user?.role === 'SALES_AGENT' && !showAll) {
            vehicleId = vehicleId || req.user.assignedVehicleId;
        }

        console.log(`[getProducts] Request from ${req.user?.name} (Role: ${req.user?.role}):`, JSON.stringify({ search, categoryId, warehouseId, vehicleId }));

        const query = {
            where: {
                status: 'ACTIVE'
            },

            include: {
                category: true,
                subCategory: true,
                brand: true,
                variants: true,
                unit: true,
            },
        };

        if (search) {
            query.where.name = {
                contains: search,
                mode: 'insensitive',
            };
        }

        if (categoryId && categoryId !== 'all') {
            query.where.categoryId = categoryId;
        }

        // Filter by Warehouse
        if (warehouseId) {
            query.where.OR = [
                { WarehouseInventory: { some: { warehouseId, quantity: { gt: 0 } } } },
                { isFree: true }
            ];
            query.include.WarehouseInventory = {
                where: { warehouseId }
            };
        }

        // Filter by Vehicle Stock
        if (vehicleId) {
            query.where.OR = [
                {
                    vehicleStocks: {
                        some: { vehicleId }
                    }
                },
                { isFree: true }
            ];

            query.include.vehicleStocks = {
                where: { vehicleId }
            };
        }

        const products = await prisma.product.findMany(query);
        console.log(`[getProducts] Found ${products.length} products for vehicle ${vehicleId || 'NONE'}`);
        
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
                unit: true,
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

export const requestRefill = async (req, res, next) => {
    try {
        const { vehicleId, items } = req.body; // items: [{ productId, quantity }]

        if (!vehicleId || !items || items.length === 0) {
            return res.status(400).json({ message: 'Missing vehicle ID or items' });
        }

        const refillRequest = await prisma.refillRequest.create({
            data: {
                vehicleId,
                userId: req.user.id,
                items: {
                    create: items.map(i => ({
                        productId: i.productId,
                        quantity: parseInt(i.quantity, 10)
                    }))
                }
            }
        });

        res.status(201).json({ message: 'Refill requested successfully', refillRequest });
    } catch (error) {
        next(error);
    }
};
