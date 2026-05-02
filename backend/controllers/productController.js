import prisma from '../utils/prisma.js';
import { logActivity } from '../utils/activityLogger.js';

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
                tenantId: req.user.tenantId,
                status: 'ACTIVE'
            },

            include: {
                category: true,
                subCategory: true,
                brand: true,
                variants: true,
                unit: true,
                WarehouseInventory: true, // Always include for stock sync
                vehicleStocks: true, // Always include for total stock calculation
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
            // Override the include to only show this specific warehouse if requested
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
        console.log(`[getProducts] Found ${products.length} products. Source: ${vehicleId ? 'Vehicle' : (warehouseId ? 'Warehouse' : 'General')}`);
        
        // Flatten stock info for easier frontend consumption
        const result = products.map(p => {
            const warehouseQty = p.WarehouseInventory?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
            // Note: vehicleStocks was only included if vehicleId was provided. 
            // To get total vehicle stock, we need to include all vehicleStocks in the original query or handle it here.
            // For now, if vehicleStocks is not available, we assume it's part of p.stock fallback.
            const vehicleQty = p.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
            const totalQty = warehouseQty + vehicleQty;

            return {
                ...p,
                warehouseStock: warehouseQty,
                vehicleStock: vehicleQty,
                totalStock: totalQty,
                stock: vehicleId 
                    ? (p.vehicleStocks?.[0]?.quantity || 0) 
                    : (warehouseId ? (p.WarehouseInventory?.[0]?.quantity || 0) : (warehouseQty > 0 ? warehouseQty : (p.stock ?? 0)))
            };
        });

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
            where: { id: req.params.id, tenantId: req.user.tenantId },
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
                tenantId: req.user.tenantId,
                storeId: req.user.storeId,
                vehicleId,
                userId: req.user.id,
                items: {
                    create: items.map(i => ({
                        tenantId: req.user.tenantId,
                        productId: i.productId,
                        quantity: parseInt(i.quantity, 10)
                    }))
                }
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'REFILL_REQUESTED',
            details: `Requested refill for ${items.length} items for vehicle ${vehicleId}`,
            metadata: { 
                vehicleId, 
                itemCount: items.length, 
                refillRequestId: refillRequest.id 
            }
        });

        res.status(201).json({ message: 'Refill requested successfully', refillRequest });
    } catch (error) {
        next(error);
    }
};

export const getVehicleAuditHistory = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;

        if (!vehicleId || vehicleId === 'undefined' || vehicleId === 'null') {
            return res.json([]);
        }

        const audits = await prisma.stockAudit.findMany({
            where: {
                vehicleId,
                tenantId: req.user.tenantId
            },
            include: {
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
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(audits);
    } catch (error) {
        next(error);
    }
};
