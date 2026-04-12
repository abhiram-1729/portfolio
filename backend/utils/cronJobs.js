import cron from 'node-cron';
import prisma from './prisma.js';
import { fetchPlanForVehicle } from '../controllers/routeController.js';
import { addDays, format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';
import { endOfDayProcess, generateMonthlySummary } from '../services/vgeAggregationService.js';


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
                if (!assignment.user || !assignment.vehicle) {
                    console.warn(`[CRON] Skipping assignment ${assignment.id}: Missing user or vehicle.`);
                    continue;
                }

                // 2. Generate tomorrow plan
                const tomorrow = addDays(new Date(), 1);
                const plan = await fetchPlanForVehicle(assignment.vehicleId, tomorrow);
                const tomorrowDateStr = format(tomorrow, 'EEEE, MMM d');

                let title, message, priority = 'medium';

                if (plan && !plan.noVillage) {
                    title = `📅 Tomorrow's Plan — ${tomorrowDateStr}`;
                    message = `Route: ${plan.routeName}\nVillage: ${plan.villageName}\n🌅 Morning: Part A\n🌆 Evening: Part B\nVehicle: ${assignment.vehicle.vehicleNumber}`;
                } else {
                    title = `⚠️ No Route Assigned — ${tomorrowDateStr}`;
                    message = `No village is scheduled for tomorrow on vehicle ${assignment.vehicle.vehicleNumber}. Admin attention may be needed.`;
                    priority = 'high';
                    
                    // Also notify admin specifically
                    sendNotification({
                        roles: ['ADMIN'],
                        title: `No Plan Alert: ${assignment.vehicle.vehicleNumber}`,
                        message: `Vehicle ${assignment.vehicle.vehicleNumber} has no plan assigned for tomorrow (${tomorrowDateStr}).`,
                        type: 'route',
                        priority: 'high',
                        metadata: { vehicleId: assignment.vehicleId, date: tomorrowDateStr }
                    });
                }

                // 3. Send notification to user
                await sendNotification({
                    userIds: [assignment.user.id],
                    title,
                    message,
                    type: 'route',
                    priority,
                    metadata: { vehicleId: assignment.vehicleId, plan }
                });
                notifiedCount++;
            }

            console.log(`✅ [CRON] Done. Processed ${notifiedCount} route notifications.`);
        } catch (error) {
            console.error('❌ Error in Route Notification Cron Job:', error);
        }

    }, {
        timezone: 'Asia/Kolkata'
    });

    // 11:59 PM Daily: VGE End-of-Day Lock + Summary Notifications
    cron.schedule('59 23 * * *', async () => {
        console.log('🎯 Running VGE End-of-Day Process [11:59 PM IST]');
        try {
            const count = await endOfDayProcess();
            console.log(`✅ [VGE CRON] End-of-day complete. Locked ${count} performance records.`);
        } catch (error) {
            console.error('❌ Error in VGE End-of-Day Cron:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // 1st of every month at 1:00 AM: Generate Monthly Summaries
    cron.schedule('0 1 1 * *', async () => {
        console.log('📊 Running VGE Monthly Summary Generation [1st of Month, 1:00 AM IST]');
        try {
            // Generate for the previous month
            const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
            
            const count = await generateMonthlySummary(monthStr);
            console.log(`✅ [VGE CRON] Monthly summary generated for ${monthStr}: ${count} agents.`);

            // Notify admins
            sendNotification({
                roles: ['ADMIN'],
                title: '📊 Monthly VGE Report Ready',
                message: `Monthly incentive summary for ${monthStr} has been generated for ${count} agents.`,
                type: 'incentive',
                priority: 'medium',
                metadata: { month: monthStr, count }
            });
        } catch (error) {
            console.error('❌ Error in VGE Monthly Summary Cron:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('✅ Cron Jobs Initialized (Route notifications + VGE end-of-day + Monthly summary)');
};
