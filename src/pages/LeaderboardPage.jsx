// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";
import LeaderboardTable from "../components/LeaderboardTable";
import { getTwoMonthPeriod } from "../utils/dateUtils";
import { useLocation } from "react-router-dom";

const SCOPES = [
  { key: "global", label: "Global" },
  { key: "school", label: "School" },
  { key: "group", label: "Group" },
  { key: "union", label: "Union/Pouroshava" },
  { key: "upazila", label: "Upazila" },
  { key: "district", label: "District" },
  { key: "division", label: "Division" },
];

const PAGE_SIZE = 20;

const SCOPE_FIELD_MAP = {
  union: "unionId",
  upazila: "upazilaId",
  district: "districtId",
  division: "divisionId",
};

// ------------------ Controls ------------------
function LeaderboardControls({ selectedScope, setSelectedScope, period, setPeriod, profileData, availableScopes }) {
  const unavailableScopes = useMemo(() => {
    if (!profileData) return [];
    const arr = [];
    Object.entries(SCOPE_FIELD_MAP).forEach(([k, f]) => {
      if (!profileData[f]) arr.push(k);
    });
    if (!availableScopes?.includes("school")) arr.push("school");
    return arr;
  }, [profileData, availableScopes]);

  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <div className="flex gap-2 flex-wrap">
        <select className="border rounded px-2 py-1" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value={getTwoMonthPeriod()}>{getTwoMonthPeriod()}</option>
        </select>

        <select className="border rounded px-2 py-1" value={selectedScope} onChange={(e) => setSelectedScope(e.target.value)}>
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
  if (!userRankInfo) return <div className="text-gray-600 p-3 border rounded mb-4">No attempts found for this period/scope.</div>;
  return (
    <div className="p-3 border rounded mb-4">
      <div className="text-sm text-gray-500">Your Rank</div>
      <div className="text-xl font-bold">{userRankInfo.rank} / {userRankInfo.total ?? "?"}</div>
      <div className="text-sm text-gray-500">
        Combined Score: {Number(userRankInfo.combinedScore ?? 0).toFixed(2)}
        {userRankInfo.school ? ` | ${userRankInfo.school}` : ""}
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

  // Fetch profile
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await fetch(`/api/users/${user.uid}`);
        const data = await snap.json();
        if (mounted) setUserProfile(data);
      } catch {
        if (mounted) setUserProfile(null);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [user]);

  // Unified leaderboard hook
  const {
    leaderboards,
    loadingScopes,
    errors,
    availableScopes,
    loadLeaderboardPage,
    listenGroup,
    stopListeningGroup,
  } = useUnifiedLeaderboard(user?.uid || null, userProfile, period);

  const profileData = useMemo(() => {
    if (!userProfile) return null;
    return {
      schoolId: userProfile.schoolId,
      schoolName: userProfile.schoolName,
      unionId: userProfile.unionId,
      upazilaId: userProfile.upazilaId,
      districtId: userProfile.districtId,
      divisionId: userProfile.divisionId,
      groups: userProfile.groups || [], // list of group IDs
    };
  }, [userProfile]);

  // Automatically start listening to user's groups
  useEffect(() => {
    if (!profileData?.groups?.length) return;
    profileData.groups.forEach((groupId) => {
      listenGroup(groupId);
    });
    return () => {
      profileData.groups.forEach((groupId) => stopListeningGroup(groupId));
    };
  }, [profileData, listenGroup, stopListeningGroup]);

  // Determine current scope data safely
  const { scopeEntries, scopeHasMore, scopeLoading, scopeError } = useMemo(() => {
    const data = leaderboards?.[selectedScope] || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return {
      scopeEntries: entries,
      scopeHasMore: !!data.hasMore,
      scopeLoading: !!loadingScopes?.[selectedScope],
      scopeError: errors?.[selectedScope] || null,
    };
  }, [selectedScope, leaderboards, loadingScopes, errors]);

  const userRankInfo = useMemo(() => {
    if (!user || !Array.isArray(scopeEntries) || scopeEntries.length === 0) return null;
    const idx = scopeEntries.findIndex((e) => e.userId === user.uid);
    if (idx === -1) return null;
    const entry = scopeEntries[idx];
    return {
      rank: entry.rank ?? idx + 1,
      total: scopeEntries.length,
      combinedScore: Number(entry.combinedScore ?? entry.score ?? 0),
      school: entry.school || userProfile?.schoolName || null,
    };
  }, [scopeEntries, user, userProfile]);

  const handleLoadMore = useCallback(() => {
    loadLeaderboardPage(selectedScope, true);
  }, [selectedScope, loadLeaderboardPage]);

  // Fallback scope if unavailable
  useEffect(() => {
    if (!profileData) return;
    const isUnavailable =
      ["global", "school"].includes(selectedScope)
        ? !availableScopes?.includes(selectedScope) && selectedScope !== "global"
        : !profileData[SCOPE_FIELD_MAP[selectedScope]];
    if (isUnavailable) setSelectedScope("global");
  }, [selectedScope, profileData, availableScopes]);

  if (authLoading || profileLoading) {
    return <div className="flex justify-center items-center h-screen"><p className="text-gray-500">Loading profile and leaderboard...</p></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-gray-700">You must be logged in to view the leaderboard.</p>
        <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</a>
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
        availableScopes={availableScopes}
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
