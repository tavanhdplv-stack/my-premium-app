import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";

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

function convertToISO(dStr) {
  if (!dStr) return new Date().toISOString();
  if (dStr.includes('/')) {
    const p = dStr.split('/');
    if (p.length === 3) {
      // DD/MM/YYYY
      const year = p[2].length === 4 ? p[2] : `20${p[2]}`;
      const month = p[1].padStart(2, '0');
      const day = p[0].padStart(2, '0');
      return `${year}-${month}-${day}T00:00:00.000Z`;
    }
  }
  return new Date(dStr).toISOString();
}

async function migrate() {
  console.log("Migrating wallets...");
  let snap = await getDocs(collection(db, "wallets"));
  let batch = writeBatch(db);
  let count = 0;
  
  for (const document of snap.docs) {
    const data = document.data();
    if (data.WalletName !== undefined || data.Type !== undefined) {
      batch.update(doc(db, "wallets", document.id), {
        name: data.WalletName || data.name || "",
        type: (data.Type || "partner").toLowerCase(),
      });
      count++;
    }
  }
  if (count > 0) {
    await batch.commit();
    console.log(`Migrated ${count} wallets.`);
  }

  console.log("Migrating transactions...");
  snap = await getDocs(collection(db, "transactions"));
  batch = writeBatch(db);
  count = 0;
  let batchCount = 0;

  for (const document of snap.docs) {
    const data = document.data();
    if (data.Amount !== undefined || data.TransID !== undefined) {
      batch.update(doc(db, "transactions", document.id), {
        walletId: data.WalletID || data.walletId || "",
        type: (data.Type || data.type || "expense").toLowerCase(),
        amount: Number(data.Amount || data.amount) || 0,
        note: data.Note || data.note || "",
        date: convertToISO(data.Date || data.date)
      });
      count++;
      batchCount++;
      if (batchCount >= 100) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Migrated ${count} transactions.`);
}

migrate().catch(console.error);
