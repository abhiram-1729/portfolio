import prisma from '../../utils/prisma.js';
import { format, isWithinInterval, parse, startOfDay, endOfDay } from 'date-fns';
import { getShiftsConfig } from '../shiftController.js';
import * as turf from '@turf/turf';

// Helper for distance calculation
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    return turf.distance(from, to, { units: 'meters' });
};

// Helper for normalized village matching
const normalize = (name) => (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

const isVillageMatch = (assigned, actual) => {
    if (!assigned || !actual) return false;
    const nAssigned = normalize(assigned);
    const nActual = normalize(actual);

    // Exact normalized match
    if (nAssigned === nActual) return true;

    // Substring match
    if (nAssigned.includes(nActual) || nActual.includes(nAssigned)) return true;

    // Token-based matching (handles "Gate Way" vs "Gateway" etc)
    const tokensAssigned = (assigned || '').toLowerCase().split(/[\s&/]+/).filter(t => t.length > 2);
    const tokensActual = (actual || '').toLowerCase().split(/[\s&/]+/).filter(t => t.length > 2);

    if (tokensActual.length === 0 || tokensAssigned.length === 0) return false;

    const matches = tokensActual.filter(t => tokensAssigned.some(ta => ta.includes(t) || t.includes(ta)));
    const matchRatio = matches.length / tokensActual.length;

    return matchRatio >= 0.5; // If 50% of tokens match, consider it a visit
};

/**
 * @desc    Get aggregated route performance for a date
 * @route   GET /api/admin/routes/performance
 * @access  Admin
 */
export const getRoutePerformance = async (req, res, next) => {
    try {
        const { date, storeId: queryStoreId } = req.query;
        const tenantId = req.user?.tenantId;
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');
        const dayName = format(new Date(targetDate), 'EEEE');

        console.log(`[Performance] Fetching for Date: ${targetDate}, Store: ${queryStoreId}, Tenant: ${tenantId}`);

        if (!tenantId) {
            return res.status(400).json({ message: 'Tenant ID is missing from user profile' });
        }

        const where = {
            status: true,
            tenantId
        };

        if (queryStoreId && queryStoreId !== 'null' && queryStoreId !== '') {
            where.vehicle = { storeId: queryStoreId };
        } else if (req.user?.storeId && !['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) {
            where.vehicle = { storeId: req.user.storeId };
        }

        const assignments = await prisma.routeAssignment.findMany({
            where,
            include: {
                route: true,
                user: { select: { id: true, name: true } },
                vehicle: { select: { id: true, vehicleNumber: true, storeId: true } }
            }
        });

        const performanceData = await Promise.all(assignments.map(async (assignment) => {
            try {
                // Determine villages assigned for today
                let assignedVillages = [];
                if (assignment.schedule && typeof assignment.schedule === 'object') {
                    const todaySchedule = assignment.schedule[dayName];
                    if (todaySchedule) {
                        if (todaySchedule.morning) assignedVillages.push(todaySchedule.morning);
                        if (todaySchedule.evening) assignedVillages.push(todaySchedule.evening);
                    }
                } else {
                    // Fallback to legacy cycles if schedule is missing
                    const cycle = await prisma.routeCycle.findFirst({
                        where: { routeId: assignment.routeId, dayOfWeek: dayName.toUpperCase() }
                    });
                    if (cycle) assignedVillages.push(cycle.villageName);
                }

                // Deduplicate assigned villages
                assignedVillages = [...new Set(assignedVillages.filter(v => v && v !== 'No Task'))];

                if (assignedVillages.length === 0) {
                    return {
                        assignmentId: assignment.id,
                        userId: assignment.userId,
                        agentName: assignment.user?.name || 'Unknown Agent',
                        routeName: assignment.route?.routeName || 'Unnamed Route',
                        vehicleNumber: assignment.vehicle?.vehicleNumber || 'No Vehicle',
                        completionRate: 0,
                        totalSales: 0,
                        missedVillages: [],
                        status: 'NO_PLAN'
                    };
                }

                // Fetch ALL activities and BREADCRUMBS for this user today
                const [allActivities, breadcrumbs, villageData] = await Promise.all([
                    prisma.locationCheckIn.findMany({
                        where: { userId: assignment.userId, date: targetDate }
                    }),
                    prisma.locationLog.findMany({
                        where: {
                            userId: assignment.userId,
                            timestamp: {
                                gte: startOfDay(new Date(targetDate)),
                                lte: endOfDay(new Date(targetDate))
                            }
                        }
                    }),
                    prisma.village.findMany({
                        where: { name: { in: assignedVillages }, tenantId: assignment.tenantId }
                    })
                ]);

                const visitedVillages = assignedVillages.filter(av => {
                    // 1. Manual Check-in match
                    const hasManualCheckIn = allActivities.some(act => isVillageMatch(av, act.villageName));
                    if (hasManualCheckIn) return true;

                    // 2. GPS Proximity match (Auto-detect visit)
                    const village = villageData.find(v => isVillageMatch(av, v.name));
                    if (village && village.latitude && village.longitude) {
                        return breadcrumbs.some(log => getDistance(log.lat, log.long, village.latitude, village.longitude) < 300); // 300m radius
                    }

                    return false;
                });

                // Fetch ALL orders for this user today
                const allOrders = await prisma.order.findMany({
                    where: {
                        userId: assignment.userId,
                        createdAt: {
                            gte: startOfDay(new Date(targetDate)),
                            lte: endOfDay(new Date(targetDate))
                        },
                        status: { not: 'CANCELLED' }
                    },
                    select: { id: true, totalAmount: true, villageName: true, createdAt: true }
                });

                // Fetch shifts for timing attribution
                const shifts = await getShiftsConfig(assignment.tenantId, assignment.vehicle?.storeId);

                const attributedOrders = allOrders.filter(order => {
                    const matchedVillage = assignedVillages.find(av => isVillageMatch(av, order.villageName));
                    if (!matchedVillage) return false;

                    // If village is split, attribute by time
                    const orderTime = format(new Date(order.createdAt), 'HH:mm');
                    const shift = shifts.find(s => orderTime >= s.startTime && orderTime <= s.endTime);

                    // If we found a shift, it must match the session of the row we will attribute to
                    // (This logic is slightly simplified for the summary, but critical for breakdown)
                    return true;
                });

                // Deduplicate for summary total
                const uniqueOrderIds = new Set(attributedOrders.map(o => o.id));
                const uniqueOrders = allOrders.filter(o => uniqueOrderIds.has(o.id));
                const totalSales = uniqueOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);

                const visitedCount = [...new Set(visitedVillages)].length;
                const completionRate = assignedVillages.length > 0 ? (visitedCount / assignedVillages.length) * 100 : 0;
                const missedVillages = assignedVillages.filter(av => !visitedVillages.includes(av));

                return {
                    assignmentId: assignment.id,
                    userId: assignment.userId,
                    agentName: assignment.user?.name || 'Unknown Agent',
                    routeName: assignment.route?.routeName || 'Unnamed Route',
                    vehicleNumber: assignment.vehicle?.vehicleNumber || 'No Vehicle',
                    assignedCount: assignedVillages.length,
                    visitedCount,
                    completionRate,
                    totalSales,
                    missedVillages,
                    status: completionRate === 100 ? 'COMPLETED' : (completionRate > 0 ? 'PARTIAL' : 'PENDING')
                };
            } catch (err) {
                console.error(`[Performance] Error processing assignment ${assignment.id}:`, err.message);
                return {
                    assignmentId: assignment.id,
                    userId: assignment.userId,
                    agentName: assignment.user?.name || 'Unknown Agent',
                    routeName: assignment.route?.routeName || 'Error Loading',
                    vehicleNumber: assignment.vehicle?.vehicleNumber || 'Error',
                    completionRate: 0,
                    totalSales: 0,
                    missedVillages: [],
                    status: 'ERROR'
                };
            }
        }));

        // Summary Stats
        const summary = {
            totalRoutes: performanceData.length,
            activeRoutes: performanceData.filter(p => p.status !== 'NO_PLAN' && p.status !== 'ERROR').length,
            avgCompletion: performanceData.length > 0
                ? (performanceData.reduce((acc, p) => acc + (isNaN(p.completionRate) ? 0 : Number(p.completionRate || 0)), 0) / performanceData.length)
                : 0,
            totalSales: performanceData.reduce((acc, p) => acc + Number(p.totalSales || 0), 0)
        };

        res.json({ summary, performance: performanceData });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get detailed assignment performance with village-level breakdown
 * @route   GET /api/admin/routes/performance/:assignmentId
 * @access  Admin
 */
export const getAssignmentPerformanceDetail = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const { date } = req.query;
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');
        const dayName = format(new Date(targetDate), 'EEEE');

        const assignment = await prisma.routeAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                route: true,
                user: { select: { id: true, name: true, mobile: true } },
                vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } }
            }
        });

        if (!assignment) {
            res.status(404);
            throw new Error('Assignment not found');
        }

        // Villages assigned today
        let assignedVillages = [];
        if (assignment.schedule && typeof assignment.schedule === 'object') {
            const todaySchedule = assignment.schedule[dayName];
            if (todaySchedule) {
                if (todaySchedule.morning) assignedVillages.push({ name: todaySchedule.morning, session: 'Morning' });
                if (todaySchedule.evening) assignedVillages.push({ name: todaySchedule.evening, session: 'Evening' });
            }
        }

        // Fetch ALL activities, orders, breadcrumbs, and shifts
        const [allCheckIns, allDayOrders, shifts, breadcrumbs] = await Promise.all([
            prisma.locationCheckIn.findMany({
                where: { userId: assignment.userId, date: targetDate }
            }),
            prisma.order.findMany({
                where: {
                    userId: assignment.userId,
                    createdAt: {
                        gte: startOfDay(new Date(targetDate)),
                        lte: endOfDay(new Date(targetDate))
                    },
                    status: { not: 'CANCELLED' }
                }
            }),
            getShiftsConfig(assignment.tenantId, assignment.vehicle?.storeId),
            prisma.locationLog.findMany({
                where: {
                    userId: assignment.userId,
                    timestamp: {
                        gte: startOfDay(new Date(targetDate)),
                        lte: endOfDay(new Date(targetDate))
                    }
                }
            })
        ]);

        // Breakdown per village
        const breakdown = await Promise.all(assignedVillages.map(async (v) => {
            const villageInfo = await prisma.village.findFirst({
                where: { name: v.name, tenantId: assignment.tenantId },
                select: { latitude: true, longitude: true }
            });

            // Check manual check-in
            const checkIn = allCheckIns
                .filter(ci => isVillageMatch(v.name, ci.villageName))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

            // Check GPS proximity (Auto-visited)
            const wasNear = villageInfo && villageInfo.latitude && villageInfo.longitude &&
                breadcrumbs.some(log => getDistance(log.lat, log.long, villageInfo.latitude, villageInfo.longitude) < 300);

            const isVisited = !!checkIn || wasNear;
            const visitedAt = checkIn?.time || (wasNear ? "Auto-detected" : null);

            // Attribute orders to this specific session by time
            const orders = allDayOrders.filter(o => {
                if (!isVillageMatch(v.name, o.villageName)) return false;

                const orderTime = format(new Date(o.createdAt), 'HH:mm');
                const matchedShift = shifts.find(s => orderTime >= s.startTime && (orderTime <= s.endTime || s.endTime < s.startTime));

                if (matchedShift) {
                    return matchedShift.name.toUpperCase() === v.session.toUpperCase();
                }

                // Fallback for sessions like "Morning" vs "Evening" if no exact shift found
                if (v.session.toUpperCase() === 'MORNING') return orderTime < '14:00';
                if (v.session.toUpperCase() === 'EVENING') return orderTime >= '14:00';

                return true;
            });

            const villageSales = orders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);

            return {
                villageName: v.name,
                session: v.session,
                latitude: villageInfo?.latitude || null,
                longitude: villageInfo?.longitude || null,
                visited: isVisited,
                visitedAt: visitedAt,
                isLocationMatched: checkIn?.isLocationMatched || wasNear || false,
                sales: villageSales,
                orderCount: orders.length,
                orders: orders
            };
        }));

        res.json({
            assignment,
            breakdown,
            summary: {
                totalSales: breakdown.reduce((acc, b) => acc + b.sales, 0),
                completionRate: assignedVillages.length > 0 ? (breakdown.filter(b => b.visited).length / assignedVillages.length) * 100 : 0
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get final closure summary for a route assignment
 * @route   GET /api/admin/routes/performance/:assignmentId/closure
 * @access  Admin
 */
export const getRouteClosureSummary = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const { date } = req.query;
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');

        const assignment = await prisma.routeAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                route: true,
                user: { select: { id: true, name: true } },
                vehicle: { select: { id: true, vehicleNumber: true } }
            }
        });

        if (!assignment) {
            res.status(404);
            throw new Error('Assignment not found');
        }

        // Aggregate day's metrics
        const [orders, activities, cashSummary, coverage] = await Promise.all([
            prisma.order.findMany({
                where: {
                    userId: assignment.userId,
                    createdAt: {
                        gte: new Date(targetDate + 'T00:00:00Z'),
                        lte: new Date(targetDate + 'T23:59:59Z')
                    },
                    status: { not: 'CANCELLED' }
                }
            }),
            prisma.locationCheckIn.findMany({
                where: { userId: assignment.userId, date: targetDate }
            }),
            prisma.dailyCashSummary.findUnique({
                where: { vehicleId_date: { vehicleId: assignment.vehicleId, date: targetDate } }
            }),
            prisma.dailyCoverage.findUnique({
                where: { vehicleId_date: { vehicleId: assignment.vehicleId, date: targetDate } }
            })
        ]);

        const totalSales = orders.reduce((acc, o) => acc + o.totalAmount, 0);
        const cashCollected = orders.filter(o => o.paymentMode === 'CASH').reduce((acc, o) => acc + o.totalAmount, 0);
        const upiCollected = orders.filter(o => o.paymentMode === 'UPI').reduce((acc, o) => acc + o.totalAmount, 0);

        // Map villages from route to their visit status
        const routeVillages = assignment.route?.villages || [];
        const visitedVillages = [...new Set(activities.map(a => a.villageName))];
        const missedVillages = routeVillages.filter(v => !visitedVillages.includes(v));

        res.json({
            summary: {
                agentName: assignment.user?.name,
                routeName: assignment.route?.routeName,
                vehicleNumber: assignment.vehicle?.vehicleNumber,
                date: targetDate,
                metrics: {
                    totalOrders: orders.length,
                    totalSales,
                    cashCollected,
                    upiCollected,
                    villagesAssigned: routeVillages.length,
                    villagesVisited: visitedVillages.length,
                    completionRate: routeVillages.length > 0 ? (visitedVillages.length / routeVillages.length) * 100 : 0
                },
                missedVillages,
                closureRemarks: coverage?.shiftStatus?.closureRemarks || null,
                cashStatus: cashSummary?.status || 'PENDING'
            }
        });
    } catch (error) {
        next(error);
    }
};
