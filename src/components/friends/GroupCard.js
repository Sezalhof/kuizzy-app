// ✅ FIXED: src/components/friends/GroupCard.js

import React, { useState, useEffect } from "react";
import { doc, updateDoc, arrayRemove, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import fallbackLogo from "../../assets/fallback-logo.png";
import ManageGroupMembers from "./ManageGroupMembers";
import InviteFriendsModal from "./InviteFriendsModal";

export default function GroupCard({ group, currentUserId, onLeft }) {
  const [showMembers, setShowMembers] = useState(false);
  const [membersDetailed, setMembersDetailed] = useState(group.membersDetailed || []);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const navigate = useNavigate();

  const isOwner = group.ownerId === currentUserId;

  // Fallback if membersDetailed is not provided
  useEffect(() => {
    const fetchMembers = async () => {
      if (group.memberIds?.length && (!group.membersDetailed || group.membersDetailed.length === 0)) {
        const enriched = await Promise.all(
          group.memberIds.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              const data = snap.exists() ? snap.data() : {};
              return {
                uid,
                displayName: data.name || "Unknown",
                className: data.grade || "N/A",
                schoolName: data.school || "N/A",
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
        setMembersDetailed(enriched);
      }
    };

    fetchMembers();
  }, [group]);

  const handleLeaveTeam = async () => {
    const confirmLeave = window.confirm("Are you sure you want to 🚪 leave this team?");
    if (!confirmLeave) return;

    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayRemove(currentUserId),
      });
      if (onLeft) onLeft(group.id);
    } catch (err) {
      alert("❌ Failed to leave team: " + err.message);
    }
  };

  const handleTakeQuiz = () => {
    navigate(`/group-quiz/${group.id}`);
  };

  const handleViewLeaderboard = () => {
    navigate(`/group-leaderboard/${group.id}`);
  };

  return (
    <div className="border rounded-lg p-4 shadow bg-white space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img
            src={group.photoURL || fallbackLogo}
            alt="Team"
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackLogo;
            }}
          />
          <div>
            <h3 className="text-lg font-semibold text-blue-700">{group.name}</h3>
            <p className="text-sm text-gray-500">{group.memberIds?.length || 0} members</p>
          </div>
        </div>

        {!isOwner && (
          <button
            onClick={handleLeaveTeam}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            🚪 Leave Team
          </button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleTakeQuiz}
          className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
        >
          🧠 Take Quiz
        </button>
        <button
          onClick={handleViewLeaderboard}
          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
        >
          👥 {showMembers ? "Hide" : "View"} Members
        </button>
        {isOwner && (
          <>
            <button
              onClick={() => setShowManageModal(true)}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              ⚙️ Manage Members
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              ➕ Invite Friends
            </button>
          </>
        )}
      </div>

      {showMembers && (
        <div className="mt-2 border rounded p-2 bg-gray-50">
          <h4 className="font-semibold mb-1 text-sm">Group Members</h4>
          <ul className="text-sm space-y-1">
            {membersDetailed.length > 0 ? (
              membersDetailed.map((member) => (
                <li key={member.uid}>
                  {member.displayName} – {member.className} – {member.schoolName}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No member details available.</li>
            )}
          </ul>
        </div>
      )}

      {showManageModal && (
        <ManageGroupMembers group={group} onClose={() => setShowManageModal(false)} />
      )}

      {showInviteModal && (
        <InviteFriendsModal group={group} onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}
