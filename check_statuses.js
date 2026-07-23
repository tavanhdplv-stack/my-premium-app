const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkStatuses() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const statuses = {};
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    const st = o.status || o.Status || 'UNKNOWN';
    if (!statuses[st]) statuses[st] = 0;
    statuses[st]++;
  });

  console.log('Statuses in DB:', statuses);
  process.exit(0);
}

checkStatuses();
