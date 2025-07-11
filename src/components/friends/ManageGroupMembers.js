import React, { useEffect, useState } from "react";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../firebase"; // ✅ FIXED
import useAuth from "../../hooks/useAuth";
import MemberList from "./MemberList";
import AddFriendsToGroup from "./AddFriendsToGroup";
import ConfirmActionModal from "./ConfirmActionModal";

export default function ManageGroupMembers({ group, onClose }) {
  const { user } = useAuth();
  const [membersWithInfo, setMembersWithInfo] = useState([]);
  const [friendsToAdd, setFriendsToAdd] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState("");
  const isOwner = user?.uid === group.ownerId;

  useEffect(() => {
    if (!user?.uid || !group?.memberIds) return;

    const q1 = query(
      collection(db, "friend_requests"),
      where("status", "==", "accepted"),
      where("fromId", "==", user.uid)
    );
    const q2 = query(
      collection(db, "friend_requests"),
      where("status", "==", "accepted"),
      where("toId", "==", user.uid)
    );

    Promise.all([getDocs(q1), getDocs(q2)]).then(async ([sentSnap, recvSnap]) => {
      const sent = sentSnap.docs.map((doc) => doc.data().toId);
      const recv = recvSnap.docs.map((doc) => doc.data().fromId);
      const all = [...new Set([...sent, ...recv])];
      const notInGroup = all.filter((id) => !group.memberIds.includes(id));

      const enriched = await Promise.all(
        notInGroup.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const data = snap.exists() ? snap.data() : {};
          return {
            uid,
            name: data.name || "Unknown",
            email: data.email || uid,
          };
        })
      );

      setFriendsToAdd(enriched);
    });
  }, [user?.uid, group?.memberIds]);

  useEffect(() => {
    const fetchMembers = async () => {
      const results = await Promise.all(
        group.memberIds.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const data = snap.exists() ? snap.data() : {};
          return {
            uid,
            name: data.name || "Unknown",
            email: data.email || uid,
          };
        })
      );
      setMembersWithInfo(results);
    };

    if (group?.memberIds?.length) {
      fetchMembers();
    }
  }, [group.memberIds]);

  const handleAddToGroup = async (friendId) => {
    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayUnion(friendId),
      });
    } catch (err) {
      alert("❌ Failed to add friend: " + err.message);
    }
  };

  const openConfirmation = (action, user) => {
    setActionType(action);
    setSelectedUser(user);
  };

  const executeAction = async () => {
    if (!selectedUser || !group.id) return;
    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayRemove(selectedUser.uid),
      });
      setSelectedUser(null);
      setActionType("");
    } catch (err) {
      alert("❌ Failed to update group: " + err.message);
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4 w-full max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center text-blue-700">
        Manage Group Members
      </h2>

      <MemberList
        members={membersWithInfo}
        user={user}
        isOwner={isOwner}
        onAction={openConfirmation}
      />

      {isOwner && (
        <AddFriendsToGroup
          friendsToAdd={friendsToAdd}
          onAdd={handleAddToGroup}
        />
      )}

      <div className="mt-6 text-right">
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Done
        </button>
      </div>

      {selectedUser && (
        <ConfirmActionModal
          user={selectedUser}
          actionType={actionType}
          onCancel={() => setSelectedUser(null)}
          onConfirm={executeAction}
        />
      )}
    </div>
  );
}
