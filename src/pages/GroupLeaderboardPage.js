// src/pages/GroupLeaderboardPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import GroupLeaderboard from "../components/GroupLeaderboard";
import { getTwoMonthPeriod } from "../utils/dateUtils";

export default function GroupLeaderboardPage() {
  const { user, authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  const { groupId: routeGroupId } = useParams();
  const location = useLocation();

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [manualGroupId, setManualGroupId] = useState("");

  const period = getTwoMonthPeriod();

  // Determine group IDs to show
  const groupIdsToShow = useMemo(() => {
    const ids = [
      routeGroupId,
      location.state?.groupId,
      profile?.groupId,
      selectedGroupId,
      manualGroupId,
    ].filter(Boolean);
    return Array.from(new Set(ids));
  }, [routeGroupId, location.state?.groupId, profile?.groupId, selectedGroupId, manualGroupId]);

  useEffect(() => {
    if (profile?.groupId && !selectedGroupId) {
      setSelectedGroupId(profile.groupId);
    }
  }, [profile?.groupId, selectedGroupId]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-gray-700">You must be logged in to view group leaderboards.</p>
        <a
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-white max-w-6xl mx-auto">
      {/* Header */}
      <div className="w-full mb-6">
        <h1 className="text-3xl font-bold text-center mb-4">Group Leaderboard</h1>

        {/* Group Selection */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Group</label>
              <div className="p-2 bg-white border rounded">
                {profile?.groupId ? (
                  <div>
                    <div className="font-medium">{profile.group || "Unknown Group"}</div>
                    <div className="text-sm text-gray-500">ID: {profile.groupId}</div>
                  </div>
                ) : (
                  <div className="text-gray-500">No group assigned</div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="manual-group" className="block text-sm font-medium text-gray-700 mb-2">
                View Different Group (Enter Group ID)
              </label>
              <div className="flex gap-2">
                <input
                  id="manual-group"
                  type="text"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Enter Group ID..."
                  value={manualGroupId}
                  onChange={(e) => setManualGroupId(e.target.value)}
                />
                <button
                  onClick={() => setSelectedGroupId(manualGroupId)}
                  disabled={!manualGroupId.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Group Assignment Warning */}
        {!profile?.groupId && (
          <div className="w-full mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">No Group Assigned</h3>
            <p className="text-yellow-700 text-sm mb-3">
              You haven't been assigned to a group yet. Groups are typically based on your school and grade.
            </p>
            <div className="text-sm text-gray-600">
              <div><strong>Your School:</strong> {profile?.school || "Not set"}</div>
              <div><strong>Your Grade:</strong> {profile?.grade || "Not set"}</div>
            </div>
            {profile?.school && profile?.grade && (
              <button
                onClick={() => {
                  const autoGroupId = `${profile.schoolId}_${profile.grade}`.replace(/\s+/g, '_');
                  setManualGroupId(autoGroupId);
                  setSelectedGroupId(autoGroupId);
                }}
                className="mt-3 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
              >
                Generate Group ID ({`${profile.schoolId}_${profile.grade}`.replace(/\s+/g, '_')})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leaderboards */}
      {groupIdsToShow.length > 0 ? (
        <div className="w-full space-y-8">
          {groupIdsToShow.map((gid) => (
            <GroupLeaderboard
              key={gid}
              groupIds={[gid]}
              userProfile={profile}
              period={period}
            />
          ))}
        </div>
      ) : (
        <div className="w-full p-8 text-center text-gray-500">
          <h3 className="text-xl font-medium mb-2">No Group Selected</h3>
          <p>Enter a Group ID above or ensure you're assigned to a group to view the leaderboard.</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="w-full mt-8 flex flex-wrap gap-3 justify-center">
        <a href="/tests" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Take Tests</a>
        <a href="/leaderboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Global Leaderboard</a>
        {profile?.groupId && (
          <button
            onClick={() => {
              setSelectedGroupId(profile.groupId);
              setManualGroupId("");
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Back to My Group
          </button>
        )}
      </div>
    </div>
  );
}
