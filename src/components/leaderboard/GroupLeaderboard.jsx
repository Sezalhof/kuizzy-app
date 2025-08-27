// src/components/leaderboard/GroupLeaderboard.jsx
import React, { useState } from "react";
import { useAggregatedLeaderboard } from "../../hooks/useAggregatedLeaderboard";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function GroupLeaderboard({ groupId }) {
  const {
    leaderboards,
    loadingScopes,
    errors,
    loadLeaderboardPage,
    availableScopes,
  } = useAggregatedLeaderboard(null, { groupId });

  const [loadMoreTriggered, setLoadMoreTriggered] = useState(false);

  if (!availableScopes.includes("group")) {
    return (
      <div className="text-center text-red-500 mt-2">
        Group leaderboard unavailable.
      </div>
    );
  }

  const leaderboard = leaderboards.group || { entries: [], lastDoc: null, hasMore: true };
  const loading = loadingScopes.group;

  const handleLoadMore = async () => {
    if (leaderboard.hasMore && !loading) {
      setLoadMoreTriggered(true);
      await loadLeaderboardPage("group", true, groupId);
      setLoadMoreTriggered(false);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-purple-700 mb-2">🏆 Group Leaderboard</h3>

      {errors.group && (
        <div className="text-red-500 text-sm mb-2">{errors.group}</div>
      )}

      {loading && !loadMoreTriggered ? (
        <LoadingSpinner />
      ) : leaderboard.entries.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No scores available yet for this group.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b px-2 py-1">#</th>
                <th className="border-b px-2 py-1">Player</th>
                <th className="border-b px-2 py-1">Score</th>
                <th className="border-b px-2 py-1">Time</th>
                <th className="border-b px-2 py-1">Last Attempt</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.entries.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="border-b px-2 py-1">{index + 1}</td>
                  <td className="border-b px-2 py-1 flex items-center gap-2">
                    <img
                      src={entry.avatarUrl || "/fallback-logo.png"}
                      alt={entry.name || "Unknown avatar"}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/fallback-logo.png";
                      }}
                    />
                    <span>{entry.name || entry.userId || "Unknown"}</span>
                  </td>
                  <td className="border-b px-2 py-1">{entry.combinedScore || 0}</td>
                  <td className="border-b px-2 py-1">{entry.timeTaken || "N/A"}s</td>
                  <td className="border-b px-2 py-1">
                    {entry.finishedAt
                      ? new Date(entry.finishedAt.seconds * 1000).toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leaderboard.hasMore && !loading && (
        <button
          onClick={handleLoadMore}
          className="mt-2 bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700"
        >
          Load More
        </button>
      )}

      {loading && loadMoreTriggered && <LoadingSpinner />}
    </div>
  );
}


