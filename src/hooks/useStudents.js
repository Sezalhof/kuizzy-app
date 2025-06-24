import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

/**
 * Fetches all students if user is an admin.
 * Returns { students, loading, accessDenied, error }
 */
export default function useStudents(user, userRole) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user || userRole !== "admin") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStudents(data);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user, userRole]);

  return { students, loading, accessDenied, error };
}
