import cron from 'node-cron';
import prisma from './prisma.js';
import { fetchPlanForVehicle } from '../controllers/routeController.js';
import { addDays } from 'date-fns';

// 8 PM Daily: Tomorrow Route Notification
export const initCronJobs = () => {
    // Schedule for 20:00 every day
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

            for (const assignment of activeAssignments) {
                // 2. Generate tomorrow plan
                const tomorrow = addDays(new Date(), 1);
                const plan = await fetchPlanForVehicle(assignment.vehicleId, tomorrow);

                if (plan && !plan.noVillage) {
                    const message = `Tomorrow Plan:
Route: ${plan.routeName}
Village: ${plan.villageName}
Morning: ${plan.morning}
Evening: ${plan.evening}`;
                    
                    // 3. Send notification (Simulation/Log for now)
                    console.log(`[Notification Sent to ${assignment.user.name} (${assignment.user.mobile})]:`);
                    console.log(message);

                    // TODO: Integrate with actual WhatsApp/SMS API or In-app notification table
                    // await notificationService.send(assignment.user.id, message);
                }
            }
        } catch (error) {
            console.error('❌ Error in Route Notification Cron Job:', error);
        }
    });

    console.log('✅ Cron Jobs Initialized');
};
