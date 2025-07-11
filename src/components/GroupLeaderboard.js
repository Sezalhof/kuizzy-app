import React, { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";

export default function GroupLeaderboard({ groupId, data }) {
  const { user } = useAuth();
  const [groupScores, setGroupScores] = useState([]);

  useEffect(() => {
    if (!groupId || !Array.isArray(data)) return;

    const filtered = data.filter((entry) => entry.groupId === groupId);
    setGroupScores(filtered);
  }, [groupId, data]);

  if (!groupScores.length) {
    return <p className="text-center text-gray-500 mt-4">No leaderboard data yet.</p>;
  }

  const sorted = [...groupScores]
    .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
    .slice(0, 10);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold text-center text-blue-700 mb-4">
        🏆 Group Leaderboard
      </h2>
      <table className="min-w-full divide-y divide-gray-300 shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2">Rank</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Score</th>
            <th className="px-4 py-2">Time</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((entry, index) => (
            <tr
              key={entry.id || index}
              className={
                user?.uid === entry.userId
                  ? "bg-blue-50 font-semibold"
                  : ""
              }
            >
              <td className="px-4 py-2 text-center">{index + 1}</td>
              <td className="px-4 py-2">{entry.email}</td>
              <td className="px-4 py-2 text-center">{entry.score}</td>
              <td className="px-4 py-2 text-center">{entry.timeTaken}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
