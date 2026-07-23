const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCreatedAtClient() {
  const ordersSnap = await getDocs(collection(db, 'orders'));
  
  let count = 0;
  let depositSum = 0;
  
  ordersSnap.forEach(doc => {
    const o = doc.data();
    if (o.status !== 'ຍົກເລີກອໍເດີ' && o.Status !== 'ຍົກເລີກອໍເດີ') {
       if (o.createdAtClient) {
           const d = new Date(o.createdAtClient);
           if (d.getFullYear() === 2026 && d.getMonth() === 5) { // June 2026
               count++;
               depositSum += Number(o.deposit) || Number(o.DepositAmount) || Number(o['ຍອດມັດຈຳ']) || 0;
           }
       }
    }
  });

  console.log('Orders with createdAtClient in June 2026:', count);
  console.log('Deposit sum for these orders:', depositSum);
  process.exit(0);
}

checkCreatedAtClient();
