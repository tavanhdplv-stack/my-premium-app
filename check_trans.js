const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTrans() {
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  let totalExpenses = 0;
  
  transSnap.forEach(doc => {
    const t = doc.data();
    if (t.type === 'expense' || t.Type === 'Expense') {
      const d = t.date || t.Date || '';
      if (d.includes('/07/2026') || d.includes('2026-07')) {
        totalExpenses += Number(t.amount) || Number(t.Amount) || 0;
      }
    }
  });

  console.log('Total Expenses for July 2026:', totalExpenses);
  process.exit(0);
}

checkTrans();
