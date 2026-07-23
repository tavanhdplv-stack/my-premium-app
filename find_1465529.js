const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function find1465529() {
  const transSnap = await getDocs(collection(db, 'transactions'));
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  transSnap.forEach(doc => {
     const t = doc.data();
     if (Number(t.amount) === 1465529 || Number(t.Amount) === 1465529) {
         console.log('Found transaction:', doc.id, t);
     }
  });

  ordersSnap.forEach(doc => {
     const o = doc.data();
     if (Number(o.price) === 1465529 || Number(o.deposit) === 1465529 || Number(o.SellingPrice) === 1465529 || Number(o.DepositAmount) === 1465529) {
         console.log('Found order:', doc.id, o);
     }
  });

  process.exit(0);
}

find1465529();
