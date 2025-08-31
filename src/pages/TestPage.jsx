// src/pages/TestPage.jsx
import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { saveAttempt } from "../utils/saveAttemptAndLeaderboard";
import TestList from "../components/tests/TestList";
import TestCart from "../components/tests/TestCart";
import TestPlayer from "../components/tests/TestPlayer";
import GroupLeaderboard from "../components/GroupLeaderboard"; // ✅ Add this import
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";
import { useLocation } from "react-router-dom";
import { getTwoMonthPeriod } from "../utils/dateUtils";

const ALL_GRADES = [
  "Class 3","Class 4","Class 5","Class 6","Class 7","Class 8",
  "Class 9","Class 10","Class 11","Class 12"
];

const dummyTests = [
  {
    id: "t1",
    title: "Basic Math Test",
    grade: "Class 6",
    duration: 900,
    questions: [
      { id: "q1", text: "What is 2 + 2?", options: ["3", "4", "5", "6"], correct: 1 },
      { id: "q2", text: "What is 10 / 2?", options: ["3", "4", "5", "6"], correct: 2 },
    ],
  },
  { id: "t2", title: "Science Intro", grade: "Class 6", duration: 1200, questions: [] },
  { id: "t3", title: "History 101", grade: "Class 7", duration: 1000, questions: [] },
];

export default function TestPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  const location = useLocation();

  const [selectedGrade, setSelectedGrade] = useState("Class 6");
  const [tests, setTests] = useState([]);
  const [cart, setCart] = useState([]);
  const [playingTestId, setPlayingTestId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false); // ✅ Add toggle state

  // 🔥 Determine current groupId
  const currentGroupId = location.state?.groupId ?? profile?.groupId ?? null;

  // Unified leaderboard hook — ✅ FIXED parameter order
  const period = getTwoMonthPeriod();
  const { listenGroup } = useUnifiedLeaderboard(user?.uid, profile, period);

  // 🔍 DEBUGGING - check what profile + location contain
  useEffect(() => {
    if (profile) {
      console.log("=== PROFILE DEBUG ===");
      console.log("Full profile:", profile);
      console.log("profile.groupId:", profile.groupId);
      console.log("location.state:", location.state);
      console.log("location.state?.groupId:", location.state?.groupId);
      console.log("final currentGroupId:", currentGroupId);
      console.log("===================");
    }
  }, [profile, location.state, currentGroupId]);

  useEffect(() => {
    if (!profileLoading && profile?.grade && ALL_GRADES.includes(profile.grade)) {
      setSelectedGrade(profile.grade);
    }
  }, [profileLoading, profile]);

  useEffect(() => {
    setTests(dummyTests.filter((t) => t.grade === selectedGrade));
  }, [selectedGrade]);

  const handleAddToCart = (test) => {
    if (!cart.find((t) => t.id === test.id)) setCart((prev) => [...prev, test]);
  };

  const handleRemoveFromCart = (testId) => {
    setCart((prev) => prev.filter((t) => t.id !== testId));
    if (playingTestId === testId) setPlayingTestId(null);
  };

  const handlePlayTest = (testId) => setPlayingTestId(testId);

  // --- MAIN SAVE HANDLER ---
  // Changed to accept a single 'result' object from TestPlayer (as requested)
  const handleTestComplete = async (testId, result) => {
    if (!user || !profile) return;
    const test = cart.find((t) => t.id === testId);
    if (!test) return;

    let currentGroupIdLocal = location.state?.groupId ?? profile?.groupId ?? null;

    // 🔍 DEBUG before saveAttempt
    console.log("=== SAVE ATTEMPT DEBUG ===");
    console.log("profile.groupId:", profile.groupId);
    console.log("location.state?.groupId:", location.state?.groupId);
    console.log("final currentGroupId:", currentGroupIdLocal);
    console.log("========================");

    // Safety: don't confuse schoolId with groupId
    if (currentGroupIdLocal && currentGroupIdLocal === profile?.schoolId) {
      console.warn("⚠️ currentGroupId matches schoolId, resetting to null");
      currentGroupIdLocal = null;
    }

    try {
      await saveAttempt({
        userId: user.uid,
        displayName: profile.displayName ?? profile.name ?? "Unknown",
        photoURL: profile.photoURL ?? null,
        testId: test.id,
        score: Number(result.rawScore) || 0,
        totalQuestions: Number(result.totalQuestions) || 0,
        userAnswers: result.userAnswers ?? {},
        startedAt: result.startedAt ?? new Date(),
        finishedAt: result.finishedAt ?? new Date(),
        combinedScore: result.combinedScore, // ✅ now included
        testDurationSec: test.duration,
        groupId: currentGroupIdLocal,
        schoolId: profile.schoolId,
        unionId: profile.unionId,
        upazilaId: profile.upazilaId,
        districtId: profile.districtId,
        divisionId: profile.divisionId,
      });

      // Refresh group leaderboard after save
      if (currentGroupIdLocal) listenGroup(currentGroupIdLocal);

      // Clear cart and stop playing
      setCart((prev) => prev.filter((t) => t.id !== testId));
      setPlayingTestId(null);

      // ✅ Show leaderboard after completing a test
      if (currentGroupIdLocal) setShowLeaderboard(true);

    } catch (err) {
      console.error("❌ Failed to save test attempt:", err);
      alert("Failed to save test attempt. Check permissions or network.");
    }
  };

  if (profileLoading) return <p className="p-4 text-gray-600">Loading your profile...</p>;
  if (!profile) return <p className="p-4 text-red-600">User profile not found. Cannot start test.</p>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tests</h1>

      {/* 🔍 Debug info UI */}
      {currentGroupId && (
        <div className="mb-4 p-2 bg-blue-100 rounded flex justify-between items-center">
          <span><strong>Debug:</strong> Current Group ID: {currentGroupId}</span>
          {/* ✅ Add leaderboard toggle button */}
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            {showLeaderboard ? 'Hide' : 'Show'} Group Leaderboard
          </button>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="grade-select" className="mr-2 font-semibold">Select Grade:</label>
        <select
          id="grade-select"
          className="border rounded px-2 py-1"
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
        >
          {ALL_GRADES.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <TestList tests={tests} onAdd={handleAddToCart} selectedGrade={selectedGrade} />
        </div>

        <div>
          <TestCart cart={cart} onRemove={handleRemoveFromCart} onPlay={handlePlayTest} />
        </div>

        <div className="md:col-span-2">
          {playingTestId ? (
            <TestPlayer
              test={cart.find((t) => t.id === playingTestId)}
              onComplete={(result) => handleTestComplete(playingTestId, result)}
              profile={profile}
              profileLoading={profileLoading}
            />
          ) : (
            <div className="p-4 border rounded text-gray-600">
              Select a test from your ExamTable to start playing.
            </div>
          )}
        </div>
      </div>

      {/* ✅ ADD GROUP LEADERBOARD COMPONENT */}
      {currentGroupId && showLeaderboard && (
        <GroupLeaderboard 
          groupId={currentGroupId} 
          userProfile={profile} 
          period={period} 
        />
      )}
    </div>
  );
}
