import { getMyPerformance } from './controllers/vgeController.js';
import { tenantContext } from './utils/tenantContext.js';

async function test() {
  const req = {
    user: { id: 'cmnvvajq60000ndznr7mfsuts', tenantId: 'VK001', storeId: null },
    query: { date: '2026-04-13' }
  };
  
  const res = {
    json: (data) => console.log('SUCCESS:', data),
    status: (code) => ({
      json: (data) => console.log(`ERROR ${code}:`, data)
    })
  };

  try {
    await tenantContext.run({ tenantId: 'VK001', storeId: null }, async () => {
      await getMyPerformance(req, res);
    });
  } catch (err) {
    console.error('CRASH:', err.stack);
  }
}

test();
