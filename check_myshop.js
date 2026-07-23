const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDBBS8AECCmM8PN-yGM61vD0RqyD4DKgMc",
  authDomain: "myshop-preorder.firebaseapp.com",
  projectId: "myshop-preorder",
  storageBucket: "myshop-preorder.firebasestorage.app",
  messagingSenderId: "868176648423",
  appId: "1:868176648423:web:694b04f79dc06dd7636a42",
  measurementId: "G-DGFG82EPX9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  console.log('--- myshop-preorder data ---');
  console.log('Orders count:', ordersSnap.size);
  console.log('Transactions count:', transSnap.size);
  
  if (ordersSnap.size > 0) {
      console.log('Sample order:', ordersSnap.docs[0].data());
  }
  
  process.exit(0);
}

checkData();
