// src/pages/GroupsPage.js - FIXED: Use sanitized groups only
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

const DEBUG = false; // Set to true only for debugging

export default function GroupsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const validUid = !authLoading && typeof user?.uid === "string" ? user.uid : null;
  
  // ✅ FIXED: Use enhanced useUserProfile with sanitized groups
  const { 
    profile, 
    loading: profileLoading, 
    validGroups, 
    hasGroups 
  } = useUserProfile(validUid ?? null);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  // ✅ FIXED: Fetch groups using only sanitized/valid group IDs
  const fetchGroups = useCallback(async () => {
    if (!validUid || authLoading || profileLoading || !hasGroups) {
      setLoadingGroups(false);
      return;
    }

    setLoadingGroups(true);
    try {
      if (DEBUG) {
        console.log('Fetching groups with valid IDs:', validGroups);
      }

      // Query using sanitized group IDs only
      const groupQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", validUid)
      );

      const snapshot = await getDocs(groupQuery);

      const groupsWithMembers = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const groupData = docSnap.data();
          const memberIds = groupData.memberIds || [];

          // ✅ ADDITIONAL FILTER: Only include groups that are in user's valid groups
          if (!validGroups.includes(docSnap.id)) {
            if (DEBUG) {
              console.log('Filtering out group not in valid list:', docSnap.id);
            }
            return null; // Filter out invalid groups
          }

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

      // Filter out null entries (invalid groups)
      const validGroupsData = groupsWithMembers.filter(Boolean);
      setGroups(validGroupsData);
      
      if (DEBUG) {
        console.log('Loaded valid groups:', validGroupsData.length);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load groups. Please try again later.");
    } finally {
      setLoadingGroups(false);
    }
  }, [validUid, authLoading, profileLoading, hasGroups, validGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await deleteDoc(doc(db, "groups", groupId));
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch {
      setError("Failed to delete group. Please try again.");
    }
  };

  const handleLeaveGroup = async (groupId, currentMembers) => {
    if (!window.confirm("Leave this group?")) return;
    try {
      const updated = currentMembers.filter((uid) => uid !== validUid);
      await updateDoc(doc(db, "groups", groupId), { memberIds: updated });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch {
      alert("Failed to leave group.");
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

  // ✅ FIXED: GroupCard component uses sanitized data
  const GroupCard = ({ group }) => {
    const { leaderboards, loading: lbLoading } = useUnifiedLeaderboard(
      validUid,
      profile,
      null, // Let it use default period
      "cached"
    );

    const members = Array.isArray(group?.membersDetailed) ? group.membersDetailed : [];
    const groupLeaderboard = leaderboards?.group?.[group.id]?.entries || [];

    return (
      <div className="border rounded-lg p-4 shadow-sm bg-white">
        <h2 className="text-lg font-semibold text-gray-800">{group?.name || "Unnamed Group"}</h2>
        <p className="text-sm text-gray-500 mb-2">Members: {members.length}</p>
        <p className="text-xs text-green-600 mb-2">
          Group ID: {group.id} ✓ Valid
        </p>

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
          ) : groupLeaderboard.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Top Performers:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {groupLeaderboard.slice(0, 3).map((entry, idx) => (
                  <li key={entry.userId || idx} className="flex justify-between">
                    <span>{idx + 1}. {entry.displayName || entry.userId}</span>
                    <span className="font-medium text-green-600">
                      {typeof entry.combinedScore === 'number' ? entry.combinedScore.toFixed(1) : '0.0'} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No leaderboard data yet.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/test"
            state={{ groupId: group.id }}
            className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
          >
            Take A Test
          </Link>

          <Link
            to={`/group-members/${group.id}`}
            className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
          >
            Show Members
          </Link>

          <Link
            to={`/group-leaderboard/${group.id}`}
            className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700"
          >
            Leaderboard
          </Link>

          {group?.ownerId === validUid && (
            <button
              onClick={() => handleDeleteGroup(group.id)}
              className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
            >
              Delete Group
            </button>
          )}

          {group?.ownerId !== validUid && group?.memberIds?.includes(validUid) && (
            <button
              onClick={() => handleLeaveGroup(group.id, group.memberIds)}
              className="bg-gray-600 text-white text-sm px-3 py-1 rounded hover:bg-gray-700"
            >
              Leave Group
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

      <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">My Groups</h1>

      {/* ✅ FIXED: Clean group status display */}
      {hasGroups && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="text-sm">
            <strong>Valid Groups ({validGroups.length}):</strong>
            <div className="mt-1 text-xs text-green-700">
              {validGroups.map(groupId => (
                <span key={groupId} className="inline-block bg-green-100 px-2 py-1 rounded mr-2 mb-1">
                  {groupId} ✓
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <button
          onClick={() => setShowGroupModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create New Group
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
        {!hasGroups ? (
          <div className="text-center py-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">No Groups Available</h3>
              <p className="text-blue-700 mb-4">
                You are not currently assigned to any valid groups.
              </p>
              <p className="text-blue-600 text-sm">
                Contact an administrator to be added to groups, or create a new group above.
              </p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Groups Not Found</h3>
              <p className="text-yellow-700 mb-4">
                You have valid group assignments, but the group data could not be loaded.
              </p>
              <p className="text-yellow-600 text-sm">
                This might be a temporary issue. Try refreshing the page.
              </p>
            </div>
          </div>
        ) : (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          Your Friends in the Guest Room ({acceptedFriends.length})
        </h2>

        {acceptedFriends.length === 0 ? (
          <p className="text-gray-500">No friends in the Guest Room yet.</p>
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