import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const validUid = !authLoading && typeof user?.uid === "string" ? user.uid : null;
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(validUid);

  useEffect(() => {
    console.log("[ProfilePage] Auth user:", user);
    console.log("[ProfilePage] Profile loading:", profileLoading);
    console.log("[ProfilePage] Profile data:", profile);
    console.log("[ProfilePage] Profile error:", profileError);
  }, [user, profileLoading, profile, profileError]);

  const [editing, setEditing] = useState(false);

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <h2 className="text-xl font-semibold mb-4 text-red-600">
          Missing profile. Please enroll or refresh.
        </h2>
        <button
          onClick={() => navigate("/enroll")}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Complete Enrollment
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      {!editing ? (
        <div className="space-y-4">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {user?.email || "N/A"}</p>
          <p><strong>Phone:</strong> {profile.phone || "N/A"}</p>
          <p><strong>Gender:</strong> {profile.gender || "N/A"}</p>
          <p><strong>Grade:</strong> {profile.grade || "N/A"}</p>
          <p><strong>School:</strong> {profile.school || "N/A"}</p>
          <p><strong>Role:</strong> {profile.role || "N/A"}</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Edit Profile
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-500">Editing mode (form not implemented here)</p>
          <button
            onClick={() => setEditing(false)}
            className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
