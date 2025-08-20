import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireProfile({
  children,
  profile,
  profileLoading,
  profileError,
  user,
  authLoading,
}) {
  const location = useLocation();

  // ⏳ Wait for loading
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-lg animate-pulse">📄 Loading profile...</div>
      </div>
    );
  }

  // 🔐 Not logged in
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 🛑 Check profile completeness
  const requiredFields = [
    "name",
    "phone",
    "school",
    "grade",
    "role",
    "countryCode",
  ];

  const isComplete =
    profile &&
    typeof profile === "object" &&
    requiredFields.every(
      (field) =>
        profile[field] !== undefined &&
        profile[field] !== null &&
        profile[field] !== ""
    );

  // Allow /enroll route to render always (prevent redirect loop)
  if (location.pathname === "/enroll") {
    return <>{children}</>;
  }

  // Redirect to enroll if profile incomplete or error (except on /enroll)
  if (!isComplete || profileError) {
    return <Navigate to="/enroll" state={{ from: location }} replace />;
  }

  // ✅ Success
  return <>{children}</>;
}
