import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/api/cash/store-register/deposit/dummyid123',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('RESPONSE:', data));
});

req.on('error', e => console.error('ERROR:', e));
req.write(JSON.stringify({ amount: 100, denominations: {}, description: "Test" }));
req.end();
