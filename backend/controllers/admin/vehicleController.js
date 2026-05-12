import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

export const getVehicles = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && !['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      where.storeId = req.user.storeId;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        assignedUsers: { select: { id: true, name: true, role: true } },
        store: { select: { id: true, name: true } }
      }
    });
    res.json(vehicles);
  } catch (error) {
    console.error('❌ Error fetching vehicles:', error);
    res.status(500).json({ message: 'Error fetching vehicles', error: error.message });
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id, tenantId: req.user.tenantId },
      include: {
        assignedUsers: { select: { id: true, name: true, role: true } },
        store: { select: { id: true, name: true } }
      }
    });

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle details', error: error.message });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const { vehicleNumber, vehicleName, status, assignedUserId, storeId } = req.body;

    console.log('📝 Creating vehicle order:', { vehicleNumber, vehicleName, status, assignedUserId, storeId });

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

    const cleanStoreId = (storeId && storeId !== 'null' && storeId !== 'undefined' && storeId !== '') ? storeId : (req.user.storeId || null);

    const displayId = await generateId({
      entity: 'VH',
      tenantId: req.user.tenantId,
      storeId: cleanStoreId
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber,
        vehicleName,
        displayId,
        status: isStatusActive,
        rcDocument,
        insuranceDocument,
        permitDocument,
        tenantId: req.user.tenantId,
        storeId: cleanStoreId
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: cleanStoreId,
      action: 'VEHICLE_CREATED',
      details: `Registered new vehicle: ${vehicle.vehicleNumber} (${vehicle.vehicleName})`,
      metadata: { vehicleId: vehicle.id }
    });

    if (assignedUserId) {
      const user = await prisma.user.update({
        where: { id: assignedUserId },
        data: { assignedVehicleId: vehicle.id }
      });

      logActivity({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        storeId: cleanStoreId,
        action: 'DRIVER_ASSIGNED',
        details: `Assigned driver ${user.name} to vehicle ${vehicle.vehicleNumber}`,
        targetUserId: user.id,
        metadata: { vehicleId: vehicle.id }
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
    const { vehicleNumber, vehicleName, status, assignedUserId, storeId } = req.body;

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
      where: { id, tenantId: req.user.tenantId },
      data: {
        ...(vehicleNumber !== undefined && { vehicleNumber }),
        ...(vehicleName !== undefined && { vehicleName }),
        ...(status !== undefined && { status: status === true || status === 'true' }),
        ...(storeId !== undefined && { storeId: (storeId && storeId !== 'null' && storeId !== '') ? storeId : null }),
        rcDocument,
        insuranceDocument,
        permitDocument,
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: updated.storeId || req.user.storeId,
      action: 'VEHICLE_UPDATED',
      details: `Updated info for vehicle: ${updated.vehicleNumber}`,
      metadata: { vehicleId: id }
    });

    // Re-assign driver: first unassign everyone currently on this vehicle, then assign new
    if (assignedUserId !== undefined) {
      // 1. Get the current assigned user(s) to notify or just unassign
      await prisma.user.updateMany({
        where: { assignedVehicleId: id, tenantId: req.user.tenantId },
        data: { assignedVehicleId: null }
      });

      // 2. Assign the new user if provided
      if (assignedUserId && assignedUserId !== 'null' && assignedUserId !== '') {
        const user = await prisma.user.update({
          where: { id: assignedUserId, tenantId: req.user.tenantId },
          data: { assignedVehicleId: id }
        });

        logActivity({
          userId: req.user.id,
          tenantId: req.user.tenantId,
          storeId: updated.storeId || req.user.storeId,
          action: 'DRIVER_ASSIGNED',
          details: `Re-assigned driver ${user.name} to vehicle ${updated.vehicleNumber}`,
          targetUserId: user.id,
          metadata: { vehicleId: id }
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

    // 6. Delete Route Assignments and Coverage records
    await prisma.routeAssignment.deleteMany({ where: { vehicleId: id } }).catch(() => {});
    await prisma.dailyCoverage.deleteMany({ where: { vehicleId: id } }).catch(() => {});

    // 7. Delete Refill Requests (RefillItems will cascade delete)
    await prisma.refillRequest.deleteMany({ where: { vehicleId: id } }).catch(() => {});

    // 8. Nullify vehicleId on notifications
    await prisma.notification.updateMany({
      where: { vehicleId: id },
      data: { vehicleId: null }
    }).catch(() => {});

    // 9. Finally delete the vehicle
    await prisma.vehicle.delete({ where: { id, tenantId: req.user.tenantId } });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'VEHICLE_DELETED',
      details: `Permanently removed vehicle ${vehicle.vehicleNumber} and all its operational history`,
      metadata: { deletedVehicleId: id }
    });

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

    // 1. Unassign current user(s) from this specific vehicle
    await prisma.user.updateMany({
      where: { assignedVehicleId: id },
      data: { assignedVehicleId: null }
    });

    // 2. If a new userId is provided, assign them to this vehicle
    // Also ensure this user isn't assigned to another vehicle (optional, but good practice)
    if (userId && userId !== 'null' && userId !== '') {
      const user = await prisma.user.update({
        where: { id: userId, tenantId: req.user.tenantId },
        data: { assignedVehicleId: id }
      });

      logActivity({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        storeId: vehicle.storeId || req.user.storeId,
        action: 'DRIVER_ASSIGNED',
        details: `Assigned driver ${user.name} to vehicle ${vehicle.vehicleNumber}`,
        targetUserId: user.id,
        metadata: { vehicleId: id }
      });
    }

    res.json({ message: 'Driver assignment updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning driver', error: error.message });
  }
};

export const getVehicleSales = async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await prisma.order.findMany({
      where: { vehicleId: id, tenantId: req.user.tenantId },
      include: { user: { select: { name: true } }, items: true }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle sales', error: error.message });
  }
};

export const getVehicleStock = async (req, res) => {
  try {
    const { id } = req.params;
    const stocks = await prisma.vehicleStock.findMany({
      where: { vehicleId: id },
      include: {
        product: {
          select: { id: true, name: true, skuCode: true, price: true, mrp: true }
        }
      }
    });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle stock', error: error.message });
  }
};

export const executeVehicleHandover = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId
    const { targetUserId, policy, auditItems, remark, existingStockPolicy, carryOverTargetVehicleId, carryOverTargetUserId } = req.body;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id, tenantId: req.user.tenantId },
      include: {
        assignedUsers: true
      }
    });

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    const storeId = vehicle.storeId;

    console.log(`Executing Handover for vehicle ${id} via policy ${policy}`);

    await prisma.$transaction(async (tx) => {
      if (policy === 'INHERIT') {
        // Option A: Stock stays in target vehicle. Perform item audit updates if items provided.
        if (auditItems && Array.isArray(auditItems) && auditItems.length > 0) {
          // Create parent audit record
          const audit = await tx.stockAudit.create({
            data: {
              tenantId: req.user.tenantId,
              storeId: storeId || null,
              vehicleId: id,
              userId: req.user.id,
              remark: remark || 'Handover Audit (Inherit Policy)'
            }
          });

          // Fetch current stocks to log audit differences
          const existingStocks = await tx.vehicleStock.findMany({
            where: {
              vehicleId: id,
              productId: { in: auditItems.map(i => i.productId) }
            }
          });
          const stockMap = new Map(existingStocks.map(s => [s.productId, s.quantity]));

          const auditItemsData = [];
          const transactionsData = [];

          for (const item of auditItems) {
            const cleanQty = Math.max(0, Math.floor(parseInt(item.quantity) || 0));
            const oldQty = Math.floor(stockMap.get(item.productId) || 0);

            auditItemsData.push({
              tenantId: req.user.tenantId,
              auditId: audit.id,
              productId: item.productId,
              oldQuantity: oldQty,
              newQuantity: cleanQty
            });

            transactionsData.push({
              tenantId: req.user.tenantId,
              storeId: storeId || null,
              type: 'AUDIT',
              vehicleId: id,
              productId: item.productId,
              quantity: cleanQty,
              date: new Date()
            });

            // Upsert vehicle stock
            await tx.vehicleStock.upsert({
              where: { vehicleId_productId: { vehicleId: id, productId: item.productId } },
              update: { quantity: cleanQty },
              create: {
                id: `vstk_${Math.random().toString(36).substring(2, 15)}`,
                tenantId: req.user.tenantId,
                storeId: storeId || null,
                vehicleId: id,
                productId: item.productId,
                quantity: cleanQty,
                openingQuantity: cleanQty
              }
            });
          }

          if (auditItemsData.length > 0) {
            await tx.stockAuditItem.createMany({ data: auditItemsData });
            await tx.stockTransaction.createMany({ data: transactionsData });
          }
        }

        // Assign Driver
        await tx.user.updateMany({
          where: { assignedVehicleId: id },
          data: { assignedVehicleId: null }
        });

        if (targetUserId) {
          await tx.user.update({
            where: { id: targetUserId },
            data: { assignedVehicleId: id }
          });
        }

      } else if (policy === 'CARRY_OVER') {
        // Option B: Agent strips source vehicle stock bare and moves it to manually chosen destination context.
        // 1. Snapshot both leaving stock and incoming stock in memory BEFORE any database writes/updates
        const sourceStocks = await tx.vehicleStock.findMany({
          where: { vehicleId: id }
        });

        let targetUser = null;
        if (targetUserId) {
          targetUser = await tx.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, assignedVehicleId: true, name: true, storeId: true }
          });
        }

        const destVehicleId = targetUser?.assignedVehicleId;
        let incomingStocks = [];
        if (destVehicleId && destVehicleId !== id) {
          incomingStocks = await tx.vehicleStock.findMany({
            where: { vehicleId: destVehicleId }
          });
        }

        // 2. Safely wipe both vehicle inventories bare in the DB to avoid primary key/increment state clashing
        const vehiclesToClear = [id];
        if (destVehicleId && destVehicleId !== id) {
          vehiclesToClear.push(destVehicleId);
        }
        await tx.vehicleStock.deleteMany({
          where: { vehicleId: { in: vehiclesToClear } }
        });

        // 3. Write INCOMING driver's stock natively into the current vehicle (id)
        const validIncoming = incomingStocks.filter(inc => inc.quantity > 0);
        if (validIncoming.length > 0) {
          await tx.vehicleStock.createMany({
            data: validIncoming.map(inc => ({
              id: `vstk_${Math.random().toString(36).substring(2, 15)}`,
              tenantId: req.user.tenantId,
              storeId: storeId || null,
              vehicleId: id,
              productId: inc.productId,
              quantity: inc.quantity,
              openingQuantity: inc.openingQuantity || inc.quantity
            }))
          });

          await tx.stockTransaction.createMany({
            data: validIncoming.map(inc => ({
              tenantId: req.user.tenantId,
              storeId: storeId || null,
              userId: req.user.id,
              type: 'LOAD',
              vehicleId: id,
              productId: inc.productId,
              quantity: inc.quantity
            }))
          });
        }

        // 4. Route OUTGOING driver's stock from current vehicle (id) to carryOverTargetVehicleId
        const validSource = sourceStocks.filter(s => s.quantity > 0);
        if (carryOverTargetVehicleId && carryOverTargetVehicleId !== 'WAREHOUSE' && carryOverTargetVehicleId !== id) {
          // Pre-query destination vehicle stock to split creates vs updates, minimizing extension query overhead
          const existingDestStocks = await tx.vehicleStock.findMany({
            where: { vehicleId: carryOverTargetVehicleId },
            select: { productId: true }
          });
          const existingDestIds = new Set(existingDestStocks.map(d => d.productId));

          const itemsToCreate = validSource.filter(s => !existingDestIds.has(s.productId));
          const itemsToUpdate = validSource.filter(s => existingDestIds.has(s.productId));

          if (itemsToCreate.length > 0) {
            await tx.vehicleStock.createMany({
              data: itemsToCreate.map(s => ({
                id: `vstk_${Math.random().toString(36).substring(2, 15)}`,
                tenantId: req.user.tenantId,
                storeId: storeId || null,
                vehicleId: carryOverTargetVehicleId,
                productId: s.productId,
                quantity: s.quantity,
                openingQuantity: s.openingQuantity || s.quantity
              }))
            });
          }

          if (itemsToUpdate.length > 0) {
            await Promise.all(itemsToUpdate.map(s => 
              tx.vehicleStock.updateMany({
                where: { vehicleId: carryOverTargetVehicleId, productId: s.productId },
                data: { quantity: { increment: s.quantity } }
              })
            ));
          }

          if (validSource.length > 0) {
            await tx.stockTransaction.createMany({
              data: validSource.map(s => ({
                tenantId: req.user.tenantId,
                storeId: storeId || null,
                userId: req.user.id,
                type: 'LOAD',
                vehicleId: carryOverTargetVehicleId,
                productId: s.productId,
                quantity: s.quantity
              }))
            });
          }

          // If admin simultaneously selected an agent to assign to the destination routing vehicle
          if (carryOverTargetUserId) {
            // Unassign that user from their old vehicle if any
            await tx.user.updateMany({
              where: { id: carryOverTargetUserId },
              data: { assignedVehicleId: null }
            });
            // Assign them directly to the destination vehicle absorbing the stock
            await tx.user.update({
              where: { id: carryOverTargetUserId },
              data: { assignedVehicleId: carryOverTargetVehicleId }
            });
          }
        } else {
          // Flush OUTGOING driver's stock back to WAREHOUSE reserves
          if (validSource.length > 0) {
            await Promise.all(validSource.map(s => 
              tx.product.updateMany({
                where: { id: s.productId },
                data: { stock: { increment: s.quantity } }
              })
            ));

            await Promise.all(validSource.map(s => 
              tx.warehouseInventory.updateMany({
                where: { productId: s.productId },
                data: { quantity: { increment: s.quantity } }
              })
            ));

            await tx.stockTransaction.createMany({
              data: validSource.map(s => ({
                tenantId: req.user.tenantId,
                storeId: storeId || null,
                userId: req.user.id,
                type: 'RETURN',
                vehicleId: id,
                productId: s.productId,
                quantity: s.quantity
              }))
            });
          }
        }

        // 5. Swap current vehicle driver references perfectly
        await tx.user.updateMany({
          where: { assignedVehicleId: id },
          data: { assignedVehicleId: null }
        });

        if (targetUserId) {
          await tx.user.update({
            where: { id: targetUserId },
            data: { assignedVehicleId: id }
          });
        }
      }
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    // Log Activity
    const targetUserObj = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } }).catch(() => null) : null;
    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'DRIVER_ASSIGNED',
      details: `Handover executed for vehicle ${vehicle.vehicleNumber} to ${targetUserObj?.name || 'Driver'} via policy ${policy}`,
      targetUserId,
      metadata: { vehicleId: id, policy }
    });

    res.json({ message: `Vehicle handover successfully finalized using ${policy} policy` });
  } catch (error) {
    console.error('❌ Handover Execution Error:', error);
    res.status(500).json({ message: 'Error executing vehicle handover', error: error.message });
  }
};
