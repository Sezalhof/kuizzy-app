// src/pages/HomePage.js
import React from "react";
import { Link } from "react-router-dom";

export default function HomePage({ user = {}, userRole = "", onLogout }) {
  const displayName = user.displayName || user.email?.split("@")[0] || "User";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4 space-y-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Welcome, {displayName} 👋
      </h1>
      <p className="text-gray-600 text-lg">
        Use the navigation above to explore the app.
      </p>

      <div className="flex flex-wrap gap-4 justify-center">
        {/* Student Dashboard Button */}
        {userRole === "student" && (
          <Link to="/student">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition duration-200">
              Go to Student Dashboard
            </button>
          </Link>
        )}

        {/* Teacher Dashboard Button */}
        {userRole === "teacher" && (
          <Link to="/teacher">
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition duration-200">
              Teacher Portal
            </button>
          </Link>
        )}

        {/* Admin Dashboard Button */}
        {userRole === "admin" && (
          <Link to="/admin">
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition duration-200">
              Admin Dashboard
            </button>
          </Link>
        )}

        {/* Logout Button */}
        {user?.email && (
          <button
            onClick={onLogout}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition duration-200"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
