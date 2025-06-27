// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Create default user doc if not present
          await setDoc(userRef, {
            name: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            phone: "",
            role: "student", // default role
            createdAt: serverTimestamp(), // ✅ better than Date.now()
          });
          setUserRole("student");
        } else {
          const data = userSnap.data();
          setUserRole(data.role || "student");
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google Sign-in Error:", err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  return {
    user,           // ✅ current Firebase user
    userRole,       // ✅ role (student, teacher, admin)
    loading,        // ✅ for suspense/spinners
    login,
    logout,
  };
}
