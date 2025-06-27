import React from "react";

export default function HomePage({ user = {}, userRole = "", onLogout }) {
  const displayName = user.displayName || user.email?.split("@")[0] || "User";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4 space-y-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Welcome, {displayName} 👋
      </h1>
      <p className="text-gray-600 text-lg">
        Use the navigation bar above to explore the app.
      </p>
      {/* Temporarily print user role */}
      <p className="text-gray-500 text-sm text-center">Role: {userRole}</p>
    </div>
  );
}