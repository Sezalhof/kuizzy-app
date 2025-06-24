import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import StudentEnrollmentForm from "../StudentEnrollmentForm";
import Quiz from "../components/Quiz";
import RequireTeacher from "../components/RequireTeacher";
import HomePage from "../pages/HomePage";
import EditProfilePage from "../pages/EditProfilePage";

// ✅ Lazy-loaded components — corrected paths
const Leaderboard = React.lazy(() => import("../components/Leaderboard"));
const ProfilePage = React.lazy(() => import("../pages/ProfilePage"));
const AdminDashboard = React.lazy(() => import("../pages/admin/AdminDashboard")); // ✅ updated path
const TeacherDashboard = React.lazy(() => import("../pages/TeacherDashboard"));

// ✅ Reusable loading spinner for lazy fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

        <Route path="/enroll" element={<StudentEnrollmentForm />} />

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

        <Route
          path="/leaderboard"
          element={<Leaderboard data={leaderboardData} />}
        />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage user={user} />} />

        {/* ✅ Protected Lazy-loaded Admin Dashboard */}
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

        {/* ✅ Protected Lazy-loaded Teacher Dashboard */}
        <Route
          path="/teacher"
          element={
            <RequireTeacher userRole={userRole}>
              <TeacherDashboard />
            </RequireTeacher>
          }
        />

        {/* Catch-all route */}
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
