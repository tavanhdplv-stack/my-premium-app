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

async function inspectPaymentMethods() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  const methods = {};
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ') {
      const dateStr = o.orderDate || o.Date || o['ວັນທີ'] || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString() : '');
      if (ymOf(dateStr) === '2026-06') {
        const pm = o.paymentMethod || o.PaymentMethod || o['ຮູບແບບການຈ່າຍ'] || 'UNKNOWN';
        if (!methods[pm]) methods[pm] = 0;
        methods[pm]++;
      }
    }
  });

  console.log('Payment Methods for June 2026:', methods);
  process.exit(0);
}

inspectPaymentMethods();
