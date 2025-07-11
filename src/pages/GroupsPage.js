import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import LoadingSpinner from "../components/ui/LoadingSpinner";
// import GroupCreator from "../components/group/GroupCreator";
import GroupCreatorModal from "../components/group/GroupCreatorModal";

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const validUid = !authLoading && typeof user?.uid === "string" ? user.uid : null;

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(validUid);

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    // debug logs preserved
    console.log("👤 [GroupsPage] user:", user);
    console.log("⏳ [GroupsPage] authLoading:", authLoading);
    console.log("🧬 [GroupsPage] profile:", profile);
    console.log("⏳ [GroupsPage] profileLoading:", profileLoading);
    console.log("⚠️ [GroupsPage] profileError:", profileError);
  }, [user, authLoading, profile, profileLoading, profileError]);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!validUid || !profile || profileLoading || authLoading) {
        console.log("⏭️ [GroupsPage] Skipping fetchTeams — incomplete state");
        return;
      }

      setLoadingTeams(true);
      console.log("📥 [GroupsPage] Fetching teams for user:", validUid);

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

            const membersDetailed = await Promise.all(
              memberIds.map(async (uid) => {
                try {
                  const userSnap = await getDoc(doc(db, "users", uid));
                  const userData = userSnap.exists() ? userSnap.data() : {};
                  return {
                    uid,
                    displayName: userData.name || "Unknown",
                    className: userData.grade || "N/A",
                    schoolName: userData.school || "N/A",
                  };
                } catch {
                  return {
                    uid,
                    displayName: "Unknown",
                    className: "N/A",
                    schoolName: "N/A",
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

        console.log("✅ [GroupsPage] Fetched teams:", teamsWithDetails);
        setTeams(teamsWithDetails);
      } catch (err) {
        console.error("❌ [GroupsPage] Error loading teams:", err);
        setError("Failed to load teams.");
      } finally {
        setLoadingTeams(false);
        console.log("✅ [GroupsPage] Finished loading teams");
      }
    };

    fetchTeams();
  }, [validUid, profile, profileLoading, authLoading]);

  const handleCopyLink = (groupId) => {
    const url = `${window.location.origin}/group-invite/${groupId}`;
    navigator.clipboard.writeText(url);
    alert("✅ Invite link copied to clipboard!");
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

  const acceptedFriends = profile.friends?.filter((f) => f.status === "accepted") || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
        ✅ My Teams
      </h1>

      {/* Button to open modal */}
      <div className="text-center mb-6">
        <button
          onClick={() => setShowGroupModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Create New Team
        </button>
      </div>

      {/* Group creation modal */}
      {showGroupModal && <GroupCreatorModal onClose={() => setShowGroupModal(false)} />}

      {error && <div className="text-red-500 text-center mt-4">{error}</div>}

      {/* Teams list */}
      <div className="mt-8 grid gap-4">
        {teams.length === 0 ? (
          <p className="text-center text-gray-500">
            You're not part of any teams yet.
          </p>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="border rounded-lg p-4 shadow-sm bg-white"
            >
              <h2 className="text-lg font-semibold text-gray-800">{team.name}</h2>
              <p className="text-sm text-gray-500 mb-2">
                Members: {team.membersDetailed.length}
              </p>

              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  to={`/group-quiz/${team.id}`}
                  className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
                >
                  📝 Take Quiz
                </Link>

                <Link
                  to={`/group-members/${team.id}`}
                  className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
                >
                  👥 Show Members
                </Link>

                <Link
                  to={`/group-leaderboard/${team.id}`}
                  className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700"
                >
                  🏆 Leaderboard
                </Link>

                <button
                  onClick={() => handleCopyLink(team.id)}
                  className="bg-gray-200 text-gray-800 text-sm px-3 py-1 rounded hover:bg-gray-300"
                >
                  🔗 Copy Invite Link
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- New section: Accepted Friends --- */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">Your Accepted Friends</h2>
        {acceptedFriends.length === 0 ? (
          <p className="text-gray-500">You have no accepted friends yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {acceptedFriends.map((friend) => (
              <li
                key={friend.uid}
                className="border rounded p-3 shadow-sm bg-white"
              >
                <p className="font-semibold">{friend.name || "Unnamed Friend"}</p>
                <p className="text-sm text-gray-600">
                  Class: {friend.grade || "N/A"} | School: {friend.school || "N/A"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
