// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDd9N0VU6hAu3Iiv4QYJcg51GpThtAkeVs",
  authDomain: "kuizzy-app.firebaseapp.com",
  projectId: "kuizzy-app",
  storageBucket: "kuizzy-app.appspot.com",
  messagingSenderId: "539841603951",
  appId: "1:539841603951:web:c013ba0b82de73125e209a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services and export them directly
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider(); // Keep provider exported as it's used in App.js
export const db = getFirestore(app);

