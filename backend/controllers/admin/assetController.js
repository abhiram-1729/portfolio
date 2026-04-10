import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';

// ─── Asset Master CRUD ────────────────────────────────────

export const getAssetRequests = async (req, res) => {
  try {
    const requests = await prisma.assetRequest.findMany({
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
    const assets = await prisma.asset.findMany({
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
  } catch (error) {
    console.error('❌ Return Asset Error:', error);
    res.status(500).json({ message: 'Error returning asset', error: error.message });
  }
};

// ─── Tracking Dashboard ──────────────────────────────────

export const getAssetTracking = async (req, res) => {
  try {
    const assignments = await prisma.assetAssignment.findMany({
      where: { isActive: true },
      orderBy: { assignedDate: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
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
    const issues = await prisma.assetIssue.findMany({
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
    // Asset utilization
    const assets = await prisma.asset.findMany({
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
    const activeAssignments = await prisma.assetAssignment.findMany({
      where: { isActive: true },
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
