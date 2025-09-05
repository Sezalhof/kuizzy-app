// GroupLeaderboard.jsx - FIXED: Use sanitized data, prevent duplicates
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import LoadingSpinner from "./ui/LoadingSpinner";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";

const DEBUG = false; // Set to true only for debugging

export default function GroupLeaderboard({ 
  groupId, 
  userProfile,
  period,
  className = ""
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("live");
  
  // Use refs to track initialization and prevent duplicate calls
  const listenerCleanupRef = useRef(null);
  const lastListenerGroupRef = useRef(null);

  // ✅ FIXED: Resolve group ID using sanitized profile data
  const resolvedGroupId = useMemo(() => {
    // If groupId is explicitly provided, use it (trusted from upstream)
    if (groupId && typeof groupId === 'string' && groupId.trim().length > 0) {
      return groupId.trim();
    }
    
    // Safety check: ensure userProfile exists and has sanitized groups
    if (!userProfile || !userProfile.groups || !Array.isArray(userProfile.groups)) {
      if (DEBUG) {
        console.log('No valid profile or groups array available');
      }
      return null;
    }
    
    // Use first sanitized group from profile
    return userProfile.groups[0] || null;
  }, [groupId, userProfile]);

  // ✅ FIXED: Simplified validation since upstream data is now sanitized
  const isValidGroup = useMemo(() => {
    return !!(resolvedGroupId && 
             typeof resolvedGroupId === 'string' && 
             resolvedGroupId.length > 8); // Basic length check for UUIDs
  }, [resolvedGroupId]);

  const {
    leaderboards,
    loadingScopes,
    errors,
    listenGroup,
    loadLeaderboardPage,
    isReady,
  } = useUnifiedLeaderboard(
    user?.uid,
    userProfile,
    period,
    activeTab === "cached" ? "cached" : "live"
  );

  // Memoized tab change handlers to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Setup live listener for the resolved group with proper cleanup
  useEffect(() => {
    if (!resolvedGroupId || !isValidGroup || !isReady || activeTab !== "live") {
      // Clean up any existing listener if conditions aren't met
      if (listenerCleanupRef.current) {
        listenerCleanupRef.current();
        listenerCleanupRef.current = null;
        lastListenerGroupRef.current = null;
      }
      return;
    }

    // Don't create a new listener if we already have one for the same group
    if (lastListenerGroupRef.current === resolvedGroupId && listenerCleanupRef.current) {
      return;
    }

    // Clean up existing listener before creating a new one
    if (listenerCleanupRef.current) {
      listenerCleanupRef.current();
    }

    // Create new listener
    const cleanup = listenGroup(resolvedGroupId);
    listenerCleanupRef.current = cleanup;
    lastListenerGroupRef.current = resolvedGroupId;

    return () => {
      if (listenerCleanupRef.current) {
        listenerCleanupRef.current();
        listenerCleanupRef.current = null;
        lastListenerGroupRef.current = null;
      }
    };
  }, [resolvedGroupId, isValidGroup, isReady, activeTab, listenGroup]);

  // Load cached data when needed
  useEffect(() => {
    if (resolvedGroupId && isValidGroup && isReady && activeTab === "cached") {
      loadLeaderboardPage("group", false, resolvedGroupId);
    }
  }, [resolvedGroupId, isValidGroup, isReady, activeTab, loadLeaderboardPage]);

  // Extract leaderboard data for the current group
  const { entries, loading, error } = useMemo(() => {
    const currentLoading = loadingScopes?.group;
    const currentError = errors?.group;

    if (!resolvedGroupId || !isValidGroup || !isReady) {
      return { entries: [], loading: false, error: null };
    }

    // Get entries from the specific group
    const groupData = leaderboards?.group?.[resolvedGroupId];
    const groupEntries = groupData?.entries || [];

    return {
      entries: groupEntries,
      loading: currentLoading,
      error: currentError
    };
  }, [leaderboards, resolvedGroupId, isValidGroup, loadingScopes, errors, isReady]);

  // Early returns for various states
  if (!resolvedGroupId || !isValidGroup) {
    return (
      <div className={`mt-6 max-w-4xl mx-auto p-4 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-center">
            <h3 className="font-semibold text-yellow-800 mb-2">No Valid Group Available</h3>
            <p className="text-yellow-700 text-sm">
              {!resolvedGroupId 
                ? "No group ID provided and no groups found in user profile."
                : "Group ID format appears invalid."
              }
            </p>
            <div className="text-xs text-yellow-600 mt-2">
              <div>Group ID: <code className="bg-yellow-100 px-1 rounded">{resolvedGroupId || 'null'}</code></div>
              <div>Profile Groups: <code className="bg-yellow-100 px-1 rounded">
                {userProfile?.groups?.join(', ') || 'None'}
              </code></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`mt-6 max-w-4xl mx-auto p-4 ${className}`}>
        <div className="text-center text-gray-500 p-4">
          User profile required for leaderboard display.
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={`mt-6 max-w-4xl mx-auto p-4 ${className}`}>
        <div className="text-center p-4">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600">Initializing leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-6 max-w-4xl mx-auto p-4 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Group Leaderboard</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Group: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{resolvedGroupId}</span>
          </p>
          <p>
            Period: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{period}</span>
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "live" 
              ? "bg-blue-600 text-white shadow" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => handleTabChange("live")}
        >
          Live Updates
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "cached" 
              ? "bg-blue-600 text-white shadow" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => handleTabChange("cached")}
        >
          Cached (24h)
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error loading leaderboard:</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600">Loading leaderboard data...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">No Results Yet</h3>
            <p className="text-blue-700 mb-4">
              No test attempts found for this group and period.
            </p>
            <p className="text-blue-600 text-sm">
              Group members need to complete tests to appear on the leaderboard.
            </p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {!loading && !error && entries.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School/Class
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => {
                  const isCurrentUser = user?.uid === entry.userId;
                  const isTopThree = entry.rank <= 3;

                  let rowClass = "";
                  if (isCurrentUser) rowClass = "bg-blue-50 border-l-4 border-blue-400";
                  else if (isTopThree) rowClass = "bg-yellow-50";

                  return (
                    <tr key={entry.userId} className={rowClass}>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-600 font-medium">YOU</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.displayName || entry.name || "Anonymous"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{entry.grade || entry.class || "N/A"}</div>
                        <div className="text-xs text-gray-400">{entry.school || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-lg font-bold text-green-600">
                          {typeof entry.combinedScore === "number" 
                            ? entry.combinedScore.toFixed(1) 
                            : "0.0"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.score || 0}/{entry.totalQuestions || 0} raw
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {entry.timeTaken
                          ? `${Math.floor(entry.timeTaken / 60)}:${(entry.timeTaken % 60)
                              .toString()
                              .padStart(2, "0")}`
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 text-center">
            <p className="text-sm text-gray-600">
              Showing {entries.length} participant{entries.length !== 1 ? "s" : ""} • Updated:{" "}
              {activeTab === "live" ? "Real-time" : "24h cache"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}