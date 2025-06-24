// src/components/Navbar.js
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, userRole, onLogout }) {
  const isStudent = userRole === "student";
  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "admin";

  return (
    <nav className="bg-white sticky top-0 z-50 shadow px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
      {/* App name */}
      <div className="text-xl font-bold text-blue-600">
        <Link to="/">📚 Kuizzy</Link>
      </div>

      {/* Nav links */}
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <Link to="/" className="text-gray-700 hover:text-blue-600">
          🏠 Home
        </Link>

        {isStudent && (
          <Link to="/quiz" className="text-gray-700 hover:text-blue-600">
            🎯 Quiz
          </Link>
        )}

        <Link to="/leaderboard" className="text-gray-700 hover:text-blue-600">
          🏆 Leaderboard
        </Link>

        <Link to="/profile" className="text-gray-700 hover:text-blue-600">
          👤 Profile
        </Link>

        {isAdmin && (
          <Link to="/admin" className="text-gray-700 hover:text-yellow-600">
            🛠️ Admin
          </Link>
        )}

        {isTeacher && (
          <Link to="/teacher" className="text-gray-700 hover:text-indigo-600">
            📘 Teacher
          </Link>
        )}

        <button
          onClick={onLogout}
          className="text-red-600 hover:underline"
        >
          🚪 Sign Out
        </button>
      </div>
    </nav>
  );
}
