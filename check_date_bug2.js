const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDateBug2() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let countStarts06 = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const d = o.orderDate || o.Date || o['ວັນທີ'] || '';
      if (d.startsWith('06/') || d.startsWith('6/')) {
        countStarts06++;
      }
    }
  });

  console.log('Orders starting with 06/ (which JS MM/DD/YYYY parses as June):', countStarts06);
  process.exit(0);
}

checkDateBug2();
