
import prisma from '../utils/prisma.js';
import { tenantContext } from '../utils/tenantContext.js';

async function testDelete(id, tenantId) {
  await tenantContext.run({ tenantId }, async () => {
    try {
      console.log(`Checking user ${id} in tenant ${tenantId}...`);
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        console.log('User not found.');
        return;
      }

      console.log('User found:', user.name);
      
      console.log('Starting Purge...');
      await prisma.$transaction(async (tx) => {
          // 0. Unlink from restrictive parent-like relations
          await tx.store.updateMany({
            where: { creatorId: id },
            data: { creatorId: null }
          });

          // 1. Inventory & Refill Cleanup
          const userCarts = await tx.cart.findMany({ where: { userId: id }, select: { id: true } });
          if (userCarts.length > 0) {
            await tx.cartItem.deleteMany({ where: { cartId: { in: userCarts.map(c => c.id) } } });
          }
          await tx.cart.deleteMany({ where: { userId: id } });
          
          await tx.refillItem.deleteMany({ where: { refillRequest: { userId: id } } });
          await tx.refillRequest.deleteMany({ where: { userId: id } });
          await tx.refillRequest.updateMany({ where: { approvedById: id }, data: { approvedById: null } });

          // 2. Financial & Sales Purge
          await tx.orderReturn.deleteMany({ where: { OR: [{ order: { userId: id } }, { returnedById: id }] } });
          await tx.orderItem.deleteMany({ where: { order: { userId: id } } });
          await tx.payment.deleteMany({ where: { order: { userId: id } } });
          await tx.order.deleteMany({ where: { userId: id } });
          
          await tx.openingCash.deleteMany({ where: { userId: id } });
          await tx.closingCash.deleteMany({ where: { userId: id } });
          await tx.cashTransfer.deleteMany({ where: { userId: id } });
          await tx.dailyCashSummary.deleteMany({ where: { userId: id } });
          await tx.bankDeposit.deleteMany({ where: { adminId: id } });
          await tx.safeTransaction.deleteMany({ where: { userId: id } });
          await tx.storeDeposit.deleteMany({ where: { userId: id } });

          // 3. Operational Logs & Performance
          await tx.shiftLog.deleteMany({ where: { userId: id } });
          await tx.attendance.deleteMany({ where: { userId: id } });
          await tx.vgeDailyPerformance.deleteMany({ where: { userId: id } });
          await tx.vgeMonthlySummary.deleteMany({ where: { userId: id } });
          await tx.routeAssignment.deleteMany({ where: { userId: id } });
          await tx.locationCheckIn.deleteMany({ where: { userId: id } });
          await tx.villageActivity.deleteMany({ where: { userId: id } });
          await tx.locationLog.deleteMany({ where: { userId: id } });
          await tx.stockTransaction.deleteMany({ where: { userId: id } });

          // 4. Damage & Deductions
          await tx.damageDeduction.deleteMany({ where: { OR: [{ userId: id }, { appliedById: id }] } });
          await tx.damageEntry.deleteMany({ where: { OR: [{ reportedById: id }, { reviewedById: id }] } });

          // 5. Notifications & HR
          await tx.notification.deleteMany({ where: { userId: id } });
          await tx.lateEntry.deleteMany({ where: { userId: id } });
          await tx.lateEntryException.deleteMany({ where: { OR: [{ userId: id }, { approvedById: id }] } });
          await tx.leaveBalance.deleteMany({ where: { userId: id } });

          // 6. Assets Management
          await tx.assetAssignment.deleteMany({ where: { userId: id } });
          await tx.assetIssue.deleteMany({ where: { userId: id } });
          await tx.assetRequest.deleteMany({ where: { userId: id } });

          // 7. Store Operational State
          await tx.storeCashRegister.updateMany({ where: { openedById: id }, data: { openedById: null } });
          await tx.storeCashRegister.updateMany({ where: { closedById: id }, data: { closedById: null } });

          // 8. Detailed Operational Logs
          await tx.stockAudit.deleteMany({ where: { userId: id } });
          await tx.expense.deleteMany({ where: { userId: id } });
          await tx.activityLog.deleteMany({ where: { OR: [{ userId: id }, { targetUserId: id }] } });

          // 9. Final Purge
          await tx.user.delete({ where: { id } });
      }, { timeout: 30000 });
      
      console.log('Deletion successful!');
    } catch (err) {
      console.error('DELETION FAILED with error:');
      console.error(err.message);
      if (err.code) console.error('Error Code:', err.code);
      if (err.meta) console.error('Meta:', JSON.stringify(err.meta, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });
}

const userId = 'cmouyoz9f0002vgznazzl975e';
const tenantId = 'VK001';
testDelete(userId, tenantId);
