import prisma from '../utils/prisma.js';
import { format, addDays } from 'date-fns';

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
