/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import HomePage from "../pages/HomePage";
import EnrollPage from "../pages/EnrollPage";
import ProfilePage from "../pages/ProfilePage";
import StudentDashboard from "../pages/student/StudentDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";
import FriendsPage from "../pages/FriendsPage";
import GroupsPage from "../pages/GroupsPage";
import QuizPage from "../pages/QuizPage";
import LeaderboardPage from "../pages/LeaderboardPage";
import GroupMembersPage from "../pages/GroupMembersPage";


import GroupQuizPage from "../pages/GroupQuizPage"; // Added for group quiz route
import GroupLeaderboardPage from "../pages/GroupLeaderboardPage"; // Updated import name

import RequireAuth from "../components/auth/RequireAuth";
import RequireProfile from "../components/auth/RequireProfile";

export default function AppRoutes({
  user,
  profile,
  profileLoading,
  profileError,
  leaderboardData,
  quizCompleted,
  score,
  timeTaken,
  handleQuizComplete,
  fullyReady,
  authLoading,
  onMounted,
}) {
  const location = useLocation();

  const isStudent = useMemo(() => profile?.role === "student", [profile]);
  const isAdminOrTeacher = useMemo(
    () => profile?.role === "admin" || profile?.role === "teacher",
    [profile]
  );

  const needsEnrollment = useMemo(() => {
    const result =
      user &&
      !profileLoading &&
      !profile &&
      profileError === "Profile does not exist.";
    console.log("[AppRoutes] 🎯 needsEnrollment evaluated:", result);
    return result;
  }, [user, profile, profileLoading, profileError]);

  useEffect(() => {
    console.groupCollapsed("[AppRoutes] ✅ Mounted");
    console.log("[AppRoutes] Props Snapshot:", {
      user,
      profile,
      profileLoading,
      profileError,
      leaderboardData,
      quizCompleted,
      score,
      timeTaken,
      fullyReady,
      authLoading,
      needsEnrollment,
    });
    console.groupEnd();

    if (typeof onMounted === "function") {
      console.log("[AppRoutes] Calling onMounted callback");
      onMounted();
    }

    return () => {
      console.log("[AppRoutes] 🔁 Unmounted");
    };
  }, [onMounted, needsEnrollment]);

  // Redirect to /enroll if profile is missing
  if (needsEnrollment) {
    if (location.pathname !== "/enroll") {
      console.warn("[AppRoutes] 🔁 Redirecting to /enroll due to missing profile");
      return <Navigate to="/enroll" replace />;
    }
    console.info("[AppRoutes] 🚧 User needs enrollment. Showing EnrollPage only.");
    return (
      <Routes>
        <Route
          path="/enroll"
          element={
            <RequireAuth user={user} authLoading={authLoading}>
              <EnrollPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/enroll" replace />} />
      </Routes>
    );
  }

  // Wait if app is not fully ready
  if (!fullyReady) {
    console.log("[AppRoutes] ⏳ Waiting for fullyReady...");
    console.log("[AppRoutes] fullyReady is", fullyReady);
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/enroll"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <EnrollPage />
          </RequireAuth>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              {(() => {
                console.group("[AppRoutes] 🧭 Rendering /dashboard");
                console.log("User:", user);
                console.log("Profile:", profile);
                console.log("Loading:", profileLoading);
                console.log("Error:", profileError);
                console.log("isStudent:", isStudent);
                console.groupEnd();

                if (isStudent) {
                  return (
                    <StudentDashboard
                      user={user}
                      profile={profile}
                      profileLoading={profileLoading}
                      profileError={profileError}
                    />
                  );
                } else if (isAdminOrTeacher) {
                  return <Navigate to="/admin" replace />;
                } else {
                  return <Navigate to="/" replace />;
                }
              })()}
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              {isAdminOrTeacher ? (
                <AdminDashboard
                  user={user}
                  profile={profile}
                  profileLoading={profileLoading}
                  profileError={profileError}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/profile"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <ProfilePage
                user={user}
                profile={profile}
                profileLoading={profileLoading}
                profileError={profileError}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/friends"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <FriendsPage
                user={user}
                profile={profile}
                profileLoading={profileLoading}
                profileError={profileError}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/groups"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <GroupsPage
                user={user}
                profile={profile}
                profileLoading={profileLoading}
                profileError={profileError}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/quiz"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <QuizPage
                user={user}
                profile={profile}
                onComplete={handleQuizComplete}
                quizCompleted={quizCompleted}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <LeaderboardPage
                user={user}
                profile={profile}
                leaderboardData={leaderboardData}
                score={score}
                timeTaken={timeTaken}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />

      {/* Added routes for Group Quiz and Group Leaderboard */}
      <Route
        path="/group-quiz/:groupId"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <GroupQuizPage
                user={user}
                profile={profile}
                profileLoading={profileLoading}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />

      <Route
        path="/group-leaderboard/:groupId"
        element={
          <RequireAuth user={user} authLoading={authLoading}>
            <RequireProfile
              user={user}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
            >
              <GroupLeaderboardPage
                user={user}
                profile={profile}
                profileLoading={profileLoading}
              />
            </RequireProfile>
          </RequireAuth>
        }
      />
{/* ✅ Group Members Page route added at bottom */}
<Route
  path="/group-members/:groupId"
  element={
    <RequireAuth user={user} authLoading={authLoading}>
      <GroupMembersPage />
    </RequireAuth>
  }
/>


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}