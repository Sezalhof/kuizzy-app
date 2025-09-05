// src/hooks/useLeaderboard.js - PRODUCTION READY VERSION
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

// Configuration
const PAGE_SIZE = 20;
const GLOBAL_CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h
const SCOPE_CACHE_EXPIRATION = 1000 * 60 * 30; // 30min
const DISABLE_CACHE = false;
const DEBUG_MODE = process.env.NODE_ENV === 'development' && false; // Set to true only for debugging

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
  } catch {
    // Silently fail cache save
  }
}

function processEntries(docs) {
  // Deduplicate by userId - keep the most recent attempt
  const dedupMap = new Map();
  docs.forEach((doc) => {
    const existing = dedupMap.get(doc.userId);
    if (!existing || (doc.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0)) {
      dedupMap.set(doc.userId, doc);
    }
  });
  
  const processedDocs = Array.from(dedupMap.values());

  // Sort by combined score (desc), time taken (asc), finished date (desc)
  processedDocs.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity)) return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
    return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
  });

  // Assign ranks
  let lastScore = null, lastTime = null, lastRank = 0;
  processedDocs.forEach((doc, idx) => {
    if (doc.combinedScore === lastScore && doc.timeTaken === lastTime) {
      doc.rank = lastRank;
    } else {
      doc.rank = idx + 1;
      lastRank = idx + 1;
      lastScore = doc.combinedScore;
      lastTime = doc.timeTaken;
    }
  });

  return processedDocs;
}

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
        let q = query(
          scoresCol, 
          orderBy("combinedScore", "desc"), 
          orderBy("timeTaken", "asc"), 
          orderBy("finishedAt", "desc"), 
          firestoreLimit(PAGE_SIZE)
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
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Process entries (deduplicate and rank)
        const processedDocs = processEntries(docs);

        setEntries((prev) => (append ? [...prev, ...processedDocs] : processedDocs));
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);

        if (!append) saveCache(scopeKey, filters, processedDocs);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
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

  // Live mode with real-time updates
  useEffect(() => {
    if (mode !== "live") return;

    const scoresCol = collection(db, "scores");
    let q = query(scoresCol, orderBy("combinedScore", "desc"), orderBy("timeTaken", "asc"), orderBy("finishedAt", "desc"));

    Object.entries(filters).forEach(([field, value]) => {
      if (value != null) {
        q = query(q, where(field, "==", value));
      }
    });

    // Capture the unsubscribe ref at effect setup time
    const currentUnsubscribeRef = unsubscribeRef;

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const processedDocs = processEntries(docs);
        setEntries(processedDocs);
      },
      (error) => {
        console.error("Live leaderboard update error:", error);
        setError("Failed to receive live updates.");
      }
    );

    currentUnsubscribeRef.current = unsubscribe;
    
    return () => {
      if (currentUnsubscribeRef.current) {
        currentUnsubscribeRef.current();
        currentUnsubscribeRef.current = null;
      }
    };
  }, [filters, mode]);

  const loadMore = useCallback(() => {
    if (lastDoc && !loading) {
      fetchPage(lastDoc, true);
    }
  }, [lastDoc, loading, fetchPage]);

  // Debug logging only in development mode
  useEffect(() => {
    if (!DEBUG_MODE) return;
    console.log("Leaderboard Debug:", { 
      scopeKey, 
      filters, 
      entriesCount: entries.length, 
      loading, 
      error 
    });
  }, [scopeKey, filters, entries.length, loading, error]);

  return { 
    entries, 
    loading, 
    error, 
    hasMore, 
    loadMore 
  };
}