import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Leaderboard from "../components/Leaderboard";
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";

export default function LeaderboardPage() {
  const { user, authLoading } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("📊 [LeaderboardPage] Mounted");
    console.log("👤 [LeaderboardPage] user:", user);

    // Don’t start fetching until auth is settled
    if (authLoading) {
      console.log("⏳ [LeaderboardPage] Waiting for auth to finish...");
      return;
    }

    if (!user) {
      console.log("⚠️ [LeaderboardPage] No user, aborting fetch.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchLeaderboard = async () => {
      console.log("⏳ [LeaderboardPage] Fetching leaderboard data...");
      try {
        const scoresRef = collection(db, "scores");
        const q = query(
          scoresRef,
          orderBy("score", "desc"),
          orderBy("timeTaken", "asc")
        );
        const snapshot = await getDocs(q);
        const scores = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("✅ [LeaderboardPage] Leaderboard scores received:", scores);
        if (isMounted) {
          setLeaderboardData(scores);
        }
      } catch (err) {
        console.error("❌ [LeaderboardPage] Failed to fetch leaderboard:", err);
        if (isMounted) {
          setError("Unable to load leaderboard. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log("✅ [LeaderboardPage] Finished loading");
        }
      }
    };

    fetchLeaderboard();

    return () => {
      console.log("🧹 [LeaderboardPage] Cleanup on unmount");
      isMounted = false;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    console.log("⌛ [LeaderboardPage] Showing loading state...");
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading leaderboard...</p>
      </div>
    );
  }

  if (!user) {
    console.log("🔒 [LeaderboardPage] User not authenticated, prompting login.");
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-gray-700">You must be logged in to view the leaderboard.</p>
        <Link
          to="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (error) {
    console.log("⚠️ [LeaderboardPage] Rendering error state:", error);
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            // trigger re-fetch by re-calling effect
            console.log("🔄 [LeaderboardPage] Retrying fetch...");
          }}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <h2 className="text-3xl font-semibold mb-4 text-blue-700">Top Players</h2>
      <Leaderboard data={leaderboardData} currentUserId={user.uid} />
    </div>
  );
}
