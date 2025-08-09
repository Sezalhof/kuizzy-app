import React, { useEffect, useState, useCallback } from "react";
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
import { db } from "../../firebase";
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
  const isOwner = user?.uid === group?.ownerId;

  // Fetch accepted friends NOT in group
  useEffect(() => {
    if (!user?.uid || !group?.memberIds) return;

    let isMounted = true;

    const fetchFriends = async () => {
      try {
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

        const [sentSnap, recvSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const sent = sentSnap.docs.map((doc) => doc.data().toId);
        const recv = recvSnap.docs.map((doc) => doc.data().fromId);
        const allFriendIds = [...new Set([...sent, ...recv])];
        const notInGroup = allFriendIds.filter((id) => !group.memberIds.includes(id));

        const enriched = await Promise.all(
          notInGroup.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            const data = snap.exists() ? snap.data() : {};
            return {
              uid,
              name: data.name || "Unknown",
              grade: data.grade || null,
              school: data.school || null,
              photoURL: data.photoURL || data.avatar || null,
            };
          })
        );

        if (isMounted) setFriendsToAdd(enriched);
      } catch (error) {
        console.error("Failed to fetch friends to add:", error);
      }
    };

    fetchFriends();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, group?.memberIds]);

  // Fetch current group members
  useEffect(() => {
    if (!group?.memberIds?.length) {
      setMembersWithInfo([]);
      return;
    }
    let isMounted = true;

    const fetchMembers = async () => {
      try {
        const results = await Promise.all(
          group.memberIds.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            const data = snap.exists() ? snap.data() : {};
            return {
              uid,
              name: data.name || "Unknown",
              grade: data.grade || null,
              school: data.school || null,
              photoURL: data.photoURL || data.avatar || null,
            };
          })
        );
        if (isMounted) setMembersWithInfo(results);
      } catch (error) {
        console.error("Failed to fetch group members:", error);
      }
    };

    fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [group?.memberIds]);

  // Add friend to group
  const handleAddToGroup = useCallback(
    async (friendId) => {
      try {
        await updateDoc(doc(db, "groups", group.id), {
          memberIds: arrayUnion(friendId),
        });

        // Find friend info from friendsToAdd
        const friendInfo = friendsToAdd.find((f) => f.uid === friendId);
        if (friendInfo) {
          setMembersWithInfo((prev) => [...prev, friendInfo]);
          setFriendsToAdd((prev) => prev.filter((f) => f.uid !== friendId));
        }
      } catch (err) {
        alert("❌ Failed to add friend: " + err.message);
      }
    },
    [group.id, friendsToAdd]
  );

  // Remove member confirmation
  const openConfirmation = useCallback((action, user) => {
    setActionType(action);
    setSelectedUser(user);
  }, []);

  // Execute member removal
  const executeAction = useCallback(async () => {
    if (!selectedUser || !group?.id) return;
    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayRemove(selectedUser.uid),
      });
      setMembersWithInfo((prev) => prev.filter((m) => m.uid !== selectedUser.uid));
      setSelectedUser(null);
      setActionType("");
    } catch (err) {
      alert("❌ Failed to update group: " + err.message);
    }
  }, [group?.id, selectedUser]);

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

      {isOwner && friendsToAdd.length > 0 && (
        <AddFriendsToGroup friendsToAdd={friendsToAdd} onAdd={handleAddToGroup} />
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
