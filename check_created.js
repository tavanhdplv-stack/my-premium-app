const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCreatedAt() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let created06 = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
      const c = o.createdAt;
      if (c && c.seconds) {
        const cd = new Date(c.seconds * 1000);
        if (cd.getFullYear() === 2026 && cd.getMonth() === 5) { // 0-indexed month, so 5 = June
          created06++;
        }
      } else if (c && typeof c === 'string') {
        if (c.includes('-06-') || c.includes('/06/')) {
          created06++;
        }
      }
    }
  });

  console.log('Orders created in June 2026:', created06);
  process.exit(0);
}

checkCreatedAt();
