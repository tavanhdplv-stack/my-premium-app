const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDateFormats() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let count06 = 0;
  let count07 = 0;
  let unknown = 0;
  let active06 = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (d.includes('/06/2026') || d.includes('2026-06')) {
        count06++;
        if (o.Status === 'ສໍາເລັດ' || o.status === 'ສໍາເລັດ') active06++;
      } else if (d.includes('/07/2026') || d.includes('2026-07')) {
        count07++;
      } else {
        unknown++;
      }
    }
  });

  console.log('Orders with June 2026:', count06);
  console.log('Orders with July 2026:', count07);
  console.log('Other dates:', unknown);
  console.log('June active (completed):', active06);
  process.exit(0);
}

checkDateFormats();
