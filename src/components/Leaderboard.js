import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Leaderboard({ data, currentUserId }) {
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    const fetchUserDetails = async () => {
      const newDetails = {};

      await Promise.all(
        data.map(async (entry) => {
          const uid = entry.userId;
          if (!uid) return;

          // If entry already has username, no need to fetch user doc
          if (entry.username) {
            newDetails[uid] = {
              name: entry.username,
              email: entry.email || uid,
            };
            return;
          }

          // Else fetch user details only if not already cached
          if (userDetails[uid] || newDetails[uid]) return;

          try {
            const docRef = doc(db, "users", uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const { username, name, email } = snap.data();
              newDetails[uid] = {
                name: username || name || "Unknown",
                email: email || uid,
              };
            } else {
              newDetails[uid] = { name: "Unknown", email: uid };
            }
          } catch {
            newDetails[uid] = { name: "Unknown", email: uid };
          }
        })
      );

      setUserDetails((prev) => ({ ...prev, ...newDetails }));
    };

    if (data?.length) fetchUserDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // removed userDetails dependency to prevent infinite loop

  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">No leaderboard data yet.</p>;
  }

  // Sort: score desc, then timeTaken asc (faster is better)
  const sortedData = [...data]
    .map((entry) => ({
      ...entry,
      timeTaken: entry.timeTaken ?? entry.time ?? 9999,
    }))
    .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
    .slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        🏆 Top 10 Leaderboard
      </h2>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <TableHeader title="Rank" />
              <TableHeader title="Name" />
              <TableHeader title="Email" />
              <TableHeader title="Score" />
              <TableHeader title="Time Taken" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((entry, index) => {
              const userInfo = userDetails[entry.userId] || {
                name: entry.username || "Loading...",
                email: entry.email || entry.userId,
              };
              const isCurrent = currentUserId === entry.userId;

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
                  } ${isCurrent ? "ring-2 ring-blue-400" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userInfo.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {userInfo.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                    {entry.score} pts
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {entry.timeTaken}s
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
