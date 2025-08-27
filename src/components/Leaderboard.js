import React from "react";
import { useAggregatedLeaderboard } from "../hooks/useAggregatedLeaderboard";
import useAuth from "../hooks/useAuth";

export default function Leaderboard({ scope, contextId }) {
  const { user } = useAuth();
  const { leaderboard, loading, error } = useAggregatedLeaderboard({ scope, contextId });

  if (loading) return <p className="text-center text-gray-500 mt-6">Loading leaderboard...</p>;
  if (error) return <p className="text-center text-red-500 mt-6">Failed to load leaderboard.</p>;
  if (!leaderboard?.length) return <p className="text-center text-gray-500 mt-6">No leaderboard data yet.</p>;

  const sortedData = [...leaderboard]
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
              <TableHeader title="Username" />
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
                    {entry.timeTaken}s
                    {entry.timeMillis ? `.${entry.timeMillis.toString().padStart(3, "0")}` : ""}
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
