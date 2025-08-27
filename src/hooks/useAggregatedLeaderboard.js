// src/hooks/useAggregatedLeaderboard.js
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import {getTwoMonthPeriod } from '../utils/saveAttemptAndLeaderboard';

import { collection, getDocs, query, where, orderBy, limit, startAfter } from "firebase/firestore";

const SCOPES = ["global", "school", "group", "union", "upazila", "district", "division"];
const PAGE_SIZE = 20;
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h
const FINISH_FIELD = "finishedAt";

const SCOPE_REQUIREMENTS = {
  global: () => true,
  school: (profile) => !!profile?.schoolId,
  group: (profile) => !!profile, // allow dynamic groupId via param
  union: (profile) => !!profile?.unionId,
  upazila: (profile) => !!profile?.upazilaId,
  district: (profile) => !!profile?.districtId,
  division: (profile) => !!profile?.divisionId,
};

const globalTracker = new Map();

function getStorageKey(scopeKey, userId, period, groupId = null) {
  return scopeKey === "group" && groupId
    ? `${STORAGE_PREFIX}${userId}_group_${groupId}_${period}`
    : `${STORAGE_PREFIX}${userId}_${scopeKey}_${period}`;
}

function isOffPeakUSCentral() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6;
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

export function useAggregatedLeaderboard(userId, profile = null) {
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});
  const [period, setPeriod] = useState(getTwoMonthPeriod());

  const loadingMoreRef = useRef({});
  const initializedRef = useRef(false);
  const lastProfileRef = useRef({});
  const lastUserIdRef = useRef(null);
  const lastPeriodRef = useRef(null);

  const profileData = useMemo(() => ({
    schoolId: profile?.schoolId || null,
    unionId: profile?.unionId || null,
    upazilaId: profile?.upazilaId || null,
    districtId: profile?.districtId || null,
    divisionId: profile?.divisionId || null,
  }), [profile?.schoolId, profile?.unionId, profile?.upazilaId, profile?.districtId, profile?.divisionId]);

  const availableScopes = useMemo(() => {
    return SCOPES.filter(scope => SCOPE_REQUIREMENTS[scope](profile));
  }, [profile]);

  const buildScopeQuery = useCallback((scopeKey, startAfterDoc = null, groupId = null) => {
    if (!SCOPE_REQUIREMENTS[scopeKey](profile)) return null;

    let q = query(collection(db, "scores"), where("twoMonthPeriod", "==", period));

    switch (scopeKey) {
      case "global": q = query(q, where("global", "==", true)); break;
      case "school": q = query(q, where("schoolId", "==", profileData.schoolId)); break;
      case "group": {
        const targetGroupId = groupId;
        if (!targetGroupId) return null;
        q = query(q, where("groupId", "==", targetGroupId));
        break;
      }
      case "union": q = query(q, where("unionId", "==", profileData.unionId)); break;
      case "upazila": q = query(q, where("upazilaId", "==", profileData.upazilaId)); break;
      case "district": q = query(q, where("districtId", "==", profileData.districtId)); break;
      case "division": q = query(q, where("divisionId", "==", profileData.divisionId)); break;
      default: return null;
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
  }, [period, profileData, profile]);

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
    if (!userId || loadingMoreRef.current[scopeKey]) return;

    if (!SCOPE_REQUIREMENTS[scopeKey](profile)) {
      setErrors(prev => ({ ...prev, [scopeKey]: `Missing profile field: ${scopeKey}` }));
      return;
    }

    const now = Date.now();
    const trackingKey = `${userId}_${scopeKey}_${period}_${groupId || "default"}`;
    const lastExecution = globalTracker.get(trackingKey) || 0;
    if (now - lastExecution < 1000) return;
    globalTracker.set(trackingKey, now);

    setErrors(prev => ({ ...prev, [scopeKey]: null }));
    setLoadingScopes(prev => ({ ...prev, [scopeKey]: true }));
    loadingMoreRef.current[scopeKey] = true;

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
      loadingMoreRef.current[scopeKey] = false;
    }
  }, [userId, period, leaderboards, buildScopeQuery, fetchUserDetailsBatch, profile]);

  const refreshLeaderboard = useCallback(() => {
    globalTracker.clear();
    initializedRef.current = false;
    availableScopes.forEach(scopeKey => {
      localStorage.removeItem(getStorageKey(scopeKey, userId, period));
      loadLeaderboardPage(scopeKey, false);
    });
  }, [userId, period, loadLeaderboardPage, availableScopes]);

  // --- Initial load & caching
  useEffect(() => {
    if (!userId) return;

    const shouldReset =
      lastUserIdRef.current !== userId ||
      lastPeriodRef.current !== period ||
      JSON.stringify(lastProfileRef.current) !== JSON.stringify(profileData);

    if (shouldReset) {
      lastUserIdRef.current = userId;
      lastPeriodRef.current = period;
      lastProfileRef.current = profileData;
      initializedRef.current = false;
      setLeaderboards(prev => (Object.keys(prev).length ? {} : prev));
      setErrors(prev => (Object.keys(prev).length ? {} : prev));
    }

    const cachedData = {};
    availableScopes.forEach(scopeKey => {
      const cache = loadCachedLeaderboard(scopeKey, userId, period);
      if (cache?.entries?.length) cachedData[scopeKey] = { entries: cache.entries, lastDoc: null, hasMore: cache.hasMore ?? true };
    });

    if (Object.keys(cachedData).length > 0) setLeaderboards(prev => ({ ...prev, ...cachedData }));
  }, [userId, period, profileData, availableScopes]);

  // --- Trigger load after mount
  useEffect(() => {
    if (!userId || initializedRef.current || !profile) return;
    initializedRef.current = true;

    availableScopes.forEach((scopeKey, index) => {
      setTimeout(() => loadLeaderboardPage(scopeKey, false), index * 100);
    });
  }, [userId, period, profile, availableScopes, loadLeaderboardPage]);

  return {
    leaderboards,
    loadingScopes,
    errors,
    period,
    setPeriod,
    loadLeaderboardPage,
    refreshLeaderboard,
    availableScopes,
  };
}
