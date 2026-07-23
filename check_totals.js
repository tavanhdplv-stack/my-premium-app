const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function calculateStats() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let totalSales = 0;
  ordersSnap.forEach(doc => {
    const data = doc.data();
    if (data.status !== 'ຍົກເລີກອໍເດີ') {
      totalSales += data.price || 0;
    }
  });

  let bal = 0;
  let inAmount = 0;
  let outAmount = 0;
  transSnap.forEach(doc => {
    const t = doc.data();
    if (t.type === 'income') {
      bal += t.amount;
      inAmount += t.amount;
    } else {
      bal -= t.amount;
      outAmount += t.amount;
    }
  });
  
  console.log('Total Sales:', totalSales);
  console.log('Wallet Transactions Balance:', bal);
  console.log('Total transactions:', transSnap.size);
  process.exit(0);
}

calculateStats();
