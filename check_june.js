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
  if (/^\d{4}-\d{2}/.test(str)) {
    const [yearStr, monthStr, dayStr] = str.substring(0, 10).split('-');
    const year = Number(yearStr), month = Number(monthStr), day = Number(dayStr);
    if (!year || !month) return null;
    return { day, month, year };
  }
  const p = str.split('/');
  if (p.length !== 3) return null;
  const day = Number(p[0]), month = Number(p[1]), year = Number(p[2]);
  if (!day || !month || !year) return null;
  return { day, month, year };
}

function ymOf(str) {
  const d = parseOrderDate(str);
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}`;
}

async function checkJune() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let revenue = 0, cost = 0, expenses = 0, actualCashIn = 0;
  let count = 0;

  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ') {
      const dateStr = o.orderDate || o.Date || o['ວັນທີ'] || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString() : '');
      if (ymOf(dateStr) === '2026-06') {
        count++;
        const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
        const orderCost = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0);
        const orderExp = Number(o.totalExpenses) || Number(o.AdditionalCost) || 0;
        
        revenue += price;
        cost += orderCost;
        expenses += orderExp;

        const isPaid = o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ';
        if (isPaid) {
          actualCashIn += price;
        } else {
          const deposit = Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
          if (deposit > 0) actualCashIn += deposit;
        }
      }
    }
  });

  transSnap.forEach(doc => {
    const t = doc.data();
    const isWithdrawal = t.type === 'profit_split' || t.note?.includes('[ປັນຜົນຮຸ້ນສ່ວນ') || t.note?.includes('ຖອນ') || t.Note?.includes('ຖອນ');
    if ((t.type === 'expense' || t.Type === 'Expense') && !t.note?.startsWith('Order #') && !isWithdrawal) {
      if (ymOf(t.date || t.Date) === '2026-06') {
        expenses += Number(t.amount) || Number(t.Amount) || 0;
      }
    }
  });

  const expectedProfit = revenue - cost - expenses;
  const netProfit = actualCashIn - cost - expenses;

  console.log('--- June 2026 Stats ---');
  console.log('Orders Count:', count);
  console.log('Total Revenue:', revenue);
  console.log('Total Cost:', cost);
  console.log('Total Expenses:', expenses);
  console.log('Expected Profit:', expectedProfit);
  console.log('Net Profit (actualCashIn - cost - expenses):', netProfit);

  process.exit(0);
}

checkJune();
