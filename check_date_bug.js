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

async function checkDateBug() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let validDays = 0;
  let invalidDays = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = parseOrderDate(o.orderDate || o.Date || o['ວັນທີ'] || '');
      if (d && d.month === 6 && d.year === 2026) {
        if (d.day <= 12) {
           validDays++;
        } else {
           invalidDays++;
        }
      }
    }
  });

  console.log('June orders with DD <= 12 (parsed correctly by JS MM/DD/YYYY):', validDays);
  console.log('June orders with DD > 12 (Invalid Date in JS):', invalidDays);
  console.log('Total June orders:', validDays + invalidDays);
  process.exit(0);
}

checkDateBug();
