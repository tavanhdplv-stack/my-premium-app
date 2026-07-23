const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  console.log('--- Orders Collection ---');
  const oSnap = await getDocs(query(collection(db, 'orders'), limit(1)));
  oSnap.forEach(doc => console.log('Order:', doc.id, doc.data()));

  console.log('--- Preorders Collection ---');
  const pSnap = await getDocs(query(collection(db, 'preorders'), limit(1)));
  pSnap.forEach(doc => console.log('Preorder:', doc.id, doc.data()));

  console.log('--- Transactions Collection ---');
  const tSnap = await getDocs(query(collection(db, 'transactions'), limit(1)));
  tSnap.forEach(doc => console.log('Transaction:', doc.id, doc.data()));

  process.exit(0);
}

inspect();
