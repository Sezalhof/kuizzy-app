//src/pages/GroupPage.js
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import GroupCreator from "../components/group/GroupCreator";

export default function GroupsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const validUid = !authLoading && typeof user?.uid === "string" ? user.uid : null;

  const { profile, loading: profileLoading } = useUserProfile(validUid);

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!validUid || !profile || profileLoading || authLoading) return;

      setLoadingTeams(true);
      try {
        const groupQuery = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", validUid)
        );
        const groupSnapshot = await getDocs(groupQuery);

        const teamsWithDetails = await Promise.all(
          groupSnapshot.docs.map(async (docSnap) => {
            const groupData = docSnap.data();
            const memberIds = groupData.memberIds || [];

            // Fetch detailed info for members (avatar, name, grade, school)
            const membersDetailed = await Promise.all(
              memberIds.map(async (uid) => {
                try {
                  const userSnap = await getDoc(doc(db, "users", uid));
                  const userData = userSnap.exists() ? userSnap.data() : {};
                  return {
                    uid,
                    displayName: userData.name || "Unknown",
                    photoURL: userData.photoURL || userData.avatar || "/fallback-logo.png",
                    grade: userData.grade || null,
                    school: userData.school || null,
                  };
                } catch {
                  return {
                    uid,
                    displayName: "Unknown",
                    photoURL: "/fallback-logo.png",
                    grade: null,
                    school: null,
                  };
                }
              })
            );

            return {
              id: docSnap.id,
              ...groupData,
              membersDetailed,
            };
          })
        );

        setTeams(teamsWithDetails);
      } catch (err) {
        console.error("[GroupsPage] Failed to load teams:", err);
        setError("❌ Failed to load teams.");
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [validUid, profile, profileLoading, authLoading]);

  const handleDeleteGroup = async (groupId) => {
    const confirm = window.confirm("Are you sure you want to delete this group?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "groups", groupId));
      setTeams((prev) => prev.filter((team) => team.id !== groupId));
    } catch (err) {
      console.error("Failed to delete group:", err);
      alert("❌ Failed to delete group.");
    }
  };

  const handleLeaveGroup = async (groupId, currentMembers) => {
    const confirm = window.confirm("Leave this group?");
    if (!confirm) return;

    try {
      const updated = currentMembers.filter((uid) => uid !== validUid);
      await updateDoc(doc(db, "groups", groupId), {
        memberIds: updated,
      });
      setTeams((prev) => prev.filter((team) => team.id !== groupId));
    } catch (err) {
      console.error("Leave group error:", err);
      alert("❌ Failed to leave group.");
    }
  };

  if (authLoading || profileLoading || loadingTeams) {
    return <LoadingSpinner />;
  }

  if (!user || !profile) {
    return (
      <div className="text-center mt-20 text-red-600">
        Missing profile. Please enroll or refresh.
      </div>
    );
  }

  const acceptedFriends =
    profile.friends?.filter((f) => f.status === "accepted") || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-blue-600 hover:underline text-sm"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
        ✅ My Teams
      </h1>

      {/* Create Team */}
      <div className="text-center mb-6">
        <button
          onClick={() => setShowGroupModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Create New Team
        </button>
      </div>

      {/* Modal */}
      {showGroupModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowGroupModal(false)}
        >
          <div
            className="relative bg-white rounded-lg p-4 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGroupModal(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-red-500 text-xl"
              title="Close"
            >
              ×
            </button>
            <GroupCreator onClose={() => setShowGroupModal(false)} />
          </div>
        </div>
      )}

      {error && <div className="text-red-500 text-center mt-4">{error}</div>}

      {/* Team Cards */}
      <div className="mt-8 grid gap-4">
        {teams.length === 0 ? (
          <p className="text-center text-gray-500">
            You're not part of any teams yet.
          </p>
        ) : (
          teams.map((team) => {
            const groupUid = team.groupUid || team.id; // fallback for legacy groups

            return (
              <div
                key={team.id}
                className="border rounded-lg p-4 shadow-sm bg-white"
              >
                <h2 className="text-lg font-semibold text-gray-800">
                  {team.name}
                </h2>
                <p className="text-sm text-gray-500 mb-2">
                  Members: {team.membersDetailed.length}
                </p>

                {/* Show member avatars & names horizontally */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {team.membersDetailed.map((member) => (
                    <div
                      key={member.uid}
                      className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1"
                      title={`${member.displayName}\nClass: ${
                        member.grade || "N/A"
                      }\nSchool: ${member.school || "N/A"}`}
                    >
                      <img
                        src={member.photoURL || "/fallback-logo.png"}
                        alt={`${member.displayName} avatar`}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/fallback-logo.png";
                        }}
                      />
                      <span className="text-xs font-medium">{member.displayName}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Link
                    to={`/group-quiz/${groupUid}`}
                    className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
                  >
                    📝 Take A Test
                  </Link>

                  <Link
                    to={`/group-members/${groupUid}`}
                    className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    🛡️ Show fighters
                  </Link>

                  <Link
                    to={`/group-leaderboard/${groupUid}`}
                    className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700"
                  >
                    🏆 Leaderboard
                  </Link>

                  {team.ownerId === validUid && team.memberIds?.length === 1 && (
                    <button
                      onClick={() => handleDeleteGroup(team.id)}
                      className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                    >
                      🗑️ Delete Group
                    </button>
                  )}

                  {team.ownerId !== validUid &&
                    team.memberIds?.includes(validUid) && (
                      <button
                        onClick={() => handleLeaveGroup(team.id, team.memberIds)}
                        className="bg-gray-600 text-white text-sm px-3 py-1 rounded hover:bg-gray-700"
                      >
                        🚪 Leave Group
                      </button>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Guest Room */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          🏡 Your teammates in the Guest Room ({acceptedFriends.length})
        </h2>

        {acceptedFriends.length === 0 ? (
          <p className="text-gray-500">
            No teammates in the Guest Room yet 💺👀
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {acceptedFriends.map((friend) => (
              <li
                key={friend.uid}
                className="border rounded p-3 shadow-sm bg-white flex items-center gap-3"
              >
                <img
                  src={friend.photoURL || friend.avatar || "/fallback-logo.png"}
                  alt={`${friend.name || "Unnamed Guest"} avatar`}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/fallback-logo.png";
                  }}
                />
                <div>
                  <p className="font-semibold">{friend.name || "Unnamed Guest"}</p>
                  <p className="text-xs text-gray-600">
                    Class: {friend.grade || "N/A"} | School: {friend.school || "N/A"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
