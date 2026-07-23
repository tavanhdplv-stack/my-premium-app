const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
  storageBucket: "preorderapp-5f24f.firebasestorage.app",
  messagingSenderId: "1039947560682",
  appId: "1:1039947560682:web:165cb159219c3e7cd68993",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

async function check() {
  console.log('Checking Firestore...');
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    console.log('Firestore - Orders count:', ordersSnap.size);
    const walletsSnap = await getDocs(collection(db, 'wallets'));
    console.log('Firestore - Wallets count:', walletsSnap.size);
  } catch (err) {
    console.error('Firestore Error:', err.message);
  }

  console.log('Checking Realtime Database...');
  try {
    const snapshot = await get(ref(rtdb, '/'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('RTDB Keys:', Object.keys(data));
    } else {
      console.log('RTDB is empty');
    }
  } catch (err) {
    console.error('RTDB Error:', err.message);
  }
  
  process.exit(0);
}

check();
