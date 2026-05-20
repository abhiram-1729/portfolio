import { getStockLedger } from '../controllers/admin/procurementReportController.js';
import prisma from '../utils/prisma.js';

async function test() {
  try {
    const req = {
      user: {
        tenantId: 'VK001'
      },
      query: {
        vendorId: 'cmo6k7arx001spbp78o3414l6',
        storeId: 'cmntyd6a80000ooznlwpwffm5'
      }
    };

    const res = {
      status(code) {
        console.log("Response status called with code:", code);
        return this;
      },
      json(data) {
        console.log("Response json called. Data keys:", Object.keys(data));
        if (data.error) {
          console.error("Error returned:", data.error);
        } else {
          console.log("Data sample vendorName:", data.vendor?.vendorName);
          console.log("Data movements count:", data.movements?.length);
          console.log("Data products count:", data.products?.length);
          if (data.movements && data.movements.length > 0) {
            console.log("First movement sample:", JSON.stringify(data.movements[0], null, 2));
          }
        }
        return this;
      }
    };

    await getStockLedger(req, res);
  } catch (err) {
    console.error("CRITICAL CONTROLLER ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
