import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { logActivity } from '../../utils/activityLogger.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';

// ─── Asset Master CRUD ────────────────────────────────────

export const getAssetRequests = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const requests = await prisma.assetRequest.findMany({
      where: {
        tenantId: req.user.tenantId,
        OR: [
          { asset: { storeId: storeId } },
          { user: { storeId: storeId } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        asset: { select: { id: true, name: true, model: true } },
        assetUnit: { select: { id: true, serialNumber: true } }
      }
    });
    res.json(requests);
  } catch (error) {
    console.error('❌ Get Asset Requests Error:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

export const updateAssetRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    const request = await prisma.assetRequest.update({
      where: { id },
      data: { 
        status, 
        adminRemark: adminRemark || undefined 
      }
    });

    res.json({ message: 'Request updated', request });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: status === 'APPROVED' ? 'ASSET_REQ_APPROVED' : 'ASSET_REQ_REJECTED',
      details: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} asset request ${id} for user ${request.userId}`,
      targetUserId: request.userId,
      metadata: { requestId: id, status, adminRemark }
    });
  } catch (error) {
    console.error('❌ Update Request Error:', error);
    res.status(500).json({ message: 'Error updating request', error: error.message });
  }
};

export const getAssetCatalog = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        model: true,
        brand: true,
        categoryId: true,
        category: { select: { name: true } },
        image: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });
    // Flatten category for catalog
    const flattened = assets.map(a => ({
        ...a,
        assetType: a.category?.name || 'Uncategorized'
    }));
    res.json(flattened);
  } catch (error) {
    console.error('❌ Get Asset Catalog Error:', error);
    res.status(500).json({ message: 'Error fetching catalog', error: error.message });
  }
};

export const getAssets = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const where = { 
      tenantId: req.user.tenantId,
      storeId: storeId
    };

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        units: {
          select: { id: true, serialNumber: true, status: true, condition: true }
        },
        category: {
          select: { id: true, name: true }
        },
        _count: {
          select: { units: true }
        }
      }
    });
    res.json(assets);
  } catch (error) {
    console.error('❌ Get Assets Error:', error);
    res.status(500).json({ message: 'Error fetching assets', error: error.message });
  }
};

export const createAsset = async (req, res) => {
  try {
    const { name, assetType, model, brand, description, estimatedCost } = req.body;

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'product-images',
        'assets'
      );
    }

    const storeId = getEffectiveStoreId(req);
    const asset = await prisma.asset.create({
      data: {
        name,
        categoryId: req.body.categoryId || null,
        assetType: assetType || 'NON_ELECTRONIC',
        model: model || null,
        brand: brand || null,
        image: imageUrl,
        description: description || null,
        estimatedCost: parseFloat(estimatedCost) || 0,
        tenantId: req.user.tenantId,
        storeId: storeId
      }
    });

    res.status(201).json({ message: 'Asset created successfully', asset });
  } catch (error) {
    console.error('❌ Create Asset Error:', error);
    res.status(500).json({ message: 'Error creating asset', error: error.message });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, assetType, model, brand, description, estimatedCost } = req.body;

    let imageUrl = undefined;
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'product-images',
        'assets'
      );
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name,
        categoryId: req.body.categoryId || undefined,
        assetType: assetType || undefined,
        model: model || undefined,
        brand: brand || undefined,
        image: imageUrl,
        description: description || undefined,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      }
    });

    res.json({ message: 'Asset updated', asset });
  } catch (error) {
    console.error('❌ Update Asset Error:', error);
    res.status(500).json({ message: 'Error updating asset', error: error.message });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    // Cascade will handle units → assignments/issues
    await prisma.asset.delete({ where: { id } });
    res.json({ message: 'Asset deleted' });
  } catch (error) {
    console.error('❌ Delete Asset Error:', error);
    res.status(500).json({ message: 'Error deleting asset', error: error.message });
  }
};

// ─── Asset Inventory (Units) ──────────────────────────────

export const addAssetUnits = async (req, res) => {
  try {
    const { id } = req.params; // assetId
    const { quantity, serialNumbers, condition } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const units = [];

    if (asset.assetType === 'ELECTRONIC' && serialNumbers && serialNumbers.length > 0) {
      // Electronic: create one unit per serial number
      for (const sn of serialNumbers) {
        const unit = await prisma.assetUnit.create({
          data: {
            assetId: id,
            serialNumber: sn.trim(),
            condition: condition || 'NEW',
            status: 'AVAILABLE'
          }
        });
        units.push(unit);
      }
    } else {
      // Non-electronic: create `quantity` units without serial numbers
      const qty = parseInt(quantity) || 1;
      for (let i = 0; i < qty; i++) {
        const unit = await prisma.assetUnit.create({
          data: {
            assetId: id,
            condition: condition || 'NEW',
            status: 'AVAILABLE'
          }
        });
        units.push(unit);
      }
    }

    // Update total quantity on asset master
    const totalUnits = await prisma.assetUnit.count({ where: { assetId: id } });
    await prisma.asset.update({ where: { id }, data: { totalQuantity: totalUnits } });

    res.status(201).json({ message: `${units.length} unit(s) added`, units });
  } catch (error) {
    console.error('❌ Add Units Error:', error);
    res.status(500).json({ message: 'Error adding units', error: error.message });
  }
};

// ─── Assignment ───────────────────────────────────────────

export const assignAsset = async (req, res) => {
  try {
    const { userId, assetId, quantity, serialNumber, condition } = req.body;

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const assignments = [];

    if (serialNumber) {
      // Electronic: assign specific unit by serial number
      const unit = await prisma.assetUnit.findFirst({
        where: { assetId, serialNumber, status: 'AVAILABLE' }
      });
      if (!unit) return res.status(400).json({ message: `Unit with serial "${serialNumber}" is not available` });

      const assignment = await prisma.assetAssignment.create({
        data: {
          assetUnitId: unit.id,
          userId,
          assignCondition: condition || 'GOOD',
          quantity: 1
        }
      });
      await prisma.assetUnit.update({
        where: { id: unit.id },
        data: { status: 'ASSIGNED' }
      });
      assignments.push(assignment);
    } else {
      // Non-electronic: assign `quantity` available units
      const qty = parseInt(quantity) || 1;
      const availableUnits = await prisma.assetUnit.findMany({
        where: { assetId, status: 'AVAILABLE' },
        take: qty
      });

      if (availableUnits.length < qty) {
        return res.status(400).json({ 
          message: `Only ${availableUnits.length} unit(s) available out of ${qty} requested` 
        });
      }

      for (const unit of availableUnits) {
        const assignment = await prisma.assetAssignment.create({
          data: {
            assetUnitId: unit.id,
            userId,
            assignCondition: condition || 'GOOD',
            quantity: 1
          }
        });
        await prisma.assetUnit.update({
          where: { id: unit.id },
          data: { status: 'ASSIGNED' }
        });
        assignments.push(assignment);
      }
    }

    res.status(201).json({ message: `${assignments.length} asset(s) assigned successfully`, assignments });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'ASSET_ASSIGNED',
      details: `Assigned ${assignments.length} unit(s) of asset ${assetId} to user ${userId}`,
      targetUserId: userId,
      metadata: { assetId, userId, quantity: assignments.length }
    });
  } catch (error) {
    console.error('❌ Assign Asset Error:', error);
    res.status(500).json({ message: 'Error assigning asset', error: error.message });
  }
};

// ─── Return ───────────────────────────────────────────────

export const returnAsset = async (req, res) => {
  try {
    const { assignmentId, returnCondition, remarks } = req.body;

    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: assignmentId },
      include: { assetUnit: true }
    });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (!assignment.isActive) return res.status(400).json({ message: 'Assignment already returned' });

    // Determine the unit status based on return condition
    let newUnitStatus = 'AVAILABLE';
    const cond = returnCondition || 'GOOD';
    if (cond === 'DAMAGED') newUnitStatus = 'DAMAGED';
    if (cond === 'LOST') newUnitStatus = 'LOST';

    await prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: {
        isActive: false,
        returnDate: new Date(),
        returnCondition: cond === 'LOST' ? 'DAMAGED' : cond,
        returnRemarks: remarks || null
      }
    });

    await prisma.assetUnit.update({
      where: { id: assignment.assetUnitId },
      data: {
        status: newUnitStatus,
        condition: cond === 'LOST' ? 'DAMAGED' : cond
      }
    });

    res.json({ message: 'Asset returned successfully' });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'ASSET_RETURNED',
      details: `Returned asset assignment ${assignmentId}. Condition: ${returnCondition || 'GOOD'}`,
      targetUserId: assignment.userId,
      metadata: { assignmentId, returnCondition, remarks }
    });
  } catch (error) {
    console.error('❌ Return Asset Error:', error);
    res.status(500).json({ message: 'Error returning asset', error: error.message });
  }
};

// ─── Tracking Dashboard ──────────────────────────────────

export const getAssetTracking = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const assignments = await prisma.assetAssignment.findMany({
      where: { 
        isActive: true,
        tenantId: req.user.tenantId,
        assetUnit: {
          asset: { storeId: storeId }
        }
      },
      orderBy: { assignedDate: 'desc' },
      include: {
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            assignedVehicleId: true,
            assignedVehicle: {
              select: { id: true, vehicleNumber: true, vehicleName: true }
            }
          } 
        },
        assetUnit: {
          include: {
            asset: { select: { id: true, name: true, assetType: true, model: true, brand: true, image: true } }
          }
        }
      }
    });
    res.json(assignments);
  } catch (error) {
    console.error('❌ Tracking Error:', error);
    res.status(500).json({ message: 'Error fetching tracking', error: error.message });
  }
};

// ─── Issues ──────────────────────────────────────────────

export const getIssues = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const issues = await prisma.assetIssue.findMany({
      where: {
        tenantId: req.user.tenantId,
        assetUnit: {
          asset: { storeId: storeId }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        assetUnit: {
          include: {
            asset: { select: { id: true, name: true, model: true, brand: true } }
          }
        }
      }
    });
    res.json(issues);
  } catch (error) {
    console.error('❌ Get Issues Error:', error);
    res.status(500).json({ message: 'Error fetching issues', error: error.message });
  }
};

export const updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const issue = await prisma.assetIssue.update({
      where: { id },
      data: { status }
    });

    // If resolving, update unit condition back to GOOD
    if (status === 'RESOLVED' || status === 'CLOSED') {
      await prisma.assetUnit.update({
        where: { id: issue.assetUnitId },
        data: { condition: 'GOOD', status: 'ASSIGNED' }
      });
    }

    res.json({ message: 'Issue updated', issue });
  } catch (error) {
    console.error('❌ Update Issue Error:', error);
    res.status(500).json({ message: 'Error updating issue', error: error.message });
  }
};

// ─── Reports ─────────────────────────────────────────────

export const getAssetReports = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);
    // Asset utilization
    const assets = await prisma.asset.findMany({
      where: {
        tenantId: req.user.tenantId,
        storeId: storeId
      },
      include: {
        units: { select: { status: true } }
      }
    });

    const utilization = assets.map(a => ({
      id: a.id,
      name: a.name,
      assetType: a.assetType,
      total: a.units.length,
      assigned: a.units.filter(u => u.status === 'ASSIGNED').length,
      available: a.units.filter(u => u.status === 'AVAILABLE').length,
      damaged: a.units.filter(u => u.status === 'DAMAGED').length,
      lost: a.units.filter(u => u.status === 'LOST').length,
    }));

    // Executive asset report
    const executiveReportWhere = {
      isActive: true,
      tenantId: req.user.tenantId,
      assetUnit: {
        asset: { storeId: storeId }
      }
    };

    const activeAssignments = await prisma.assetAssignment.findMany({
      where: executiveReportWhere,
      include: {
        user: { select: { id: true, name: true } },
        assetUnit: {
          include: { asset: { select: { name: true, model: true } } }
        }
      }
    });

    const executiveMap = {};
    activeAssignments.forEach(a => {
      const uid = a.userId;
      if (!executiveMap[uid]) {
        executiveMap[uid] = { user: a.user, assets: [] };
      }
      executiveMap[uid].assets.push({
        assetName: a.assetUnit.asset.name,
        model: a.assetUnit.asset.model,
        serialNumber: a.assetUnit.serialNumber,
        condition: a.assignCondition,
        assignedDate: a.assignedDate
      });
    });
    const executiveReport = Object.values(executiveMap);

    // Loss/Damage
    const issues = await prisma.assetIssue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true } },
        assetUnit: {
          include: { asset: { select: { name: true } } }
        }
      }
    });

    res.json({ utilization, executiveReport, issues });
  } catch (error) {
    console.error('❌ Reports Error:', error);
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
};

// ─── Agent-Side Endpoints ────────────────────────────────

export const getMyAssets = async (req, res) => {
  try {
    const userId = req.user.id;
    const assignments = await prisma.assetAssignment.findMany({
      where: { userId, isActive: true },
      orderBy: { assignedDate: 'desc' },
      include: {
        assetUnit: {
          include: {
            asset: {
              select: { id: true, name: true, assetType: true, model: true, brand: true, image: true, description: true }
            }
          }
        }
      }
    });
    res.json(assignments);
  } catch (error) {
    console.error('❌ My Assets Error:', error);
    res.status(500).json({ message: 'Error fetching your assets', error: error.message });
  }
};

export const reportIssue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetUnitId, issueType, description } = req.body;

    // Verify user owns this asset
    const assignment = await prisma.assetAssignment.findFirst({
      where: { assetUnitId, userId, isActive: true }
    });
    if (!assignment) return res.status(403).json({ message: 'You do not have this asset assigned' });

    // Handle photo uploads
    const photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToSupabase(
          file.buffer,
          file.originalname,
          file.mimetype,
          'product-images',
          'asset-issues'
        );
        if (url) photos.push(url);
      }
    }

    const issue = await prisma.assetIssue.create({
      data: {
        assetUnitId,
        userId,
        issueType: issueType || 'OTHER',
        description: description || null,
        photos
      }
    });

    // Mark unit condition
    if (issueType === 'DAMAGED' || issueType === 'NOT_WORKING') {
      await prisma.assetUnit.update({
        where: { id: assetUnitId },
        data: { condition: 'DAMAGED' }
      });
    }

    res.status(201).json({ message: 'Issue reported successfully', issue });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'ASSET_ISSUE_REPORTED',
      details: `Reported ${issueType} issue for asset unit ${assetUnitId}: ${description || 'No description'}`,
      metadata: { issueId: issue.id, assetUnitId, issueType }
    });
  } catch (error) {
    console.error('❌ Report Issue Error:', error);
    res.status(500).json({ message: 'Error reporting issue', error: error.message });
  }
};

export const createAssetRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, assetId, assetUnitId, description, priority } = req.body;

    const request = await prisma.assetRequest.create({
      data: {
        userId,
        type,
        assetId: assetId || null,
        assetUnitId: assetUnitId || null,
        description: description || null,
        priority: priority || 'MEDIUM'
      }
    });

    res.status(201).json({ message: 'Request submitted successfully', request });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'ASSET_REQUEST_SUBMITTED',
      details: `Submitted ${type} request for asset ${assetId || 'New Requirement'}`,
      metadata: { requestId: request.id, type, assetId, assetUnitId }
    });
  } catch (error) {
    console.error('❌ Create Asset Request Error:', error);
    res.status(500).json({ message: 'Error submitting request', error: error.message });
  }
};

export const getMyAssetRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.assetRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { name: true, model: true } },
        assetUnit: { select: { serialNumber: true } }
      }
    });
    res.json(requests);
  } catch (error) {
    console.error('❌ Get My Asset Requests Error:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

// ─── Module 14 Enterprise Extensions ───────────────────────

// 1. Vehicle Asset Mapping Update
export const updateAssetVehicleMapping = async (req, res) => {
  try {
    const { assetUnitId, vehicleId } = req.body;
    const targetVehicleId = vehicleId || null;

    const updatedUnit = await prisma.assetUnit.update({
      where: { id: assetUnitId },
      data: { vehicleId: targetVehicleId }
    });

    // Also update active assignments targeting this unit to maintain parallel synchronization
    await prisma.assetAssignment.updateMany({
      where: { assetUnitId, isActive: true },
      data: { vehicleId: targetVehicleId }
    });

    res.json({ message: 'Vehicle asset mapping updated successfully', unit: updatedUnit });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'ASSET_ASSIGNED',
      details: `Updated vehicle mapping for asset unit ${assetUnitId} to vehicle ${targetVehicleId || 'Unassigned'}`,
      metadata: { assetUnitId, vehicleId: targetVehicleId }
    });
  } catch (error) {
    console.error('❌ Update Vehicle Mapping Error:', error);
    res.status(500).json({ message: 'Error updating vehicle asset mapping', error: error.message });
  }
};

// 2. Depreciation Modeling & Management
export const getDepreciationSchedules = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);
    
    // Fetch all master assets to verify schedules exist
    const assets = await prisma.asset.findMany({
      where: {
        tenantId: req.user.tenantId,
        storeId: storeId
      },
      select: {
        id: true,
        name: true,
        model: true,
        estimatedCost: true,
        createdAt: true
      }
    });

    const schedules = [];

    for (const asset of assets) {
      let dep = await prisma.assetDepreciation.findFirst({
        where: { assetId: asset.id }
      });

      // If no schedule exists, auto-seed a default straight line schedule based on estimatedCost
      if (!dep) {
        dep = await prisma.assetDepreciation.create({
          data: {
            assetId: asset.id,
            tenantId: req.user.tenantId,
            costBasis: asset.estimatedCost || 0,
            salvageValue: (asset.estimatedCost || 0) * 0.1, // Default 10% salvage value
            usefulLifeYears: 5,
            method: 'STRAIGHT_LINE',
            ratePercentage: 20,
            currentBookVal: asset.estimatedCost || 0
          }
        });
      }

      // Calculate real-time net book value dynamically
      const elapsedMs = Date.now() - new Date(asset.createdAt).getTime();
      const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365.25);
      
      let calculatedBookValue = dep.costBasis;
      if (dep.method === 'STRAIGHT_LINE') {
        const annualDep = (dep.costBasis - dep.salvageValue) * (dep.ratePercentage / 100);
        calculatedBookValue = dep.costBasis - (annualDep * elapsedYears);
      } else {
        // Declining balance
        calculatedBookValue = dep.costBasis * Math.pow(1 - (dep.ratePercentage / 100), elapsedYears);
      }

      // Clamp to salvage value
      calculatedBookValue = Math.max(calculatedBookValue, dep.salvageValue);
      if (isNaN(calculatedBookValue) || calculatedBookValue < 0) calculatedBookValue = 0;

      schedules.push({
        ...dep,
        assetName: asset.name,
        assetModel: asset.model,
        realTimeBookValue: Math.round(calculatedBookValue)
      });
    }

    res.json(schedules);
  } catch (error) {
    console.error('❌ Get Depreciation Schedules Error:', error);
    res.status(500).json({ message: 'Error fetching depreciation matrices', error: error.message });
  }
};

export const saveDepreciationSchedule = async (req, res) => {
  try {
    const { assetId, costBasis, salvageValue, usefulLifeYears, method, ratePercentage } = req.body;

    // Find existing or create
    const existing = await prisma.assetDepreciation.findFirst({
      where: { assetId }
    });

    let updated;
    const cBasis = parseFloat(costBasis) || 0;
    const sVal = parseFloat(salvageValue) || 0;
    const lifeYears = parseInt(usefulLifeYears) || 5;
    const rate = parseFloat(ratePercentage) || 20;

    if (existing) {
      updated = await prisma.assetDepreciation.update({
        where: { id: existing.id },
        data: {
          costBasis: cBasis,
          salvageValue: sVal,
          usefulLifeYears: lifeYears,
          method: method || 'STRAIGHT_LINE',
          ratePercentage: rate,
          lastCalculated: new Date()
        }
      });
    } else {
      updated = await prisma.assetDepreciation.create({
        data: {
          assetId,
          tenantId: req.user.tenantId,
          costBasis: cBasis,
          salvageValue: sVal,
          usefulLifeYears: lifeYears,
          method: method || 'STRAIGHT_LINE',
          ratePercentage: rate,
          currentBookVal: cBasis
        }
      });
    }

    res.json({ message: 'Depreciation matrix updated successfully', schedule: updated });
  } catch (error) {
    console.error('❌ Save Depreciation Error:', error);
    res.status(500).json({ message: 'Error saving depreciation configuration', error: error.message });
  }
};

// 3. Asset Audit Verification
export const getAssetAudits = async (req, res) => {
  try {
    const audits = await prisma.assetAuditLog.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { auditDate: 'desc' },
      take: 100
    });

    // Populate transient asset references manually to optimize join lookups
    const populated = await Promise.all(audits.map(async (audit) => {
      let assetName = 'Unknown Asset';
      let serialNumber = 'N/A';
      let auditedByName = 'Supervisor';

      if (audit.assetId) {
        const a = await prisma.asset.findUnique({ where: { id: audit.assetId }, select: { name: true } });
        if (a) assetName = a.name;
      }
      if (audit.assetUnitId) {
        const u = await prisma.assetUnit.findUnique({ 
          where: { id: audit.assetUnitId }, 
          select: { serialNumber: true, asset: { select: { name: true } } } 
        });
        if (u) {
          serialNumber = u.serialNumber || 'Unit';
          if (u.asset) assetName = u.asset.name;
        }
      }
      if (audit.auditedByUserId) {
        const user = await prisma.user.findUnique({ where: { id: audit.auditedByUserId }, select: { name: true } });
        if (user) auditedByName = user.name;
      }

      return {
        ...audit,
        assetName,
        serialNumber,
        auditedByName
      };
    }));

    res.json(populated);
  } catch (error) {
    console.error('❌ Get Asset Audits Error:', error);
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};

export const createAssetAudit = async (req, res) => {
  try {
    const { assetId, assetUnitId, status, physicalCondition, remarks } = req.body;

    const auditLog = await prisma.assetAuditLog.create({
      data: {
        assetId: assetId || null,
        assetUnitId: assetUnitId || null,
        tenantId: req.user.tenantId,
        auditedByUserId: req.user.id,
        status: status || 'VERIFIED',
        physicalCondition: physicalCondition || 'GOOD',
        remarks: remarks || null
      }
    });

    // If unit reported damaged or missing, update physical asset unit status natively
    if (assetUnitId && (status === 'MISSING' || status === 'DAMAGED')) {
      await prisma.assetUnit.update({
        where: { id: assetUnitId },
        data: { 
          status: status === 'MISSING' ? 'LOST' : 'DAMAGED',
          condition: 'DAMAGED' 
        }
      });
    }

    res.status(201).json({ message: 'Asset inspection verification recorded successfully', auditLog });
  } catch (error) {
    console.error('❌ Create Asset Audit Error:', error);
    res.status(500).json({ message: 'Error recording asset inspection', error: error.message });
  }
};

