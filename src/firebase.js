// ✅ FILE: src/firebase.js

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDd9N0VU6hAu3Iiv4QYJcg51GpThtAkeVs",
  authDomain: "kuizzy-app.firebaseapp.com",
  projectId: "kuizzy-app",
  storageBucket: "kuizzy-app.appspot.com",
  messagingSenderId: "539841603951",
  appId: "1:539841603951:web:c013ba0b82de73125e209a",
};

// ✅ Prevent duplicate initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// ✅ Export Firebase services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// ✅ Optional: export app if any hook needs it
export { app };

// ✅ Global UID getter (optional for debugging)
window.getCurrentUid = () => getAuth().currentUser?.uid;
