// src/pages/GroupLeaderboardPage.js
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import UnifiedLeaderboard from "../components/UnifiedLeaderboard";

export default function GroupLeaderboardPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);

  const [activeTab, setActiveTab] = useState("live"); // 'live' or 'cached'

  if (authLoading || profileLoading) return <LoadingSpinner />;

  if (!user || !profile) {
    return (
      <div className="p-6 text-center text-red-600">
        Missing profile. Please enroll or refresh.
      </div>
    );
  }

  if (!groupId) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center text-red-600">
        Invalid group ID. Please go back{" "}
        <button
          className="underline text-blue-600"
          onClick={() => navigate("/groups")}
        >
          Groups
        </button>
        .
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        🏆 Group Leaderboard
      </h1>

      <div className="flex justify-center gap-4 mb-6">
        <button
          className={
            activeTab === "live"
              ? "bg-blue-500 text-white px-4 py-2 rounded"
              : "bg-gray-200 px-4 py-2 rounded"
          }
          onClick={() => setActiveTab("live")}
        >
          Live
        </button>
        <button
          className={
            activeTab === "cached"
              ? "bg-blue-500 text-white px-4 py-2 rounded"
              : "bg-gray-200 px-4 py-2 rounded"
          }
          onClick={() => setActiveTab("cached")}
        >
          24h Cached
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        {activeTab === "live" && (
          <UnifiedLeaderboard scope="group" contextId={groupId} liveMode={true} />
        )}
        {activeTab === "cached" && (
          <UnifiedLeaderboard scope="group" contextId={groupId} liveMode={false} />
        )}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/groups"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to My Groups
        </Link>
      </div>
    </div>
  );
}
