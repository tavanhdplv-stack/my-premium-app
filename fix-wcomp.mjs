import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";

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

async function fix() {
  await setDoc(doc(db, "wallets", "W-COMP"), {
    name: "ກະເປົາກຳໄລບໍລິສັດ",
    type: "W-COMP",
    sharePercent: 100,
    createdAt: new Date().toISOString()
  });
  console.log("W-COMP wallet created.");
}

fix().catch(console.error);
