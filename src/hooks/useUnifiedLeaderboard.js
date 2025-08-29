// src/hooks/useUnifiedLeaderboard.js
import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";

// ------------------ Constants ------------------
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const GLOBAL_CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h
const GROUP_CACHE_EXPIRATION = 1000 * 60 * 30; // 30 min
const PAGE_SIZE = 20;

const SCOPE_FIELD_MAP = {
  global: null,
  school: "schoolId",
  union: "unionId",
  upazila: "upazilaId",
  district: "districtId",
  division: "divisionId",
};

// ------------------ Helpers ------------------
function getCacheKey(scope, userId, period, idValue = null) {
  return idValue
    ? `${STORAGE_PREFIX}${userId}_${scope}_${idValue}_${period}`
    : `${STORAGE_PREFIX}${userId}_${scope}_${period}`;
}

function loadCache(scope, userId, period, idValue = null) {
  try {
    const key = getCacheKey(scope, userId, period, idValue);
    const json = localStorage.getItem(key);
    if (!json) return null;
    const parsed = JSON.parse(json);
    const expiration = scope === "group" ? GROUP_CACHE_EXPIRATION : GLOBAL_CACHE_EXPIRATION;
    if (Date.now() - (parsed.lastUpdated || 0) > expiration) return null;
    console.log(`[DEBUG] Loaded cache for ${scope} (${idValue || "none"}):`, parsed.entries);
    return parsed.entries?.slice(0, PAGE_SIZE) || null;
  } catch (err) {
    console.error("[DEBUG] Failed to load cache:", err);
    return null;
  }
}

function saveCache(scope, userId, period, entries, idValue = null) {
  try {
    const key = getCacheKey(scope, userId, period, idValue);
    localStorage.setItem(
      key,
      JSON.stringify({ entries: entries.slice(0, PAGE_SIZE), lastUpdated: Date.now() })
    );
    console.log(`[DEBUG] Saved cache for ${scope} (${idValue || "none"}), entries:`, entries.slice(0, PAGE_SIZE));
  } catch (err) {
    console.error("[DEBUG] Failed to save cache:", err);
  }
}

// ------------------ Hook ------------------
export function useUnifiedLeaderboard(userId, userProfile, period, mode = "cached") {
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});
  const [availableScopes, setAvailableScopes] = useState([]);
  const groupListenersRef = useRef({});

  // ------------------ Fetch single scope ------------------
  const fetchScope = useCallback(
    async (scopeKey) => {
      if (!userId || !period) return;

      console.log("[DEBUG] fetchScope called for:", scopeKey);

      const field = SCOPE_FIELD_MAP[scopeKey];
      const idValue = field ? userProfile?.[field] : null;

      if (field && !idValue) {
        const msg = "Scope not available";
        setErrors((prev) => ({ ...prev, [scopeKey]: msg }));
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
        console.warn("[DEBUG]", msg, scopeKey);
        return;
      }

      const cached = loadCache(scopeKey, userId, period, idValue);
      if (cached) {
        setLeaderboards((prev) => ({ ...prev, [scopeKey]: { entries: cached } }));
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
        if (mode === "cached") return;
      }

      try {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: true }));

        let collectionRef;
        if (scopeKey === "global") {
          collectionRef = collection(db, "leaderboards", "global", "entries");
        } else {
          collectionRef = collection(db, "leaderboards", scopeKey, idValue, "entries");
        }

        const snapshot = await getDocs(collectionRef);
        const entries = snapshot.docs.map((d) => d.data());
        console.log(`[DEBUG] Fetched ${entries.length} entries for ${scopeKey}`);

        entries.sort((a, b) => {
          if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
          if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
          return a.timeMillis - b.timeMillis;
        });

        setLeaderboards((prev) => ({ ...prev, [scopeKey]: { entries, hasMore: false } }));
        saveCache(scopeKey, userId, period, entries, idValue);
      } catch (err) {
        console.error(`[DEBUG] Error fetching ${scopeKey}:`, err);
        setErrors((prev) => ({ ...prev, [scopeKey]: err.message || "Failed to load leaderboard." }));
      } finally {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
      }
    },
    [userId, userProfile, period, mode]
  );

  // ------------------ Initialize available scopes ------------------
  useEffect(() => {
    if (!userProfile) return;
    const scopes = Object.keys(SCOPE_FIELD_MAP).filter(
      (k) => !SCOPE_FIELD_MAP[k] || userProfile[SCOPE_FIELD_MAP[k]]
    );
    setAvailableScopes(scopes);
    console.log("[DEBUG] Available scopes:", scopes);
    scopes.forEach(fetchScope);
  }, [userProfile, fetchScope]);

  // ------------------ Group leaderboard ------------------
  const listenGroup = useCallback(
    (groupId) => {
      if (!userId || !period || !groupId || groupListenersRef.current[groupId]) return;

      console.log("[DEBUG] listenGroup called for:", groupId);

      const cached = loadCache("group", userId, period, groupId);
      if (cached) {
        setLeaderboards((prev) => ({
          ...prev,
          group: { ...prev.group, [groupId]: { entries: cached, hasMore: false } },
        }));
      }

      setLoadingScopes((prev) => ({
        ...prev,
        group: { ...prev.group, [groupId]: true },
      }));

      const groupQuery = query(
        collection(db, "test_attempts"),
        where("groupId", "==", groupId),
        where("twoMonthPeriod", "==", period)
      );

      const unsubscribe = onSnapshot(
        groupQuery,
        (snapshot) => {
          console.log(`[DEBUG] Snapshot received for group ${groupId}: ${snapshot.docs.length} docs`);
          const entries = snapshot.docs.map((doc) => ({
            ...doc.data(),
            combinedScore: doc.data().combinedScore ?? doc.data().score ?? 0,
            timeTaken: doc.data().timeTaken ?? doc.data().time ?? 9999,
            timeMillis: doc.data().timeMillis ?? 0,
          }));

          entries.sort((a, b) => {
            if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
            if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
            return a.timeMillis - b.timeMillis;
          });

          setLeaderboards((prev) => ({
            ...prev,
            group: { ...prev.group, [groupId]: { entries: entries.slice(0, PAGE_SIZE), hasMore: false } },
          }));

          console.log(`[DEBUG] Updated group leaderboard for ${groupId}:`, entries.slice(0, PAGE_SIZE));
          saveCache("group", userId, period, entries, groupId);

          setLoadingScopes((prev) => ({
            ...prev,
            group: { ...prev.group, [groupId]: false },
          }));
        },
        (err) => {
          console.error(`[DEBUG] Snapshot error for group ${groupId}:`, err);
          setErrors((prev) => ({
            ...prev,
            group: { ...prev.group, [groupId]: "Failed to load group leaderboard." },
          }));
          setLoadingScopes((prev) => ({
            ...prev,
            group: { ...prev.group, [groupId]: false },
          }));
        }
      );

      groupListenersRef.current[groupId] = unsubscribe;

      const timer = setTimeout(() => {
        if (groupListenersRef.current[groupId]) {
          groupListenersRef.current[groupId]();
          delete groupListenersRef.current[groupId];
        }
      }, GROUP_CACHE_EXPIRATION);

      return () => clearTimeout(timer);
    },
    [userId, period]
  );

  const stopListeningGroup = useCallback((groupId) => {
    if (groupListenersRef.current[groupId]) {
      console.log("[DEBUG] stopListeningGroup called for:", groupId);
      groupListenersRef.current[groupId]();
      delete groupListenersRef.current[groupId];
      setLeaderboards((prev) => {
        const newGroup = { ...prev.group };
        delete newGroup[groupId];
        return { ...prev, group: newGroup };
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(groupListenersRef.current).forEach((u) => u());
      groupListenersRef.current = {};
    };
  }, []);

  const loadLeaderboardPage = useCallback(
    (scopeKey) => {
      console.log("[DEBUG] loadLeaderboardPage called for:", scopeKey);
      fetchScope(scopeKey);
    },
    [fetchScope]
  );

  return {
    leaderboards,
    loadingScopes,
    errors,
    availableScopes,
    listenGroup,
    stopListeningGroup,
    loadLeaderboardPage,
  };
}
