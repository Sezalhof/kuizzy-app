// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { useAggregatedLeaderboard } from "../hooks/useAggregatedLeaderboard";
import LeaderboardTable from "../components/LeaderboardTable";
import { getTwoMonthPeriod } from '../utils/saveAttemptAndLeaderboard';

import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

const SCOPES = [
  { key: "global", label: "Global" },
  { key: "school", label: "School" },
  { key: "union", label: "Union/Pouroshava" },
  { key: "upazila", label: "Upazila" },
  { key: "district", label: "District" },
  { key: "division", label: "Division" },
];

const PAGE_SIZE = 20; // Reconciled
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h

const SCOPE_FIELD_MAP = {
  union: "unionId",
  upazila: "upazilaId",
  district: "districtId",
  division: "divisionId",
};

// ------------------ Helpers ------------------
function isOffPeakUSCentral() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6;
}

function loadCachedLeaderboard(scopeKey, userId, period, groupId = null) {
  try {
    const key =
      scopeKey === "group"
        ? `${STORAGE_PREFIX}${userId}_group_${groupId || "self"}_${period}`
        : `${STORAGE_PREFIX}${userId}_${scopeKey}_${period}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.entries) return null;
    const age = Date.now() - (parsed.lastUpdated || 0);
    if (age > CACHE_EXPIRATION && !isOffPeakUSCentral()) return null;
    parsed.entries = parsed.entries.slice(0, PAGE_SIZE); // Apply PAGE_SIZE
    return parsed;
  } catch (e) {
    console.warn("[LeaderboardPage] Cache parse failed", e);
    return null;
  }
}

// ------------------ Controls ------------------
function LeaderboardControls({
  selectedScope,
  setSelectedScope,
  period,
  setPeriod,
  profileData,
  hookAvailableScopes = [],
}) {
  const getUnavailableScopes = () => {
    if (!profileData) return [];
    const unavailable = [];
    Object.entries(SCOPE_FIELD_MAP).forEach(([scopeKey, fieldName]) => {
      if (!profileData[fieldName]) unavailable.push(scopeKey);
    });
    ["school"].forEach((scopeKey) => {
      if (!hookAvailableScopes?.includes(scopeKey) && !unavailable.includes(scopeKey)) {
        unavailable.push(scopeKey);
      }
    });
    return unavailable;
  };
  const unavailableScopes = getUnavailableScopes();

  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <div className="flex gap-2 flex-wrap">
        <select
          className="border rounded px-2 py-1"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value={getTwoMonthPeriod()}>{getTwoMonthPeriod()}</option>
        </select>

        <select
          className="border rounded px-2 py-1"
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
        >
          {SCOPES.map(({ key, label }) => (
            <option key={key} value={key} disabled={unavailableScopes.includes(key)}>
              {label} {unavailableScopes.includes(key) ? "(Not Available)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ------------------ User Rank ------------------
function UserRankCard({ userRankInfo }) {
  if (!userRankInfo)
    return (
      <div className="text-gray-600 p-3 border rounded mb-4">
        No attempts found for this period/scope.
      </div>
    );
  return (
    <div className="p-3 border rounded mb-4">
      <div className="text-sm text-gray-500">Your Rank</div>
      <div className="text-xl font-bold">
        {userRankInfo.rank} / {userRankInfo.total ?? "?"}
      </div>
      <div className="text-sm text-gray-500">
        Combined Score: {Number(userRankInfo.combinedScore ?? 0).toFixed(2)}
      </div>
    </div>
  );
}

// ------------------ Main Page ------------------
export default function LeaderboardPage() {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryScope = params.get("scope") || "global";

  const [selectedScope, setSelectedScope] = useState(queryScope);
  const [period, setPeriod] = useState(getTwoMonthPeriod());
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileFetchedRef = useRef(false);

  // Fetch user profile
  useEffect(() => {
    if (!user || profileFetchedRef.current) {
      setProfileLoading(false);
      return;
    }
    profileFetchedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (mounted && snap.exists()) setUserProfile(snap.data());
      } catch {
        if (mounted) setUserProfile(null);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [user]);

  // Use hook for aggregated leaderboard
  const {
    leaderboards: aggLeaderboards,
    loadingScopes: aggLoadingScopes,
    errors: aggErrors,
    period: hookPeriod,
    setPeriod: setHookPeriod,
    loadLeaderboardPage: aggLoadLeaderboardPage,
    availableScopes: hookAvailableScopes,
  } = useAggregatedLeaderboard(user?.uid || null, userProfile, null);

  useEffect(() => {
    if (hookPeriod !== period) setHookPeriod(period);
  }, [period, hookPeriod, setHookPeriod]);

  const profileData = useMemo(() => {
    if (!userProfile) return null;
    return {
      schoolId: userProfile.schoolId,
      schoolName: userProfile.schoolName,
      unionId: userProfile.unionId,
      upazilaId: userProfile.upazilaId,
      districtId: userProfile.districtId,
      divisionId: userProfile.divisionId,
    };
  }, [userProfile]);

  // Determine current scope data
  const { scopeEntries, scopeHasMore, scopeLoading, scopeError } = useMemo(() => {
    const cached = loadCachedLeaderboard(selectedScope, user?.uid, period);
    if (cached) return { scopeEntries: cached.entries, scopeHasMore: false, scopeLoading: false, scopeError: null };
    if (["global", "school", "union", "upazila", "district", "division"].includes(selectedScope)) {
      const data = aggLeaderboards[selectedScope] || { entries: [], hasMore: true };
      return {
        scopeEntries: data.entries || [],
        scopeHasMore: !!data.hasMore,
        scopeLoading: !!aggLoadingScopes[selectedScope],
        scopeError: aggErrors[selectedScope] || null,
      };
    }
    return { scopeEntries: [], scopeHasMore: false, scopeLoading: false, scopeError: null };
  }, [selectedScope, aggLeaderboards, aggLoadingScopes, aggErrors, user?.uid, period]);

  const userRankInfo = useMemo(() => {
    if (!user) return null;
    const idx = scopeEntries.findIndex((e) => e.userId === user.uid);
    if (idx === -1) return null;
    const entry = scopeEntries[idx];
    return {
      rank: idx + 1,
      total: scopeEntries.length,
      combinedScore: Number(entry.combinedScore ?? entry.score ?? 0),
    };
  }, [scopeEntries, user]);

  const handleLoadMore = useCallback(() => {
    if (["global", "school", "union", "upazila", "district", "division"].includes(selectedScope)) {
      aggLoadLeaderboardPage(selectedScope, true);
    }
  }, [selectedScope, aggLoadLeaderboardPage]);

  useEffect(() => {
    if (!profileData) return;
    const isUnavailable =
      ["global", "school"].includes(selectedScope)
        ? !hookAvailableScopes?.includes(selectedScope) && selectedScope !== "global"
        : !profileData[SCOPE_FIELD_MAP[selectedScope]];
    if (isUnavailable) setSelectedScope("global");
  }, [selectedScope, profileData, hookAvailableScopes]);

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
        profileData={profileData}
        hookAvailableScopes={hookAvailableScopes}
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
        topN={PAGE_SIZE}
        fetchMissingNames={true}
      />
    </div>
  );
}
