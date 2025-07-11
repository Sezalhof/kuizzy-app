// ✅ FILE: GroupLeaderboard.js (Updated & Scalable)

import React, { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";

export default function GroupLeaderboard({ groupId, data }) {
  const [userDetails, setUserDetails] = useState({});
  const fetchedUserIds = useRef(new Set());
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!data?.length) return;

    const fetchUserDetails = async () => {
      const newDetails = {};

      await Promise.all(
        data.map(async (entry) => {
          const uid = entry.userId;
          if (!uid || fetchedUserIds.current.has(uid)) return;

          try {
            const docRef = doc(db, "users", uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const { name, email } = snap.data();
              newDetails[uid] = {
                name: name || "Unknown",
                email: email || uid,
              };
            } else {
              newDetails[uid] = { name: "Unknown", email: uid };
            }
          } catch {
            newDetails[uid] = { name: "Unknown", email: uid };
          }

          fetchedUserIds.current.add(uid);
        })
      );

      setUserDetails((prev) => ({ ...prev, ...newDetails }));
    };

    fetchUserDetails();
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <p className="text-center text-gray-500 mt-6">
        No leaderboard data yet.
      </p>
    );
  }

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
        🏆 Group Leaderboard
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
              const userInfo = userDetails[entry.userId] || {};
              const isCurrentUser = currentUser?.uid === entry.userId;

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
                  } ${isCurrentUser ? "ring-2 ring-blue-400" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userInfo.name || "Loading..."}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {userInfo.email || entry.userId}
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
