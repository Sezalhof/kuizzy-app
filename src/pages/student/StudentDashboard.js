import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export default function StudentDashboard({
  user,
  profile,
  profileLoading,
  profileError,
}) {
  const validUid = typeof user?.uid === "string" ? user.uid : null;

  const [recentScores, setRecentScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);

  // ✅ Mount log
  useEffect(() => {
    console.log("[StudentDashboard] ✅ Mounted");
    return () => {
      console.log("[StudentDashboard] 🔁 Unmounted");
    };
  }, []);

  // ✅ Snapshot of props
  useEffect(() => {
    console.groupCollapsed("[StudentDashboard] 🔍 Prop Snapshot");
    console.log("Auth user:", user);
    console.log("Profile loading:", profileLoading);
    console.log("Profile:", profile);
    console.log("Profile error:", profileError);
    console.groupEnd();
  }, [user, profile, profileLoading, profileError]);

  // ✅ Fetch recent quiz scores
  useEffect(() => {
    const fetchScores = async () => {
      if (!validUid || !profile || profileLoading) {
        console.log("[StudentDashboard] ⏳ Skipping score fetch – waiting for profile/UID");
        setLoadingScores(false);
        return;
      }

      try {
        const scoresRef = collection(db, "scores");
        const q = query(scoresRef, where("uid", "==", validUid));
        const snapshot = await getDocs(q);

        const scores = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sorted = scores.sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return bTime - aTime;
        });

        setRecentScores(sorted.slice(0, 5));
        console.log("[StudentDashboard] 🏁 Recent scores loaded:", sorted.slice(0, 5));
      } catch (error) {
        console.error("[StudentDashboard] ❌ Error fetching scores:", error);
      } finally {
        setLoadingScores(false);
      }
    };

    fetchScores();
  }, [validUid, profile, profileLoading]);

  // ✅ Guard: no user yet
  if (!user) {
    console.log("[StudentDashboard] 💤 Waiting for authenticated user...");
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // ✅ Guard: still loading profile
  if (profileLoading || !profile) {
    console.log("[StudentDashboard] 📄 Waiting for profile...");
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // ❌ Profile load failed
  if (profileError) {
    console.error("[StudentDashboard] ⚠️ Profile error:", profileError);
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 text-red-600">
        Error loading profile: {profileError}
      </div>
    );
  }

  // ✅ Render student dashboard
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {profile.name} 👋</h1>
      <p className="mb-2">Class: {profile.grade}</p>
      <p className="mb-6">School: {profile.school}</p>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Recent Quiz Attempts</h2>
        {loadingScores ? (
          <p>Loading scores...</p>
        ) : recentScores.length > 0 ? (
          <ul className="space-y-2">
            {recentScores.map((score) => (
              <li key={score.id} className="border p-2 rounded">
                <p className="font-semibold">Quiz: {score.quizTitle || "Untitled"}</p>
                <p>Score: {score.score}</p>
                <p>Time Taken: {score.timeTaken} sec</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent quiz attempts found.</p>
        )}
      </div>
    </div>
  );
}
