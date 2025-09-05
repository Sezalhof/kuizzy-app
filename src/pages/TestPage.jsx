// src/pages/TestPage.jsx - FIXED: Use sanitized profile groups
import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { saveAttempt } from "../utils/saveAttemptAndLeaderboard";
import TestList from "../components/tests/TestList";
import TestCart from "../components/tests/TestCart";
import TestPlayer from "../components/tests/TestPlayer";
import GroupLeaderboard from "../components/GroupLeaderboard";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";
import DatabaseInspector from "../components/DatabaseInspector";
import { useLocation } from "react-router-dom";
import { getTwoMonthPeriod } from "../utils/dateUtils";

const DEBUG = false; // Set to true only for debugging

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
  const { profile, loading: profileLoading, validGroups, primaryGroupId, hasGroups } = useUserProfile(user?.uid);
  const location = useLocation();

  const [selectedGrade, setSelectedGrade] = useState("Class 6");
  const [tests, setTests] = useState([]);
  const [cart, setCart] = useState([]);
  const [playingTestId, setPlayingTestId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Get correct period format
  const period = getTwoMonthPeriod(); // Should return "2025-SepOct"

  // ✅ FIXED: Use only sanitized groups from profile
  // Determine current groupId using ONLY valid, sanitized groups
  const currentGroupId = React.useMemo(() => {
    // Priority: URL param > user selection > first valid group > null
    if (location.state?.groupId && validGroups.includes(location.state.groupId)) {
      return location.state.groupId;
    }
    
    if (selectedGroupId && validGroups.includes(selectedGroupId)) {
      return selectedGroupId;
    }
    
    return primaryGroupId; // First valid group or null
  }, [location.state?.groupId, selectedGroupId, validGroups, primaryGroupId]);

  // ✅ FIXED: allUserGroups now uses only sanitized data
  // Direct reference to sanitized array from profile hook

  // Enhanced readiness check using sanitized data
  const shouldInitializeLeaderboard = React.useMemo(() => {
    const hasUser = !!(user && user.uid);
    const hasProfile = !!(profile && !profileLoading);
    const hasPeriod = !!(period);
    
    if (DEBUG) {
      console.log("🔍 Leaderboard initialization check:", {
        hasUser,
        hasProfile,
        hasPeriod,
        validGroupsCount: validGroups.length,
        shouldInit: hasUser && hasProfile && hasPeriod
      });
    }
    
    return hasUser && hasProfile && hasPeriod;
  }, [user, profile, profileLoading, period, validGroups.length]);

  // Only initialize leaderboard hook when data is ready
  const { 
    isReady, 
    initialized,
        listenGroup, 
    leaderboards, 
    loadingScopes, 
    errors,
    availableScopes,
   } = useUnifiedLeaderboard(
    shouldInitializeLeaderboard ? user?.uid : null,
    shouldInitializeLeaderboard ? profile : null, 
    shouldInitializeLeaderboard ? period : null
  );

  // ✅ FIXED: Simplified debugging with clean data
  useEffect(() => {
    if (profile && user?.uid && DEBUG) {
      console.log("=== CLEAN PROFILE DEBUG ===");
      console.log("User ID:", user.uid);
      console.log("Profile loaded:", !profileLoading);
      console.log("✅ Sanitized validGroups:", validGroups);
      console.log("✅ Primary group ID:", primaryGroupId);
      console.log("✅ Has groups:", hasGroups);
      console.log("Final currentGroupId:", currentGroupId);
      console.log("Leaderboard ready:", isReady, "initialized:", initialized);
      console.log("Period:", period);
      console.log("===============================");
    }
  }, [profile, user?.uid, profileLoading, validGroups, primaryGroupId, hasGroups, currentGroupId, isReady, initialized, period]);

  // Set default group if user has groups but none selected
  useEffect(() => {
    if (hasGroups && !selectedGroupId && !location.state?.groupId) {
      if (DEBUG) {
        console.log("🎯 Auto-selecting primary group:", primaryGroupId);
      }
      setSelectedGroupId(primaryGroupId);
    }
  }, [hasGroups, selectedGroupId, location.state?.groupId, primaryGroupId]);

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

  // Enhanced save handler with sanitized group data
  const handleTestComplete = async (testId, result) => {
    if (!user || !profile) {
      console.error("❌ Missing user or profile");
      alert("Error: User authentication or profile data missing");
      return;
    }
    
    const test = cart.find((t) => t.id === testId);
    if (!test) {
      console.error("❌ Test not found in cart");
      alert("Error: Test data not found");
      return;
    }

    let targetGroupId = currentGroupId;

    if (DEBUG) {
      console.log("=== SAVE ATTEMPT DEBUG ===");
      console.log("✅ Using sanitized groups only");
      console.log("Valid groups:", validGroups);
      console.log("Target group ID:", targetGroupId);
      console.log("Period:", period);
      console.log("==========================");
    }

    // Safety check: ensure target group is in valid groups
    if (targetGroupId && !validGroups.includes(targetGroupId)) {
      console.warn("⚠️ Target group ID not in valid groups, setting to null");
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
        timeTaken: result.timeTaken || 0,
        testDurationSec: test.duration,
        twoMonthPeriod: period,
        groupId: targetGroupId,
        schoolId: profile.schoolId,
        unionId: profile.unionId,
        upazilaId: profile.upazilaId,
        districtId: profile.districtId,
        divisionId: profile.divisionId,
        grade: profile.grade,
        school: profile.school || profile.schoolName,
      };

      if (DEBUG) {
        console.log("💾 Saving attempt with sanitized group data:", {
          groupId: saveData.groupId,
          period: saveData.twoMonthPeriod,
          score: saveData.combinedScore
        });
      }

      await saveAttempt(saveData);
      console.log("✅ Save attempt successful");

      // Refresh leaderboards after save
      if (isReady && initialized && hasGroups) {
        setTimeout(() => {
          if (DEBUG) {
            console.log("🔄 Refreshing leaderboards for valid groups...");
          }
          
          validGroups.forEach(groupId => {
            listenGroup(groupId);
          });
        }, 1500);
      }

      // Clear cart and stop playing
      setCart((prev) => prev.filter((t) => t.id !== testId));
      setPlayingTestId(null);

      // Show leaderboard after completing a test
      if (hasGroups) {
        setShowLeaderboard(true);
      }

      alert("Test completed successfully! Check the leaderboard to see your ranking.");

    } catch (err) {
      console.error("❌ Failed to save test attempt:", err);
      alert(`Failed to save test attempt: ${err.message}`);
    }
  };

  // Early returns for loading states
  if (profileLoading) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded mb-4 mx-auto w-48"></div>
            <div className="h-4 bg-gray-200 rounded mb-2 mx-auto w-32"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Profile Not Found</h3>
          <p className="text-red-700">User profile not found. Cannot start test.</p>
        </div>
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Authentication Required</h3>
          <p className="text-red-700">User not authenticated. Please log in to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tests</h1>

      {/* ✅ FIXED: Clean group info panel - no more junk IDs */}
      {hasGroups && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <strong>✅ Clean Group Data:</strong>
              <div className="text-sm">
                Current Group: {currentGroupId || 'None'}
              </div>
              <div className="text-sm">
                Valid Groups ({validGroups.length}): {validGroups.join(', ')} 
                <span className="text-green-600 ml-1">✓ Sanitized</span>
              </div>
              <div className="text-sm">
                Ready: {isReady ? '✅' : '❌'} | 
                Init: {initialized ? '✅' : '❌'} | 
                Period: <code>{period}</code>
              </div>
              {availableScopes && (
                <div className="text-sm">
                  Available Scopes: {availableScopes.join(', ')}
                </div>
              )}
            </div>
            
            {/* ✅ FIXED: Group selector shows only valid groups */}
            {validGroups.length > 1 && (
              <div>
                <label className="mr-2 text-sm font-medium">Select Group:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(e.target.value || null)}
                >
                  <option value="">-- Select Group --</option>
                  {validGroups.map((groupId) => (
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
              disabled={!hasGroups}
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

      {/* No groups message */}
      {!hasGroups && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm text-yellow-800">
            <strong>No Groups Available:</strong> You are not currently assigned to any groups. 
            Group leaderboards will not be available.
          </div>
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

      {/* ✅ FIXED: Group Leaderboard with clean data only */}
      {showLeaderboard && hasGroups && (
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
                key={`current-${currentGroupId}-${isReady}-${initialized}`}
              />
            </div>
          )}
          
          {/* Show leaderboards for other groups if user belongs to multiple */}
          {validGroups.length > 1 && validGroups
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
                  key={`group-${groupId}-${isReady}-${initialized}`}
                />
              </div>
            ))}
        </div>
      )}

      {/* Debug section - only show if DEBUG is true */}
      {DEBUG && showLeaderboard && isReady && initialized && hasGroups && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">🔍 Debug: Clean Leaderboard Data</h3>
          <div className="text-sm">
            <div><strong>Available Scopes:</strong> {availableScopes?.join(', ') || 'None'}</div>
            <div><strong>✅ Valid Groups:</strong> {validGroups.join(', ')}</div>
            <div><strong>Leaderboard Keys:</strong> {Object.keys(leaderboards).join(', ') || 'None'}</div>
            <div><strong>Period:</strong> <code>{period}</code></div>
            {Object.entries(leaderboards).map(([scope, data]) => (
              <div key={scope}>
                <strong>{scope}:</strong> {
                  scope === 'group' 
                    ? Object.keys(data).map(groupId => `${groupId}(${data[groupId]?.entries?.length || 0}${data[groupId]?.isEmpty ? ',empty' : ''})`).join(', ')
                    : `${data?.entries?.length || 0} entries${data?.isEmpty ? ' (empty)' : ''}`
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Inspector - only show in DEBUG mode */}
      {DEBUG && shouldInitializeLeaderboard && (
        <DatabaseInspector
          userId={user?.uid}
          groupId={currentGroupId}
          period={period}
          visible={true}
        />
      )}
    </div>
  );
}