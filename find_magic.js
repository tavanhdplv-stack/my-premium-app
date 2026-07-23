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

async function findMagicNumber() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  const fields = {};
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (ymOf(d) === '2026-06' || d.includes('6/2026')) {
         for (const key in o) {
             const val = Number(o[key]);
             if (!isNaN(val) && val > 0) {
                 if (!fields[key]) fields[key] = 0;
                 fields[key] += val;
             }
         }
      }
    }
  });
  
  transSnap.forEach(doc => {
    const t = doc.data();
    const d = t.date || t.Date || '';
    if (ymOf(d) === '2026-06' || d.includes('6/2026')) {
         const amt = Number(t.amount) || Number(t.Amount);
         const type = t.type || t.Type || 'Unknown';
         const key = 'Trans_' + type;
         if (!isNaN(amt) && amt > 0) {
             if (!fields[key]) fields[key] = 0;
             fields[key] += amt;
         }
    }
  });

  console.log('Target Magic Number: 4888113');
  for (const k in fields) {
     console.log(k, '->', fields[k]);
  }
  
  process.exit(0);
}

findMagicNumber();
