// src/pages/GroupLeaderboardPage.js
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, query } from "firebase/firestore";
import GroupLeaderboard from "../components/leaderboard/GroupLeaderboard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";

// ------------------ Cache Helper ------------------
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h

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
    return parsed;
  } catch (e) {
    console.warn("[GroupLeaderboardPage] Cache parse failed", e);
    return null;
  }
}

// ------------------ Main Component ------------------
export default function GroupLeaderboardPage() {
  const { groupId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);

  const [validGroupId, setValidGroupId] = useState(groupId);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const period = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month % 2 === 0 ? `${month}-${month + 1}-${year}` : `${month + 1}-${month + 2}-${year}`;
  }, []);

  useEffect(() => {
    if (!groupId) setValidGroupId(null);
    else setValidGroupId(groupId);
  }, [groupId]);

  // Load leaderboard (cached first)
  useEffect(() => {
    if (!user || !validGroupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const cached = loadCachedLeaderboard("group", user.uid, period, validGroupId);
    if (cached) {
      setLeaderboardData(cached.entries);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const q = query(collection(db, "group_leaderboards", validGroupId, "members"));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
        setLeaderboardData(entries);

        // Cache it
        const key = `${STORAGE_PREFIX}${user.uid}_group_${validGroupId}_${period}`;
        localStorage.setItem(
          key,
          JSON.stringify({ entries, lastUpdated: Date.now() })
        );
      } catch (err) {
        console.error("[GroupLeaderboardPage] Fetch error:", err);
        setError("❌ Failed to load group leaderboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, validGroupId, period]);

  if (authLoading || profileLoading || loading) return <LoadingSpinner />;

  if (!validGroupId) {
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

  if (!user || !profile) {
    return (
      <div className="p-6 text-center text-red-600">
        Missing profile. Please enroll or refresh.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        🏆 Group Leaderboard
      </h1>

      {error && <div className="text-red-600 text-center mb-4">{error}</div>}

      {leaderboardData ? (
        <GroupLeaderboard groupId={validGroupId} initialData={leaderboardData} />
      ) : (
        <p className="text-center text-gray-500">No leaderboard data available.</p>
      )}
    </div>
  );
}
