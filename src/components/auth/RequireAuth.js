import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children, user, authLoading }) {
  const location = useLocation();

  // 🔍 Debug logs for development only
  useEffect(() => {
    console.log("[RequireAuth] 🔐 Auth loading:", authLoading);
    console.log("[RequireAuth] 👤 Auth user:", user?.uid || "null");
  }, [authLoading, user]);

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
    console.log("[RequireAuth] 🚫 Redirecting: Not authenticated");
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // ✅ All checks passed – render children
  return <>{children}</>;
}
