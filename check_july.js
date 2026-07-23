const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function calculateStats() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let totalSales = 0;
  let totalCost = 0;
  let totalExpenses = 0;
  let netProfit = 0;
  let count = 0;

  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ') {
      const dateStr = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (dateStr.includes('/07/2026') || dateStr.startsWith('2026-07')) {
        count++;
        const p = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
        const c = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0);
        const e = (Number(o.totalExpenses) || Number(o.AdditionalCost) || 0);
        totalSales += p;
        totalCost += c;
        totalExpenses += e;
        netProfit += (o.totalProfit !== undefined ? Number(o.totalProfit) : (o.NetProfit !== undefined ? Number(o.NetProfit) : (p - c - e)));
      }
    }
  });

  console.log('--- July 2026 Stats ---');
  console.log('Orders Count:', count);
  console.log('Total Sales:', totalSales);
  console.log('Total Cost:', totalCost);
  console.log('Total Expenses:', totalExpenses);
  console.log('Expected Profit (computed):', totalSales - totalCost - totalExpenses);
  console.log('Net Profit (from doc):', netProfit);

  process.exit(0);
}

calculateStats();
