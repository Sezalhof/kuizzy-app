import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ Add this

const firebaseConfig = {
  apiKey: "AIzaSyDd9N0VU6hAu3Iiv4QYJcg51GpThtAkeVs",
  authDomain: "kuizzy-app.firebaseapp.com",
  projectId: "kuizzy-app",
  storageBucket: "kuizzy-app.firebasestorage.app", // ✅ FIXED
  messagingSenderId: "539841603951",
  appId: "1:539841603951:web:c013ba0b82de73125e209a",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ Now you can use this in upload code

export { app };
window.getCurrentUid = () => getAuth().currentUser?.uid;
