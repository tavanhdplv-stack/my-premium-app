import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from "firebase/firestore";

// Use environment variables for sensitive config so it's safe for deployment, with fallback for local dev
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDBBS8AECCmM8PN-yGM61vD0RqyD4DKgMc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "myshop-preorder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "myshop-preorder",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "myshop-preorder.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "868176648423",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:868176648423:web:694b04f79dc06dd7636a42",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DGFG82EPX9",
};

// Throw error if critical config is completely missing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(`[🔥 Firebase Error] ❌ Missing Firebase configuration!`);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: Firestore;

if (typeof window !== "undefined") {
  try {
    // Enable offline persistence and faster local cache for client-side
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) {
    // Fallback if initializeFirestore is called more than once
    db = getFirestore(app);
  }
} else {
  // Server-side rendering fallback
  db = getFirestore(app);
}

export { db };