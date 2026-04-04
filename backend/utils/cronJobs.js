import cron from 'node-cron';
import prisma from './prisma.js';
import { fetchPlanForVehicle } from '../controllers/routeController.js';
import { addDays, format } from 'date-fns';

// 8 PM Daily: Tomorrow Route Notification
export const initCronJobs = () => {
    // Schedule for 20:00 every day (IST)
    cron.schedule('0 20 * * *', async () => {
        console.log('🔔 Running Daily Route Notification Job [8:00 PM]');
        
        try {
            // 1. Fetch all active route assignments
            const activeAssignments = await prisma.routeAssignment.findMany({
                where: { status: true },
                include: {
                    user: { select: { id: true, name: true, mobile: true } },
                    vehicle: { select: { id: true, vehicleNumber: true } },
                    route: { select: { routeName: true } }
                }
            });

            let notifiedCount = 0;

            for (const assignment of activeAssignments) {
                // 2. Generate tomorrow plan
                const tomorrow = addDays(new Date(), 1);
                const plan = await fetchPlanForVehicle(assignment.vehicleId, tomorrow);
                const tomorrowDateStr = format(tomorrow, 'EEEE, MMM d');

                let title, message;

                if (plan && !plan.noVillage) {
                    title = `📅 Tomorrow's Plan — ${tomorrowDateStr}`;
                    message = `Route: ${plan.routeName}\nVillage: ${plan.villageName}\n🌅 Morning: Part A\n🌆 Evening: Part B\nVehicle: ${assignment.vehicle.vehicleNumber}`;
                } else {
                    title = `📅 No Plan for ${tomorrowDateStr}`;
                    message = `No village is scheduled for tomorrow on ${assignment.vehicle.vehicleNumber}. Rest well! 🌙`;
                }

                // 3. Persist notification in DB
                try {
                    await prisma.notification.create({
                        data: {
                            userId: assignment.user.id,
                            title,
                            message,
                            type: 'ROUTE_PLAN'
                        }
                    });
                    notifiedCount++;
                    console.log(`[Notification] → ${assignment.user.name} (${assignment.user.mobile || 'no mobile'})`);
                } catch (err) {
                    console.error(`[CRON] Failed to create notification for ${assignment.user.name}:`, err.message);
                }
            }

            console.log(`✅ [CRON] Done. Created ${notifiedCount} notifications for ${activeAssignments.length} assignments.`);
        } catch (error) {
            console.error('❌ Error in Route Notification Cron Job:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('✅ Cron Jobs Initialized (8 PM IST daily route notifications)');
};
