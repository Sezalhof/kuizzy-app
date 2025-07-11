import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { Button } from "../ui/button";

export default function GroupCreator({ onClose }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchAcceptedFriends = async () => {
      if (!user?.uid) return;

      try {
        const q = query(
          collection(db, "friend_requests"),
          where("status", "==", "accepted")
        );
        const snapshot = await getDocs(q);
        const ids = new Set();
        const friendList = [];

        for (let docSnap of snapshot.docs) {
          const data = docSnap.data();
          const isMe = data.fromId === user.uid || data.toId === user.uid;
          if (!isMe) continue;

          const friendId = data.fromId === user.uid ? data.toId : data.fromId;

          if (!ids.has(friendId)) {
            ids.add(friendId);

            const userDocSnap = await getDocs(
              query(collection(db, "users"), where("__name__", "==", friendId))
            );
            userDocSnap.forEach((d) =>
              friendList.push({ uid: d.id, ...d.data() })
            );
          }
        }

        setFriends(friendList);
      } catch (err) {
        console.error("Error loading friends:", err);
        setMessage("❌ Failed to fetch friends.");
      }
    };

    fetchAcceptedFriends();
  }, [user?.uid]);

  const toggleFriend = (uid) => {
    setSelectedFriends((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return setMessage("⚠️ Group name is required.");
    }
    if (selectedFriends.length === 0) {
      return setMessage("⚠️ Please select at least one friend.");
    }

    const groupId = `${user.uid}_${Date.now()}`;
    try {
      await setDoc(doc(db, "groups", groupId), {
        id: groupId,
        name: groupName,
        ownerId: user.uid,
        memberIds: [user.uid, ...selectedFriends],
        createdAt: Date.now(),
        photoURL: "", // placeholder for now
      });

      setMessage("✅ Group created!");
      setGroupName("");
      setSelectedFriends([]);

      if (onClose) onClose();
    } catch (err) {
      console.error("Error creating group:", err);
      setMessage("❌ Failed to create group.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-blue-700">Create a Team</h2>

      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Enter team name"
        className="border px-3 py-2 rounded w-full"
      />

      <div>
        <h3 className="font-semibold mb-1">Select Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-sm text-gray-500">No accepted friends found.</p>
          ) : (
            friends.map((friend) => (
              <label
                key={friend.uid}
                className={`flex items-center gap-2 border p-2 rounded cursor-pointer ${
                  selectedFriends.includes(friend.uid)
                    ? "bg-blue-50 border-blue-300"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFriends.includes(friend.uid)}
                  onChange={() => toggleFriend(friend.uid)}
                />
                <div>
                  <p className="font-medium">
                    {friend.name || "Unknown User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {friend.email || friend.phone || "No contact info"}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <Button onClick={handleCreateGroup}>Create Team</Button>

      {message && (
        <p className="text-sm mt-2 text-center text-blue-600">{message}</p>
      )}
    </div>
  );
}
