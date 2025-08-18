// src/hooks/useTests.js
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetch tests by grade and subject
 */
export function useTests(grade, subject) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!grade || !subject) {
      setTests([]);
      setLoading(false);
      return;
    }

    const fetchTests = async () => {
      setLoading(true);
      try {
        const testsRef = collection(db, "tests");
        const q = query(
          testsRef,
          where("grade", "==", grade),
          where("subject", "==", subject)
        );
        const snapshot = await getDocs(q);
        const loadedTests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTests(loadedTests);
      } catch (err) {
        setError(err.message || "Failed to fetch tests.");
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [grade, subject]);

  return { tests, loading, error };
}
