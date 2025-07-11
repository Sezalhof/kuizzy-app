import React, { useEffect } from "react";
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

  // 🐞 Debug logs
  useEffect(() => {
    console.groupCollapsed("[RequireProfile] 🔍 State Snapshot");
    console.log("Auth user:", user?.uid || "null");
    console.log("Auth loading:", authLoading);
    console.log("Profile loading:", profileLoading);
    console.log("Profile object:", profile);
    console.log("Profile error:", profileError);
    console.groupEnd();
  }, [user, authLoading, profileLoading, profile, profileError]);

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
    console.warn("[RequireProfile] 🚫 Redirecting: user not signed in");
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
    console.log("[RequireProfile] ℹ️ On /enroll route - allowing access");
    return <>{children}</>;
  }

  // Redirect to enroll if profile incomplete or error (except on /enroll)
  if (!isComplete || profileError) {
    console.warn("[RequireProfile] ⚠️ Redirecting: profile incomplete or error", {
      isComplete,
      profileError,
    });
    return <Navigate to="/enroll" state={{ from: location }} replace />;
  }

  // ✅ Success
  console.log("[RequireProfile] ✅ Profile complete — rendering children");
  return <>{children}</>;
}
