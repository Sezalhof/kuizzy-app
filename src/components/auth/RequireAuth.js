import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children, user, authLoading }) {
  const location = useLocation();

  // ⏳ Show loading while authentication is in progress
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-lg animate-pulse">🔐 Checking authentication...</div>
      </div>
    );
  }

  // 🚫 Redirect to home if no authenticated user
  if (!user || typeof user.uid !== "string") {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // ✅ All checks passed – render children
  return <>{children}</>;
}
