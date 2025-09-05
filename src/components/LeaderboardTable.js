// src/components/LeaderboardTable.jsx - FIXED: Clean data processing
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getCleanLeaderboard } from "../utils/leaderboardUtils";

const DEBUG = false; // Set to true only for debugging

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

  // Batch fetch missing usernames/emails with improved error handling
  useEffect(() => {
    if (!fetchMissingNames || !data?.length) return;
  
    const fetchUserDetails = async () => {
      setUserDetails((prev) => {
        const missingUids = data
          .map((entry) => entry.userId)
          .filter((uid) => uid && typeof uid === 'string' && uid.length > 0 && !prev[uid]);
  
        if (!missingUids.length) return prev;
  
        const BATCH_SIZE = 10;
        const batches = [];
        for (let i = 0; i < missingUids.length; i += BATCH_SIZE) {
          batches.push(missingUids.slice(i, i + BATCH_SIZE));
        }
  
        const newDetails = {};
  
        Promise.all(
          batches.map(async (batch) => {
            const q = query(collection(db, "users"), where("__name__", "in", batch));
            try {
              const snap = await getDocs(q);
              snap.forEach((doc) => {
                const { username, name, email } = doc.data();
                newDetails[doc.id] = {
                  name: username || name || "Unknown",
                  email: email || doc.id,
                };
              });
              batch.forEach((uid) => {
                if (!newDetails[uid]) {
                  newDetails[uid] = { name: "Unknown", email: uid };
                }
              });
            } catch (error) {
              if (DEBUG) {
                console.warn('Error fetching user details for batch:', batch, error);
              }
              batch.forEach((uid) => {
                newDetails[uid] = { name: "Unknown", email: uid };
              });
            }
          })
        ).then(() => {
          setUserDetails((finalPrev) => ({ ...finalPrev, ...newDetails }));
        }).catch((error) => {
          if (DEBUG) {
            console.error('Error in user details fetch:', error);
          }
        });
  
        return prev;
      });
    };
  
    fetchUserDetails();
  }, [data, fetchMissingNames]);

  // Enhanced data validation and normalization
  const normalizedData = useMemo(() => {
    if (!Array.isArray(data)) {
      if (DEBUG) {
        console.warn('LeaderboardTable received non-array data:', data);
      }
      return [];
    }

    return data
      .filter((entry) => {
        // Filter out entries with invalid data
        if (!entry || typeof entry !== 'object') return false;
        if (!entry.userId || typeof entry.userId !== 'string') return false;
        
        // Additional validation for group-related entries
        if (entry.groupId && typeof entry.groupId === 'string') {
          const groupId = entry.groupId.trim().toLowerCase();
          // Filter out obviously invalid group IDs
          if (groupId === 'nnn' || 
              groupId === 'null' || 
              groupId === 'undefined' || 
              groupId.includes('_class') || 
              groupId.includes('school_') ||
              groupId.length < 3) {
            if (DEBUG) {
              console.warn('Filtering out entry with invalid groupId:', entry.groupId);
            }
            return false;
          }
        }
        
        return true;
      })
      .map((entry, index) => ({
        ...entry,
        score: Number(
          entry.combinedScore ??
            entry.avgCombined ??
            entry.totalCombinedAverage ??
            entry.score ??
            0
        ),
        timeTaken: Number(entry.timeTaken ?? entry.time ?? entry.avgTime ?? 9999),
        rank: entry.rank ?? index + 1,
        school: entry.school ?? entry.schoolName ?? entry.schoolId ?? "-",
        grade: entry.grade ?? entry.class ?? entry.className ?? "-",
      }));
  }, [data]);

  // Debug logging effect - always called, but only logs when DEBUG is true
  useEffect(() => {
    if (DEBUG) {
      console.log("LeaderboardTable normalized data:", {
        originalLength: data?.length || 0,
        normalizedLength: normalizedData.length,
        filtered: (data?.length || 0) - normalizedData.length
      });
    }
  }, [data, normalizedData]);

  // Apply leaderboard cleaning and ranking
  const cleanedLeaderboard = useMemo(() => {
    return getCleanLeaderboard(normalizedData, true); // true = sort by score
  }, [normalizedData]);

  // Top-N + pinned current user logic
  const displayData = useMemo(() => {
    if (!cleanedLeaderboard.length) return [];
    
    let topEntries = topN ? cleanedLeaderboard.slice(0, topN) : cleanedLeaderboard;
    
    if (!highlightUserId) return topEntries;
    
    const isUserInTop = topEntries.some((e) => e.userId === highlightUserId);
    if (isUserInTop) return topEntries;
    
    const userEntry = cleanedLeaderboard.find((e) => e.userId === highlightUserId);
    if (userEntry) {
      return [...topEntries, { ...userEntry, pinned: true }];
    }
    
    return topEntries;
  }, [cleanedLeaderboard, highlightUserId, topN]);

  // Loading state
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 animate-pulse">
        Loading leaderboard...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        {error}
      </div>
    );
  }

  // Empty state
  if (!cleanedLeaderboard.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">No Data Available</h3>
          <p className="text-blue-700">
            No valid leaderboard entries found. Complete some tests to appear on the leaderboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg w-full">
      <table
        className="min-w-full divide-y divide-gray-200"
        aria-label="Leaderboard Table"
      >
        <thead className="bg-gray-50">
          <tr>
            <TableHeader title="Rank" />
            <TableHeader title="Name" />
            <TableHeader title="Email" />
            <TableHeader title="School" />
            <TableHeader title="Grade" />
            <TableHeader title="Score" />
            <TableHeader title="Time (min)" />
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
                key={entry.id || `${entry.userId}-${entry.finishedAt?.seconds || index}`}
                className={`
                  ${entry.rank === 1 ? "bg-yellow-100" : entry.rank === 2 ? "bg-gray-100" : entry.rank === 3 ? "bg-orange-100" : ""}
                  ${isCurrent ? "ring-2 ring-blue-400 font-semibold" : ""}
                  ${isPinned ? "bg-blue-50 italic border-t-2 border-blue-200" : ""}
                `}
                aria-current={isCurrent ? "row" : undefined}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        entry.rank === 1
                          ? "bg-yellow-100 text-yellow-800"
                          : entry.rank === 2
                          ? "bg-gray-100 text-gray-800"
                          : entry.rank === 3
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    {isPinned && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">PINNED</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {userInfo.name}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-blue-600 font-medium">(YOU)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userInfo.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.school}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.grade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                  {entry.score.toFixed(1)} pts
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {entry.timeTaken < 9999 
                    ? `${Math.floor(entry.timeTaken / 60)}:${(entry.timeTaken % 60).toString().padStart(2, '0')}`
                    : 'N/A'
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="p-4 text-center bg-gray-50">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Load More Results
          </button>
        </div>
      )}
      
      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-3 text-center">
        <p className="text-sm text-gray-600">
          Showing {displayData.length} participant{displayData.length !== 1 ? 's' : ''} 
          {cleanedLeaderboard.length > displayData.length && 
            ` (${cleanedLeaderboard.length} total)`
          }
        </p>
      </div>
    </div>
  );
}

const TableHeader = ({ title }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
    {title}
  </th>
);