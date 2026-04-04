import prisma from '../utils/prisma.js';
import { format, addDays } from 'date-fns';

// Helper: get all active vehicle assignments (used by cron)
export const getAllActiveAssignments = async () => {
    return await prisma.routeAssignment.findMany({
        where: { status: true },
        include: {
            route: true,
            vehicle: { select: { id: true, vehicleNumber: true } },
            user: { select: { id: true, name: true, mobile: true } }
        }
    });
};

const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Helper to get plan for a specific date and vehicle
export const fetchPlanForVehicle = async (vehicleId, targetDate = new Date()) => {
    // 1. Fetch active route assignment for vehicle
    const assignment = await prisma.routeAssignment.findFirst({
        where: {
            vehicleId,
            status: true
        },
        include: {
            route: true
        }
    });

    if (!assignment) return null;

    // 2. Get current day of week
    const dayName = days[targetDate.getDay()];

    // 3. Fetch village from route_cycles
    const cycle = await prisma.routeCycle.findUnique({
        where: {
            routeId_dayOfWeek: {
                routeId: assignment.routeId,
                dayOfWeek: dayName
            }
        }
    });

    if (!cycle) return { routeId: assignment.routeId, routeName: assignment.route.routeName, noVillage: true };

    // 4. Return formatted plan
    // Morning: Part A, Evening: Part B
    return {
        routeId: assignment.routeId,
        villageName: cycle.villageName,
        routeName: assignment.route.routeName,
        morning: "Part A",
        evening: "Part B"
    };
};

// @desc    Get Today's Plan for a vehicle
// @route   GET /api/routes/today-plan
// @access  Private
export const getTodayPlan = async (req, res, next) => {
    try {
        const vehicleId = req.query.vehicleId || req?.user?.assignedVehicleId;
        if (!vehicleId) {
            console.error('[TodayPlan] Vehicle ID Missing. User:', req?.user?.id);
            res.status(400);
            throw new Error('Vehicle ID is required to fetch plan');
        }

        const plan = await fetchPlanForVehicle(vehicleId);
        if (!plan) return res.json({ message: "No Plan Available" });

        res.json(plan);
    } catch (error) {
        console.error('[TodayPlan] CRASH:', error);
        next(error);
    }
};

// @desc    Get Tomorrow's Plan for a vehicle
// @route   GET /api/routes/tomorrow-plan
// @access  Private
export const getTomorrowPlan = async (req, res, next) => {
    try {
        const vehicleId = req.query.vehicleId || req?.user?.assignedVehicleId;
        if (!vehicleId) {
            console.error('[TomorrowPlan] Vehicle ID Missing. User:', req?.user?.id);
            res.status(400);
            throw new Error('Vehicle ID is required to fetch plan');
        }

        const tomorrow = addDays(new Date(), 1);
        const plan = await fetchPlanForVehicle(vehicleId, tomorrow);
        if (!plan) return res.json({ message: "No Plan Available" });

        res.json(plan);
    } catch (error) {
        console.error('[TomorrowPlan] CRASH:', error);
        next(error);
    }
};

// Utility for coverage type determination
export const getCoverageType = (date = new Date()) => {
    const hours = date.getHours();
    return hours < 14 ? 'MORNING' : 'EVENING'; // Split at 2 PM
};

// @desc    Mark morning/evening coverage as done for a vehicle
// @route   POST /api/routes/mark-coverage
// @access  Private
export const markCoverage = async (req, res, next) => {
    try {
        const { slot } = req.body; // 'MORNING' | 'EVENING'
        const vehicleId = req.user.assignedVehicleId;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId) {
            res.status(400);
            throw new Error('No vehicle assigned to this user');
        }
        if (!['MORNING', 'EVENING'].includes(slot)) {
            res.status(400);
            throw new Error('slot must be MORNING or EVENING');
        }

        // Get current plan for today
        const plan = await fetchPlanForVehicle(vehicleId);
        if (!plan || plan.noVillage) {
            res.status(400);
            throw new Error('No active plan for today');
        }

        // Upsert DailyCoverage record
        const existing = await prisma.dailyCoverage.findUnique({
            where: { vehicleId_date: { vehicleId, date: dateString } }
        });

        let coverageStatus;
        if (!existing) {
            coverageStatus = slot === 'MORNING' ? 'MORNING_DONE' : 'EVENING_DONE';
        } else if (existing.status === 'MORNING_DONE' && slot === 'EVENING') {
            coverageStatus = 'BOTH_DONE';
        } else if (existing.status === 'EVENING_DONE' && slot === 'MORNING') {
            coverageStatus = 'BOTH_DONE';
        } else {
            coverageStatus = existing.status; // Already set
        }

        const coverage = await prisma.dailyCoverage.upsert({
            where: { vehicleId_date: { vehicleId, date: dateString } },
            update: {
                status: coverageStatus,
                [`${slot.toLowerCase()}Done`]: true,
                villageName: plan.villageName,
                routeId: plan.routeId,
            },
            create: {
                vehicleId,
                date: dateString,
                villageName: plan.villageName,
                routeId: plan.routeId,
                status: coverageStatus,
                morningDone: slot === 'MORNING',
                eveningDone: slot === 'EVENING',
            }
        });

        res.json({ success: true, coverage });
    } catch (error) {
        next(error);
    }
};

// @desc    Get today's coverage status for a vehicle
// @route   GET /api/routes/coverage-status
// @access  Private
export const getCoverageStatus = async (req, res, next) => {
    try {
        const vehicleId = req.user.assignedVehicleId;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId) return res.json({ vehicleAssigned: false });

        const coverage = await prisma.dailyCoverage.findUnique({
            where: { vehicleId_date: { vehicleId, date: dateString } }
        });

        const plan = await fetchPlanForVehicle(vehicleId);

        // Find next working day with a plan (skip empty days like Sunday)
        let nextPlan = null;
        let nextPlanDate = null;
        for (let i = 1; i <= 6; i++) {
            const futureDate = addDays(new Date(), i);
            const result = await fetchPlanForVehicle(vehicleId, futureDate);
            if (result && !result.noVillage && !result.message) {
                nextPlan = result;
                nextPlanDate = format(futureDate, 'EEEE, MMM d');
                break;
            }
        }

        res.json({
            vehicleAssigned: true,
            today: plan,
            tomorrow: nextPlan,
            tomorrowLabel: nextPlanDate || 'Tomorrow',
            coverage: coverage || { morningDone: false, eveningDone: false, status: 'PENDING' }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user notifications
// @route   GET /api/routes/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const [notifications, unreadCount, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.notification.count({
                where: { userId, isRead: false }
            }),
            prisma.notification.count({
                where: { userId }
            })
        ]);

        res.json({ notifications, unreadCount, total, page, limit });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   POST /api/routes/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all notifications as read
// @route   POST /api/routes/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

