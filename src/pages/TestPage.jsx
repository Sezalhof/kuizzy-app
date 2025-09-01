// src/pages/TestPage.jsx - UPDATED FOR MULTI-GROUP SUPPORT
import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { saveAttempt } from "../utils/saveAttemptAndLeaderboard";
import TestList from "../components/tests/TestList";
import TestCart from "../components/tests/TestCart";
import TestPlayer from "../components/tests/TestPlayer";
import GroupLeaderboard from "../components/GroupLeaderboard";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";
import { useLocation } from "react-router-dom";
import { getTwoMonthPeriod } from "../utils/dateUtils";

const DEBUG_MODE = true; // Enable debug logging

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null); // For multi-group support

  // 🔥 Determine current groupId with enhanced logic
  const currentGroupId = React.useMemo(() => {
    // Priority: location state > selected > profile primary
    return location.state?.groupId ?? 
           selectedGroupId ?? 
           profile?.groupId ?? 
           null;
  }, [location.state?.groupId, selectedGroupId, profile?.groupId]);

  // Get all user groups
  const allUserGroups = React.useMemo(() => {
    if (!profile) return [];
    return [...new Set([
      profile?.groupId,
      profile?.group,
      ...(profile?.groups || [])
    ].filter(Boolean))];
  }, [profile]);

  // Unified leaderboard hook with improved parameters
  const period = getTwoMonthPeriod();
  const { 
    isReady, 
    userGroups, 
    listenGroup, 
    leaderboards, 
    loadingScopes, 
    errors,
    availableScopes // Add this missing variable
  } = useUnifiedLeaderboard(user?.uid, profile, period);

  // 🔍 ENHANCED DEBUGGING
  useEffect(() => {
    if (profile && user?.uid) {
      console.log("=== ENHANCED PROFILE DEBUG ===");
      console.log("Full profile:", profile);
      console.log("User ID:", user.uid);
      console.log("profile.groupId:", profile.groupId);
      console.log("profile.groups:", profile.groups);
      console.log("allUserGroups computed:", allUserGroups);
      console.log("location.state:", location.state);
      console.log("selectedGroupId:", selectedGroupId);
      console.log("final currentGroupId:", currentGroupId);
      console.log("isReady:", isReady);
      console.log("period:", period);
      console.log("================================");
    }
  }, [profile, user?.uid, allUserGroups, location.state, selectedGroupId, currentGroupId, isReady, period]);

  // Set default group if user has groups but none selected
  useEffect(() => {
    if (allUserGroups.length > 0 && !selectedGroupId && !location.state?.groupId) {
      console.log("🎯 Auto-selecting first group:", allUserGroups[0]);
      setSelectedGroupId(allUserGroups[0]);
    }
  }, [allUserGroups, selectedGroupId, location.state?.groupId]);

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

  // --- ENHANCED SAVE HANDLER ---
  const handleTestComplete = async (testId, result) => {
    if (!user || !profile) {
      console.error("❌ Missing user or profile");
      return;
    }
    
    const test = cart.find((t) => t.id === testId);
    if (!test) {
      console.error("❌ Test not found in cart");
      return;
    }

    // Use current group logic
    let targetGroupId = currentGroupId;

    // 🔍 ENHANCED DEBUG before saveAttempt
    console.log("=== ENHANCED SAVE ATTEMPT DEBUG ===");
    console.log("user.uid:", user.uid);
    console.log("profile.groupId:", profile.groupId);
    console.log("selectedGroupId:", selectedGroupId);
    console.log("location.state?.groupId:", location.state?.groupId);
    console.log("allUserGroups:", allUserGroups);
    console.log("final targetGroupId:", targetGroupId);
    console.log("===================================");

    // Safety: don't confuse schoolId with groupId
    if (targetGroupId && targetGroupId === profile?.schoolId) {
      console.warn("⚠️ targetGroupId matches schoolId, resetting to null");
      targetGroupId = null;
    }

    try {
      const saveData = {
        userId: user.uid,
        displayName: profile.displayName ?? profile.name ?? "Unknown",
        photoURL: profile.photoURL ?? null,
        testId: test.id,
        score: Number(result.rawScore) || 0,
        totalQuestions: Number(result.totalQuestions) || 0,
        userAnswers: result.userAnswers ?? {},
        startedAt: result.startedAt ?? new Date(),
        finishedAt: result.finishedAt ?? new Date(),
        combinedScore: result.combinedScore,
        testDurationSec: test.duration,
        groupId: targetGroupId,
        schoolId: profile.schoolId,
        unionId: profile.unionId,
        upazilaId: profile.upazilaId,
        districtId: profile.districtId,
        divisionId: profile.divisionId,
      };

      console.log("💾 Saving attempt with data:", saveData);
      await saveAttempt(saveData);
      console.log("✅ Save attempt successful");

      // Refresh group leaderboard after save - for all user groups
      if (isReady) {
        allUserGroups.forEach(groupId => {
          console.log(`🔄 Refreshing leaderboard for group: ${groupId}`);
          listenGroup(groupId);
        });
      }

      // Clear cart and stop playing
      setCart((prev) => prev.filter((t) => t.id !== testId));
      setPlayingTestId(null);

      // Show leaderboard after completing a test
      if (targetGroupId || allUserGroups.length > 0) {
        setShowLeaderboard(true);
      }

    } catch (err) {
      console.error("❌ Failed to save test attempt:", err);
      alert(`Failed to save test attempt: ${err.message}`);
    }
  };

  if (profileLoading) return <p className="p-4 text-gray-600">Loading your profile...</p>;
  if (!profile) return <p className="p-4 text-red-600">User profile not found. Cannot start test.</p>;
  if (!user?.uid) return <p className="p-4 text-red-600">User not authenticated.</p>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tests</h1>

      {/* 🔧 ENHANCED DEBUG INFO AND CONTROLS */}
      {(allUserGroups.length > 0 || currentGroupId) && (
        <div className="mb-4 p-3 bg-blue-100 rounded">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <strong>Debug Info:</strong>
              <div className="text-sm">
                Current Group: {currentGroupId || 'None'}
              </div>
              <div className="text-sm">
                All Groups: {allUserGroups.join(', ') || 'None'}
              </div>
              <div className="text-sm">
                Ready: {isReady ? '✅' : '❌'} | Period: {period}
              </div>
            </div>
            
            {/* Group Selector for multi-group users */}
            {allUserGroups.length > 1 && (
              <div>
                <label className="mr-2 text-sm font-medium">Select Group:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(e.target.value || null)}
                >
                  <option value="">-- Select Group --</option>
                  {allUserGroups.map((groupId) => (
                    <option key={groupId} value={groupId}>
                      {groupId}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Leaderboard Toggle Button */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              {showLeaderboard ? 'Hide' : 'Show'} Group Leaderboard
            </button>
          </div>
          
          {/* Error Display */}
          {Object.keys(errors).length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              <strong>Leaderboard Errors:</strong>
              <ul className="list-disc list-inside">
                {Object.entries(errors).map(([scope, error]) => (
                  <li key={scope}>{scope}: {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Loading Status */}
          {Object.keys(loadingScopes).some(key => loadingScopes[key]) && (
            <div className="mt-2 text-sm text-blue-600">
              Loading: {Object.entries(loadingScopes)
                .filter(([_, loading]) => loading)
                .map(([scope, _]) => scope)
                .join(', ')}
            </div>
          )}
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

      {/* 🔧 ENHANCED GROUP LEADERBOARD COMPONENT WITH MULTI-GROUP SUPPORT */}
      {showLeaderboard && allUserGroups.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Group Leaderboards</h2>
          
          {/* Show leaderboard for current group */}
          {currentGroupId && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Current Group: {currentGroupId}
              </h3>
              <GroupLeaderboard 
                groupId={currentGroupId} 
                userProfile={profile} 
                period={period}
                key={`current-${currentGroupId}`} // Force re-render when group changes
              />
            </div>
          )}
          
          {/* Show leaderboards for all other groups if user belongs to multiple */}
          {allUserGroups.length > 1 && allUserGroups
            .filter(groupId => groupId !== currentGroupId)
            .map(groupId => (
              <div key={groupId} className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Group: {groupId}
                </h3>
                <GroupLeaderboard 
                  groupId={groupId} 
                  userProfile={profile} 
                  period={period}
                />
              </div>
            ))}
        </div>
      )}

      {/* Debug Leaderboard Data */}
      {showLeaderboard && isReady && DEBUG_MODE && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">🔍 Debug: Leaderboard Data</h3>
          <div className="text-sm">
            <div><strong>Available Scopes:</strong> {availableScopes?.join(', ') || 'None'}</div>
            <div><strong>User Groups:</strong> {userGroups?.join(', ') || 'None'}</div>
            <div><strong>Leaderboard Keys:</strong> {Object.keys(leaderboards).join(', ') || 'None'}</div>
            {Object.entries(leaderboards).map(([scope, data]) => (
              <div key={scope}>
                <strong>{scope}:</strong> {
                  scope === 'group' 
                    ? Object.keys(data).map(groupId => `${groupId}(${data[groupId]?.entries?.length || 0})`).join(', ')
                    : `${data?.entries?.length || 0} entries`
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}