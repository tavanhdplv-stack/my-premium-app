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

async function bruteForce() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let juneOrders = [];
  let juneTrans = [];
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (ymOf(d) === '2026-06' || d.includes('6/2026')) {
         juneOrders.push(o);
      }
    }
  });

  let sumTransIncome = 0;
  let sumTransExpense = 0;
  
  transSnap.forEach(doc => {
    const t = doc.data();
    const d = t.date || t.Date || '';
    if (ymOf(d) === '2026-06' || d.includes('6/2026')) {
        const amt = Number(t.amount) || Number(t.Amount) || 0;
        const type = t.type || t.Type;
        if (type === 'income' || type === 'Income') sumTransIncome += amt;
        else if (type === 'expense' || type === 'Expense') sumTransExpense += amt;
    }
  });

  const TARGET = 3256741;
  const tolerance = 5;

  let totalRevenue = 0;
  let totalCost = 0;
  let totalExpenses = 2587000;
  
  let validDaysSum = 0; // if only DD <= 12 are counted
  let depositSum = 0;
  let netProfitSum = 0;
  let totalProfitSum = 0;
  let priceSum = 0;
  let cashInSum = 0; // my definition
  
  for (const o of juneOrders) {
     const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
     const cost = (Number(o.totalCost) || Number(o.CostPrice) || 0) + (Number(o.shippingFee) || Number(o.OrderShippingFee) || 0);
     const deposit = Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
     const profit = Number(o.totalProfit) || Number(o.NetProfit) || 0;
     
     totalRevenue += price;
     totalCost += cost;
     depositSum += deposit;
     netProfitSum += profit;
     totalProfitSum += profit;
     priceSum += price;
     
     // What if we only sum NetProfit for DD <= 12?
     const rawDate = o.orderDate || o.Date || o['ວັນທີ'] || '';
     const parts = rawDate.split('/');
     if (parts.length === 3 && Number(parts[0]) <= 12) {
         validDaysSum += profit;
     }
  }

  console.log('--- Combinations ---');
  console.log('Target:', TARGET);
  console.log('validDaysSum:', validDaysSum);
  console.log('netProfitSum:', netProfitSum);
  console.log('TotalRevenue - TotalCost - Expenses:', totalRevenue - totalCost - totalExpenses);
  console.log('TotalTransIncome - TotalCost - Expenses:', sumTransIncome - totalCost - totalExpenses);
  console.log('TotalTransIncome - TotalTransExpense - TotalCost:', sumTransIncome - sumTransExpense - totalCost);
  
  // What if Net Profit is calculated as ExpectedProfit - (TotalRevenue - TransIncome)?
  const expectedProfit = totalRevenue - totalCost - totalExpenses;
  console.log('ExpectedProfit - (TotalRevenue - TransIncome):', expectedProfit - (totalRevenue - sumTransIncome));

  // What if Net Profit is Sum(NetProfit) - TransExpense?
  console.log('Sum(NetProfit) - TransExpense:', netProfitSum - sumTransExpense);

  process.exit(0);
}

bruteForce();
