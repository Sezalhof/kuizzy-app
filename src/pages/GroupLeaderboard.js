import React from "react";

export default function GroupLeaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center text-gray-500 mt-6">
        No leaderboard data yet.
      </p>
    );
  }

  // Sort by score descending, then by time ascending (including millisec if available)
  const sortedData = [...data]
    .map((entry) => ({
      ...entry,
      timeTaken: entry.timeTaken ?? entry.time ?? 9999,
      timeMillis: entry.timeMillis ?? 0, // optional millisec field
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
        🏆 Group Leaderboard
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
              return (
                <tr
                  key={entry.id || index}
                  className={`${
                    index === 0
                      ? "bg-yellow-100"
                      : index === 1
                      ? "bg-gray-100"
                      : index === 2
                      ? "bg-orange-100"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {entry.username || entry.email || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                    {entry.score} pts
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {/* Format seconds and millis */}
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
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
    {title}
  </th>
);
