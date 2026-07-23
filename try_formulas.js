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

async function tryFormulas() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let formula1 = 0; // sum of price if status == 'Delivered', else deposit
  let formula2 = 0; // sum of price if isPaid == true, else deposit + (price-deposit) if status == 'Delivered'
  let formula3 = 0; // sum of NetProfit from orders
  let formula4 = 0; // sum of price if status != 'Cancelled' and not COD
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (ymOf(d) === '2026-06' || d.includes('6/2026')) {
        const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
        const deposit = Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
        const pm = o.paymentMethod || o.PaymentMethod || o['ຮູບແບບການຈ່າຍ'] || '';
        const status = o.status || o.Status || '';
        
        const isDelivered = status === 'ສົ່ງສຳເລັດ' || status === 'ส่งสำเร็จแล้ว' || status === 'ສໍາເລັດ' || status === 'Success';
        const isPaid = pm === 'ຈ່າຍແລ້ວ' || pm === 'โอนแล้ว' || pm === 'จ่ายแล้ว' || pm === 'Paid';
        
        formula1 += isDelivered ? price : deposit;
        formula2 += isPaid ? price : (isDelivered ? price : deposit);
        formula3 += Number(o.totalProfit) || Number(o.NetProfit) || 0;
      }
    }
  });

  console.log('Target ActualCashIn:', 17951015);
  console.log('Formula 1 (Price if delivered, else deposit):', formula1);
  console.log('Formula 2 (Price if paid/delivered, else deposit):', formula2);
  console.log('Formula 3 (Sum of NetProfit):', formula3);
  
  process.exit(0);
}

tryFormulas();
