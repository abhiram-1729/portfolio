import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * VEHICLE PHYSICAL DAMAGE CRUD
 * Tracks body/mechanical damages to the vehicle itself (dents, accidents, tire issues, etc.)
 * Completely separate from product/stock damage tracking.
 */

// 1. GET ALL
export const getVehicleDamages = async (req, res) => {
  try {
    const { storeId, vehicleId, status } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined') where.storeId = storeId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;

    const damages = await prisma.vehiclePhysicalDamage.findMany({
      where,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        reportedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(damages);
  } catch (error) {
    console.error('getVehicleDamages error:', error);
    res.status(500).json({ message: 'Error fetching vehicle damages', error: error.message });
  }
};

// 2. CREATE
export const createVehicleDamage = async (req, res) => {
  try {
    const {
      vehicleId, damageType, severity, title,
      description, location, estimatedCost, odometerReading, storeId
    } = req.body;

    if (!vehicleId || !title || !damageType) {
      return res.status(400).json({ message: 'Vehicle, title, and damage type are required' });
    }

    // Upload images if provided
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToSupabase(file.buffer, file.originalname, file.mimetype, 'vehicle-damages', 'vehicle-damages');
        if (url) imageUrls.push(url);
      }
    }

    const damage = await prisma.vehiclePhysicalDamage.create({
      data: {
        tenantId: req.user.tenantId,
        storeId: storeId || req.user.storeId || null,
        vehicleId,
        reportedById: req.user.id,
        damageType,
        severity: severity || 'MINOR',
        title,
        description: description || null,
        location: location || null,
        images: imageUrls,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        odometerReading: odometerReading ? parseFloat(odometerReading) : null
      },
      include: {
        vehicle: { select: { vehicleNumber: true } },
        reportedBy: { select: { name: true } }
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'VEHICLE_DAMAGE_REPORTED',
      details: `Reported ${severity || 'MINOR'} ${damageType} damage on ${damage.vehicle.vehicleNumber}: "${title}"`,
      metadata: { damageId: damage.id, vehicleId }
    });

    res.status(201).json(damage);
  } catch (error) {
    console.error('createVehicleDamage error:', error);
    res.status(500).json({ message: 'Error creating vehicle damage', error: error.message });
  }
};

// 3. UPDATE
export const updateVehicleDamage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      damageType, severity, title, description,
      location, estimatedCost, actualCost,
      status, repairNotes, repairDate, odometerReading
    } = req.body;

    const existing = await prisma.vehiclePhysicalDamage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Damage entry not found' });

    const updateData = {};
    if (damageType) updateData.damageType = damageType;
    if (severity) updateData.severity = severity;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (estimatedCost !== undefined) updateData.estimatedCost = parseFloat(estimatedCost);
    if (actualCost !== undefined) updateData.actualCost = parseFloat(actualCost);
    if (status) updateData.status = status;
    if (repairNotes !== undefined) updateData.repairNotes = repairNotes;
    if (repairDate) updateData.repairDate = new Date(repairDate);
    if (odometerReading !== undefined) updateData.odometerReading = parseFloat(odometerReading);

    // Append new images if uploaded
    if (req.files && req.files.length > 0) {
      const newUrls = [];
      for (const file of req.files) {
        const url = await uploadToSupabase(file.buffer, file.originalname, file.mimetype, 'vehicle-damages', 'vehicle-damages');
        if (url) newUrls.push(url);
      }
      updateData.images = [...existing.images, ...newUrls];
    }

    const updated = await prisma.vehiclePhysicalDamage.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: { select: { vehicleNumber: true } },
        reportedBy: { select: { name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('updateVehicleDamage error:', error);
    res.status(500).json({ message: 'Error updating vehicle damage', error: error.message });
  }
};

// 4. DELETE
export const deleteVehicleDamage = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.vehiclePhysicalDamage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Damage entry not found' });

    await prisma.vehiclePhysicalDamage.delete({ where: { id } });

    logActivity({
      userId: req.user.id,
      tenantId: existing.tenantId,
      action: 'VEHICLE_DAMAGE_DELETED',
      details: `Deleted vehicle damage: "${existing.title}"`,
      metadata: { damageId: id, vehicleId: existing.vehicleId }
    });

    res.json({ message: 'Vehicle damage entry deleted successfully' });
  } catch (error) {
    console.error('deleteVehicleDamage error:', error);
    res.status(500).json({ message: 'Error deleting vehicle damage', error: error.message });
  }
};
