// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { useAggregatedLeaderboard } from "../hooks/useAggregatedLeaderboard";
import LeaderboardTable from "../components/LeaderboardTable";
import { getTwoMonthPeriod } from "../utils/saveTestAttempt";

// --- Firestore v9 modular imports ---
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

const SCOPES = [
  { key: "global", label: "Global" },
  { key: "school", label: "School" },
  { key: "group", label: "Group" }, // group/group by users (from scores)
  { key: "union", label: "Union/Pouroshava" },
  { key: "upazila", label: "Upazila" },
  { key: "district", label: "District" },
  { key: "division", label: "Division" },
];

const PAGE_SIZE = 20;
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h

function getStorageKey(scopeKey, userId, period, groupId = null) {
  return scopeKey === "group"
    ? `${STORAGE_PREFIX}${userId}_group_${groupId || "self"}_${period}`
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
    const key = getStorageKey(scopeKey, userId, period, groupId);
    const json = localStorage.getItem(key);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.entries) return null;
    const age = Date.now() - (parsed.lastUpdated || 0);

    // favor fresh data during peak hours; allow stale off-peak (quota friendliness)
    if (age > CACHE_EXPIRATION && !isOffPeakUSCentral()) return null;

    return parsed;
  } catch (e) {
    console.warn("[LeaderboardPage] Cache parse failed", e);
    return null;
  }
}

function LeaderboardControls({
  selectedScope,
  setSelectedScope,
  period,
  setPeriod,
  schoolId,
  setSchoolId,
  schoolName,
  setSchoolName,
  groupId,
  setGroupId,
  groupName,
  setGroupName,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <div className="flex gap-2 flex-wrap">
        <select
          className="border rounded px-2 py-1"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {/* If you later add more periods, add <option>s here */}
          <option value={getTwoMonthPeriod()}>{getTwoMonthPeriod()}</option>
        </select>

        <select
          className="border rounded px-2 py-1"
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
        >
          {SCOPES.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {selectedScope === "school" && (
          <>
            <input
              className="border rounded px-2 py-1"
              placeholder="School ID"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1 bg-gray-50"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="School Name (optional)"
            />
          </>
        )}

        {selectedScope === "group" && (
          <>
            <input
              className="border rounded px-2 py-1"
              placeholder="Group/Group ID (leave blank to use your profile group)"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1 bg-gray-50"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group Name (optional)"
            />
          </>
        )}
      </div>
    </div>
  );
}

function UserRankCard({ userRankInfo }) {
  if (!userRankInfo) {
    return (
      <div className="text-gray-600 p-3 border rounded mb-4">
        No attempts found for this period/scope.
      </div>
    );
  }
  return (
    <div className="p-3 border rounded mb-4">
      <div className="text-sm text-gray-500">Your Rank</div>
      <div className="text-xl font-bold">
        {userRankInfo.rank} / {userRankInfo.total ?? "?"}
      </div>
      <div className="text-sm text-gray-500">
        Combined Score: {Number(userRankInfo.combinedScore ?? userRankInfo.score ?? 0).toFixed(2)}
      </div>
    </div>
  );
}

export default function LeaderboardPage({ schoolId: propSchoolId, groupId: propGroupId }) {
  const { user, authLoading } = useAuth();

  // UI state
  const [selectedScope, setSelectedScope] = useState("global");
  const [period, setPeriod] = useState(getTwoMonthPeriod());

  // identity / context
  const [schoolId, setSchoolId] = useState(propSchoolId ?? "");
  const [schoolName, setSchoolName] = useState("");
  const [groupId, setGroupId] = useState(propGroupId ?? "");
  const [groupName, setGroupName] = useState("");

  // profile
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // local-only state for extra scopes (not covered by the hook)
  const [extraLeaderboards, setExtraLeaderboards] = useState({});
  const [extraLoadingScopes, setExtraLoadingScopes] = useState({});
  const [extraErrors, setExtraErrors] = useState({});
  const extraLoadingMoreRef = useRef({});
  
  // Track what's been initialized to prevent re-runs
  const profileFetchedRef = useRef(false);
  const profileSeededRef = useRef(false);
  const extraCacheLoadedRef = useRef(false);
  const dataFetchTriggeredRef = useRef({});

  // ✅ Use the aggregated hook for global/school/group
  const {
    leaderboards: aggLeaderboards,
    loadingScopes: aggLoadingScopes,
    errors: aggErrors,
    period: hookPeriod,
    setPeriod: setHookPeriod,
    loadLeaderboardPage: aggLoadLeaderboardPage,
  } = useAggregatedLeaderboard(user?.uid || null, userProfile);

  // Memoized profile data to prevent unnecessary re-renders
  const profileData = useMemo(() => userProfile ? {
    schoolId: userProfile.schoolId,
    schoolName: userProfile.schoolName,
    groupId: userProfile.groupId,
    groupName: userProfile.groupName,
    unionId: userProfile.unionId,
    upazilaId: userProfile.upazilaId,
    districtId: userProfile.districtId,
    divisionId: userProfile.divisionId,
  } : null, [userProfile]);

  // single source of truth for period (sync hook <-> page)
  useEffect(() => {
    if (hookPeriod !== period) {
      setHookPeriod(period);
    }
  }, [period, hookPeriod, setHookPeriod]);

  // ---- Fetch profile (v9 modular) - only run once per user
  useEffect(() => {
    const userKey = user?.uid || 'no-user';
    if (authLoading || profileFetchedRef.current === userKey) return;
    
    if (!user) {
      setProfileLoading(false);
      profileFetchedRef.current = userKey;
      return;
    }
    
    profileFetchedRef.current = userKey;
    let mounted = true;
    
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (mounted && snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
        } else {
          console.warn("[LeaderboardPage] Profile missing");
          setUserProfile(null);
        }
      } catch (err) {
        console.error("[LeaderboardPage] Profile fetch error:", err);
        setUserProfile(null);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [user?.uid, authLoading]);

  // seed IDs from profile (once available) - only run once per profile
  useEffect(() => {
    const profileKey = profileData ? JSON.stringify(profileData) : 'no-profile';
    if (!profileData || profileSeededRef.current === profileKey) return;
    
    profileSeededRef.current = profileKey;
    
    if (profileData.schoolId) setSchoolId((prev) => prev || profileData.schoolId);
    if (profileData.schoolName) setSchoolName((prev) => prev || profileData.schoolName);
    if (profileData.groupId) setGroupId((prev) => prev || profileData.groupId);
    if (profileData.groupName) setGroupName((prev) => prev || profileData.groupName);
  }, [profileData]);

  // ---------- Local fetching for extra scopes (union/upazila/district/division) ----------

  const buildExtraScopeQuery = useCallback(
    (scopeKey, startAfterDoc = null) => {
      if (!user || !profileData) return null;

      let field = null;
      let value = null;

      switch (scopeKey) {
        case "union":
          field = "unionId";
          value = profileData.unionId || null;
          break;
        case "upazila":
          field = "upazilaId";
          value = profileData.upazilaId || null;
          break;
        case "district":
          field = "districtId";
          value = profileData.districtId || null;
          break;
        case "division":
          field = "divisionId";
          value = profileData.divisionId || null;
          break;
        default:
          return null;
      }

      if (!field || !value) {
        console.warn("[LeaderboardPage] Missing field/value for extra scope", { scopeKey, field, value });
        return null;
      }

      let q = query(
        collection(db, "scores"),
        where(field, "==", value),
        orderBy("combinedScore", "desc"),
        orderBy("timeTaken", "asc"),
        limit(PAGE_SIZE)
      );

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      return q;
    },
    [user, profileData]
  );

  const loadExtraScopePage = useCallback(
    async (scopeKey, isLoadMore = false) => {
      if (!user || extraLoadingMoreRef.current[scopeKey]) return;

      setExtraErrors((prev) => ({ ...prev, [scopeKey]: null }));
      setExtraLoadingScopes((prev) => ({ ...prev, [scopeKey]: true }));
      extraLoadingMoreRef.current[scopeKey] = true;

      try {
        const currentData = extraLeaderboards[scopeKey] || {
          entries: [],
          lastDoc: null,
          hasMore: true,
        };
        if (!currentData.hasMore && isLoadMore) {
          return;
        }

        const q = buildExtraScopeQuery(scopeKey, currentData.lastDoc);
        if (!q) {
          const msg = `No data for ${scopeKey}`;
          console.warn("[LeaderboardPage]", msg);
          setExtraErrors((prev) => ({ ...prev, [scopeKey]: msg }));
          return;
        }

        const snap = await getDocs(q);
        const newEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const hasMore = snap.docs.length === PAGE_SIZE;
        const updatedEntries = isLoadMore ? [...currentData.entries, ...newEntries] : newEntries;

        // cache (separate key pattern is fine)
        try {
          const cacheKey = getStorageKey(scopeKey, user.uid, period, null);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              entries: updatedEntries,
              lastDocIndex: snap.docs.length ? snap.docs.length - 1 : null,
              hasMore,
              lastUpdated: Date.now(),
            })
          );
        } catch (e) {
          console.warn("[LeaderboardPage] Cache write (extra scope) failed", e);
        }

        setExtraLeaderboards((prev) => ({
          ...prev,
          [scopeKey]: {
            entries: updatedEntries,
            lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
            hasMore,
          },
        }));
      } catch (err) {
        console.error("[LeaderboardPage] Load (extra scope) error", { scopeKey, err });
        setExtraErrors((prev) => ({
          ...prev,
          [scopeKey]: "Unable to load leaderboard. Try again.",
        }));
      } finally {
        setExtraLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
        extraLoadingMoreRef.current[scopeKey] = false;
      }
    },
    [user, period, extraLeaderboards, buildExtraScopeQuery]
  );

  // ---- Load cached data for extra scopes - only run once per user/period
  useEffect(() => {
    const cacheKey = `${user?.uid}-${period}`;
    if (!user || extraCacheLoadedRef.current === cacheKey) return;
    
    extraCacheLoadedRef.current = cacheKey;
    const cachedData = {};
    
    ["union", "upazila", "district", "division"].forEach((key) => {
      const cache = loadCachedLeaderboard(key, user.uid, period, null);
      if (cache && cache.entries.length) {
        cachedData[key] = {
          entries: cache.entries,
          lastDoc: null,
          hasMore: cache.hasMore ?? true,
        };
      }
    });
    
    if (Object.keys(cachedData).length) {
      setExtraLeaderboards(cachedData);
    }
  }, [user?.uid, period]);

  // ---- Ensure current scope has data - prevent multiple triggers for same scope
  useEffect(() => {
    const triggerKey = `${user?.uid}-${selectedScope}-${period}`;
    if (!user || profileLoading || dataFetchTriggeredRef.current[triggerKey]) return;
    
    dataFetchTriggeredRef.current[triggerKey] = true;

    if (["global", "school", "group"].includes(selectedScope)) {
      const aggScopeData = aggLeaderboards[selectedScope];
      if (!aggScopeData || !aggScopeData.entries?.length) {
        console.debug("[LeaderboardPage] Trigger hook fetch for", selectedScope);
        aggLoadLeaderboardPage(selectedScope, false);
      }
    } else {
      const extraData = extraLeaderboards[selectedScope];
      if (!extraData || !extraData.entries?.length) {
        console.debug("[LeaderboardPage] Trigger extra-scope fetch for", selectedScope);
        loadExtraScopePage(selectedScope, false);
      }
    }
  }, [
    user?.uid,
    profileLoading,
    selectedScope,
    period,
    aggLeaderboards,
    aggLoadLeaderboardPage,
    extraLeaderboards,
    loadExtraScopePage,
  ]);

  // Reset fetch triggers when scope changes
  useEffect(() => {
    // Clear the trigger for the current scope when scope changes
    const prevTriggers = { ...dataFetchTriggeredRef.current };
    Object.keys(prevTriggers).forEach(key => {
      if (key.includes(`-${selectedScope}-`)) {
        delete dataFetchTriggeredRef.current[key];
      }
    });
  }, [selectedScope]);

  // derive current scope data/loading/error and rank
  const { scopeEntries, scopeHasMore, scopeLoading, scopeError } = useMemo(() => {
    if (["global", "school", "group"].includes(selectedScope)) {
      const scopeData = aggLeaderboards[selectedScope] || { entries: [], hasMore: true };
      return {
        scopeEntries: scopeData.entries || [],
        scopeHasMore: !!scopeData.hasMore,
        scopeLoading: !!aggLoadingScopes[selectedScope],
        scopeError: aggErrors[selectedScope] || null,
      };
    }
    const scopeData = extraLeaderboards[selectedScope] || { entries: [], hasMore: true };
    return {
      scopeEntries: scopeData.entries || [],
      scopeHasMore: !!scopeData.hasMore,
      scopeLoading: !!extraLoadingScopes[selectedScope],
      scopeError: extraErrors[selectedScope] || null,
    };
  }, [
    selectedScope,
    aggLeaderboards,
    aggLoadingScopes,
    aggErrors,
    extraLeaderboards,
    extraLoadingScopes,
    extraErrors,
  ]);

  const userRankInfo = useMemo(() => {
    if (!user) return null;
    const idx = scopeEntries.findIndex((e) => e.userId === user.uid);
    if (idx === -1) return null;
    const entry = scopeEntries[idx];
    return {
      rank: idx + 1,
      total: scopeEntries.length,
      combinedScore: Number(entry.combinedScore ?? entry.score ?? 0),
      userId: entry.userId,
    };
  }, [scopeEntries, user?.uid]);

  // load more (route to hook or extra)
  const handleLoadMore = useCallback(() => {
    if (["global", "school", "group"].includes(selectedScope)) {
      console.debug("[LeaderboardPage] Load more via hook for", selectedScope);
      aggLoadLeaderboardPage(selectedScope, true);
    } else {
      console.debug("[LeaderboardPage] Load more for extra scope", selectedScope);
      loadExtraScopePage(selectedScope, true);
    }
  }, [selectedScope, aggLoadLeaderboardPage, loadExtraScopePage]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading profile and leaderboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-gray-700">You must be logged in to view the leaderboard.</p>
        <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-white max-w-6xl mx-auto">
      <LeaderboardControls
        selectedScope={selectedScope}
        setSelectedScope={setSelectedScope}
        period={period}
        setPeriod={setPeriod}
        schoolId={schoolId}
        setSchoolId={setSchoolId}
        schoolName={schoolName}
        setSchoolName={setSchoolName}
        groupId={groupId}
        setGroupId={setGroupId}
        groupName={groupName}
        setGroupName={setGroupName}
      />

      <UserRankCard userRankInfo={userRankInfo} />

      {scopeError && <div className="text-red-600 mb-4">{scopeError}</div>}

      <LeaderboardTable
        data={scopeEntries}
        highlightUserId={user.uid}
        loading={scopeLoading}
        error={scopeError}
        onLoadMore={handleLoadMore}
        hasMore={scopeHasMore}
        topN={20}
        fetchMissingNames={true}
      />
    </div>
  );
}
