// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserRole("");
        setLoading(false);
        return;
      }

      try {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            name: currentUser.displayName || "",
            email: currentUser.email,
            role: "student",
            institution: "",
            upazila: "",
            createdAt: new Date(),
          });
          setUserRole("student");
        } else {
          const data = userSnap.data();
          setUserRole(data.role || "student");
        }
      } catch (error) {
        console.error("Error during auth role check:", error);
        setUserRole("");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole("");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return { user, userRole, login, logout, loading };
}
