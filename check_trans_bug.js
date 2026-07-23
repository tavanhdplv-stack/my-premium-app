const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTransBug() {
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let validIncome = 0;
  
  transSnap.forEach(doc => {
    const t = doc.data();
    const type = t.type || t.Type;
    if (type === 'income' || type === 'Income') {
        const rawDate = t.date || t.Date || '';
        const parts = rawDate.split('/');
        if (parts.length === 3 && parts[1] === '06' && parts[2] === '2026') {
             if (Number(parts[0]) <= 12) {
                 validIncome += Number(t.amount) || Number(t.Amount) || 0;
             }
        } else if (rawDate.includes('2026-06') || rawDate.includes('6/2026')) {
             validIncome += Number(t.amount) || Number(t.Amount) || 0;
        }
    }
  });

  console.log('Total Income Transactions for DD<=12:', validIncome);
  process.exit(0);
}

checkTransBug();
