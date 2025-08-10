import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import Leaderboard from "../components/Leaderboard";
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";

const SCOPES = [
  { key: "school", label: "School" },
  { key: "union", label: "Union/Pouroshava" },
  { key: "upazila", label: "Upazila" },
  { key: "district", label: "District" },
  { key: "division", label: "Division" },
];

const PAGE_SIZE = 20;
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24 hours

function getStorageKey(scopeKey, userId) {
  return `${STORAGE_PREFIX}${userId}_${scopeKey}`;
}

function isOffPeakUSCentral() {
  const now = new Date();
  // UTC hour minus 5 for CST (no DST adjustment)
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6; // 12am-6am CST off-peak
}

function loadCachedLeaderboard(scopeKey, userId) {
  try {
    const json = localStorage.getItem(getStorageKey(scopeKey, userId));
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.entries) return null;

    const now = Date.now();
    const age = now - (parsed.lastUpdated || 0);

    if (age > CACHE_EXPIRATION) {
      // Cache expired
      if (isOffPeakUSCentral()) {
        // Allowed to refresh now - treat as no cache to force reload
        return null;
      } else {
        // Use stale cache but no refresh
        return parsed;
      }
    }
    // Cache fresh
    return parsed;
  } catch (e) {
    console.warn("[LeaderboardPage] Failed to read cache", e);
    return null;
  }
}

export default function LeaderboardPage() {
  const { user, authLoading } = useAuth();

  const [selectedScope, setSelectedScope] = useState("school");
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [leaderboards, setLeaderboards] = useState({}); // { scopeKey: { entries, lastDoc, hasMore } }
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});

  const loadingMoreRef = useRef({});

  // Fetch user profile to get location info
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfileLoading(false);
      return;
    }

    let mounted = true;
    async function fetchUserProfile() {
      try {
        const userDocRef = collection(db, "users").doc
          ? db.collection("users").doc(user.uid)
          : null;

        if (!userDocRef) {
          // fallback query by uid
          const q = query(collection(db, "users"), where("uid", "==", user.uid));
          const snap = await getDocs(q);
          if (mounted && !snap.empty) setUserProfile(snap.docs[0].data());
        } else {
          const snap = await userDocRef.get();
          if (mounted && snap.exists()) setUserProfile(snap.data());
        }
      } catch (err) {
        console.error("[LeaderboardPage] Failed to fetch user profile", err);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    fetchUserProfile();
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  // Build query for scope and pagination
  const buildScopeQuery = useCallback(
    (scopeKey, userProfile, startAfterDoc = null) => {
      if (!userProfile) return null;
      const scopeValue = userProfile[scopeKey];
      if (!scopeValue) return null;

      let baseQuery = query(
        collection(db, "scores"),
        where(scopeKey, "==", scopeValue),
        orderBy("score", "desc"),
        orderBy("timeTaken", "asc"),
        limit(PAGE_SIZE)
      );

      if (startAfterDoc) {
        baseQuery = query(
          collection(db, "scores"),
          where(scopeKey, "==", scopeValue),
          orderBy("score", "desc"),
          orderBy("timeTaken", "asc"),
          startAfter(startAfterDoc),
          limit(PAGE_SIZE)
        );
      }

      return baseQuery;
    },
    []
  );

  // Load one page for a scope
  const loadLeaderboardPage = useCallback(
    async (scopeKey, isLoadMore = false) => {
      if (!userProfile) return;
      if (loadingMoreRef.current[scopeKey]) return;

      setErrors((prev) => ({ ...prev, [scopeKey]: null }));
      setLoadingScopes((prev) => ({ ...prev, [scopeKey]: true }));
      loadingMoreRef.current[scopeKey] = true;

      try {
        const currentData = leaderboards[scopeKey] || {
          entries: [],
          lastDoc: null,
          hasMore: true,
        };

        if (!currentData.hasMore && isLoadMore) {
          setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
          loadingMoreRef.current[scopeKey] = false;
          return;
        }

        const q = buildScopeQuery(scopeKey, userProfile, currentData.lastDoc);
        if (!q) {
          setErrors((prev) => ({
            ...prev,
            [scopeKey]: `No data available for ${scopeKey}`,
          }));
          setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
          loadingMoreRef.current[scopeKey] = false;
          return;
        }

        const snap = await getDocs(q);
        const docs = snap.docs;

        const newEntries = docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const hasMore = docs.length === PAGE_SIZE;

        const updatedEntries = isLoadMore
          ? [...currentData.entries, ...newEntries]
          : newEntries;

        // Cache with lastUpdated
        try {
          localStorage.setItem(
            getStorageKey(scopeKey, user.uid),
            JSON.stringify({
              entries: updatedEntries,
              lastDocIndex: docs.length ? docs.length - 1 : null,
              hasMore,
              lastUpdated: Date.now(),
            })
          );
        } catch (e) {
          console.warn("[LeaderboardPage] Failed to write cache", e);
        }

        setLeaderboards((prev) => ({
          ...prev,
          [scopeKey]: {
            entries: updatedEntries,
            lastDoc: docs.length ? docs[docs.length - 1] : null,
            hasMore,
          },
        }));
      } catch (err) {
        console.error(`[LeaderboardPage] Failed to fetch ${scopeKey} leaderboard`, err);
        setErrors((prev) => ({
          ...prev,
          [scopeKey]: "Unable to load leaderboard. Please try again later.",
        }));
      } finally {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
        loadingMoreRef.current[scopeKey] = false;
      }
    },
    [userProfile, leaderboards, buildScopeQuery, user]
  );

  // Load cached leaderboards on user & profile change
  useEffect(() => {
    if (!user || !userProfile) return;

    const cachedData = {};
    SCOPES.forEach(({ key }) => {
      const cache = loadCachedLeaderboard(key, user.uid);
      if (cache && cache.entries.length) {
        cachedData[key] = {
          entries: cache.entries,
          lastDoc: null,
          hasMore: cache.hasMore ?? true,
        };
      }
    });
    setLeaderboards(cachedData);
  }, [user, userProfile]);

  // Load page on scope change if no cached entries
  useEffect(() => {
    if (!profileLoading && userProfile) {
      const scopeData = leaderboards[selectedScope];
      if (!scopeData || scopeData.entries.length === 0) {
        loadLeaderboardPage(selectedScope, false);
      }
    }
  }, [selectedScope, userProfile, profileLoading, leaderboards, loadLeaderboardPage]);

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
        <Link
          to="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const scopeData = leaderboards[selectedScope] || { entries: [], hasMore: true };
  const isLoading = loadingScopes[selectedScope];
  const errorMsg = errors[selectedScope];

  const handleLoadMore = () => {
    if (!isLoading && scopeData.hasMore) {
      loadLeaderboardPage(selectedScope, true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-white max-w-4xl mx-auto">
      <h2 className="text-3xl font-semibold mb-4 text-blue-700">Top Players</h2>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-300">
        {SCOPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedScope(key)}
            className={`py-2 px-4 -mb-px font-semibold border-b-2 ${
              selectedScope === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-blue-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}

      {/* Leaderboard */}
      <Leaderboard data={scopeData.entries} currentUserId={user.uid} />

      {/* Load more button */}
      {scopeData.hasMore && !errorMsg && (
        <button
          onClick={handleLoadMore}
          disabled={isLoading}
          className={`mt-6 px-6 py-2 rounded ${
            isLoading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLoading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
