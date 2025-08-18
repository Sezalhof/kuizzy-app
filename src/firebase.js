// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- Production Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyDd9N0VU6hAu3Iiv4QYJcg51GpThtAkeVs",
  authDomain: "kuizzy-app.firebaseapp.com",
  projectId: "kuizzy-app",
  // NOTE: the canonical bucket domain is *.appspot.com
  storageBucket: "kuizzy-app.appspot.com",
  messagingSenderId: "539841603951",
  appId: "1:539841603951:web:c013ba0b82de73125e209a",
};

// Initialize once (avoid re-init during hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Firebase services ---
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// Optional helper for quick debugging (safe in dev)
if (typeof window !== "undefined") {
  window.getCurrentUid = () => auth.currentUser?.uid ?? null;
}

// Named exports used across your app
export { app, auth, provider, db, storage, serverTimestamp };
