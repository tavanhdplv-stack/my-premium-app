const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function parseOrderDate(str) {
  if (!str) return null;
  const p = str.split('/');
  if (p.length === 3) return { month: Number(p[1]), year: Number(p[2]) };
  if (str.includes('-')) {
     const p = str.split('-');
     return { year: Number(p[0]), month: Number(p[1]) };
  }
  return null;
}

async function checkHypothesis() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let expenses = 0;
  transSnap.forEach(doc => {
    const t = doc.data();
    const isWithdrawal = t.type === 'profit_split' || t.note?.includes('[ປັນຜົນຮຸ້ນສ່ວນ') || t.note?.includes('ຖອນ') || t.Note?.includes('ຖອນ');
    if ((t.type === 'expense' || t.Type === 'Expense') && !t.note?.startsWith('Order #') && !isWithdrawal) {
       const d = parseOrderDate(t.date || t.Date || '');
       if (d && d.month === 6 && d.year === 2026) {
           expenses += Number(t.amount) || Number(t.Amount) || 0;
       }
    }
  });

  let actualCashIn = 0;
  let cost = 0;
  let revenue = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = parseOrderDate(o.orderDate || o.Date || o['ວັນທີ'] || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString() : ''));
      if (d && d.month === 6 && d.year === 2026) {
         const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
         const orderCost = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0);
         const pm = o.paymentMethod || o.PaymentMethod || o['ຮູບແບບການຈ່າຍ'] || '';
         const status = o.status || o.Status || '';
         
         revenue += price;
         cost += orderCost;
         
         if (pm === 'ຈ່າຍແລ້ວ' || pm === 'โอนแล้ว' || pm === 'จ่ายแล้ว' || pm === 'Paid') {
           actualCashIn += price;
         } else {
           // COD
           if (status === 'ສົ່ງສຳເລັດ' || status === 'ส่งสำเร็จแล้ว' || status === 'ສໍາເລັດ' || status === 'Success') {
              actualCashIn += price; // full price collected
           } else {
              actualCashIn += Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
           }
         }
      }
    }
  });
  
  console.log('--- Hypothesis Check (June 2026) ---');
  console.log('Revenue:', revenue);
  console.log('Cost:', cost);
  console.log('Expenses:', expenses);
  console.log('Expected Profit:', revenue - cost - expenses);
  console.log('Actual Cash In:', actualCashIn);
  console.log('Net Profit (Cash In - Cost - Expenses):', actualCashIn - cost - expenses);
  process.exit(0);
}

checkHypothesis();
