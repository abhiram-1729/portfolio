import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';

export const getVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        assignedUsers: { select: { id: true, name: true, role: true } },
      }
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles', error: error.message });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const { vehicleNumber, vehicleName, status, assignedUserId } = req.body;

    console.log('📝 Creating vehicle order:', { vehicleNumber, vehicleName, status, assignedUserId });

    // Convert string status from FormData to boolean
    const isStatusActive = status === 'true' || status === true;

    // Handle file uploads to Supabase
    let rcDocument = null;
    let insuranceDocument = null;
    let permitDocument = null;

    if (req.files) {
      if (req.files.rcDocument) {
        rcDocument = await uploadToSupabase(
          req.files.rcDocument[0].buffer,
          req.files.rcDocument[0].originalname,
          req.files.rcDocument[0].mimetype
        );
      }
      if (req.files.insuranceDocument) {
        insuranceDocument = await uploadToSupabase(
          req.files.insuranceDocument[0].buffer,
          req.files.insuranceDocument[0].originalname,
          req.files.insuranceDocument[0].mimetype
        );
      }
      if (req.files.permitDocument) {
        permitDocument = await uploadToSupabase(
          req.files.permitDocument[0].buffer,
          req.files.permitDocument[0].originalname,
          req.files.permitDocument[0].mimetype
        );
      }
    }

    console.log('✅ Uploaded to Supabase:', { rcDocument, insuranceDocument, permitDocument });

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber,
        vehicleName,
        status: isStatusActive,
        rcDocument,
        insuranceDocument,
        permitDocument
      }
    });

    if (assignedUserId) {
      await prisma.user.update({
        where: { id: assignedUserId },
        data: { assignedVehicleId: vehicle.id }
      });
    }

    res.status(201).json({ message: 'Vehicle created successfully', vehicle });
  } catch (error) {
    console.error('❌ Error creating vehicle:', error.message);
    res.status(500).json({ message: 'Error creating vehicle', error: error.message });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleNumber, vehicleName, status, assignedUserId } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Handle optional document uploads
    let rcDocument = vehicle.rcDocument;
    let insuranceDocument = vehicle.insuranceDocument;
    let permitDocument = vehicle.permitDocument;

    if (req.files) {
      if (req.files.rcDocument) {
        rcDocument = await uploadToSupabase(
          req.files.rcDocument[0].buffer,
          req.files.rcDocument[0].originalname,
          req.files.rcDocument[0].mimetype
        );
      }
      if (req.files.insuranceDocument) {
        insuranceDocument = await uploadToSupabase(
          req.files.insuranceDocument[0].buffer,
          req.files.insuranceDocument[0].originalname,
          req.files.insuranceDocument[0].mimetype
        );
      }
      if (req.files.permitDocument) {
        permitDocument = await uploadToSupabase(
          req.files.permitDocument[0].buffer,
          req.files.permitDocument[0].originalname,
          req.files.permitDocument[0].mimetype
        );
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(vehicleNumber !== undefined && { vehicleNumber }),
        ...(vehicleName !== undefined && { vehicleName }),
        ...(status !== undefined && { status: status === true || status === 'true' }),
        rcDocument,
        insuranceDocument,
        permitDocument,
      }
    });

    // Re-assign driver: first unassign anyone currently on this vehicle, then assign new
    if (assignedUserId !== undefined) {
      await prisma.user.updateMany({
        where: { assignedVehicleId: id },
        data: { assignedVehicleId: null }
      });
      if (assignedUserId) {
        await prisma.user.update({
          where: { id: assignedUserId },
          data: { assignedVehicleId: id }
        });
      }
    }

    res.json({ message: 'Vehicle updated successfully', vehicle: updated });
  } catch (error) {
    console.error('❌ Error updating vehicle:', error.message);
    res.status(500).json({ message: 'Error updating vehicle', error: error.message });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // 1. Unassign all users from this vehicle
    await prisma.user.updateMany({
      where: { assignedVehicleId: id },
      data: { assignedVehicleId: null }
    });

    // 2. Nullify vehicleId on existing orders (preserve order history)
    await prisma.order.updateMany({
      where: { vehicleId: id },
      data: { vehicleId: null }
    });

    // 3. Delete stock transactions for this vehicle
    await prisma.stockTransaction.deleteMany({ where: { vehicleId: id } });

    // 4. Delete vehicle stock records
    await prisma.vehicleStock.deleteMany({ where: { vehicleId: id } });

    // 5. Delete closing/opening cash records for this vehicle
    await prisma.closingCash.deleteMany({ where: { vehicleId: id } }).catch(() => {});
    await prisma.openingCash.deleteMany({ where: { vehicleId: id } }).catch(() => {});
    await prisma.dailyCashSummary.deleteMany({ where: { vehicleId: id } }).catch(() => {});

    // 6. Finally delete the vehicle
    await prisma.vehicle.delete({ where: { id } });

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error.message);
    res.status(500).json({ message: 'Error deleting vehicle', error: error.message });
  }
};

export const assignDriver = async (req, res) => {
  try {
    const { id } = req.params; // vehicle id
    const { userId } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    await prisma.user.update({
      where: { id: userId },
      data: { assignedVehicleId: id }
    });

    res.json({ message: 'Driver assigned to vehicle' });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning driver', error: error.message });
  }
};

export const getVehicleSales = async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await prisma.order.findMany({
      where: { vehicleId: id },
      include: { user: { select: { name: true } }, items: true }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle sales', error: error.message });
  }
};
