import prisma from '../../utils/prisma.js';
import { sendNotification } from '../../services/notificationService.js';

// @desc    Create a new route with cycles
// @route   POST /api/admin/routes/create
// @access  Admin
export const createRoute = async (req, res, next) => {
    try {
        const { routeName, villages, cycles, storeId: bodyStoreId } = req.body;
        const tenantId = req.user.tenantId;
        const storeId = (bodyStoreId && bodyStoreId !== 'null' && bodyStoreId !== '') ? bodyStoreId : req.user.storeId;

        if (!routeName || !villages || !cycles) {
            res.status(400);
            throw new Error('All fields are required');
        }

        const route = await prisma.route.create({
            data: {
                routeName,
                villages,
                tenantId,
                storeId,
                cycles: {
                    create: cycles.map(cycle => ({
                        dayOfWeek: cycle.dayOfWeek,
                        villageName: cycle.villageName
                    }))
                }
            },
            include: {
                cycles: true
            }
        });

        res.status(201).json(route);
    } catch (error) {
        next(error);
    }
};

// @desc    Assign a route to a vehicle and executive
// @route   POST /api/admin/routes/assignments
// @access  Admin
export const assignRouteToVehicle = async (req, res, next) => {
    try {
        const { vehicleId, userId, routeId, morningSession, afternoonSession, schedule } = req.body;

        if (!vehicleId || !userId || !routeId) {
            res.status(400);
            throw new Error('Vehicle, User, and Route are required');
        }

        // Deactivate previous active assignment for this vehicle
        await prisma.routeAssignment.updateMany({
            where: {
                vehicleId,
                status: true
            },
            data: {
                status: false
            }
        });

        const assignment = await prisma.routeAssignment.create({
            data: {
                vehicleId,
                userId,
                routeId,
                status: true,
                morningSession,
                afternoonSession,
                schedule
            },
            include: {
                route: true,
                vehicle: { select: { vehicleNumber: true, vehicleName: true, id: true } },
                user: { select: { name: true, id: true } }
            }
        });

        // Send notification to the assigned Agent
        sendNotification({
            userIds: [userId],
            title: 'New Route Assigned!',
            message: `You have been assigned to Route: ${assignment.route.routeName} with a specific weekly schedule.`,
            type: 'route',
            priority: 'high',
            metadata: { assignmentId: assignment.id, routeId, vehicleId }
        });

        res.status(201).json(assignment);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a route assignment
// @route   PUT /api/admin/routes/assignments/:id
// @access  Admin
export const updateRouteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId, routeId, morningSession, afternoonSession, schedule } = req.body;

        // If userId is updated, we must fetch the new assignedVehicleId for the user
        let vehicleId = req.body.vehicleId;
        if (!vehicleId && userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            vehicleId = user?.assignedVehicleId || undefined;
        }

        const assignment = await prisma.routeAssignment.update({
            where: { id },
            data: {
                userId,
                vehicleId,
                routeId,
                morningSession,
                afternoonSession,
                schedule: schedule || undefined
            },
            include: {
                route: true,
                vehicle: { select: { vehicleNumber: true, vehicleName: true, id: true } },
                user: { select: { name: true, id: true } }
            }
        });

        // Send notification to the updated / existing Agent
        sendNotification({
            userIds: [assignment.userId],
            title: 'Route Assignment Updated',
            message: `Your assignment for Route ${assignment.route.routeName} has been updated with a weekly schedule.`,
            type: 'route',
            priority: 'medium',
            metadata: { assignmentId: assignment.id, routeId: assignment.routeId, vehicleId: assignment.vehicleId }
        });

        res.json(assignment);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all routes
// @route   GET /api/admin/routes
// @access  Admin
export const getAdminRoutes = async (req, res, next) => {
    try {
        const { storeId: queryStoreId } = req.query;
        const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : req.user.storeId;

        const where = { tenantId: req.user.tenantId };
        if (storeId) where.storeId = storeId;

        const routes = await prisma.route.findMany({
            where,
            include: {
                cycles: true
            }
        });
        res.json(routes);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all active assignments
// @route   GET /api/admin/routes/assignments
// @access  Admin
export const getRouteAssignments = async (req, res, next) => {
    try {
        const { storeId } = req.query;
        const where = { status: true };

        // Filter assignments by vehicle's store
        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            where.vehicle = { storeId };
        } else if (req.user.storeId) {
            where.vehicle = { storeId: req.user.storeId };
        }

        const assignments = await prisma.routeAssignment.findMany({
            where,
            include: {
                route: true,
                vehicle: { select: { vehicleNumber: true, vehicleName: true, storeId: true } },
                user: { select: { name: true } }
            }
        });
        res.json(assignments);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a route
// @route   PUT /api/admin/routes/:id
// @access  Admin
export const updateRoute = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { routeName, villages, cycles } = req.body;

        // Update route and its cycles (re-create cycles for simplicity in v1.2)
        const updated = await prisma.$transaction(async (tx) => {
            if (cycles) {
                await tx.routeCycle.deleteMany({ where: { routeId: id } });
            }

            return await tx.route.update({
                where: { id },
                data: {
                    routeName,
                    villages,
                    cycles: cycles ? {
                        create: cycles.map(c => ({
                            dayOfWeek: c.dayOfWeek,
                            villageName: c.villageName
                        }))
                    } : undefined
                },
                include: { cycles: true }
            });
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a route
// @route   DELETE /api/admin/routes/:id
// @access  Admin
export const deleteRoute = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        await prisma.$transaction([
            prisma.routeCycle.deleteMany({ where: { routeId: id } }),
            prisma.routeAssignment.deleteMany({ where: { routeId: id } }),
            prisma.route.delete({ where: { id } })
        ]);

        res.json({ message: 'Route deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete/Deactivate assignment
// @route   DELETE /api/admin/routes/assignments/:id
// @access  Admin
export const deleteRouteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.routeAssignment.delete({ where: { id } });
        res.json({ message: 'Assignment removed' });
    } catch (error) {
        next(error);
    }
};
