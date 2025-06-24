// src/hooks/useAuthRedirect.js
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useAuthRedirect(user, loading) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkProfile = async () => {
      if (loading || !user) return;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const incomplete =
          !data.name || !data.grade || !data.institution || !data.upazila;

        if (incomplete && location.pathname !== "/enroll") {
          navigate("/enroll");
        }
      }
    };

    checkProfile();
  }, [user, loading, navigate, location]);
}
