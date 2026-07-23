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

async function checkDeliveredCOD() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let deliveredBalance = 0;
  let undeliveredBalance = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'Cancel') {
      const rawDate = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (ymOf(rawDate) === '2026-06') {
        const pm = o.paymentMethod || o.PaymentMethod || o['ຮູບແບບການຈ່າຍ'] || 'UNKNOWN';
        if (pm.includes('COD') || pm.includes('ປາຍທາງ')) {
          const price = Number(o.price) || Number(o.totalSales) || Number(o.SellingPrice) || 0;
          const deposit = Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
          const balance = price - deposit;
          
          if (o.status === 'ສົ່ງສຳເລັດ' || o.status === 'ส่งสำเร็จแล้ว' || o.Status === 'ສໍາເລັດ' || o.Status === 'Success') {
            deliveredBalance += balance;
          } else {
            undeliveredBalance += balance;
          }
        }
      }
    }
  });

  console.log('Delivered COD Balance for June 2026:', deliveredBalance);
  console.log('Undelivered COD Balance for June 2026:', undeliveredBalance);
  process.exit(0);
}

checkDeliveredCOD();
