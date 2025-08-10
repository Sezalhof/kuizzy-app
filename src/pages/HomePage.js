import React, { useState } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(user?.uid ?? null);

  const [activeTab, setActiveTab] = useState("overview");

  if (profileLoading) {
    return <p className="text-center mt-6">Loading profile...</p>;
  }

  if (profileError) {
    return <p className="text-center mt-6 text-red-600">{profileError}</p>;
  }

  if (!profile) {
    return <p className="text-center mt-6">Profile not found.</p>;
  }

  // Ensure we have UID and PhotoURL from either profile or auth
  const profileUid = profile.uid || user?.uid;
  const profilePhoto =
    profile.photoURL || user?.photoURL || "/default-avatar.png";

  const isOwner = user?.uid === profileUid;

  // Public info
  const limitedInfo = {
    grade: profile.grade || "N/A",
    school: profile.school || "N/A",
    upazila: profile.upazila || "N/A",
  };

  // Private info
  const privateInfo = {
    phone: profile.phone || "N/A",
    email: profile.email || user?.email || "N/A",
    religion: profile.religion || "N/A",
    gender: profile.gender || "N/A",
    union: profile.union || "N/A",
    district: profile.district || "N/A",
    division: profile.division || "N/A",
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
        <img
          src={profilePhoto}
          alt="Profile"
          className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 cursor-pointer"
          onClick={() => {
            if (!isOwner) {
              navigate(`/profile/${profileUid}`);
            }
          }}
        />
        <h1
          className="text-2xl font-bold mt-4 cursor-pointer"
          onClick={() => {
            if (!isOwner) {
              navigate(`/profile/${profileUid}`);
            }
          }}
        >
          {profile.name || user?.displayName || "Unnamed"}
        </h1>
        <p className="text-gray-500">
          {limitedInfo.grade} • {limitedInfo.school}
        </p>
        <p className="text-gray-400 text-sm">{limitedInfo.upazila}</p>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 text-center ${
              activeTab === "overview"
                ? "border-b-2 border-blue-500 text-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab("private")}
              className={`flex-1 py-2 text-center ${
                activeTab === "private"
                  ? "border-b-2 border-blue-500 text-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Private Info
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow p-4 mt-2">
          {activeTab === "overview" && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Profile Overview</h2>
              <p><strong>Grade:</strong> {limitedInfo.grade}</p>
              <p><strong>School:</strong> {limitedInfo.school}</p>
              <p><strong>Upazila:</strong> {limitedInfo.upazila}</p>

              {isOwner && (
                <>
                  <p><strong>Phone:</strong> {privateInfo.phone}</p>
                  <p><strong>Email:</strong> {privateInfo.email}</p>
                  <p><strong>Religion:</strong> {privateInfo.religion}</p>
                  <p><strong>Gender:</strong> {privateInfo.gender}</p>
                  <p><strong>Union/Pouroshava:</strong> {privateInfo.union}</p>
                  <p><strong>District:</strong> {privateInfo.district}</p>
                  <p><strong>Division:</strong> {privateInfo.division}</p>
                </>
              )}
            </div>
          )}

          {isOwner && activeTab === "private" && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Private Details</h2>
              <p><strong>Phone:</strong> {privateInfo.phone}</p>
              <p><strong>Email:</strong> {privateInfo.email}</p>
              <p><strong>Religion:</strong> {privateInfo.religion}</p>
              <p><strong>Gender:</strong> {privateInfo.gender}</p>
              <p><strong>Union/Pouroshava:</strong> {privateInfo.union}</p>
              <p><strong>District:</strong> {privateInfo.district}</p>
              <p><strong>Division:</strong> {privateInfo.division}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
