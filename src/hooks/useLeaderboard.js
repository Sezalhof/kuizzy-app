// src/hooks/useLeaderboard.js
import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { loadFromCache, saveToCache } from "../utils/cache";

const PAGE_SIZE = 20;

export default function useLeaderboard(scopeKey, filters = {}) {
  // scopeKey example: 'leaderboard_school_ABC_School'
  // filters example: { school: "ABC School" }

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const cacheKey = `leaderboard_${scopeKey}`;

  const fetchPage = useCallback(
    async (startAfterDoc = null, append = false) => {
      setLoading(true);
      setError(null);

      try {
        // Build query with filters + ordering + pagination
        let q = query(
          collection(db, "scores"),
          orderBy("score", "desc"),
          orderBy("timeTaken", "asc"),
          limit(PAGE_SIZE)
        );

        // Apply filters
        Object.entries(filters).forEach(([field, value]) => {
          if (value != null) {
            q = query(q, where(field, "==", value));
          }
        });

        // Pagination
        if (startAfterDoc) {
          q = query(q, startAfter(startAfterDoc));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Save last doc for next page
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];

        setLastDoc(lastVisible);
        setHasMore(snapshot.docs.length === PAGE_SIZE);

        setData((prev) => (append ? [...prev, ...docs] : docs));

        if (!append) {
          // Save first page to cache
          saveToCache(cacheKey, docs);
        }
      } catch (err) {
        setError("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, filters]
  );

  // Load first page on mount or filters change, try cache first
  useEffect(() => {
    const cached = loadFromCache(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      // Still fetch fresh data in background to update cache
      fetchPage(null, false);
    } else {
      fetchPage();
    }
  }, [cacheKey, fetchPage]);

  const loadMore = () => {
    if (lastDoc && !loading) {
      fetchPage(lastDoc, true);
    }
  };

  return { data, loading, error, hasMore, loadMore };
}
