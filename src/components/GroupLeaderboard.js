import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";

export default function GroupLeaderboard({ groupId, data }) {
  const { user } = useAuth();
  const [groupScores, setGroupScores] = useState([]);
  const [userDetails, setUserDetails] = useState({});

  // Filter scores by groupId
  useEffect(() => {
    if (!groupId || !Array.isArray(data)) {
      setGroupScores([]);
      return;
    }
    const filtered = data.filter((entry) => entry.groupId === groupId);
    setGroupScores(filtered);
  }, [groupId, data]);

  // Fetch missing user info (username preferably)
  useEffect(() => {
    const fetchUserDetails = async () => {
      const newDetails = {};

      await Promise.all(
        groupScores.map(async (entry) => {
          const uid = entry.userId;
          if (!uid) return;

          // If entry has username, use it directly, no need to fetch
          if (entry.username) {
            newDetails[uid] = {
              name: entry.username,
              email: entry.email || uid,
            };
            return;
          }

          // Skip if already cached
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

    if (groupScores.length) fetchUserDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupScores]);

  if (!groupScores.length) {
    return <p className="text-center text-gray-500 mt-4">No leaderboard data yet.</p>;
  }

  const sorted = [...groupScores]
    .map((entry) => ({
      ...entry,
      timeTaken: entry.timeTaken ?? entry.time ?? 9999,
    }))
    .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
    .slice(0, 10);

  return (
    <div className="mt-6 max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-center text-blue-700 mb-4">
        🏆 Group Leaderboard
      </h2>
      <table className="min-w-full divide-y divide-gray-300 shadow rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2">Rank</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2">Score</th>
            <th className="px-4 py-2">Time</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((entry, index) => {
            const userInfo = userDetails[entry.userId] || {
              name: entry.username || "Loading...",
              email: entry.email || entry.userId,
            };
            const isCurrent = user?.uid === entry.userId;

            return (
              <tr
                key={entry.id || index}
                className={isCurrent ? "bg-blue-50 font-semibold" : ""}
              >
                <td className="px-4 py-2 text-center">{index + 1}</td>
                <td className="px-4 py-2">{userInfo.name}</td>
                <td className="px-4 py-2 text-center">{entry.score}</td>
                <td className="px-4 py-2 text-center">{entry.timeTaken}s</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
