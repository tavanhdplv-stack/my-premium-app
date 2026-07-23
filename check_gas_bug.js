const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkGASBug() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let expenses = 0;
  
  transSnap.forEach(doc => {
    const t = doc.data();
    const isWithdrawal = t.type === 'profit_split' || t.note?.includes('[ປັນຜົນຮຸ້ນສ່ວນ') || t.note?.includes('ຖອນ') || t.Note?.includes('ຖອນ');
    if ((t.type === 'expense' || t.Type === 'Expense') && !t.note?.startsWith('Order #') && !isWithdrawal) {
       // if date matches 2026-06 exactly like GAS does
       const d = t.date || t.Date || '';
       if (d.includes('/06/2026') || d.includes('2026-06') || d.includes('6/2026')) {
           expenses += Number(t.amount) || Number(t.Amount) || 0;
       }
    }
  });

  let actualCashIn = 0;
  let cost = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const rawDate = o.orderDate || o.Date || o['ວັນທີ'] || '';
      const parts = rawDate.split('/');
      let isJune = false;
      let isValidInJS = false;
      
      if (parts.length === 3) {
         if (parts[1] === '06' && parts[2] === '2026') isJune = true;
         // If GAS app parses it as JS Date: new Date('25/06/2026') -> Invalid Date
         // It only parses correctly if DD <= 12
         if (Number(parts[0]) <= 12) isValidInJS = true;
      } else if (rawDate.includes('2026-06')) {
         isJune = true;
         isValidInJS = true;
      }
      
      if (isJune && isValidInJS) {
         const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
         const orderCost = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0);
         const pm = o.paymentMethod || o.PaymentMethod || o['ຮູບແບບການຈ່າຍ'] || '';
         
         cost += orderCost;
         
         if (pm === 'ຈ່າຍແລ້ວ' || pm === 'โอนแล้ว' || pm === 'จ่ายแล้ว' || pm === 'Paid') {
           actualCashIn += price;
         } else {
           actualCashIn += Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
         }
      }
    }
  });
  
  console.log('Net Profit for ONLY valid JS date orders:', actualCashIn - cost - expenses);
  process.exit(0);
}

checkGASBug();
