import prisma from '../utils/prisma.js';
import { isWithinRadius } from '../utils/geoUtils.js';

/**
 * @desc    Submit a refill log
 * @route   POST /api/refills/log
 * @access  Private
 */
export const logRefill = async (req, res, next) => {
  try {
    const { 
      amount, 
      photo, 
      lat, 
      lon, 
      accuracy, 
      items // Array of { productId, quantity }
    } = req.body;
    const userId = req.user.id;
    const vehicleId = req.user.assignedVehicleId;

    if (!vehicleId) {
      return res.status(400).json({ message: 'No vehicle assigned to user.' });
    }

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({ 
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy 
      });
    }

    // 2. Geo-Validation against HUB (Store)
    const store = await prisma.store.findUnique({
      where: { id: req.user.storeId }
    });

    if (!store || !store.latitude || !store.longitude) {
      return res.status(400).json({ message: 'Store (HUB) location not configured.' });
    }

    const nearHub = isWithinRadius(lat, lon, store.latitude, store.longitude, 200);
    if (!nearHub) {
      return res.status(400).json({ message: 'Refill must be logged near the HUB (within 200m).' });
    }

    // 3. Create Refill Request/Log
    const refill = await prisma.$transaction(async (tx) => {
      const newRefill = await tx.refillRequest.create({
        data: {
          tenantId: req.user.tenantId,
          userId,
          vehicleId,
          storeId: req.user.storeId,
          amount: parseFloat(amount),
          photo,
          lat,
          long: lon,
          accuracy,
          status: 'APPROVED', // Assuming direct logging for now as per PRD "Refill stock"
          items: {
            create: items.map(item => ({
              tenantId: req.user.tenantId,
              productId: item.productId,
              quantity: parseInt(item.quantity),
              requestedQuantity: parseInt(item.quantity),
              storeId: req.user.storeId
            }))
          }
        },
        include: { items: true }
      });

      // 4. Update Vehicle Stock and Create Transactions
      for (const item of items) {
        // Upsert vehicle stock
        await tx.vehicleStock.upsert({
          where: {
            vehicleId_productId: {
              vehicleId,
              productId: item.productId
            }
          },
          update: {
            quantity: { increment: parseInt(item.quantity) }
          },
          create: {
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            vehicleId,
            productId: item.productId,
            quantity: parseInt(item.quantity)
          }
        });

        // Create stock transaction
        await tx.stockTransaction.create({
          data: {
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            vehicleId,
            productId: item.productId,
            quantity: parseInt(item.quantity),
            type: 'LOAD',
            date: new Date()
          }
        });
      }

      return newRefill;
    });

    res.status(201).json({ message: 'Refill Stock Logged ✅', refill });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get refill history for agent
 * @route   GET /api/refills/my-history
 * @access  Private
 */
export const getMyRefillHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const refills = await prisma.refillRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
      take: 10
    });
    res.json(refills);
  } catch (error) {
    next(error);
  }
};
