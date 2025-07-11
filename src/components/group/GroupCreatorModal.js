// ✅ FILE: src/components/group/GroupCreatorModal.js

import React, { useState, useEffect } from "react";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { Button } from "../ui/button";

export default function GroupCreatorModal({ onClose }) {
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
          where("status", "==", "accepted"),
          where("fromId", "==", user.uid)
        );

        const sentSnapshot = await getDocs(q);

        const q2 = query(
          collection(db, "friend_requests"),
          where("status", "==", "accepted"),
          where("toId", "==", user.uid)
        );

        const recvSnapshot = await getDocs(q2);

        const friendIds = new Set();

        sentSnapshot.forEach((doc) => {
          const data = doc.data();
          friendIds.add(data.toId);
        });

        recvSnapshot.forEach((doc) => {
          const data = doc.data();
          friendIds.add(data.fromId);
        });

        const friendsList = [];

        for (const friendId of friendIds) {
          const userSnap = await getDocs(
            query(collection(db, "users"), where("__name__", "==", friendId))
          );
          userSnap.forEach((d) => {
            friendsList.push({ uid: d.id, ...d.data() });
          });
        }

        setFriends(friendsList);
      } catch (err) {
        console.error("Error fetching accepted friends:", err);
        setMessage("❌ Failed to load friends.");
      }
    };

    fetchAcceptedFriends();
  }, [user?.uid]);

  const toggleFriend = (uid) => {
    setSelectedFriends((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedFriends.length === 0) {
      setMessage("⚠️ Please provide a group name and select members.");
      return;
    }

    const groupId = `${user.uid}_${Date.now()}`;
    try {
      await setDoc(doc(db, "groups", groupId), {
        id: groupId,
        name: groupName,
        ownerId: user.uid,
        memberIds: [user.uid, ...selectedFriends],
        createdAt: Date.now(),
      });

      setMessage("✅ Group created successfully!");
      setGroupName("");
      setSelectedFriends([]);
      onClose();
    } catch (err) {
      console.error("Group creation failed:", err);
      setMessage("❌ Failed to create group.");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-center text-blue-700">
          Create a Team
        </h2>

        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter team name"
          className="border px-3 py-2 rounded w-full mb-4"
        />

        <div>
          <h3 className="font-semibold mb-2">Select Members</h3>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-500">No accepted friends found.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto border rounded p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {friends.map((friend) => (
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
                    <p className="font-medium">{friend.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">
                      {friend.email || friend.phone || "No contact"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {message && (
          <p className="text-sm text-blue-600 mt-4 text-center">{message}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <Button onClick={handleCreateGroup}>Create Team</Button>
        </div>
      </div>
    </div>
  );
}
