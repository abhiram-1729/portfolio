import axios from 'axios';

async function run() {
  try {
    const res = await axios.put('http://localhost:5001/api/procurement/purchases/cmol8mu9x007nndzn8ch1lqi3', {
      invoiceNumber: "INV-TEST",
      items: [{ productId: "some_id", quantity: 1, price: 10 }]
    }, {
      headers: { Authorization: "Bearer " + "dummy" } // I need a valid token to bypass protect.
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
