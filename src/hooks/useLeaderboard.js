// src/hooks/useLeaderboard.js
import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

// ---------------- Config ----------------
const PAGE_SIZE = 20;
const GLOBAL_CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h
const SCOPE_CACHE_EXPIRATION = 1000 * 60 * 30; // 30min
const DISABLE_CACHE = false;
const DEBUG_MODE = false;

function getCacheKey(scopeKey, filters = {}) {
  const filterPart = Object.entries(filters)
    .map(([k, v]) => `${k}_${v}`)
    .join("_");
  return `kuizzy_leaderboard_${scopeKey}_${filterPart}`;
}

function loadCache(scopeKey, filters = {}) {
  if (DISABLE_CACHE) return null;
  try {
    const key = getCacheKey(scopeKey, filters);
    const json = localStorage.getItem(key);
    if (!json) return null;
    const parsed = JSON.parse(json);
    const expiration = GLOBAL_CACHE_EXPIRATION;
    if (Date.now() - (parsed.lastUpdated || 0) > expiration) return null;
    return parsed.entries || null;
  } catch {
    return null;
  }
}

function saveCache(scopeKey, filters = {}, entries) {
  if (DISABLE_CACHE) return;
  try {
    const key = getCacheKey(scopeKey, filters);
    localStorage.setItem(
      key,
      JSON.stringify({ entries: entries.slice(0, PAGE_SIZE), lastUpdated: Date.now() })
    );
  } catch {}
}

// ---------------- Hook ----------------
export default function useLeaderboard(scopeKey, filters = {}, mode = "live") {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const unsubscribeRef = useRef(null);

  const fetchPage = useCallback(
    async (startAfterDoc = null, append = false) => {
      setLoading(true);
      setError(null);

      try {
        const scoresCol = collection(db, "scores");
        let q = query(scoresCol, orderBy("combinedScore", "desc"), orderBy("timeTaken", "asc"), orderBy("finishedAt", "desc"), firestoreLimit(PAGE_SIZE));

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
        let docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Deduplicate by userId
        const dedupMap = new Map();
        docs.forEach((doc) => {
          const existing = dedupMap.get(doc.userId);
          if (!existing || (doc.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0)) {
            dedupMap.set(doc.userId, doc);
          }
        });
        docs = Array.from(dedupMap.values());

        // Assign rank
        let lastScore = null,
          lastTime = null,
          lastRank = 0;
        docs.sort((a, b) => {
          if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
          if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity)) return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
          return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
        });
        docs.forEach((doc, idx) => {
          if (doc.combinedScore === lastScore && doc.timeTaken === lastTime) {
            doc.rank = lastRank;
          } else {
            doc.rank = idx + 1;
            lastRank = idx + 1;
            lastScore = doc.combinedScore;
            lastTime = doc.timeTaken;
          }
        });

        setEntries((prev) => (append ? [...prev, ...docs] : docs));
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);

        if (!append) saveCache(scopeKey, filters, docs);
      } catch (err) {
        setError("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    },
    [scopeKey, filters]
  );

  // Initial load
  useEffect(() => {
    const cached = loadCache(scopeKey, filters);
    if (cached && mode === "cached") {
      setEntries(cached);
      setLoading(false);
    } else {
      fetchPage();
    }
  }, [scopeKey, filters, mode, fetchPage]);

  // Optional live mode
  useEffect(() => {
    if (mode !== "live") return;

    const scoresCol = collection(db, "scores");
    let q = query(scoresCol, orderBy("combinedScore", "desc"), orderBy("timeTaken", "asc"), orderBy("finishedAt", "desc"));

    Object.entries(filters).forEach(([field, value]) => {
      if (value != null) {
        q = query(q, where(field, "==", value));
      }
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Deduplicate + rank
      const dedupMap = new Map();
      docs.forEach((doc) => {
        const existing = dedupMap.get(doc.userId);
        if (!existing || (doc.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0)) {
          dedupMap.set(doc.userId, doc);
        }
      });
      docs = Array.from(dedupMap.values());
      docs.sort((a, b) => {
        if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
        if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity)) return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
        return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
      });
      let lastScore = null,
        lastTime = null,
        lastRank = 0;
      docs.forEach((doc, idx) => {
        if (doc.combinedScore === lastScore && doc.timeTaken === lastTime) {
          doc.rank = lastRank;
        } else {
          doc.rank = idx + 1;
          lastRank = idx + 1;
          lastScore = doc.combinedScore;
          lastTime = doc.timeTaken;
        }
      });

      setEntries(docs);
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribeRef.current && unsubscribeRef.current();
    };
  }, [filters, mode]);

  const loadMore = () => {
    if (lastDoc && !loading) fetchPage(lastDoc, true);
  };

  // Debug
  useEffect(() => {
    if (!DEBUG_MODE) return;
    console.log("=== Leaderboard Debug ===", { scopeKey, filters, entries, loading, error });
  }, [scopeKey, filters, entries, loading, error]);

  return { entries, loading, error, hasMore, loadMore };
}
