// src/components/GroupLeaderboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import LoadingSpinner from "./ui/LoadingSpinner";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";

const DEBUG_MODE = true; // set true to enable debug logs

export default function GroupLeaderboard({ groupIds = [], userProfile, period }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("live"); // 'live' or 'cached'

  const groupId = groupIds[0]; // Only one group per table now

  const {
    leaderboards,
    loadingScopes,
    errors,
    listenGroup,
    stopListeningGroup,
    loadLeaderboardPage,
  } = useUnifiedLeaderboard(
    user?.uid || null,
    userProfile,
    period,
    activeTab === "cached" ? "cached" : "live"
  );

  // Listen for live updates
  useEffect(() => {
    if (!groupId || activeTab !== "live") return;

    if (DEBUG_MODE) {
      console.log(`GroupLeaderboard: Starting listener for group ${groupId}`);
    }

    const unsubscribe = listenGroup(groupId);
    return () => {
      if (DEBUG_MODE) {
        console.log(`GroupLeaderboard: Stopping listener for group ${groupId}`);
      }
      unsubscribe && unsubscribe();
    };
  }, [groupId, listenGroup, activeTab]);

  // Initial load for cached mode or fallback
  useEffect(() => {
    if (groupId && activeTab === "cached") {
      if (DEBUG_MODE) {
        console.log(`GroupLeaderboard: Loading cached data for group ${groupId}`);
      }
      loadLeaderboardPage("group", false, groupId);
    }
  }, [groupId, loadLeaderboardPage, activeTab]);

  // 🔹 Temporary collection debug
  useEffect(() => {
    const testCollections = async () => {
      console.log("=== TESTING COLLECTION NAMES ===");

      try {
        const scoresQuery = query(collection(db, "scores"));
        const scoresSnapshot = await getDocs(scoresQuery);
        console.log("Documents in 'scores' collection:", scoresSnapshot.size);

        const scoreQuery = query(collection(db, "score"));
        const scoreSnapshot = await getDocs(scoreQuery);
        console.log("Documents in 'score' collection:", scoreSnapshot.size);

        const testScoresQuery = query(collection(db, "test_scores"));
        const testScoresSnapshot = await getDocs(testScoresQuery);
        console.log("Documents in 'test_scores' collection:", testScoresSnapshot.size);
      } catch (error) {
        console.error("Collection test error:", error);
      }
    };

    if (groupId) testCollections();
  }, [groupId]);

  // Get entries for this group
  const entries = useMemo(() => {
    if (DEBUG_MODE) {
      console.log("=== GROUP LEADERBOARD ENTRIES DEBUG ===");
      console.log("Full leaderboards state:", leaderboards);
      console.log("Group ID:", groupId);
      console.log("Group leaderboards:", leaderboards?.group);
    }

    let groupEntries = [];
    if (leaderboards?.group?.[groupId]?.entries) {
      groupEntries = leaderboards.group[groupId].entries;
    } else if (leaderboards?.group?.entries) {
      groupEntries = leaderboards.group.entries.filter(entry => entry.groupId === groupId);
    }

    if (DEBUG_MODE) {
      console.log("Raw group entries:", groupEntries);
    }

    if (!Array.isArray(groupEntries)) return [];

    const sorted = [...groupEntries].sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity))
        return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
      return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
    });

    let lastScore = null;
    let lastTime = null;
    let lastRank = 0;
    sorted.forEach((entry, idx) => {
      if (entry.combinedScore === lastScore && entry.timeTaken === lastTime) {
        entry.rank = lastRank;
      } else {
        entry.rank = idx + 1;
        lastRank = idx + 1;
        lastScore = entry.combinedScore;
        lastTime = entry.timeTaken;
      }
    });

    if (DEBUG_MODE) {
      console.log("Final sorted entries:", sorted);
    }

    return sorted;
  }, [leaderboards, groupId]);

  const loading = loadingScopes?.group || loadingScopes?.group?.[groupId];
  const error = errors?.group?.[groupId] || errors?.group;

  useEffect(() => {
    if (!DEBUG_MODE) return;
    console.log("=== GROUP LEADERBOARD DEBUG ===");
    console.log("groupId:", groupId);
    console.log("entries length:", entries.length);
    console.log("loading:", loading);
    console.log("error:", error);
    console.log("userProfile:", userProfile);
    console.log("period:", period);
    console.log("================================");
  }, [groupId, entries.length, loading, error, userProfile, period]);

  if (!groupId) {
    return (
      <div className="mt-6 max-w-4xl mx-auto p-4">
        <div className="text-center text-gray-500">No group ID provided for leaderboard.</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="mt-6 max-w-4xl mx-auto p-4">
        <div className="text-center text-gray-500">User profile required for leaderboard.</div>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">🏆 Group Leaderboard</h2>
      <p className="text-center text-gray-600 mb-4">Group ID: {groupId}</p>
      <p className="text-center text-gray-600 mb-4">Period: {period}</p>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === "live" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("live")}
        >
          Live
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "cached" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("cached")}
        >
          24h Cached
        </button>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading && <LoadingSpinner />}
      {!loading && entries.length === 0 && (
        <div className="text-center">
          <p className="text-gray-500 mb-2">No leaderboard data yet for this group.</p>
          <p className="text-sm text-gray-400">
            Make sure users have completed tests and are assigned to this group ID.
          </p>
          {DEBUG_MODE && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Group ID: {groupId}</p>
              <p>Period: {period}</p>
              <p>Leaderboards state: {JSON.stringify(leaderboards, null, 2)}</p>
            </div>
          )}
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class / School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => {
                const isCurrent = user?.uid === entry.userId;
                const rowClass = isCurrent
                  ? "bg-blue-50 font-semibold"
                  : index < 3
                  ? "bg-yellow-100 font-semibold"
                  : "";

                return (
                  <tr key={entry.userId || index} className={rowClass}>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{entry.rank}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.displayName || entry.name || "Unknown"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{entry.grade || entry.class || "N/A"} / {entry.school || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-green-700">{entry.combinedScore} pts</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{entry.timeTaken}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
