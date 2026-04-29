import prisma from '../utils/prisma.js';
import { startOfMonth, subMonths, format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';

/**
 * Script to send monthly late entry summaries to all employees.
 * Can be run via cron: node scripts/sendMonthlySummaries.js
 */
const sendMonthlySummaries = async () => {
  try {
    const lastMonth = subMonths(new Date(), 1);
    const monthStr = format(lastMonth, 'yyyy-MM');
    const monthName = format(lastMonth, 'MMMM yyyy');

    console.log(`Generating monthly summaries for ${monthName}...`);

    // 1. Get all users with late entries in the last month
    const lateEntries = await prisma.lateEntry.findMany({
      where: {
        date: { startsWith: monthStr }
      },
      include: { user: true }
    });

    const userMap = {};
    lateEntries.forEach(entry => {
      if (!userMap[entry.userId]) {
        userMap[entry.userId] = {
          user: entry.user,
          count: 0,
          totalPenalty: 0
        };
      }
      if (!entry.isWaived) {
        userMap[entry.userId].count++;
        userMap[entry.userId].totalPenalty += entry.penaltyValue;
      }
    });

    // 2. Send notifications
    for (const userId in userMap) {
      const data = userMap[userId];
      await sendNotification({
        userIds: [userId],
        title: `Monthly Attendance Summary: ${monthName}`,
        message: `You had ${data.count} late entries in ${monthName}. Total penalty applied: ${data.totalPenalty} days.`,
        type: 'info',
        priority: 'medium'
      });
      console.log(`Sent summary to ${data.user.name}`);
    }

    console.log('Monthly summary distribution complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error sending monthly summaries:', error);
    process.exit(1);
  }
};

sendMonthlySummaries();
