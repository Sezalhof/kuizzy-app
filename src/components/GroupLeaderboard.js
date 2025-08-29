// src/components/GroupLeaderboard.js
import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../hooks/useAuth";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";

export default function GroupLeaderboard({ groupId }) {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState({});

  // ------------------ Unified Leaderboard Hook ------------------
  const { leaderboard, loading, error } = useUnifiedLeaderboard({
    scope: "group",
    id: groupId,
    period: null,
    topN: 50, // Fetch enough for top + current user
  });

  // ------------------ Fetch missing user details ------------------
  useEffect(() => {
    if (!leaderboard?.length) return;
    const fetchUserDetails = async () => {
      const { db, doc, getDoc } = await import("../firebase");
      const newDetails = {};
      await Promise.all(
        leaderboard.map(async (entry) => {
          const uid = entry.userId;
          if (!uid || newDetails[uid]) return; // removed check against userDetails
          try {
            const docRef = doc(db, "users", uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const { displayName, name, email, grade, school } = snap.data();
              newDetails[uid] = {
                name: displayName || name || "Unknown",
                email: email || uid,
                grade: grade || "N/A",
                school: school || "N/A",
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
    fetchUserDetails();
  }, [leaderboard]); // <-- only leaderboard
  

  // ------------------ Sorted Top 10 ------------------
  const sorted = useMemo(() => {
    if (!leaderboard) return [];
    return [...leaderboard]
      .map((entry) => ({
        ...entry,
        timeTaken: entry.timeTaken ?? entry.time ?? 9999,
        combinedScore: entry.combinedScore ?? entry.score ?? 0,
        timeMillis: entry.timeMillis ?? 0,
      }))
      .sort((a, b) => {
        if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
        if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
        return a.timeMillis - b.timeMillis;
      })
      .slice(0, 10);
  }, [leaderboard]);

  if (!leaderboard || !leaderboard.length) {
    return <p className="text-center text-gray-500 mt-4">{loading ? "Loading..." : "No leaderboard data yet."}</p>;
  }

  return (
    <div className="mt-6 max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">🏆 Group Leaderboard</h2>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((entry, index) => {
              const userInfo = userDetails[entry.userId] || { name: entry.displayName || "Loading...", email: entry.email || entry.userId };
              const isCurrent = user?.uid === entry.userId;
              return (
                <tr key={entry.userId || index} className={isCurrent ? "bg-blue-50 font-semibold" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-center">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{userInfo.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-green-700">{entry.combinedScore} pts</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {entry.timeTaken}s{entry.timeMillis ? `.${entry.timeMillis.toString().padStart(3, "0")}` : ""}
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
