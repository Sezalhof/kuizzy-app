// src/components/GroupLeaderboard.js
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

          if (entry.username) {
            newDetails[uid] = {
              name: entry.username,
              email: entry.email || uid,
            };
            return;
          }

          if (userDetails[uid] || newDetails[uid]) return;

          try {
            const docRef = doc(db, "users", uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const { username, name, email, schoolId, unionId } = snap.data();

              // Optional: filter users by same schoolId or unionId if needed
              newDetails[uid] = {
                name: username || name || "Unknown",
                email: email || uid,
                schoolId,
                unionId,
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

  // Sort top 10 by score descending, then time ascending, then millis (if available)
  const sorted = [...groupScores]
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
    <div className="mt-6 max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">
        🏆 Group Leaderboard
      </h2>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{userInfo.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-green-700">
                    {entry.score} pts
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
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
