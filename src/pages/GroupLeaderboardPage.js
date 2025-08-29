// src/pages/GroupLeaderboardPage.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import GroupLeaderboard from "../components/GroupLeaderboard";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";

export default function GroupLeaderboardPage() {
  const { groupId: rawGroupId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("live"); // 'live' or 'cached'
  const [userDetails, setUserDetails] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ------------------ Profile fetch ------------------
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await fetch(`/api/users/${user.uid}`);
        const data = await snap.json();
        if (mounted) {
          setUserProfile(data);
          console.log("[DEBUG] User profile fetched:", data);
        }
      } catch (err) {
        console.error("[DEBUG] Failed to fetch profile:", err);
        if (mounted) setUserProfile(null);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [user]);

  // ------------------ Current period ------------------
  const currentPeriod = useMemo(() => {
    const date = new Date();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const period = `${date.getFullYear()}-${monthNames[date.getMonth()]}`;
    console.log("[DEBUG] Current period:", period);
    return period;
  }, []);

  // ------------------ Group key ------------------
  const groupKey = useMemo(() => {
    const key = rawGroupId ? `${rawGroupId}_${currentPeriod}` : null;
    console.log("[DEBUG] Computed groupKey:", key);
    return key;
  }, [rawGroupId, currentPeriod]);

  // ------------------ Unified leaderboard hook ------------------
  const { leaderboards, loadingScopes, errors, listenGroup } = useUnifiedLeaderboard(
    user?.uid || null,
    userProfile,
    groupKey,
    activeTab
  );

  // ------------------ Extract leaderboard ------------------
  const leaderboard = useMemo(() => leaderboards?.group?.[groupKey]?.entries ?? [], [leaderboards, groupKey]);
  const loading = loadingScopes?.group?.[groupKey] ?? false;
  const error = errors?.group?.[groupKey] ?? null;

  // ------------------ Debug: log leaderboard state ------------------
  useEffect(() => {
    console.log("[DEBUG] Leaderboard state updated:");
    console.log({ groupKey, leaderboard, loading, error, leaderboards, loadingScopes });
  }, [groupKey, leaderboard, loading, error, leaderboards, loadingScopes]);

  // ------------------ Fetch user details ------------------
  useEffect(() => {
    if (!leaderboard.length) return;

    const fetchUserDetails = async () => {
      const { db, doc, getDoc } = await import("../firebase");
      const newDetails = {};
      await Promise.all(
        leaderboard.map(async (entry) => {
          const uid = entry.userId;
          if (!uid || newDetails[uid]) return;
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
          } catch (err) {
            console.error("[DEBUG] Failed fetching user details for", uid, err);
            newDetails[uid] = { name: "Unknown", email: uid };
          }
        })
      );
      setUserDetails((prev) => {
        console.log("[DEBUG] User details updated:", newDetails);
        return { ...prev, ...newDetails };
      });
    };

    fetchUserDetails();
  }, [leaderboard]);

  // ------------------ Trigger live leaderboard refresh ------------------
  useEffect(() => {
    if (listenGroup && groupKey && activeTab === "live") {
      console.log("[DEBUG] Triggering listenGroup for groupKey:", groupKey);
      listenGroup(groupKey);
    }
  }, [listenGroup, groupKey, activeTab]);

  if (authLoading || profileLoading) return <LoadingSpinner />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-gray-700">You must be logged in to view the group leaderboard.</p>
        <a
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </a>
      </div>
    );
  }

  if (!rawGroupId) {
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

      {/* Toggle Live / Cached */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          className={activeTab === "live"
            ? "bg-blue-500 text-white px-4 py-2 rounded"
            : "bg-gray-200 px-4 py-2 rounded"}
          onClick={() => setActiveTab("live")}
        >
          Live
        </button>
        <button
          className={activeTab === "cached"
            ? "bg-blue-500 text-white px-4 py-2 rounded"
            : "bg-gray-200 px-4 py-2 rounded"}
          onClick={() => setActiveTab("cached")}
        >
          24h Cached
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && leaderboard.length > 0 && (
        <GroupLeaderboard
          groupId={rawGroupId}
          initialData={leaderboard}
          userDetails={userDetails}
        />
      )}

      {!loading && leaderboard.length === 0 && (
        <p className="text-center text-gray-500 mt-6">No leaderboard data yet.</p>
      )}

      <div className="mt-8 text-center">
        <Link to="/groups" className="text-blue-600 hover:underline text-sm">
          ← Back to My Groups
        </Link>
      </div>
    </div>
  );
}
