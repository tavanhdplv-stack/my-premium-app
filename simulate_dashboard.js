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

async function simulateDashboard() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let orders = [];
  ordersSnap.forEach(doc => orders.push(doc.data()));
  
  let walletTransactions = [];
  transSnap.forEach(doc => walletTransactions.push(doc.data()));
  
  const monthFilter = '2026-06';
  
  const periodOrders = orders.filter((o) => ymOf(o.orderDate || o.Date || o['ວັນທີ'] || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString() : '')) === monthFilter);
  const activeOrders = periodOrders.filter((o) => o.status !== 'ຍົກເລີກອໍເດີ');
  
  let revenue = 0, cost = 0, expenses = 0, actualCashIn = 0;
  
  activeOrders.forEach((o) => {
      const price = o.price || o.totalSales || o.SellingPrice || 0;
      const orderCost = (o.totalCost || o.CostPrice || 0) + (o.shippingFee || o.OrderShippingFee || 0);
      const orderExp = o.totalExpenses || o.AdditionalCost || 0;
      revenue += price;
      cost += orderCost;
      expenses += orderExp;
      if (o.paymentMethod === 'ຈ່າຍແລ້ວ' || o.PaymentMethod === 'ຈ່າຍແລ້ວ') actualCashIn += price;
      else if ((o.deposit || o.DepositAmount || o['ຍອດມັດຈຳ'] || 0) > 0) actualCashIn += o.deposit || o.DepositAmount || o['ຍອດມັດຈຳ'] || 0;
  });

  walletTransactions.forEach(t => {
      const isWithdrawal = t.type === 'profit_split' || t.note?.includes('[ປັນຜົນຮຸ້ນສ່ວນ') || t.note?.includes('ຖອນ') || t.Note?.includes('ຖອນ');
      if ((t.type === 'expense' || t.Type === 'Expense') && !t.note?.startsWith('Order #') && !isWithdrawal) {
        if (!monthFilter || ymOf(t.date || t.Date) === monthFilter) {
          expenses += Number(t.amount) || Number(t.Amount) || 0;
        }
      }
  });

  const expectedProfit = revenue - cost - expenses;
  const netProfit = actualCashIn - cost - expenses;

  console.log('--- OrderDashboard.tsx Output for 2026-06 ---');
  console.log('Orders Count:', activeOrders.length);
  console.log('Revenue:', revenue);
  console.log('Cost:', cost);
  console.log('Expenses:', expenses);
  console.log('Expected Profit:', expectedProfit);
  console.log('Net Profit:', netProfit);

  process.exit(0);
}

simulateDashboard();
