import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import StudentEnrollmentForm from "../StudentEnrollmentForm";
import Quiz from "../components/Quiz";
import RequireTeacher from "../components/RequireTeacher";
import RequireStudent from "../components/RequireStudent";
import HomePage from "../pages/HomePage";
import EditProfilePage from "../pages/EditProfilePage";
import StudentDashboard from "../pages/student/StudentDashboard";

// Lazy-loaded components with verified paths
const Leaderboard = React.lazy(() => import("../components/Leaderboard"));
const ProfilePage = React.lazy(() => import("../pages/ProfilePage"));
const AdminDashboard = React.lazy(() => import("../pages/admin/AdminDashboard"));
const TeacherDashboard = React.lazy(() => import("../pages/TeacherDashboard"));
const StudentDashboardLazy = React.lazy(() => import("../pages/student/StudentDashboard"));

// Enhanced loading component
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex flex-col justify-center items-center h-64 space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    <p className="text-gray-600">{message}</p>
  </div>
);

export default function AppRoutes({
  user,
  userRole,
  leaderboardData,
  quizCompleted,
  score,
  timeTaken,
  handleQuizComplete,
  onLogout,
}) {
  const isStudent = userRole === "student";
  const isAdmin = userRole === "admin";

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Home Route */}
        <Route
          path="/"
          element={
            <HomePage
              user={user}
              userRole={userRole}
              onLogout={onLogout}
            />
          }
        />

        {/* Public Routes */}
        <Route path="/enroll" element={<StudentEnrollmentForm />} />
        <Route path="/leaderboard" element={<Leaderboard data={leaderboardData} />} />
        <Route path="/student-basic" element={<StudentDashboard />} />

        {/* Protected Student Routes */}
        <Route
          path="/quiz"
          element={
            isStudent ? (
              <Quiz onComplete={handleQuizComplete} />
            ) : (
              <div className="text-center text-red-600 font-bold mt-10">
                Only students can take the quiz.
              </div>
            )
          }
        />
<Route path="/student" element={<StudentDashboard />} />

  

        {/* User Profile Routes */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage user={user} />} />

        {/* Protected Admin Route */}
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <AdminDashboard user={user} userRole={userRole} />
            ) : (
              <div className="text-center text-red-600 font-bold mt-10">
                Access Denied — Admins only
              </div>
            )
          }
        />

        {/* Protected Teacher Route */}
        <Route
          path="/teacher"
          element={
            <RequireTeacher userRole={userRole}>
              <TeacherDashboard />
            </RequireTeacher>
          }
        />

        {/* Fallback Route */}
        <Route
          path="*"
          element={
            <div className="text-center mt-20 text-gray-600 text-xl">
              404 — Page Not Found
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}