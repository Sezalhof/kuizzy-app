// src/components/LeaderboardTable.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function LeaderboardTable({
  data = [],
  highlightUserId,
  loading = false,
  error = null,
  onLoadMore = null,
  hasMore = false,
  topN = 20,
  fetchMissingNames = true,
}) {
  const [userDetails, setUserDetails] = useState({});

  // Batch fetch missing usernames
  useEffect(() => {
    if (!fetchMissingNames || !data?.length) return;

    const fetchUserDetails = async () => {
      const missingUids = data
        .map((entry) => entry.userId)
        .filter((uid) => uid && !userDetails[uid]);

      if (!missingUids.length) return;

      const BATCH_SIZE = 10;
      const batches = [];

      for (let i = 0; i < missingUids.length; i += BATCH_SIZE) {
        batches.push(missingUids.slice(i, i + BATCH_SIZE));
      }

      const newDetails = {};

      await Promise.all(
        batches.map(async (batch) => {
          const q = query(collection(db, "users"), where("__name__", "in", batch));
          try {
            const snap = await getDocs(q);
            snap.forEach((doc) => {
              const { username, name, email } = doc.data();
              newDetails[doc.id] = { name: username || name || "Unknown", email: email || doc.id };
            });

            batch.forEach((uid) => {
              if (!newDetails[uid]) newDetails[uid] = { name: "Unknown", email: uid };
            });
          } catch {
            batch.forEach((uid) => {
              newDetails[uid] = { name: "Unknown", email: uid };
            });
          }
        })
      );

      setUserDetails((prev) => ({ ...prev, ...newDetails }));
    };

    fetchUserDetails();
  }, [data]);

  // Use rank from entries if available
  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].map((entry, index) => ({
      ...entry,
      score: entry.avgCombined ?? entry.totalCombinedAverage ?? entry.combinedScore ?? 0,
      timeTaken: entry.avgTime ?? entry.time ?? entry.timeTaken ?? 9999,
      rank: entry.rank ?? index + 1, // fallback
    }));
  }, [data]);

  // Top-N + pinned current user
  const displayData = useMemo(() => {
    if (!sortedData.length) return [];
    let topEntries = topN ? sortedData.slice(0, topN) : sortedData;
    if (!highlightUserId) return topEntries;
    const isUserInTop = topEntries.some((e) => e.userId === highlightUserId);
    if (isUserInTop) return topEntries;
    const userEntry = sortedData.find((e) => e.userId === highlightUserId);
    if (userEntry) return [...topEntries, { ...userEntry, pinned: true }];
    return topEntries;
  }, [sortedData, highlightUserId, topN]);

  if (loading)
    return (
      <div className="p-4 text-center text-gray-500 animate-pulse">Loading leaderboard...</div>
    );
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;
  if (!sortedData.length)
    return <div className="p-4 text-center text-gray-500">No leaderboard data yet.</div>;

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg w-full">
      <table className="min-w-full divide-y divide-gray-200" aria-label="Leaderboard Table">
        <thead className="bg-gray-50">
          <tr>
            <TableHeader title="Rank" />
            <TableHeader title="Name" />
            <TableHeader title="Email" />
            <TableHeader title="School" />
            <TableHeader title="Grade" />
            <TableHeader title="Score" />
            <TableHeader title="Time Taken (s)" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayData.map((entry, index) => {
            const userInfo = userDetails[entry.userId] || {
              name: entry.displayName || entry.name || "Loading...",
              email: entry.email || entry.userId,
            };
            const isCurrent = entry.userId === highlightUserId;
            const isPinned = entry.pinned;
            return (
              <tr
                key={entry.id || index}
                className={`
                  ${entry.rank === 1 ? "bg-yellow-100" : entry.rank === 2 ? "bg-gray-100" : entry.rank === 3 ? "bg-orange-100" : ""}
                  ${isCurrent ? "ring-2 ring-blue-400 font-semibold" : ""}
                  ${isPinned ? "bg-blue-50 italic" : ""}
                `}
                aria-current={isCurrent ? "row" : undefined}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                  {entry.rank}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userInfo.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userInfo.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.school || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.grade || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                  {entry.score.toFixed(2)} pts
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{entry.timeTaken}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasMore && onLoadMore && (
        <div className="p-4 text-center">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

const TableHeader = ({ title }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</th>
);
