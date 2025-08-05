import React, { useEffect, useMemo, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Page Components
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
import GroupQuizPage from "../pages/GroupQuizPage";
import GroupLeaderboardPage from "../pages/GroupLeaderboardPage";
import SeedDataPage from "../pages/admin/SeedDataPage";
import ApiTestPage from '../pages/ApiTestPage';



// Auth Components
import RequireAuth from "../components/auth/RequireAuth";
import RequireProfile from "../components/auth/RequireProfile";

// Constants
const ROLES = {
  STUDENT: "student",
  ADMIN: "admin",
  TEACHER: "teacher",
};

const ROUTES = {
  HOME: "/",
  ENROLL: "/enroll",
  DASHBOARD: "/dashboard",
  ADMIN: "/admin",
  PROFILE: "/profile",
  FRIENDS: "/friends",
  GROUPS: "/groups",
  QUIZ: "/quiz",
  LEADERBOARD: "/leaderboard",
  GROUP_QUIZ: "/group-quiz/:groupId",
  GROUP_LEADERBOARD: "/group-leaderboard/:groupId",
  GROUP_MEMBERS: "/group-members/:groupId",
};

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

  // Memoized role checks
  const userRole = useMemo(() => profile?.role, [profile]);
  const isStudent = useMemo(() => userRole === ROLES.STUDENT, [userRole]);
  const isAdminOrTeacher = useMemo(
    () => userRole === ROLES.ADMIN || userRole === ROLES.TEACHER,
    [userRole]
  );

  // Memoized enrollment check
  const needsEnrollment = useMemo(() => {
    const result =
      user &&
      !profileLoading &&
      !profile &&
      profileError === "Profile does not exist.";
    
    if (process.env.NODE_ENV === "development") {
      console.log("[AppRoutes] 🎯 needsEnrollment evaluated:", result);
    }
    
    return result;
  }, [user, profile, profileLoading, profileError]);

  // Memoized common props for pages
  const commonProps = useMemo(
    () => ({
      user,
      profile,
      profileLoading,
      profileError,
    }),
    [user, profile, profileLoading, profileError]
  );

  // Memoized auth wrapper props
  const authProps = useMemo(
    () => ({
      user,
      authLoading,
    }),
    [user, authLoading]
  );

  // Memoized profile wrapper props
  const profileProps = useMemo(
    () => ({
      user,
      profile,
      profileLoading,
      profileError,
    }),
    [user, profile, profileLoading, profileError]
  );

  // Development logging
  const logMountInfo = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.groupCollapsed("[AppRoutes] ✅ Mounted");
      console.log("[AppRoutes] Props Snapshot:", {
        user: !!user,
        profile: !!profile,
        profileLoading,
        profileError,
        leaderboardData: !!leaderboardData,
        quizCompleted,
        score,
        timeTaken,
        fullyReady,
        authLoading,
        needsEnrollment,
        userRole,
      });
      console.groupEnd();
    }
  }, [
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
    userRole,
  ]);

  // Mount/unmount effects
  useEffect(() => {
    logMountInfo();
    
    if (typeof onMounted === "function") {
      if (process.env.NODE_ENV === "development") {
        console.log("[AppRoutes] Calling onMounted callback");
      }
      onMounted();
    }

    return () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[AppRoutes] 🔁 Unmounted");
      }
    };
  }, [onMounted, logMountInfo]);

  // Helper components
  const ProtectedRoute = ({ children }) => (
    <RequireAuth {...authProps}>
      <RequireProfile {...profileProps}>
        {children}
      </RequireProfile>
    </RequireAuth>
  );

  const AuthOnlyRoute = ({ children }) => (
    <RequireAuth {...authProps}>
      {children}
    </RequireAuth>
  );

  // Dashboard router logic
  const DashboardRouter = () => {
    if (process.env.NODE_ENV === "development") {
      console.group("[AppRoutes] 🧭 Rendering /dashboard");
      console.log("User:", !!user);
      console.log("Profile:", !!profile);
      console.log("Loading:", profileLoading);
      console.log("Error:", profileError);
      console.log("isStudent:", isStudent);
      console.groupEnd();
    }

    if (isStudent) {
      return <StudentDashboard {...commonProps} />;
    }
    
    if (isAdminOrTeacher) {
      return <Navigate to={ROUTES.ADMIN} replace />;
    }
    
    return <Navigate to={ROUTES.HOME} replace />;
  };

  // Early returns for special states
  if (needsEnrollment) {
    if (location.pathname !== ROUTES.ENROLL) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AppRoutes] 🔁 Redirecting to /enroll due to missing profile");
      }
      return <Navigate to={ROUTES.ENROLL} replace />;
    }
    
    if (process.env.NODE_ENV === "development") {
      console.info("[AppRoutes] 🚧 User needs enrollment. Showing EnrollPage only.");
    }
    
    return (
      <Routes>
        <Route
          path={ROUTES.ENROLL}
          element={
            <AuthOnlyRoute>
              <EnrollPage />
            </AuthOnlyRoute>
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.ENROLL} replace />} />
      </Routes>
    );
  }

  if (!fullyReady) {
    if (process.env.NODE_ENV === "development") {
      console.log("[AppRoutes] ⏳ Waiting for fullyReady...");
      console.log("[AppRoutes] fullyReady is", fullyReady);
    }
    return null;
  }

  // Main routes
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.HOME} element={<HomePage />} />
      
      {/* Auth-only Routes */}
      <Route
        path={ROUTES.ENROLL}
        element={
          <AuthOnlyRoute>
            <EnrollPage />
          </AuthOnlyRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />

<Route
  path={ROUTES.ADMIN}
  element={
    <ProtectedRoute>
      {isAdminOrTeacher ? (
        <AdminDashboard {...commonProps} />
      ) : (
        <Navigate to={ROUTES.DASHBOARD} replace />
      )}
    </ProtectedRoute>
  }
>
  <Route
    path="seed"
    element={
      <ProtectedRoute>
        <SeedDataPage />
      </ProtectedRoute>
    }
  />
</Route>


      <Route
        path={ROUTES.PROFILE}
        element={
          <ProtectedRoute>
            <ProfilePage {...commonProps} />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.FRIENDS}
        element={
          <ProtectedRoute>
            <FriendsPage {...commonProps} />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.GROUPS}
        element={
          <ProtectedRoute>
            <GroupsPage {...commonProps} />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.QUIZ}
        element={
          <ProtectedRoute>
            <QuizPage
              {...commonProps}
              onComplete={handleQuizComplete}
              quizCompleted={quizCompleted}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.LEADERBOARD}
        element={
          <ProtectedRoute>
            <LeaderboardPage
              {...commonProps}
              leaderboardData={leaderboardData}
              score={score}
              timeTaken={timeTaken}
            />
          </ProtectedRoute>
        }
      />

      {/* Group Routes */}
      <Route
        path={ROUTES.GROUP_QUIZ}
        element={
          <ProtectedRoute>
            <GroupQuizPage {...commonProps} />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.GROUP_LEADERBOARD}
        element={
          <ProtectedRoute>
            <GroupLeaderboardPage {...commonProps} />
          </ProtectedRoute>
        }
      />


      <Route
        path={ROUTES.GROUP_MEMBERS}
        element={
          <AuthOnlyRoute>
            <GroupMembersPage />
          </AuthOnlyRoute>
        }
      />
<Route
  path="/admin/seed"
  element={
    <ProtectedRoute>
      <SeedDataPage />
    </ProtectedRoute>
  }
/>

<Route path="/api-test" element={<ApiTestPage />} />



      {/* Fallback Route */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}