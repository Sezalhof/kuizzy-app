// src/hooks/useAggregatedLeaderboard.js
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import { getTwoMonthPeriod } from "../utils/saveAttemptAndLeaderboard";
import { collection, getDocs, query, where, orderBy, limit, startAfter } from "firebase/firestore";

const PAGE_SIZE = 20;
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h
const FINISH_FIELD = "finishedAt";

// Simple off-peak check to allow slightly stale cache
function isOffPeakUSCentral() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6;
}

function getStorageKey(scopeKey, userId, period, groupId = null) {
  return scopeKey === "group" && groupId
    ? `${STORAGE_PREFIX}${userId}_group_${groupId}_${period}`
    : `${STORAGE_PREFIX}${userId}_${scopeKey}_${period}`;
}

function loadCachedLeaderboard(scopeKey, userId, period, groupId = null) {
  try {
    const json = localStorage.getItem(getStorageKey(scopeKey, userId, period, groupId));
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.entries) return null;
    const age = Date.now() - (parsed.lastUpdated || 0);
    if (age > CACHE_EXPIRATION && !isOffPeakUSCentral()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useAggregatedLeaderboard(userId, profile = null, currentGroupId = null) {
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});
  const [period, setPeriod] = useState(getTwoMonthPeriod());

  const loadingMoreRef = useRef({});
  const initializedRef = useRef(false);

  const profileData = useMemo(() => ({
    schoolId: profile?.schoolId || null,
  }), [profile?.schoolId]);

  const SCOPES = useMemo(() => ["global", "group"], []);

  const globalTracker = useRef(new Map()).current;

  const buildScopeQuery = useCallback((scopeKey, startAfterDoc = null, groupId = null) => {
    let q = query(collection(db, "scores"), where("twoMonthPeriod", "==", period));

    switch (scopeKey) {
      case "global":
        q = query(q, where("global", "==", true));
        break;
      case "group":
        if (!groupId) return null;
        q = query(q, where("groupId", "==", groupId));
        break;
      default:
        return null;
    }

    q = query(
      q,
      orderBy("combinedScore", "desc"),
      orderBy("timeTaken", "asc"),
      orderBy(FINISH_FIELD, "desc"),
      limit(PAGE_SIZE)
    );

    if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
    return q;
  }, [period]);

  const fetchUserDetailsBatch = useCallback(async (uids) => {
    if (!uids.length) return {};
    const BATCH_SIZE = 10;
    const result = {};
    for (let i = 0; i < uids.length; i += BATCH_SIZE) {
      const batch = uids.slice(i, i + BATCH_SIZE);
      try {
        const q = query(collection(db, "public_profiles"), where("__name__", "in", batch));
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          const { displayName, avatarUrl } = doc.data();
          result[doc.id] = { name: displayName || "Unknown", avatarUrl: avatarUrl || null };
        });
        batch.forEach(uid => { if (!result[uid]) result[uid] = { name: "Unknown", avatarUrl: null }; });
      } catch {
        batch.forEach(uid => { result[uid] = { name: "Unknown", avatarUrl: null }; });
      }
    }
    return result;
  }, []);

  const loadLeaderboardPage = useCallback(async (scopeKey, isLoadMore = false, groupId = null) => {
    if (!userId || loadingMoreRef[scopeKey]) return;

    const trackingKey = `${userId}_${scopeKey}_${period}_${groupId || "default"}`;
    const lastExecution = globalTracker.get(trackingKey) || 0;
    if (Date.now() - lastExecution < 1000) return;
    globalTracker.set(trackingKey, Date.now());

    setErrors(prev => ({ ...prev, [scopeKey]: null }));
    setLoadingScopes(prev => ({ ...prev, [scopeKey]: true }));
    loadingMoreRef[scopeKey] = true;

    try {
      const currentData = leaderboards[scopeKey] || { entries: [], lastDoc: null, hasMore: true };
      if (!currentData.hasMore && isLoadMore) return;

      const q = buildScopeQuery(scopeKey, currentData.lastDoc, groupId);
      if (!q) {
        setErrors(prev => ({ ...prev, [scopeKey]: `Cannot build query for ${scopeKey}` }));
        return;
      }

      let snap;
      try { snap = await getDocs(q); } 
      catch { 
        setLeaderboards(prev => ({ ...prev, [scopeKey]: { entries: [], lastDoc: null, hasMore: false } }));
        setErrors(prev => ({ ...prev, [scopeKey]: "Unable to load leaderboard (permissions)" }));
        return;
      }

      let newEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userIdsToFetch = [...new Set(newEntries.map(e => e.userId).filter(Boolean))];
      const userDetails = await fetchUserDetailsBatch(userIdsToFetch);

      newEntries = newEntries.map(e => ({
        ...e,
        name: e.name || userDetails[e.userId]?.name || "Unknown",
        avatarUrl: e.avatarUrl || userDetails[e.userId]?.avatarUrl || "/fallback-logo.png",
      }));

      const hasMore = snap.docs.length === PAGE_SIZE;
      const updatedEntries = isLoadMore ? [...currentData.entries, ...newEntries] : newEntries;

      try {
        localStorage.setItem(getStorageKey(scopeKey, userId, period, groupId),
          JSON.stringify({ entries: updatedEntries, lastDocIndex: snap.docs.length ? snap.docs.length - 1 : null, hasMore, lastUpdated: Date.now() })
        );
      } catch {}

      setLeaderboards(prev => ({
        ...prev,
        [scopeKey]: { entries: updatedEntries, lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : currentData.lastDoc, hasMore }
      }));
    } finally {
      setLoadingScopes(prev => ({ ...prev, [scopeKey]: false }));
      loadingMoreRef[scopeKey] = false;
    }
  }, [userId, period, leaderboards, buildScopeQuery, fetchUserDetailsBatch, globalTracker]);

  const refreshLeaderboard = useCallback(() => {
    globalTracker.clear();
    initializedRef.current = false;
    SCOPES.forEach(scopeKey => {
      const gid = scopeKey === "group" ? currentGroupId : null;
      localStorage.removeItem(getStorageKey(scopeKey, userId, period, gid));
      loadLeaderboardPage(scopeKey, false, gid);
    });
  }, [userId, period, loadLeaderboardPage, currentGroupId, SCOPES]);

  useEffect(() => {
    if (!userId) return;
    const cachedData = {};
    SCOPES.forEach(scopeKey => {
      const gid = scopeKey === "group" ? currentGroupId : null;
      const cache = loadCachedLeaderboard(scopeKey, userId, period, gid);
      if (cache?.entries?.length) cachedData[scopeKey] = { entries: cache.entries, lastDoc: null, hasMore: cache.hasMore ?? true };
    });
    if (Object.keys(cachedData).length > 0) setLeaderboards(prev => ({ ...prev, ...cachedData }));
  }, [userId, period, currentGroupId, SCOPES]);

  useEffect(() => {
    if (!userId || initializedRef.current) return;
    initializedRef.current = true;
    SCOPES.forEach((scopeKey, index) => {
      const gid = scopeKey === "group" ? currentGroupId : null;
      setTimeout(() => loadLeaderboardPage(scopeKey, false, gid), index * 100);
    });
  }, [userId, currentGroupId, loadLeaderboardPage, SCOPES]);

  return {
    leaderboards,
    loadingScopes,
    errors,
    period,
    setPeriod,
    loadLeaderboardPage,
    refreshLeaderboard,
    availableScopes: SCOPES,
  };
}
