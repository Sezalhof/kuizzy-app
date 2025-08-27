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
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setUserProfile({ uid: user.uid, ...snap.data() });
        }
      } catch (err) {
        console.error("[GroupCreator] Error fetching profile:", err);
        setMessage("❌ Failed to load your profile.");
      }
    };
    fetchProfile();
  }, [user?.uid]);

  // Fetch accepted friends
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
        console.error("[GroupCreator] Error fetching friends:", err);
        setMessage("❌ Failed to load friends.");
      }
    };
    fetchAcceptedFriends();
  }, [user?.uid]);

  // Filter friends by search
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

  // Automatic context resolution
  const resolveContext = () => {
    if (!userProfile) return null;

    const contextMap = [
      ["schoolId", "school"],
      ["unionId", "union"],
      ["upazilaId", "upazila"],
      ["districtId", "district"],
      ["divisionId", "division"],
    ];

    for (const [key, type] of contextMap) {
      if (userProfile[key]) {
        return { contextType: type, contextId: userProfile[key] };
      }
    }

    return null;
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedFriends.length === 0) {
      setMessage("⚠️ Please enter a group name and select members.");
      return;
    }

    const context = resolveContext();
    if (!context) {
      setMessage("⚠️ Cannot determine your context for group creation.");
      return;
    }


    const groupUid = crypto.randomUUID();

    try {
      await setDoc(
        doc(db, `groups/${groupUid}`),
        {
          id: groupUid,
          groupUid: groupUid,
          name: groupName,
          ownerId: user.uid,
          memberIds: [user.uid, ...selectedFriends],
          createdAt: Date.now(),
        }
      );
      
      setMessage("✅ Group created successfully!");
      setGroupName("");
      setSelectedFriends([]);
      onClose?.();
    } catch (err) {
      console.error("[GroupCreator] Error creating group:", err);
      setMessage("❌ Failed to create group. Check permissions.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-xl font-bold text-blue-700 mb-4 text-center">
        Create a Group
      </h2>

      <input
        type="text"
        placeholder="Enter group name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full px-3 py-2 mb-4 border rounded"
      />

      <input
        type="text"
        placeholder="🔍 Search members"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-4 border rounded"
      />

      {filteredFriends.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No members found.</p>
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
                <p className="font-medium">{friend.name || "Unnamed Member"}</p>
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
        <Button onClick={handleCreate}>Create Group</Button>
      </div>
    </div>
  );
}


