// src/pages/GroupsPage.js
import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import GroupCreator from "../components/group/GroupCreator";
import { useUnifiedLeaderboard } from "../hooks/useUnifiedLeaderboard";

export default function GroupsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const validUid = !authLoading && typeof user?.uid === "string" ? user.uid : null;
  const { profile, loading: profileLoading } = useUserProfile(validUid ?? null);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!validUid || authLoading || profileLoading) return;

    setLoadingGroups(true);
    try {
      const groupQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", validUid)
      );

      const snapshot = await getDocs(groupQuery);

      const groupsWithMembers = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const groupData = docSnap.data();
          const memberIds = groupData.memberIds || [];

          const membersDetailed = await Promise.all(
            memberIds.map(async (uid) => {
              try {
                const userSnap = await getDoc(doc(db, "users", uid));
                const userData = userSnap.exists() ? userSnap.data() : {};
                return {
                  uid,
                  displayName: userData.name || "Unknown",
                  photoURL: userData.photoURL || userData.avatar || "/fallback-logo.png",
                  grade: userData.grade || "N/A",
                  school: userData.school || "N/A",
                };
              } catch {
                return {
                  uid,
                  displayName: "Unknown",
                  photoURL: "/fallback-logo.png",
                  grade: "N/A",
                  school: "N/A",
                };
              }
            })
          );

          return { id: docSnap.id, ...groupData, membersDetailed };
        })
      );

      setGroups(groupsWithMembers);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to load groups. Please try again later.");
    } finally {
      setLoadingGroups(false);
    }
  }, [validUid, authLoading, profileLoading]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await deleteDoc(doc(db, "groups", groupId));
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch {
      setError("❌ Failed to delete group. Please try again.");
    }
  };

  const handleLeaveGroup = async (groupId, currentMembers) => {
    if (!window.confirm("Leave this group?")) return;
    try {
      const updated = currentMembers.filter((uid) => uid !== validUid);
      await updateDoc(doc(db, "groups", groupId), { memberIds: updated });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch {
      alert("❌ Failed to leave group.");
    }
  };

  if (authLoading || profileLoading || loadingGroups) return <LoadingSpinner />;

  if (!user || !profile) {
    return (
      <div className="text-center mt-20 text-red-600">
        Missing profile. Please enroll or refresh.
      </div>
    );
  }

  const acceptedFriends = profile?.friends?.filter((f) => f.status === "accepted") || [];

  // ----- Child component for each group to safely use Hooks -----
  const GroupCard = ({ group }) => {
    const { leaderboard, loading: lbLoading } = useUnifiedLeaderboard({
      scope: "group",
      id: group.id,
      topN: 10,
    });

    // Fallbacks
    const members = Array.isArray(group?.membersDetailed) ? group.membersDetailed : [];
    const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

    return (
      <div className="border rounded-lg p-4 shadow-sm bg-white">
        <h2 className="text-lg font-semibold text-gray-800">{group?.name || "Unnamed Group"}</h2>
        <p className="text-sm text-gray-500 mb-2">Members: {members.length}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {members.length > 0 ? (
            members.map((member) => (
              <div
                key={member.uid || Math.random()}
                className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1"
                title={`${member.displayName}\nClass: ${member.grade}\nSchool: ${member.school}`}
              >
                <img
                  src={member.photoURL || "/fallback-logo.png"}
                  alt={`${member.displayName || "Unknown"} avatar`}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/fallback-logo.png"; }}
                />
                <span className="text-xs font-medium">{member.displayName}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">No members yet.</p>
          )}
        </div>

        <div className="mt-2">
          {lbLoading ? (
            <p className="text-gray-500 text-sm">Loading leaderboard...</p>
          ) : safeLeaderboard.length > 0 ? (
            <ul className="text-sm text-gray-700">
              {safeLeaderboard.map((entry, idx) => (
                <li key={entry.userId || idx}>
                  {idx + 1}. {entry.displayName || entry.userId} - {entry.combinedScore || 0} pts
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No leaderboard data.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to={`/group-quiz/${group.id}`}
            className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
          >
            📝 Take A Test
          </Link>

          <Link
            to={`/group-members/${group.id}`}
            className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
          >
            🛡️ Show Members
          </Link>

          <Link
            to={`/group-leaderboard/${group.id}`}
            className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700"
          >
            🏆 Leaderboard
          </Link>

          {group?.ownerId === validUid && (
            <button
              onClick={() => handleDeleteGroup(group.id)}
              className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
            >
              🗑️ Delete Group
            </button>
          )}

          {group?.ownerId !== validUid && group?.memberIds?.includes(validUid) && (
            <button
              onClick={() => handleLeaveGroup(group.id, group.memberIds)}
              className="bg-gray-600 text-white text-sm px-3 py-1 rounded hover:bg-gray-700"
            >
              🚪 Leave Group
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline text-sm">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">✅ My Groups</h1>

      <div className="text-center mb-6">
        <button
          onClick={() => setShowGroupModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Create New Group
        </button>
      </div>

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
            <GroupCreator onClose={() => setShowGroupModal(false)} onCreated={fetchGroups} />
          </div>
        </div>
      )}

      {error && <div className="text-red-500 text-center mt-4">{error}</div>}

      <div className="mt-8 grid gap-4">
        {groups.length === 0 ? (
          <p className="text-center text-gray-500">You're not part of any groups yet.</p>
        ) : (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          🏡 Your friends in the Guest Room ({acceptedFriends.length})
        </h2>

        {acceptedFriends.length === 0 ? (
          <p className="text-gray-500">No friends in the Guest Room yet 💺👀</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {acceptedFriends.map((friend) => (
              <li
                key={friend.uid}
                className="border rounded p-3 shadow-sm bg-white flex items-center gap-3"
              >
                <img
                  src={friend.photoURL || friend.avatar || "/fallback-logo.png"}
                  alt={`${friend.name || "Unnamed Friend"} avatar`}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/fallback-logo.png"; }}
                />
                <div>
                  <p className="font-semibold">{friend.name || "Unnamed Friend"}</p>
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
