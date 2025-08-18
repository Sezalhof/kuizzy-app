// src/hooks/useAggregatedLeaderboard.js
import { useState, useEffect, useCallback, useRef } from "react";
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
    // prefer fresh data at peak, allow stale off-peak
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
  const loadingMoreRef = useRef({});
  const warnedMissingRef = useRef({}); // throttle “missing id” warnings per scope

  // Build Firestore query for a scope, auto-fallback to global if id missing
  const buildScopeQuery = useCallback(
    (scopeKey, startAfterDoc = null) => {
      // Always constrain to the active period to tame index sizes
      let q = query(collection(db, "scores"), where("twoMonthPeriod", "==", period));
      let usingFallback = false;

      const missingOnce = (k, fieldName) => {
        if (!warnedMissingRef.current[k]) {
          console.warn(`[LeaderboardHook] Missing ${fieldName} for scope=${k}, using global fallback`);
          warnedMissingRef.current[k] = true;
        }
      };

      switch (scopeKey) {
        case "global":
          console.log("[LeaderboardHook] Building global leaderboard query for period:", period);
          break;

        case "school":
          if (profile?.schoolId) {
            q = query(q, where("schoolId", "==", profile.schoolId));
            console.log("[LeaderboardHook] Building school query", { schoolId: profile.schoolId, period });
          } else {
            missingOnce("school", "schoolId");
            usingFallback = true;
          }
          break;

        case "group":
          if (profile?.groupId) {
            q = query(q, where("groupId", "==", profile.groupId));
            console.log("[LeaderboardHook] Building group query", { groupId: profile.groupId, period });
          } else {
            missingOnce("group", "groupId");
            usingFallback = true;
          }
          break;

        case "union":
          if (profile?.unionId) {
            q = query(q, where("unionId", "==", profile.unionId));
            console.log("[LeaderboardHook] Building union query", { unionId: profile.unionId, period });
          } else {
            missingOnce("union", "unionId");
            usingFallback = true;
          }
          break;

        case "upazila":
          if (profile?.upazilaId) {
            q = query(q, where("upazilaId", "==", profile.upazilaId));
            console.log("[LeaderboardHook] Building upazila query", { upazilaId: profile.upazilaId, period });
          } else {
            missingOnce("upazila", "upazilaId");
            usingFallback = true;
          }
          break;

        case "district":
          if (profile?.districtId) {
            q = query(q, where("districtId", "==", profile.districtId));
            console.log("[LeaderboardHook] Building district query", { districtId: profile.districtId, period });
          } else {
            missingOnce("district", "districtId");
            usingFallback = true;
          }
          break;

        case "division":
          if (profile?.divisionId) {
            q = query(q, where("divisionId", "==", profile.divisionId));
            console.log("[LeaderboardHook] Building division query", { divisionId: profile.divisionId, period });
          } else {
            missingOnce("division", "divisionId");
            usingFallback = true;
          }
          break;

        default:
          console.warn(`[LeaderboardHook] Unknown scope=${scopeKey}, falling back to global`);
          usingFallback = true;
      }

      if (usingFallback && scopeKey !== "global") {
        // fall back to global within the same period
        q = query(collection(db, "scores"), where("twoMonthPeriod", "==", period));
        console.log("[LeaderboardHook] Fallback -> global query for period:", period);
      }

      // ---- ORDERING (composite-index friendly) ----
      // We’ll use fields you actually have: combinedScore (desc), timeTaken (asc if present), finishedAt (desc).
      // This will require composite indexes once combined with equality filters above.
      // Example composite (global): twoMonthPeriod ASC, combinedScore DESC, timeTaken ASC, finishedAt DESC
      q = query(
        q,
        orderBy("combinedScore", "desc"),
        orderBy("timeTaken", "asc"),
        orderBy("finishedAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      console.log(`[LeaderboardHook] Built query for scope=${usingFallback ? "global(fallback)" : scopeKey}`, {
        period,
        orders: ["combinedScore DESC", "timeTaken ASC", "finishedAt DESC"],
        pageSize: PAGE_SIZE,
        startAfterId: startAfterDoc?.id || null,
      });

      return q;
    },
    [profile, period]
  );

  // Batch fetch user details (avoid N+1)
  const fetchUserDetailsBatch = useCallback(async (uids) => {
    if (!uids.length) return {};
    const BATCH_SIZE = 10;
    const result = {};
    for (let i = 0; i < uids.length; i += BATCH_SIZE) {
      const batch = uids.slice(i, i + BATCH_SIZE);
      console.log("[LeaderboardHook] Fetching user details batch:", batch);
      try {
        const q = query(collection(db, "users"), where("__name__", "in", batch));
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          const { username, name, email } = doc.data();
          result[doc.id] = { name: username || name || "Unknown", email: email || doc.id };
        });
        // mark any still-missing ids
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
      if (!userId) return;
      if (loadingMoreRef.current[scopeKey]) return;

      setErrors((prev) => ({ ...prev, [scopeKey]: null }));
      setLoadingScopes((prev) => ({ ...prev, [scopeKey]: true }));
      loadingMoreRef.current[scopeKey] = true;

      try {
        const currentData = leaderboards[scopeKey] || { entries: [], lastDoc: null, hasMore: true };
        if (!currentData.hasMore && isLoadMore) {
          console.log("[LeaderboardHook] No more pages for", scopeKey);
          return;
        }

        const q = buildScopeQuery(scopeKey, currentData.lastDoc);
        const snap = await getDocs(q);
        console.log(`[LeaderboardHook] ${scopeKey} snapshot size:`, snap.size);

        let newEntries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // hydrate display names
        const userIdsToFetch = [...new Set(newEntries.map((e) => e.userId).filter(Boolean))];
        const userDetails = await fetchUserDetailsBatch(userIdsToFetch);
        newEntries = newEntries.map((e) => ({
          ...e,
          name: e.name || userDetails[e.userId]?.name || "Unknown",
          email: e.email || userDetails[e.userId]?.email || e.userId,
        }));

        const hasMore = snap.docs.length === PAGE_SIZE;
        const updatedEntries = isLoadMore ? [...(currentData.entries || []), ...newEntries] : newEntries;

        // cache without lastDoc (can’t serialize a doc snapshot)
        try {
          localStorage.setItem(
            getStorageKey(scopeKey, userId, period),
            JSON.stringify({
              entries: updatedEntries,
              lastDocIndex: snap.docs.length ? snap.docs.length - 1 : null,
              hasMore,
              lastUpdated: Date.now(),
            })
          );
          console.log(`[LeaderboardHook] Cached ${scopeKey} leaderboard (entries=${updatedEntries.length})`);
        } catch (err) {
          console.warn("[LeaderboardHook] Failed to cache leaderboard", err);
        }

        setLeaderboards((prev) => ({
          ...prev,
          [scopeKey]: {
            entries: updatedEntries,
            lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : currentData.lastDoc,
            hasMore,
          },
        }));
      } catch (err) {
        // Surface composite-index hint if present
        const msg = String(err?.message || err);
        const idxUrl = msg.includes("create_composite=")
          ? msg.substring(msg.indexOf("https://"), msg.length)
          : null;
        console.error(`[LeaderboardHook] Error loading ${scopeKey} leaderboard:`, err);
        if (idxUrl) {
          console.warn(`[LeaderboardHook] Firestore index required for ${scopeKey}. Create it from:`, idxUrl);
        }
        setErrors((prev) => ({
          ...prev,
          [scopeKey]: idxUrl
            ? "Firestore composite index required. See console for the link."
            : "Unable to load leaderboard. Try again.",
        }));
      } finally {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
        loadingMoreRef.current[scopeKey] = false;
      }
    },
    [userId, leaderboards, period, buildScopeQuery, fetchUserDetailsBatch]
  );

  const refreshLeaderboard = useCallback(() => {
    console.log("[LeaderboardHook] Refreshing all scopes...");
    SCOPES.forEach((scopeKey) => loadLeaderboardPage(scopeKey, false));
  }, [loadLeaderboardPage]);

  // Load cached leaderboards
  useEffect(() => {
    if (!userId) return;
    const cachedData = {};
    SCOPES.forEach((scopeKey) => {
      const cache = loadCachedLeaderboard(scopeKey, userId, period);
      if (cache && cache.entries.length) {
        cachedData[scopeKey] = { entries: cache.entries, lastDoc: null, hasMore: cache.hasMore ?? true };
        console.log(`[LeaderboardHook] Loaded cached data for ${scopeKey}`, {
          count: cache.entries.length,
          hasMore: cache.hasMore,
        });
      }
    });
    setLeaderboards(cachedData);
  }, [userId, period]);

  // Initial load for all scopes (will fallback where IDs are missing)
  useEffect(() => {
    console.log("[LeaderboardHook] Initial load for all scopes, period:", period);
    SCOPES.forEach((scopeKey) => loadLeaderboardPage(scopeKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]); // re-run when period changes

  return {
    leaderboards,
    loadingScopes,
    errors,
    period,
    setPeriod,
    loadLeaderboardPage,
    refreshLeaderboard,
  };
}
