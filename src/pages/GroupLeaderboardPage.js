//src/pages/GroupLeaderboardPage.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import GroupLeaderboard from "../components/GroupLeaderboard";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const STORAGE_PREFIX = "kuizzy_group_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24 hours

function getStorageKey(groupId) {
  return `${STORAGE_PREFIX}${groupId}`;
}

function isOffPeakUSCentral() {
  const now = new Date();
  // UTC hour minus 5 for CST (no DST adjustment)
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6;
}

function loadCachedGroupLeaderboard(groupId) {
  try {
    const json = localStorage.getItem(getStorageKey(groupId));
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.data) return null;

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
    return parsed;
  } catch (e) {
    console.warn("[GroupLeaderboardPage] Failed to read cache", e);
    return null;
  }
}

export default function GroupLeaderboardPage() {
  const { groupId } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadingRef = useRef(false);

  const fetchScores = useCallback(async () => {
    if (!groupId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const q = query(collection(db, "scores"), where("groupId", "==", groupId));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(results);

      // Save cache with timestamp
      try {
        localStorage.setItem(
          getStorageKey(groupId),
          JSON.stringify({ data: results, lastUpdated: Date.now() })
        );
      } catch (e) {
        console.warn("[GroupLeaderboardPage] Failed to write cache", e);
      }
    } catch (err) {
      setData([]);
      console.error("[GroupLeaderboardPage] Failed to fetch scores", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [groupId]);

  // Load cached data on mount or groupId change
  useEffect(() => {
    if (!groupId) return;

    const cached = loadCachedGroupLeaderboard(groupId);
    if (cached && cached.data?.length) {
      setData(cached.data);

      // If cache expired and we are off-peak, refresh from server
      if (
        Date.now() - (cached.lastUpdated || 0) > CACHE_EXPIRATION &&
        isOffPeakUSCentral()
      ) {
        fetchScores();
      } else {
        setLoading(false);
      }
    } else {
      // No valid cache, fetch immediately
      fetchScores();
    }
  }, [groupId, fetchScores]);

  if (!groupId) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center text-red-600">
        Invalid group ID. Please go back to{" "}
        <Link to="/groups" className="underline text-blue-600">
          Groups
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        🏆 Group Leaderboard
      </h1>
      {loading ? <LoadingSpinner /> : <GroupLeaderboard groupId={groupId} data={data} />}
    </div>
  );
}
