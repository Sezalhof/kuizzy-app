// src/pages/GroupMembersPage.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";

export default function GroupMembersPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.uid ?? null);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      try {
        // Align collection to 'users' if you only allow reading 'users'
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (!groupDoc.exists()) {
          setError("Group not found");
          setLoading(false);
          return;
        }

        const groupData = groupDoc.data();
        setGroup(groupData);

        // Fetch members from users collection (allowed by rules)
        const memberSnapshots = await Promise.all(
          (groupData.memberIds ?? []).map((uid) => getDoc(doc(db, "users", uid)))
        );

        const memberDetails = memberSnapshots.map((snap, i) =>
          snap.exists()
            ? {
                uid: groupData.memberIds[i],
                name: snap.data().name || "Unknown",
                photoURL: snap.data().photoURL || snap.data().avatar || "/fallback-logo.png",
                grade: snap.data().grade || "N/A",
                school: snap.data().school || "N/A",
              }
            : { uid: groupData.memberIds[i], name: "Unknown", photoURL: "/fallback-logo.png", grade: "N/A", school: "N/A" }
        );

        setMembers(memberDetails);
      } catch (err) {
        setError("Failed to load group");
      } finally {
        setLoading(false);
      }
    };

    if (groupId) fetchGroup();
  }, [groupId]);

  const handleRemoveMember = async (uid) => {
    if (!group || group.ownerId !== user.uid) return;
    if (uid === user.uid) return alert("You cannot remove yourself.");

    const updatedIds = group.memberIds.filter((id) => id !== uid);

    try {
      await updateDoc(doc(db, "groups", groupId), { memberIds: updatedIds });
      setGroup((prev) => ({ ...prev, memberIds: updatedIds }));
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    } catch {
      alert("❌ Failed to remove member.");
    }
  };

  const handleAddMember = async (uid) => {
    if (!group || !uid || group.memberIds.includes(uid)) return;

    const updatedIds = [...group.memberIds, uid];

    try {
      await updateDoc(doc(db, "groups", groupId), { memberIds: updatedIds });

      const newMemberSnap = await getDoc(doc(db, "users", uid));
      const newMemberData = newMemberSnap.exists()
        ? {
            uid,
            name: newMemberSnap.data().name || "Unknown",
            photoURL: newMemberSnap.data().photoURL || newMemberSnap.data().avatar || "/fallback-logo.png",
            grade: newMemberSnap.data().grade || "N/A",
            school: newMemberSnap.data().school || "N/A",
          }
        : { uid, name: "Unknown", photoURL: "/fallback-logo.png", grade: "N/A", school: "N/A" };

      setGroup((prev) => ({ ...prev, memberIds: updatedIds }));
      setMembers((prev) => [...prev, newMemberData]);
    } catch {
      alert("❌ Failed to add member.");
    }
  };

  if (loading || profileLoading) return <p className="text-center mt-6">Loading real fighters...</p>;
  if (error || profileError) return <p className="text-center mt-6 text-red-600">{error || profileError}</p>;
  if (!group || !profile) return null;

  const isOwner = group.ownerId === user?.uid;
  const acceptedFriends = profile.friends?.filter((f) => f.status === "accepted") || [];
  const nonMembers = acceptedFriends.filter((f) => !group.memberIds.includes(f.uid));

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">Group Members</h1>

      {members.length > 0 ? (
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.uid} className="border p-3 rounded shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img
                  src={member.photoURL}
                  alt={`${member.name} avatar`}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/fallback-logo.png"; }}
                />
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-gray-600">
                    Class: {member.grade} | School: {member.school}
                  </p>
                </div>
              </div>

              {isOwner && member.uid !== user.uid && (
                <button onClick={() => handleRemoveMember(member.uid)} className="text-sm text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mt-4">No members found in this group.</p>
      )}

      {isOwner && nonMembers.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Add New Members</h3>
          <div className="space-y-2">
            {nonMembers.map((f) => (
              <div key={f.uid} className="flex justify-between items-center border rounded px-3 py-2">
                <div className="flex items-center gap-3">
                  <img
                    src={f.photoURL || f.avatar || "/fallback-logo.png"}
                    alt={`${f.name || f.email || "Unnamed"} avatar`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = "/fallback-logo.png"; }}
                  />
                  <div>
                    <p className="font-medium">{f.name || f.email || "Unnamed"}</p>
                    <p className="text-xs text-gray-500">Class: {f.grade || "N/A"} | School: {f.school || "N/A"}</p>
                  </div>
                </div>

                <button onClick={() => handleAddMember(f.uid)} className="text-sm text-blue-600 hover:underline">
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link to="/groups" className="underline text-blue-600">
          ← Back to Groups
        </Link>
      </div>
    </div>
  );
}


