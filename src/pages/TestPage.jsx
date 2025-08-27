// src/pages/TestPage.jsx
import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { saveAttempt } from '../utils/saveAttemptAndLeaderboard';
import TestList from "../components/tests/TestList";
import TestCart from "../components/tests/TestCart";
import TestPlayer from "../components/tests/TestPlayer";
import { useAggregatedLeaderboard } from "../hooks/useAggregatedLeaderboard";
import { useLocation } from "react-router-dom";

const ALL_GRADES = [
  "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8",
  "Class 9", "Class 10", "Class 11", "Class 12"
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
  {
    id: "t2",
    title: "Science Intro",
    grade: "Class 6",
    duration: 1200,
    questions: [],
  },
  {
    id: "t3",
    title: "History 101",
    grade: "Class 7",
    duration: 1000,
    questions: [],
  },
];

export default function TestPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.uid);
  const location = useLocation(); // get state from router

  const [selectedGrade, setSelectedGrade] = useState("Class 6");
  const [tests, setTests] = useState([]);
  const [cart, setCart] = useState([]);
  const [playingTestId, setPlayingTestId] = useState(null);
  const { refreshLeaderboard } = useAggregatedLeaderboard();

  // Use groupId from location state (passed from ContextPage)
  const groupId = location.state?.groupId ?? profile?.groupId ?? null;

  useEffect(() => {
    if (!profileLoading && profile?.grade && ALL_GRADES.includes(profile.grade)) {
      setSelectedGrade(profile.grade);
    }
  }, [profileLoading, profile]);

  useEffect(() => {
    const filtered = dummyTests.filter((t) => t.grade === selectedGrade);
    setTests(filtered);
  }, [selectedGrade]);

  const handleAddToCart = (test) => {
    if (!cart.find((t) => t.id === test.id)) setCart((prev) => [...prev, test]);
  };

  const handleRemoveFromCart = (testId) => {
    setCart((prev) => prev.filter((t) => t.id !== testId));
    if (playingTestId === testId) setPlayingTestId(null);
  };

  const handlePlayTest = (testId) => setPlayingTestId(testId);

  // Updated handleTestComplete function for TestPage.jsx

// Updated TestPage.jsx with proper groupId handling

const handleTestComplete = async (
  testId,
  score,
  totalQuestions,
  userAnswers,
  startedAt,
  finishedAt
) => {
  if (!user || !profile) return;

  const test = cart.find((t) => t.id === testId);
  if (!test) return;

  // DETERMINE THE PROPER GROUP ID
  // Option 1: If you have a proper group document ID from location state or profile
  let properGroupId = location.state?.groupId || profile?.groupId || null;
  
  // Option 2: If the groupId is actually a school name, convert it to a proper ID
  // or set it to null to skip group leaderboards
  if (properGroupId && properGroupId === profile?.schoolId) {
    console.log("GroupId is same as schoolId, treating as school-based group");
    // You can either:
    // A) Use a normalized version: properGroupId = normalizeId(properGroupId, "group");
    // B) Or skip group leaderboards entirely: properGroupId = null;
    properGroupId = null; // For now, skip group leaderboards to avoid confusion
  }

  console.log("=== TestPage Debug ===");
  console.log("Original groupId from location/profile:", location.state?.groupId || profile?.groupId);
  console.log("Profile schoolId:", profile?.schoolId);
  console.log("Final properGroupId to use:", properGroupId);
  console.log("=======================");

  try {
    const payload = {
      userId: user.uid,
      displayName: profile.displayName ?? profile.name ?? "Unknown",
      photoURL: profile.photoURL ?? null,
      testId: test.id,
      score: Number(score) || 0,
      totalQuestions: Number(totalQuestions) || 0,
      userAnswers: userAnswers ?? {},
      startedAt: startedAt ?? new Date(),
      finishedAt: finishedAt ?? new Date(),
      testDurationSec: test.duration,
      
      // Use the proper group ID (could be null)
      groupId: properGroupId,
      
      // Store geographic info for reference
      schoolId: profile.schoolId,
      unionId: profile.unionId,
      upazilaId: profile.upazilaId,
      districtId: profile.districtId,
      divisionId: profile.divisionId,
    };

    console.log("Final payload being sent:", payload);

    const attemptId = await saveAttempt(payload);
    console.log("Attempt saved successfully with ID:", attemptId);

    // Refresh leaderboard with the same groupId
    refreshLeaderboard({
      userId: user.uid,
      schoolId: profile.schoolId,
      groupId: properGroupId,
      unionId: profile.unionId,
      upazilaId: profile.upazilaId,
      districtId: profile.districtId,
      divisionId: profile.divisionId,
      global: true,
    });

    setCart((prev) => prev.filter((t) => t.id !== testId));
    setPlayingTestId(null);
  } catch (err) {
    console.error("Failed to save test attempt:", err);
    alert("Failed to save test attempt. Check permissions or network.");
  }
};
  if (profileLoading) {
    return <p className="p-4 text-gray-600">Loading your profile...</p>;
  }

  if (!profile) {
    return <p className="p-4 text-red-600">User profile not found. Cannot start test.</p>;
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tests</h1>

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
          <TestList
            tests={tests}
            onAdd={handleAddToCart}
            selectedGrade={selectedGrade}
          />
        </div>

        <div>
          <TestCart
            cart={cart}
            onRemove={handleRemoveFromCart}
            onPlay={handlePlayTest}
          />
        </div>

        <div className="md:col-span-2">
          {playingTestId ? (
            <TestPlayer
              test={cart.find((t) => t.id === playingTestId)}
              onComplete={(score, totalQuestions, userAnswers, startedAt, finishedAt) =>
                handleTestComplete(
                  playingTestId,
                  score,
                  totalQuestions,
                  userAnswers,
                  startedAt,
                  finishedAt
                )
              }
              userId={user?.uid}
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
    </div>
  );
}
