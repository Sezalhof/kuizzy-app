// src/components/group/GroupCreator.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  where,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { assignUserToGroup } from "../../utils/groupUtils"; // ✅ ensure this uses real UUID

export default function GroupCreator({ onClose, onGroupCreated }) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setUserProfile({ uid: user.uid, ...snap.data() });
      } catch (err) {
        console.error("[GroupCreator] Error fetching profile:", err);
        setError("❌ Failed to load your profile.");
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
        for (const fid of friendIds) {
          const snap = await getDoc(doc(db, "users", fid));
          if (snap.exists()) loaded.push({ uid: fid, ...snap.data() });
        }
        setFriends(loaded);
      } catch (err) {
        console.error("[GroupCreator] Error fetching friends:", err);
        setError("❌ Failed to load friends.");
      }
    };
    fetchAcceptedFriends();
  }, [user?.uid]);

  // Filter and sort friends by name
  const filteredFriends = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return friends
      .filter((f) =>
        (f.name || "").toLowerCase().includes(term) ||
        (f.email || "").toLowerCase().includes(term) ||
        (f.phone || "").includes(term)
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [friends, searchTerm]);

  const toggleFriend = useCallback((uid) => {
    setSelectedFriends((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }, []);

  // Helper to add group to a user's profile safely using arrayUnion
  const addGroupToUser = useCallback(async (uid, groupId) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        groups: arrayUnion(groupId),
      });
    } catch (err) {
      console.error(`[GroupCreator] Failed to add group to user ${uid}:`, err);
    }
  }, []);

  // Handle group creation
  const handleCreateGroup = async () => {
    setError(null);
    setSuccessMessage("");

    if (!groupName.trim() || selectedFriends.length === 0) {
      setError("⚠️ Enter group name and select at least one member.");
      return;
    }

    if (!userProfile) {
      setError("❌ User profile not loaded yet.");
      return;
    }

    setCreating(true);
    const groupUid = crypto.randomUUID();

    try {
      // Create group document
      await setDoc(doc(db, `groups/${groupUid}`), {
        id: groupUid,
        name: groupName.trim(),
        ownerId: user.uid,
        memberIds: [user.uid, ...selectedFriends],
        createdAt: Date.now(),
      });

      // Add group to creator and friends using arrayUnion
      await addGroupToUser(user.uid, groupUid);
      await Promise.all(selectedFriends.map(fid => addGroupToUser(fid, groupUid)));

      // ✅ Assign each user to this group properly
      await assignUserToGroup(user.uid, { ...userProfile, groupId: groupUid, groupName: groupName.trim() });
      await Promise.all(selectedFriends.map(async (fid) => {
        const friendProfileSnap = await getDoc(doc(db, "users", fid));
        if (friendProfileSnap.exists()) {
          await assignUserToGroup(fid, { ...friendProfileSnap.data(), groupId: groupUid, groupName: groupName.trim() });
        }
      }));

      setSuccessMessage("✅ Group created successfully!");
      setGroupName("");
      setSelectedFriends([]);

      if (onGroupCreated) onGroupCreated(groupUid);
      if (onClose) onClose();
    } catch (err) {
      console.error("[GroupCreator] Error creating group:", err);
      setError("❌ Failed to create group. Check permissions.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h2 className="text-xl font-bold text-blue-700 mb-4 text-center">
        Create a Group
      </h2>

      {error && <p className="text-center text-sm text-red-600 mb-2">{error}</p>}
      {successMessage && <p className="text-center text-sm text-green-600 mb-2">{successMessage}</p>}

      <input
        type="text"
        placeholder="Enter group name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full px-3 py-2 mb-2 border rounded"
      />

      <input
        type="text"
        placeholder="🔍 Search members"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-2 border rounded"
      />

      {/* Selected count */}
      {selectedFriends.length > 0 && (
        <p className="text-sm text-gray-600 mb-2">{selectedFriends.length} member(s) selected</p>
      )}

      {filteredFriends.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No members found.</p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredFriends.map((friend) => (
            <label
              key={friend.uid}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                selectedFriends.includes(friend.uid) ? "bg-blue-50 border-blue-300" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedFriends.includes(friend.uid)}
                onChange={() => toggleFriend(friend.uid)}
              />
              {friend.photoURL && <img src={friend.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />}
              <div>
                <p className="font-medium">{friend.name || "Unnamed Member"}</p>
                <p className="text-xs text-gray-500">{friend.email || friend.phone || "No contact info"}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button onClick={handleCreateGroup} disabled={creating}>
          {creating ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </div>
  );
}
