import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
  const txs = await getDocs(collection(db, "transactions"));
  console.log("Transactions count:", txs.size);
  let errorCount = 0;
  for (const doc of txs.docs) {
    const d = doc.data();
    try {
      new Date(d.date).toISOString();
    } catch (e) {
      console.log("Invalid date in tx:", doc.id, d.date);
      errorCount++;
    }
  }
  
  if (errorCount === 0) console.log("All tx dates are valid.");
  
  console.log("First tx:", txs.docs[0].data());
}

check().catch(console.error);
