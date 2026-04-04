import cron from 'node-cron';
import { fetchPlanForVehicle, getAllActiveAssignments } from '../controllers/routeController.js';
import { addDays } from 'date-fns';

// Nightly notification payload builder
const buildTomorrowMessage = (assignment, plan) => {
    const routeName = assignment.route?.routeName || 'Your Route';
    const vehicle = assignment.vehicle?.vehicleNumber || 'Your Vehicle';
    const agent = assignment.user?.name || 'Agent';

    if (!plan || plan.message) {
        return `Hi ${agent}, no plan scheduled for tomorrow on ${vehicle}. Rest well! 🌙`;
    }

    return (
        `📅 Tomorrow's Plan\n` +
        `Route: ${routeName}\n` +
        `Vehicle: ${vehicle}\n` +
        `Village: ${plan.villageName}\n` +
        `🌅 Morning: Part A\n` +
        `🌆 Evening: Part B\n\n` +
        `Have a great day! — VillagKart`
    );
};

// Log notifications to console (replace with WhatsApp/SMS integration later)
const sendNotification = async (assignment, plan) => {
    const message = buildTomorrowMessage(assignment, plan);
    console.log(`[NOTIFICATION] → ${assignment.user?.name} (${assignment.user?.mobile || 'no mobile'})`);
    console.log(message);
    console.log('---');

    // TODO: Uncomment and configure when WhatsApp API is ready
    // await sendWhatsApp(assignment.user.mobile, message);
};

// Main scheduler: runs every day at 8:00 PM IST (UTC 14:30)
export const startNotificationScheduler = () => {
    // Cron: "30 14 * * *" = 14:30 UTC = 20:00 IST
    cron.schedule('30 14 * * *', async () => {
        console.log('[CRON] 8 PM: Generating tomorrow\'s route plans...');
        try {
            const assignments = await getAllActiveAssignments();
            const tomorrow = addDays(new Date(), 1);

            for (const assignment of assignments) {
                try {
                    const plan = await fetchPlanForVehicle(assignment.vehicle.id, tomorrow);
                    await sendNotification(assignment, plan);
                } catch (err) {
                    console.error(`[CRON] Failed for vehicle ${assignment.vehicle?.vehicleNumber}:`, err.message);
                }
            }

            console.log(`[CRON] Done. Notified ${assignments.length} active routes.`);
        } catch (err) {
            console.error('[CRON] Nightly scheduler crashed:', err);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('[CRON] Nightly route notification scheduler started (8 PM IST daily)');
};
