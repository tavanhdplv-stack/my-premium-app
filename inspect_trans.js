const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectTrans() {
  const transSnap = await getDocs(collection(db, 'transactions'));
  
  transSnap.forEach(doc => {
    const t = doc.data();
    const d = t.date || t.Date || '';
    if (d.includes('/07/2026') || d.includes('2026-07')) {
      if (t.type === 'expense' || t.Type === 'Expense') {
        console.log(t.Note || t.note, '->', t.amount || t.Amount);
      }
    }
  });

  process.exit(0);
}

inspectTrans();
