const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findMatch() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  const groups = {};
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'Cancel') {
      const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
      const cost = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0);
      
      const rawDate = o.orderDate || o.Date || o['ວັນທີ'] || '';
      // Group by raw date substring, maybe split by month?
      // Let's just group by the MM/YYYY part.
      let mmyyyy = 'unknown';
      if (rawDate.includes('/')) {
         const parts = rawDate.split('/');
         if (parts.length === 3) {
            mmyyyy = parts[1] + '/' + parts[2];
         }
      }
      
      if (!groups[mmyyyy]) groups[mmyyyy] = { count: 0, revenue: 0, cost: 0 };
      groups[mmyyyy].count++;
      groups[mmyyyy].revenue += price;
      groups[mmyyyy].cost += cost;
    }
  });

  console.log('Groups by MM/YYYY:');
  for (const k in groups) {
     console.log(k, '->', groups[k]);
  }
  
  process.exit(0);
}

findMatch();
