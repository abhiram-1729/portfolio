import prisma from '../../utils/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { generateId } from '../../utils/idGenerator.js';

export const addMaintenanceLog = async (req, res) => {
  try {
    const { vehicleId, tripId, date, odometer, serviceType, details, amount, mechanicName } = req.body;
    const tenantId = req.user.tenantId;

    if (!vehicleId || !serviceType || !amount) {
      return res.status(400).json({ message: 'Missing required maintenance details' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    let billImage = null;
    if (req.file) {
      billImage = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'maintenance-bills'
      );
    }

    const maintenanceLog = await prisma.maintenanceLog.create({
      data: {
        tenantId,
        storeId: vehicle.storeId || req.user.storeId,
        vehicleId,
        tripId: tripId || null,
        date: date || new Date().toISOString().split('T')[0],
        odometer: parseFloat(odometer) || 0,
        serviceType,
        details,
        amount: parseFloat(amount),
        mechanicName,
        billImage
      }
    });

    // Automatically create an Expense record
    const expenseDisplayId = await generateId({
      entity: 'EXP',
      tenantId,
      storeId: maintenanceLog.storeId
    });

    await prisma.expense.create({
      data: {
        tenantId,
        storeId: maintenanceLog.storeId,
        userId: req.user.id,
        vehicleId,
        type: `Maintenance - ${vehicle.vehicleNumber} (${serviceType})`,
        amount: parseFloat(amount),
        paymentMode: 'CASH', // Default for maintenance unless specified
        description: `Automated Maintenance Expense: ${serviceType}. ${details || ''}. Mechanic: ${mechanicName || 'N/A'}. ODO: ${odometer || 'N/A'}`,
        billImage,
        date,
        displayId: expenseDisplayId,
        status: 'PENDING' // Maintenance usually needs review
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: maintenanceLog.storeId,
      action: 'MAINTENANCE_LOGGED',
      details: `Logged ${serviceType} for ${vehicle.vehicleNumber} (₹${amount})`,
      metadata: { maintenanceId: maintenanceLog.id, vehicleId }
    });

    res.status(201).json({ success: true, maintenanceLog });
  } catch (error) {
    console.error('Maintenance Log Error:', error);
    res.status(500).json({ success: false, message: 'Error logging maintenance', error: error.message });
  }
};

export const getMaintenanceLogs = async (req, res) => {
  try {
    const { vehicleId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (vehicleId) where.vehicleId = vehicleId;
    if (storeId) where.storeId = storeId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching maintenance logs', error: error.message });
  }
};
