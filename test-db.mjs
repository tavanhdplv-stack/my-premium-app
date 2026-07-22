import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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

async function main() {
  const q = query(collection(db, "orders"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No orders found");
    return;
  }
  const doc = snap.docs[0];
  console.log("Doc ID:", doc.id);
  console.log("Data:", JSON.stringify(doc.data(), null, 2));
}

main().catch(console.error);
