import prisma from '../../utils/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';

// ─── Get all transfers ───────────────────────────────────────────────────────
export const getAssetTransfers = async (req, res) => {
  try {
    const where = { tenantId: req.user.tenantId };
    let transfers = [];
    let useFallback = false;

    try {
      transfers = await prisma.assetTransferLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      if (transfers.length === 0) {
        useFallback = true;
      }
    } catch (dbErr) {
      console.warn('⚠️ AssetTransferLog table might not exist in database yet, falling back to assignment synthesis:', dbErr.message);
      useFallback = true;
    }

    if (useFallback) {
      // Synthesize realistic, high-fidelity transfers from actual Activity Logs!
      try {
        const logs = await prisma.activityLog.findMany({
          where: { tenantId: req.user.tenantId, action: 'ASSET_TRANSFERRED' },
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 200
        });

        const users = await prisma.user.findMany({ where: { tenantId: req.user.tenantId } });
        const vehicles = await prisma.vehicle.findMany({ where: { tenantId: req.user.tenantId } });
        const stores = await prisma.store.findMany({ where: { tenantId: req.user.tenantId } });
        const assets = await prisma.asset.findMany({ where: { tenantId: req.user.tenantId } });

        const getLabel = (type, id) => {
          if (type === 'STORE') {
            const st = stores.find(s => s.id === id);
            return st ? st.name : 'Store';
          }
          if (type === 'USER') {
            const u = users.find(u => u.id === id);
            return u ? u.name : 'Agent';
          }
          if (type === 'VEHICLE') {
            const v = vehicles.find(v => v.id === id);
            return v ? v.vehicleNumber : 'Vehicle';
          }
          return 'Unknown';
        };

        const synthesized = logs.map(l => {
          const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
          const assetObj = assets.find(a => a.id === meta.assetId);

          return {
            id: `sys-act-${l.id}`,
            assetName: assetObj ? assetObj.name : 'Unknown Asset',
            serialNumber: 'N/A', // We can't easily resolve serial without deep querying, but bulk is fine
            quantity: meta.unitIds ? meta.unitIds.length : (meta.quantity || 1),
            fromType: meta.fromType || 'STORE',
            fromLabel: getLabel(meta.fromType || 'STORE', meta.fromId),
            toType: meta.toType || 'STORE',
            toLabel: getLabel(meta.toType || 'STORE', meta.toId),
            createdAt: l.createdAt,
            status: 'COMPLETED',
            initiatedByName: l.user?.name || 'System Admin',
            reason: meta.reason || null,
            notes: meta.notes || null,
          };
        });

        return res.json(synthesized);
      } catch (synthErr) {
        console.error('❌ Failed to synthesize transfers from ActivityLog:', synthErr);
        return res.json([]);
      }
    }

    // Populate references manually
    const populated = await Promise.all(transfers.map(async (t) => {
      let assetName = 'Unknown';
      let serialNumber = 'N/A';
      let initiatedByName = 'Admin';
      let fromLabel = t.fromLabel || t.fromId || '—';
      let toLabel = t.toLabel || t.toId || '—';

      try {
        if (t.assetId) {
          const a = await prisma.asset.findUnique({ where: { id: t.assetId }, select: { name: true } });
          if (a) assetName = a.name;
        }
        if (t.assetUnitId) {
          const u = await prisma.assetUnit.findUnique({ where: { id: t.assetUnitId }, select: { serialNumber: true } });
          if (u) serialNumber = u.serialNumber || 'Unit';
        }
        if (t.initiatedById) {
          const u = await prisma.user.findUnique({ where: { id: t.initiatedById }, select: { name: true } });
          if (u) initiatedByName = u.name;
        }
        if (t.fromType === 'STORE' && t.fromId) {
          const s = await prisma.store.findUnique({ where: { id: t.fromId }, select: { name: true } });
          if (s) fromLabel = s.name;
        } else if (t.fromType === 'USER' && t.fromId) {
          const u = await prisma.user.findUnique({ where: { id: t.fromId }, select: { name: true } });
          if (u) fromLabel = u.name;
        } else if (t.fromType === 'VEHICLE' && t.fromId) {
          const v = await prisma.vehicle.findUnique({ where: { id: t.fromId }, select: { vehicleNumber: true } });
          if (v) fromLabel = v.vehicleNumber;
        }
        if (t.toType === 'STORE' && t.toId) {
          const s = await prisma.store.findUnique({ where: { id: t.toId }, select: { name: true } });
          if (s) toLabel = s.name;
        } else if (t.toType === 'USER' && t.toId) {
          const u = await prisma.user.findUnique({ where: { id: t.toId }, select: { name: true } });
          if (u) toLabel = u.name;
        } else if (t.toType === 'VEHICLE' && t.toId) {
          const v = await prisma.vehicle.findUnique({ where: { id: t.toId }, select: { vehicleNumber: true } });
          if (v) toLabel = v.vehicleNumber;
        }
      } catch (_) {}

      return { ...t, assetName, serialNumber, initiatedByName, fromLabel, toLabel };
    }));

    res.json(populated);
  } catch (error) {
    console.error('❌ Get Transfers Error:', error);
    res.status(500).json({ message: 'Error fetching transfers', error: error.message });
  }
};

// ─── Create a transfer ────────────────────────────────────────────────────────
export const createAssetTransfer = async (req, res) => {
  try {
    const { assetId, assetUnitId, quantity, fromType, fromId, toType, toId, reason, notes } = req.body;

    if (!assetId || !fromType || !fromId || !toType || !toId) {
      return res.status(400).json({ message: 'assetId, fromType, fromId, toType, toId are required' });
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const transferredUnits = [];

    if (assetUnitId) {
      // Transfer a specific electronic unit
      const unit = await prisma.assetUnit.findUnique({ where: { id: assetUnitId } });
      if (!unit) return res.status(404).json({ message: 'Asset unit not found' });

      let newVehicleId = unit.vehicleId;
      if (toType === 'VEHICLE') newVehicleId = toId;
      if (fromType === 'VEHICLE' && unit.vehicleId === fromId) newVehicleId = null;

      if (fromType === 'USER') {
        await prisma.assetAssignment.updateMany({
          where: { assetUnitId, userId: fromId, isActive: true },
          data: { isActive: false, returnDate: new Date(), returnRemarks: reason || 'Transfer' }
        });
      }

      let newStatus = 'AVAILABLE';
      if (toType === 'USER') {
        await prisma.assetAssignment.create({
          data: { assetUnitId, userId: toId, assignCondition: unit.condition || 'GOOD', quantity: 1, tenantId: req.user.tenantId }
        });
        newStatus = 'ASSIGNED';
      }

      await prisma.assetUnit.update({ where: { id: assetUnitId }, data: { vehicleId: newVehicleId, status: newStatus } });
      transferredUnits.push(assetUnitId);
    } else {
      // Bulk transfer
      const qty = parseInt(quantity) || 1;
      const statusFilter = fromType === 'USER' ? 'ASSIGNED' : 'AVAILABLE';
      const whereClause = { assetId, status: statusFilter };
      if (fromType === 'VEHICLE') whereClause.vehicleId = fromId;

      const availableUnits = await prisma.assetUnit.findMany({ where: whereClause, take: qty });
      if (availableUnits.length < qty) {
        return res.status(400).json({ message: `Only ${availableUnits.length} unit(s) available for transfer` });
      }

      for (const unit of availableUnits) {
        let newVehicleId = unit.vehicleId;
        if (toType === 'VEHICLE') newVehicleId = toId;
        if (fromType === 'VEHICLE') newVehicleId = null;

        let newStatus = 'AVAILABLE';
        if (fromType === 'USER') {
          await prisma.assetAssignment.updateMany({
            where: { assetUnitId: unit.id, userId: fromId, isActive: true },
            data: { isActive: false, returnDate: new Date(), returnRemarks: reason || 'Transfer' }
          });
        }
        if (toType === 'USER') {
          await prisma.assetAssignment.create({
            data: { assetUnitId: unit.id, userId: toId, assignCondition: unit.condition || 'GOOD', quantity: 1, tenantId: req.user.tenantId }
          });
          newStatus = 'ASSIGNED';
        }

        await prisma.assetUnit.update({ where: { id: unit.id }, data: { vehicleId: newVehicleId, status: newStatus } });
        transferredUnits.push(unit.id);
      }
    }

    // If store-to-store, update asset master's storeId
    if (fromType === 'STORE' && toType === 'STORE') {
      await prisma.asset.update({ where: { id: assetId }, data: { storeId: toId } });
    }

    // Build readable labels for log
    const buildLabel = (type, id) => `${type}:${id}`;

    let log = null;
    try {
      log = await prisma.assetTransferLog.create({
        data: {
          tenantId: req.user.tenantId,
          assetId,
          assetUnitId: assetUnitId || null,
          quantity: transferredUnits.length,
          fromType,
          fromId,
          fromLabel: buildLabel(fromType, fromId),
          toType,
          toId,
          toLabel: buildLabel(toType, toId),
          reason: reason || null,
          notes: notes || null,
          status: 'COMPLETED',
          initiatedById: req.user.id,
          unitIds: transferredUnits,
        }
      });
    } catch (logErr) {
      console.warn('⚠️ Could not create AssetTransferLog row (e.g. table not pushed):', logErr.message);
    }

    res.status(201).json({ message: `Transfer completed. ${transferredUnits.length} unit(s) moved.`, log });

    try {
      logActivity({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        storeId: req.user.storeId,
        action: 'ASSET_TRANSFERRED',
        details: `Transferred ${transferredUnits.length} unit(s) of "${asset.name}" from ${fromType}:${fromId} to ${toType}:${toId}. Reason: ${reason || 'N/A'}`,
        metadata: { assetId, unitIds: transferredUnits, fromType, fromId, toType, toId }
      });
    } catch (activityErr) {
      console.warn('⚠️ Could not log activity for asset transfer:', activityErr.message);
    }
  } catch (error) {
    console.error('❌ Create Transfer Error:', error);
    res.status(500).json({ message: 'Error creating transfer', error: error.message });
  }
};
