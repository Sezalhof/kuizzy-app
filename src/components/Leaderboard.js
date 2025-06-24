import React from "react";

const Leaderboard = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">No leaderboard data yet.</p>;
  }

  // Sort by score (descending) and timeTaken (ascending)
  const sortedData = [...data]
    .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
    .slice(0, 10); // Top 10 only

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">🏆 Top 10 Leaderboard</h2>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Taken</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((entry, index) => (
              <tr key={index} className={index < 3 ? "bg-yellow-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    index === 0 ? "bg-gold-500 text-white" : 
                    index === 1 ? "bg-silver-500 text-white" : 
                    index === 2 ? "bg-bronze-500 text-white" : "bg-gray-100"
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-bold">{entry.score}</span> pts
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.timeTaken}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;