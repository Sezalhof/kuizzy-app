// src/hooks/useAggregatedLeaderboard.js
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import { getTwoMonthPeriod } from "../utils/saveTestAttempt";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

const SCOPES = ["global", "school", "group", "union", "upazila", "district", "division"];
const PAGE_SIZE = 20;
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h

const FINISH_FIELD = "finishedAt";

// Simplified global state - just track what's been executed
const globalTracker = new Map();

function getStorageKey(scopeKey, userId, period) {
  return `${STORAGE_PREFIX}${userId}_${scopeKey}_${period}`;
}

function isOffPeakUSCentral() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6;
}

function loadCachedLeaderboard(scopeKey, userId, period) {
  try {
    const json = localStorage.getItem(getStorageKey(scopeKey, userId, period));
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.entries) return null;
    const age = Date.now() - (parsed.lastUpdated || 0);
    if (age > CACHE_EXPIRATION && !isOffPeakUSCentral()) return null;
    return parsed;
  } catch (err) {
    console.error("[LeaderboardHook] Failed to parse cached leaderboard", err);
    return null;
  }
}

export function useAggregatedLeaderboard(userId, profile = null) {
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});
  const [period, setPeriod] = useState(getTwoMonthPeriod());

  // Refs to prevent infinite loops
  const loadingMoreRef = useRef({});
  const warnedMissingRef = useRef({});
  const initializedRef = useRef(false);
  const lastProfileRef = useRef(null);
  const lastUserIdRef = useRef(null);
  const lastPeriodRef = useRef(null);

  // Memoize profile values to prevent unnecessary re-renders
  const profileData = useMemo(() => ({
    schoolId: profile?.schoolId || null,
    groupId: profile?.groupId || null,
    unionId: profile?.unionId || null,
    upazilaId: profile?.upazilaId || null,
    districtId: profile?.districtId || null,
    divisionId: profile?.divisionId || null,
  }), [profile?.schoolId, profile?.groupId, profile?.unionId, profile?.upazilaId, profile?.districtId, profile?.divisionId]);

  const buildScopeQuery = useCallback(
    (scopeKey, startAfterDoc = null) => {
      let q = query(collection(db, "scores"), where("twoMonthPeriod", "==", period));
      let usingFallback = false;

      const warnOnce = (scopeKey, fieldName) => {
        if (!warnedMissingRef.current[scopeKey]) {
          warnedMissingRef.current[scopeKey] = true;
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[LeaderboardHook] Missing ${fieldName} for scope=${scopeKey}, using global fallback`
            );
          }
        }
      };

      switch (scopeKey) {
        case "global":
          break;

        case "school":
          if (profileData.schoolId) {
            q = query(q, where("schoolId", "==", profileData.schoolId));
          } else {
            warnOnce("school", "schoolId");
            usingFallback = true;
          }
          break;

          case "group":
            if (profileData.groupId) {
              q = query(q, where("groupId", "==", profileData.groupId));
            } else {
              console.warn("[LeaderboardHook] No groupId; skipping group leaderboard");
              return null; // Prevents fallback to global
            }
          
          break;

        case "union":
          if (profileData.unionId) {
            q = query(q, where("unionId", "==", profileData.unionId));
          } else {
            warnOnce("union", "unionId");
            usingFallback = true;
          }
          break;

        case "upazila":
          if (profileData.upazilaId) {
            q = query(q, where("upazilaId", "==", profileData.upazilaId));
          } else {
            warnOnce("upazila", "upazilaId");
            usingFallback = true;
          }
          break;

        case "district":
          if (profileData.districtId) {
            q = query(q, where("districtId", "==", profileData.districtId));
          } else {
            warnOnce("district", "districtId");
            usingFallback = true;
          }
          break;
            
        case "division":
          if (profileData.divisionId) {
            q = query(q, where("divisionId", "==", profileData.divisionId));
          } else {
            warnOnce("division", "divisionId");
            usingFallback = true;
          }
          break;
        
        default:
          console.warn(`[LeaderboardHook] Unknown scope=${scopeKey}, fallback to global`);
          usingFallback = true;
      }
      
if (usingFallback) {
  // Do not query global if user lacks permission
  console.warn(`[LeaderboardHook] Skipping scope=${scopeKey} due to missing profile data`);
  return null; // early exit; loadLeaderboardPage should handle null
}      
      q = query(q,
        orderBy("combinedScore", "desc"),
        orderBy("timeTaken", "asc"),
        orderBy(FINISH_FIELD, "desc"),
        limit(PAGE_SIZE)
      );

      if (startAfterDoc) q = query(q, startAfter(startAfterDoc));

      return q;
    },
    [period, profileData]
  );

  const fetchUserDetailsBatch = useCallback(async (uids) => {
    if (!uids.length) return {};
    const BATCH_SIZE = 10;
    const result = {};
    for (let i = 0; i < uids.length; i += BATCH_SIZE) {
      const batch = uids.slice(i, i + BATCH_SIZE);
      try {
        const q = query(collection(db, "users"), where("__name__", "in", batch));
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          const { username, name, email } = doc.data();
          result[doc.id] = { name: username || name || "Unknown", email: email || doc.id };
        });
        batch.forEach((uid) => { if (!result[uid]) result[uid] = { name: "Unknown", email: uid }; });
      } catch (err) {
        console.error("[LeaderboardHook] Error fetching users batch:", batch, err);
        batch.forEach((uid) => { result[uid] = { name: "Unknown", email: uid }; });
      }
    }
    return result;
  }, []);

  const loadLeaderboardPage = useCallback(
    async (scopeKey, isLoadMore = false) => {
      if (!userId || loadingMoreRef.current[scopeKey]) {
        return;
      }

      // Simple rate limiting - prevent same scope from loading too frequently
      const now = Date.now();
      const trackingKey = `${userId}_${scopeKey}_${period}`;
      const lastExecution = globalTracker.get(trackingKey) || 0;
      
      if (now - lastExecution < 1000) { // 1 second minimum between calls
        console.debug(`[LeaderboardHook] Rate limited: ${scopeKey}`);
        return;
      }

      globalTracker.set(trackingKey, now);

      setErrors(prev => ({ ...prev, [scopeKey]: null }));
      setLoadingScopes(prev => ({ ...prev, [scopeKey]: true }));
      loadingMoreRef.current[scopeKey] = true;

      try {
        const currentData = leaderboards[scopeKey] || { entries: [], lastDoc: null, hasMore: true };
        if (!currentData.hasMore && isLoadMore) return;

        const q = buildScopeQuery(scopeKey, currentData.lastDoc);
        const snap = await getDocs(q);

        let newEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const userIdsToFetch = [...new Set(newEntries.map(e => e.userId).filter(Boolean))];
        const userDetails = await fetchUserDetailsBatch(userIdsToFetch);
        newEntries = newEntries.map(e => ({
          ...e,
          name: e.name || userDetails[e.userId]?.name || "Unknown",
          email: e.email || userDetails[e.userId]?.email || e.userId,
        }));

        const hasMore = snap.docs.length === PAGE_SIZE;
        const updatedEntries = isLoadMore ? [...currentData.entries, ...newEntries] : newEntries;

        try {
          localStorage.setItem(getStorageKey(scopeKey, userId, period),
            JSON.stringify({ entries: updatedEntries, lastDocIndex: snap.docs.length ? snap.docs.length - 1 : null, hasMore, lastUpdated: Date.now() })
          );
        } catch (err) { 
          console.warn("[LeaderboardHook] Failed to cache leaderboard", err); 
        }

        const newLeaderboardData = { 
          entries: updatedEntries, 
          lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : currentData.lastDoc, 
          hasMore 
        };
        
        setLeaderboards(prev => ({ ...prev, [scopeKey]: newLeaderboardData }));
        
      } catch (err) {
        console.error(`[LeaderboardHook] Error loading ${scopeKey}:`, err);
        const msg = String(err?.message || err);
        const idxUrl = msg.includes("create_composite=") ? msg.substring(msg.indexOf("https://")) : null;
        if (idxUrl) console.warn(`[LeaderboardHook] Firestore index required for ${scopeKey}. Create it from:`, idxUrl);
        setErrors(prev => ({ ...prev, [scopeKey]: idxUrl ? "Firestore composite index required. See console." : "Unable to load leaderboard. Try again." }));
      } finally {
        setLoadingScopes(prev => ({ ...prev, [scopeKey]: false }));
        loadingMoreRef.current[scopeKey] = false;
      }
    },
    [userId, period, leaderboards, buildScopeQuery, fetchUserDetailsBatch]
  );

  const refreshLeaderboard = useCallback(() => {
    // Clear cache and reload all scopes
    globalTracker.clear();
    initializedRef.current = false;
    SCOPES.forEach(scopeKey => {
      if (localStorage.getItem(getStorageKey(scopeKey, userId, period))) {
        localStorage.removeItem(getStorageKey(scopeKey, userId, period));
      }
      loadLeaderboardPage(scopeKey, false);
    });
  }, [userId, period, loadLeaderboardPage]);

  // Load cached data on mount or when key params change
  useEffect(() => {
    if (!userId) return;
    
    // Check if we need to reset due to parameter changes
    const shouldReset = (
      lastUserIdRef.current !== userId ||
      lastPeriodRef.current !== period ||
      JSON.stringify(lastProfileRef.current) !== JSON.stringify(profileData)
    );

    if (shouldReset) {
      lastUserIdRef.current = userId;
      lastPeriodRef.current = period;
      lastProfileRef.current = profileData;
      initializedRef.current = false;
    }

    // Load cached data
    const cachedData = {};
    SCOPES.forEach(scopeKey => {
      const cache = loadCachedLeaderboard(scopeKey, userId, period);
      if (cache && cache.entries.length) {
        cachedData[scopeKey] = { 
          entries: cache.entries, 
          lastDoc: null, 
          hasMore: cache.hasMore ?? true 
        };
      }
    });
    
    if (Object.keys(cachedData).length > 0) {
      setLeaderboards(cachedData);
    }
  }, [userId, period, profileData]);

  // Initialize leaderboards - only run once per parameter set
  useEffect(() => {
    if (!userId || initializedRef.current) return;

    initializedRef.current = true;
    
    // Load scopes that have the required data
    SCOPES.forEach((scopeKey) => {
      const shouldLoad = 
        scopeKey === "global" ||
        (scopeKey === "school" && profileData.schoolId) ||
        (scopeKey === "group" && profileData.groupId) ||
        (scopeKey === "union" && profileData.unionId) ||
        (scopeKey === "upazila" && profileData.upazilaId) ||
        (scopeKey === "district" && profileData.districtId) ||
        (scopeKey === "division" && profileData.divisionId);

      if (shouldLoad) {
        // Small delay to prevent all requests firing at once
        setTimeout(() => {
          loadLeaderboardPage(scopeKey, false);
        }, Math.random() * 100);
      }
    });
  }, [userId, period, profileData, loadLeaderboardPage]);

  return { 
    leaderboards, 
    loadingScopes, 
    errors, 
    period, 
    setPeriod, 
    loadLeaderboardPage, 
    refreshLeaderboard 
  };
}

