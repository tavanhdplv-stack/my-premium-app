const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDBBS8AECCmM8PN-yGM61vD0RqyD4DKgMc",
  authDomain: "myshop-preorder.firebaseapp.com",
  projectId: "myshop-preorder",
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
  transSnap.forEach(doc => {
    const t = doc.data();
    if (t.type === 'income') {
      bal += t.amount;
    } else {
      bal -= t.amount;
    }
  });
  
  console.log('--- myshop-preorder ---');
  console.log('Orders Count:', ordersSnap.size);
  console.log('Total Sales:', totalSales);
  console.log('Wallet Transactions Balance:', bal);
  console.log('Total transactions:', transSnap.size);
  process.exit(0);
}

calculateStats();
