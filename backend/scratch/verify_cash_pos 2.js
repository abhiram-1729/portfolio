import { getAdminCashSummary } from '../controllers/cashController.js';
import prisma from '../utils/prisma.js';

async function test() {
  console.log("=== RUNNING CASH POS VERIFICATION TEST ===");
  try {
    const req = {
      user: {
        tenantId: 'VK001',
        role: 'SUPER_ADMIN',
        portalType: 'ADMIN'
      },
      query: {
        storeId: 'cmntyd6a80000ooznlwpwffm5',
        date: new Date().toISOString().split('T')[0] // today's date
      }
    };

    let statusCalledWith = null;
    let jsonResult = null;

    const res = {
      status(code) {
        statusCalledWith = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      }
    };

    const next = (err) => {
      if (err) {
        console.error("Express next() called with error:", err);
      }
    };

    await getAdminCashSummary(req, res, next);

    if (jsonResult) {
      console.log(`Successfully fetched summaries. Total records count: ${jsonResult.length}`);
      const storePosRecord = jsonResult.find(r => r.id === 'STORE_POS');
      if (storePosRecord) {
        console.log("Found STORE_POS virtual record!");
        console.log("STORE_POS vehicle payload:", JSON.stringify(storePosRecord.vehicle, null, 2));
        if (storePosRecord.vehicle.storeId === 'cmntyd6a80000ooznlwpwffm5') {
          console.log("✅ SUCCESS: STORE_POS virtual vehicle has the correct storeId!");
        } else {
          console.error("❌ FAILURE: STORE_POS virtual vehicle has INCORRECT storeId:", storePosRecord.vehicle.storeId);
        }
      } else {
        console.log("ℹ️ No STORE_POS record found for today's date. This is expected if there are no direct store orders or store expenses for today's date yet.");
        
        // Let's verify by finding any date that has null vehicleId orders
        const testOrder = await prisma.order.findFirst({
          where: {
            tenantId: 'VK001',
            vehicleId: null,
            status: { in: ['COMPLETED', 'PAID'] }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (testOrder) {
          const testDateString = new Date(testOrder.createdAt).toISOString().split('T')[0];
          console.log(`Found a test direct POS order from date: ${testDateString}. Retrying test for this date...`);
          req.query.date = testDateString;
          req.query.storeId = testOrder.storeId;
          
          await getAdminCashSummary(req, res, next);
          
          const storePosRecordForDate = jsonResult.find(r => r.id === 'STORE_POS');
          if (storePosRecordForDate) {
            console.log("Found STORE_POS virtual record for date:", testDateString);
            console.log("STORE_POS vehicle payload:", JSON.stringify(storePosRecordForDate.vehicle, null, 2));
            if (storePosRecordForDate.vehicle.storeId === testOrder.storeId) {
              console.log("✅ SUCCESS: STORE_POS virtual vehicle has the correct storeId!");
            } else {
              console.error("❌ FAILURE: STORE_POS virtual vehicle has INCORRECT storeId:", storePosRecordForDate.vehicle.storeId);
            }
          } else {
            console.error("❌ FAILURE: Could not construct STORE_POS even with existing direct POS orders on date:", testDateString);
          }
        } else {
          console.log("ℹ️ No direct POS orders exist in the entire database to perform dynamic retro-active testing.");
        }
      }
    } else {
      console.error("❌ FAILURE: No JSON response returned from getAdminCashSummary!");
    }
  } catch (error) {
    console.error("CRITICAL TEST ERROR:", error);
  } finally {
    await prisma.$disconnect();
    console.log("=== CASH POS VERIFICATION TEST COMPLETE ===");
  }
}

test();
