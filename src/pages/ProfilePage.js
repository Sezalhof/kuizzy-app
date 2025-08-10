import { useParams } from "react-router-dom";
import { useUserProfile } from "../hooks/useUserProfile";
import useAuth from "../hooks/useAuth";
import { useState } from "react";

export default function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { profile, loading, error, hasProfile } = useUserProfile(userId || user?.uid);

  const [activeTab, setActiveTab] = useState("info");

  const isOwner = user && profile && user.uid === userId;
  const limitedView = !isOwner;

  if (loading) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  if (!hasProfile) {
    return <div className="p-4 text-center">No profile found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Profile Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <img
          src={profile.avatar || "/default-avatar.png"}
          alt={`${profile.name}'s avatar`}
          className="w-24 h-24 rounded-full object-cover border"
        />
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          {profile.grade && <p className="text-gray-600">Class {profile.grade}</p>}
          {profile.schoolName && <p className="text-gray-500">{profile.schoolName}</p>}
          {profile.upazila && <p className="text-gray-500">{profile.upazila}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mt-4 border-b">
        <button
          className={`pb-2 ${activeTab === "info" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
          onClick={() => setActiveTab("info")}
        >
          Info
        </button>
        <button
          className={`pb-2 ${activeTab === "friends" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
          onClick={() => setActiveTab("friends")}
        >
          Friends
        </button>
        {isOwner && (
          <button
            className={`pb-2 ${activeTab === "settings" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "info" && (
          <div className="space-y-2">
            {limitedView ? (
              <>
                {/* Limited public info */}
                <p><strong>School:</strong> {profile.schoolName || "Hidden"}</p>
                <p><strong>Class:</strong> {profile.grade || "Hidden"}</p>
                <p><strong>Upazila:</strong> {profile.upazila || "Hidden"}</p>
              </>
            ) : (
              <>
                {/* Full owner view */}
                <p><strong>Email:</strong> {profile.email || "Not set"}</p>
                <p><strong>Phone:</strong> {profile.phone || "Not set"}</p>
                <p><strong>School:</strong> {profile.schoolName || "Not set"}</p>
                <p><strong>Class:</strong> {profile.grade || "Not set"}</p>
                <p><strong>Upazila:</strong> {profile.upazila || "Not set"}</p>
                {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
              </>
            )}
          </div>
        )}

        {activeTab === "friends" && (
          <div>
            {/* You can slot in your FriendCard/Friends list component here */}
            <p>Friends list coming here...</p>
          </div>
        )}

        {activeTab === "settings" && isOwner && (
          <div>
            {/* Link to Edit Profile Page */}
            <a
              href="/edit-profile"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Edit Profile
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
