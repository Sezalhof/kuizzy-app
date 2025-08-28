// src/pages/TestPage.jsx
import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { saveAttempt } from "../utils/saveAttemptAndLeaderboard";
import TestList from "../components/tests/TestList";
import TestCart from "../components/tests/TestCart";
import TestPlayer from "../components/tests/TestPlayer";
import { useAggregatedLeaderboard } from "../hooks/useAggregatedLeaderboard";
import { useLocation } from "react-router-dom";

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
  const { refreshLeaderboard } = useAggregatedLeaderboard();

  // groupId only comes from location (GroupPage) or profile (if user permanently belongs to a group)


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
  const handleTestComplete = async (
    testId, score, totalQuestions, userAnswers, startedAt, finishedAt
  ) => {
    if (!user || !profile) return;
    const test = cart.find((t) => t.id === testId);
    if (!test) return;

    // Correct groupId: from location.state or profile.groupId
    let currentGroupId = location.state?.groupId ?? profile?.groupId ?? null;

    // Do not confuse schoolId with groupId
    if (currentGroupId && currentGroupId === profile?.schoolId) currentGroupId = null;

    try {
      await saveAttempt({
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

        // PASS THE PROPER GROUP ID HERE
        groupId: currentGroupId,

        // Hierarchy info
        schoolId: profile.schoolId,
        unionId: profile.unionId,
        upazilaId: profile.upazilaId,
        districtId: profile.districtId,
        divisionId: profile.divisionId,
      });

      // Refresh leaderboards: pass groupId only if valid
      refreshLeaderboard({
        userId: user.uid,
        schoolId: profile.schoolId,
        groupId: currentGroupId,
        unionId: profile.unionId,
        upazilaId: profile.upazilaId,
        districtId: profile.districtId,
        divisionId: profile.divisionId,
        global: true,
      });

      // Clear cart and stop playing
      setCart((prev) => prev.filter((t) => t.id !== testId));
      setPlayingTestId(null);

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
              onComplete={(score, totalQuestions, userAnswers, startedAt, finishedAt) =>
                handleTestComplete(playingTestId, score, totalQuestions, userAnswers, startedAt, finishedAt)
              }
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
