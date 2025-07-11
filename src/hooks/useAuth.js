// ✅ FILE: src/hooks/useAuth.js
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, provider } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Prevent multiple simultaneous login attempts
  const loginInProgress = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const data = userDoc.data();

          if (userDoc.exists() && data?.role) {
            setUserRole(data.role);
          } else {
            setUserRole("student"); // fallback
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("student"); // fallback on error
        }
      } else {
        setUser(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    // Prevent multiple simultaneous login attempts
    if (loginInProgress.current || isAuthenticating) {
      return;
    }

    loginInProgress.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Login successful:", result.user);
      return result;
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = "Login failed. Please try again.";
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = "Login was cancelled. Please try again.";
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = "Login request was cancelled.";
          break;
        case 'auth/popup-blocked':
          errorMessage = "Popup was blocked. Please allow popups for this site.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many login attempts. Please wait and try again.";
          break;
        case 'auth/operation-not-supported-in-this-environment':
          errorMessage = "Login not supported in this environment.";
          break;
        default:
          errorMessage = error.message || "An unexpected error occurred.";
      }
      
      setAuthError(errorMessage);
      
      // Re-throw for component-level handling if needed
      throw error;
    } finally {
      loginInProgress.current = false;
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setAuthError(null);
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      setAuthError("Logout failed. Please try again.");
    }
  }, []);

  // Clear auth error when user changes
  useEffect(() => {
    if (user) {
      setAuthError(null);
    }
  }, [user]);

  return useMemo(() => {
    return { 
      user, 
      userRole, 
      loading, 
      login, 
      logout, 
      authError,
      isAuthenticating
    };
  }, [user, userRole, loading, authError, isAuthenticating, login, logout]);
}