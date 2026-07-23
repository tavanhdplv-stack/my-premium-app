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

async function checkJuneActualCashIn() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let totalDeposit = 0;
  let totalPaid = 0;
  let paidCount = 0;
  let codCount = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (ymOf(d) === '2026-06' || d.includes('6/2026')) { // handle 6/2026 too
        const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
        const deposit = Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
        
        const pm = o.paymentMethod || o.PaymentMethod || o['ຮູບແບບການຈ່າຍ'] || '';
        
        if (pm === 'ຈ່າຍແລ້ວ' || pm === 'โอนแล้ว' || pm === 'จ่ายแล้ว' || pm === 'Paid') {
          totalPaid += price;
          paidCount++;
        } else {
          totalDeposit += deposit;
          codCount++;
        }
      }
    }
  });

  console.log('Total Paid Orders Price:', totalPaid, 'Count:', paidCount);
  console.log('Total COD Deposits:', totalDeposit, 'Count:', codCount);
  console.log('Total ActualCashIn:', totalPaid + totalDeposit);
  process.exit(0);
}

checkJuneActualCashIn();
