// src/routes/AppRoutes.js
// ✅ 1. Core & library imports
import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// ✅ 2. Static imports first
import HomePage from "pages/HomePage";
import EditProfilePage from "pages/EditProfilePage";
import StudentEnrollmentForm from "StudentEnrollmentForm";
import StudentDashboard from "pages/student/StudentDashboard";
import Quiz from "components/Quiz";
import RequireTeacher from "components/RequireTeacher";
import RequireStudent from "components/RequireStudent";
import { Link } from "react-router-dom";

// ✅ 3. Then dynamic React.lazy() imports
const Leaderboard = React.lazy(() => import("components/Leaderboard"));
const ProfilePage = React.lazy(() => import("pages/ProfilePage"));
const AdminDashboard = React.lazy(() => import("pages/admin/AdminDashboard"));
const TeacherDashboard = React.lazy(() => import("pages/TeacherDashboard"));
const FriendsPage = React.lazy(() => import("pages/FriendsPage"));



// Fallback loading UI
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
        {/* Home Page */}
        <Route
          path="/"
          element={<HomePage user={user} userRole={userRole} onLogout={onLogout} />}
        />

        {/* Public Routes */}
        <Route path="/enroll" element={<StudentEnrollmentForm />} />
        <Route path="/leaderboard" element={<Leaderboard data={leaderboardData} />} />
        <Route path="/student-basic" element={<StudentDashboard />} />

        {/* Quiz - Student Only */}
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
        
<Route path="/leaderboard" element={<Leaderboard data={leaderboardData} />} />

        {/* Student Dashboard */}
        <Route path="/student" element={<StudentDashboard />} />

        {/* Friends Page (Student-only protected) */}
<Route path="/friends" element={<FriendsPage />} />



        {/* Profile Pages */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage user={user} />} />

        {/* Admin Page */}
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

        {/* Teacher Dashboard */}
        <Route
          path="/teacher"
          element={
            <RequireTeacher userRole={userRole}>
              <TeacherDashboard />
            </RequireTeacher>
          }
        />

        {/* 404 Page */}
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
