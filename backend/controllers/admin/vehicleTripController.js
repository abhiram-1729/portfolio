import prisma from '../../utils/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';
import { format } from 'date-fns';

export const startTrip = async (req, res) => {
  try {
    const { vehicleId, startOdometer, openingCash, shift = 1, date } = req.body;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    if (!vehicleId || startOdometer === undefined) {
      return res.status(400).json({ message: 'Vehicle and Start Odometer are required' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const trip = await prisma.vehicleTrip.upsert({
      where: {
        vehicleId_date_shift: { vehicleId, date: dateString, shift }
      },
      update: {
        startOdometer,
        openingCash,
        status: 'OPEN',
        userId: req.user.id
      },
      create: {
        tenantId,
        storeId: vehicle.storeId || req.user.storeId,
        vehicleId,
        userId: req.user.id,
        date: dateString,
        shift,
        startOdometer,
        openingCash,
        status: 'OPEN'
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: trip.storeId,
      action: 'TRIP_STARTED',
      details: `Started trip for vehicle ${vehicle.vehicleNumber}. Start ODO: ${startOdometer}`,
      metadata: { tripId: trip.id, vehicleId }
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Error starting trip', error: error.message });
  }
};

export const endTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { endOdometer, closingCash, totalSales, totalExpenses } = req.body;

    const trip = await prisma.vehicleTrip.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    if (endOdometer < trip.startOdometer) {
      return res.status(400).json({ message: 'End odometer cannot be less than start odometer' });
    }

    const updated = await prisma.vehicleTrip.update({
      where: { id },
      data: {
        endOdometer,
        closingCash,
        totalSales,
        totalExpenses,
        status: 'CLOSED'
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: trip.tenantId,
      storeId: trip.storeId,
      action: 'TRIP_ENDED',
      details: `Ended trip for vehicle ${trip.vehicle.vehicleNumber}. End ODO: ${endOdometer}, KM: ${endOdometer - trip.startOdometer}`,
      metadata: { tripId: id, vehicleId: trip.vehicleId }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error ending trip', error: error.message });
  }
};

export const getTrips = async (req, res) => {
  try {
    const { vehicleId, storeId, date } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (vehicleId) where.vehicleId = vehicleId;
    if (storeId) where.storeId = storeId;
    if (date) where.date = date;

    const trips = await prisma.vehicleTrip.findMany({
      where,
      include: {
        vehicle: { select: { vehicleNumber: true, vehicleName: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trips', error: error.message });
  }
};
