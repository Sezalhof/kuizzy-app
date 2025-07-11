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
        const isIncomplete =
          !data.name || !data.phone || !data.grade || !data.school;

        if (isIncomplete && location.pathname !== "/enroll") {
          navigate("/enroll");
        }
      } else {
        // No document at all — redirect to enroll
        if (location.pathname !== "/enroll") {
          navigate("/enroll");
        }
      }
    };

    checkProfile();
  }, [user, loading, navigate, location]);
}
