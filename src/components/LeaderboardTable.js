import React, { useMemo } from "react";

export default function LeaderboardTable({
  data,
  highlightUserId,
  loading,
  error,
  onLoadMore,
  hasMore,
}) {
  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) => b.score - a.score || (a.timeTaken ?? 9999) - (b.timeTaken ?? 9999)
    );
  }, [data]);

  if (loading) {
    return (
      <div className="p-4 animate-pulse text-center text-gray-500">Loading leaderboard...</div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  if (!sortedData.length) {
    return <div className="p-4 text-center text-gray-500">No leaderboard data yet.</div>;
  }

  return (
    <>
      <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow ring-1 ring-black ring-opacity-5">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Taken (s)</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((entry, i) => {
            const isCurrentUser = entry.userId === highlightUserId;
            return (
              <tr
                key={entry.id || i}
                className={`${
                  i === 0 ? "bg-yellow-100" : i === 1 ? "bg-gray-100" : i === 2 ? "bg-orange-100" : ""
                } ${isCurrentUser ? "ring-2 ring-blue-400 font-semibold" : ""}`}
                aria-current={isCurrentUser ? "row" : undefined}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{i + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.name || "Unknown"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">{entry.score} pts</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{entry.timeTaken ?? "N/A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            aria-label="Load more leaderboard entries"
          >
            Load More
          </button>
        </div>
      )}
    </>
  );
}
