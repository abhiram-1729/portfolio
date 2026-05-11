import prisma from '../../utils/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { generateId } from '../../utils/idGenerator.js';

export const addFuelLog = async (req, res) => {
  try {
    const { vehicleId, tripId, date, odometer, liters, rate, totalAmount, paymentMode } = req.body;
    const tenantId = req.user.tenantId;

    if (!vehicleId || !odometer || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fuel log details' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    let billImage = null;
    if (req.file) {
      billImage = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'fuel-bills'
      );
    }

    const fuelLog = await prisma.fuelLog.create({
      data: {
        tenantId,
        storeId: vehicle.storeId || req.user.storeId,
        vehicleId,
        tripId: tripId || null,
        date: date || new Date().toISOString().split('T')[0],
        odometer: parseFloat(odometer) || 0,
        liters: parseFloat(liters) || 0,
        rate: parseFloat(rate) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        paymentMode: paymentMode === 'PERSONAL_CASH' ? 'CASH' : paymentMode,
        billImage
      }
    });

    // Automatically create an Expense record
    const expenseDisplayId = await generateId({
      entity: 'EXP',
      tenantId,
      storeId: fuelLog.storeId
    });

    await prisma.expense.create({
      data: {
        tenantId,
        storeId: fuelLog.storeId,
        userId: req.user.id,
        vehicleId,
        type: `Fuel - ${vehicle.vehicleNumber}`,
        amount: parseFloat(totalAmount),
        paymentMode: paymentMode === 'PERSONAL_CASH' ? 'CASH' : paymentMode,
        description: `Automated Fuel Expense: ${liters}L @ ₹${rate}/L. ODO: ${odometer}`,
        billImage,
        date: date || new Date().toISOString().split('T')[0],
        displayId: expenseDisplayId,
        status: 'APPROVED' // Fuel expenses are usually pre-approved or verified by ODO
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: fuelLog.storeId,
      action: 'FUEL_LOGGED',
      details: `Logged ${liters}L fuel for ${vehicle.vehicleNumber} (₹${totalAmount})`,
      metadata: { fuelLogId: fuelLog.id, vehicleId }
    });

    res.status(201).json({ success: true, fuelLog });
  } catch (error) {
    console.error('Fuel Log Error:', error);
    res.status(500).json({ success: false, message: 'Error logging fuel', error: error.message });
  }
};

export const getFuelLogs = async (req, res) => {
  try {
    const { vehicleId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (vehicleId) where.vehicleId = vehicleId;
    if (storeId) where.storeId = storeId;

    const logs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching fuel logs', error: error.message });
  }
};
