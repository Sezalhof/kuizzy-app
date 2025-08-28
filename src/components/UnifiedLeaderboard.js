// src/components/UnifiedLeaderboard.js
import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, onSnapshot } from "firebase/firestore";
import useAuth from "../hooks/useAuth";

// ------------------ Cache Helper ------------------
const STORAGE_PREFIX = "kuizzy_leaderboard_";
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24; // 24h

function isOffPeakUSCentral() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const centralHour = (utcHour + 24 - 5) % 24;
  return centralHour >= 0 && centralHour < 6;
}

function loadCachedLeaderboard(scopeKey, userId, period, contextId = null) {
  try {
    const key =
      scopeKey === "group"
        ? `${STORAGE_PREFIX}${userId}_group_${contextId || "self"}_${period}`
        : `${STORAGE_PREFIX}${userId}_${scopeKey}_${period}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed.entries) return null;
    const age = Date.now() - (parsed.lastUpdated || 0);
    if (age > CACHE_EXPIRATION && !isOffPeakUSCentral()) return null;
    return parsed.entries;
  } catch {
    return null;
  }
}

function saveLeaderboardCache(scopeKey, userId, period, contextId, entries) {
  try {
    const key =
      scopeKey === "group"
        ? `${STORAGE_PREFIX}${userId}_group_${contextId || "self"}_${period}`
        : `${STORAGE_PREFIX}${userId}_${scopeKey}_${period}`;
    localStorage.setItem(
      key,
      JSON.stringify({ entries, lastUpdated: Date.now() })
    );
  } catch {}
}

// ------------------ Main Component ------------------
export default function UnifiedLeaderboard({
  scope = "global",
  contextId = null,
  liveMode = false,
}) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const period = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month % 2 === 0 ? `${month}-${month + 1}-${year}` : `${month + 1}-${month + 2}-${year}`;
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError("");

    // Attempt to load cached data first (if not live)
    if (!liveMode) {
      const cached = loadCachedLeaderboard(scope, user.uid, period, contextId);
      if (cached) {
        setLeaderboard(cached);
        setLoading(false);
        return;
      }
    }

    // Function to fetch leaderboard from Firestore
    const fetchLeaderboard = async () => {
      try {
        const colPath =
          scope === "group"
            ? `group_leaderboards/${contextId}/members`
            : `leaderboards/${scope}_${period}/members`;
        const colRef = collection(db, colPath);

        if (liveMode) {
          // Real-time listener
          const unsubscribe = onSnapshot(
            colRef,
            (snapshot) => {
              const entries = snapshot.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
              setLeaderboard(entries);
            },
            (err) => setError("❌ Failed to load leaderboard.")
          );
          return unsubscribe; // cleanup listener
        } else {
          // One-time fetch
          const snapshot = await getDocs(colRef);
          const entries = snapshot.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
          setLeaderboard(entries);
          saveLeaderboardCache(scope, user.uid, period, contextId, entries);
        }
      } catch (err) {
        console.error("[UnifiedLeaderboard] Fetch error:", err);
        setError("❌ Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = fetchLeaderboard();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [user, scope, contextId, period, liveMode]);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!leaderboard?.length) return [];
    return [...leaderboard]
      .map((entry) => ({
        ...entry,
        timeTaken: entry.timeTaken ?? entry.time ?? 9999,
        timeMillis: entry.timeMillis ?? 0,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
        return a.timeMillis - b.timeMillis;
      })
      .slice(0, 10);
  }, [leaderboard]);

  if (loading) return <p className="text-center text-gray-500 mt-6">Loading leaderboard...</p>;
  if (error) return <p className="text-center text-red-500 mt-6">{error}</p>;
  if (!sortedData.length) return <p className="text-center text-gray-500 mt-6">No leaderboard data yet.</p>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        🏆 {scope.charAt(0).toUpperCase() + scope.slice(1)} Leaderboard
      </h2>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <TableHeader title="Rank" />
              <TableHeader title="Name" />
              <TableHeader title="Score" />
              <TableHeader title="Time (s.ms)" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((entry, index) => {
              const isCurrent = user?.uid === entry.userId;
              return (
                <tr key={entry.id || index} className={isCurrent ? "bg-blue-50 font-semibold" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{entry.username || entry.email || "Unknown"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">{entry.score} pts</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {entry.timeTaken}s{entry.timeMillis ? `.${entry.timeMillis.toString().padStart(3, "0")}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TableHeader = ({ title }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</th>
);
