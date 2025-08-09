import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { Button } from "../ui/button";

export default function GroupCreator({ onClose }) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchAcceptedFriends = async () => {
      if (!user?.uid) return;
      try {
        const sentQuery = query(
          collection(db, "friend_requests"),
          where("status", "==", "accepted"),
          where("fromId", "==", user.uid)
        );
        const recvQuery = query(
          collection(db, "friend_requests"),
          where("status", "==", "accepted"),
          where("toId", "==", user.uid)
        );

        const sentSnapshot = await getDocs(sentQuery);
        const recvSnapshot = await getDocs(recvQuery);

        const friendIds = new Set();
        sentSnapshot.forEach((doc) => friendIds.add(doc.data().toId));
        recvSnapshot.forEach((doc) => friendIds.add(doc.data().fromId));

        const loaded = [];
        for (const friendId of friendIds) {
          const snap = await getDoc(doc(db, "users", friendId));
          if (snap.exists()) {
            loaded.push({ uid: friendId, ...snap.data() });
          }
        }
        setFriends(loaded);
      } catch (err) {
        console.error("Error fetching guests:", err);
        setMessage("❌ Failed to load guests.");
      }
    };
    fetchAcceptedFriends();
  }, [user?.uid]);

  const filteredFriends = friends.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      (f.name || "").toLowerCase().includes(term) ||
      (f.email || "").toLowerCase().includes(term) ||
      (f.phone || "").includes(term)
    );
  });

  const toggleFriend = (uid) => {
    setSelectedFriends((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedFriends.length === 0) {
      setMessage("⚠️ Please enter a name and select guests.");
      return;
    }

    const groupUid = crypto.randomUUID();

    try {
      await setDoc(doc(db, "groups", groupUid), {
        id: groupUid,
        groupUid,
        name: groupName,
        ownerId: user.uid,
        memberIds: [user.uid, ...selectedFriends],
        createdAt: Date.now(),
      });

      setMessage("✅ Team created successfully!");
      setGroupName("");
      setSelectedFriends([]);
      onClose?.();
    } catch (err) {
      console.error("Error creating group:", err);
      setMessage("❌ Failed to create group.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-xl font-bold text-blue-700 mb-4 text-center">
        Create a Team
      </h2>

      <input
        type="text"
        placeholder="Enter team name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full px-3 py-2 mb-4 border rounded"
      />

      <input
        type="text"
        placeholder="🔍 Search guests"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-4 border rounded"
      />

      {filteredFriends.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No guests found.</p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredFriends.map((friend) => (
            <label
              key={friend.uid}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
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
              {friend.photoURL && (
                <img
                  src={friend.photoURL}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{friend.name || "Unnamed Guest"}</p>
                <p className="text-xs text-gray-500">
                  {friend.email || friend.phone || "No contact info"}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {message && (
        <p className="text-center text-sm text-blue-600 mb-2">{message}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button onClick={handleCreate}>Create Team</Button>
      </div>
    </div>
  );
}
