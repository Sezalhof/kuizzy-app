import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import GroupCard from "../components/friends/GroupCard";
import { useNavigate } from "react-router-dom";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const navigate = useNavigate();

  // ✅ Load user’s groups
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroups(results);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ✅ Load accepted friends (both directions)
  useEffect(() => {
    if (!user?.uid) return;

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

    Promise.all([getDocs(q1), getDocs(q2)]).then(([sentSnap, receivedSnap]) => {
      const sent = sentSnap.docs.map((doc) => doc.data().toId);
      const received = receivedSnap.docs.map((doc) => doc.data().fromId);
      setAcceptedFriends([...new Set([...sent, ...received])]);
    });
  }, [user?.uid]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return alert("Enter a group name");

    try {
      const allMembers = [user.uid, ...acceptedFriends];
      await addDoc(collection(db, "groups"), {
        name: groupName.trim(),
        ownerId: user.uid,
        memberIds: [...new Set(allMembers)],
        createdAt: serverTimestamp(),
      });
      setGroupName("");
    } catch (err) {
      console.error("❌ Failed to create group:", err);
    }
  };

  const handleLeftGroup = (leftGroupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== leftGroupId));
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Groups</h2>
      </div>

      {/* ✅ Create Group Form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="New Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="flex-1 border px-3 py-2 rounded"
        />
        <button
          onClick={handleCreateGroup}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ➕ Create Group
        </button>
      </div>

      {/* ✅ Show Groups */}
      {groups.length === 0 ? (
        <p className="text-center text-gray-500">
          You haven't joined any groups yet.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              <GroupCard group={group} onLeft={handleLeftGroup} />
              <div className="flex gap-4 justify-end text-sm mt-2">
                <button
                  onClick={() => navigate(`/groups/${group.id}/quiz`)}
                  className="text-green-700 hover:underline"
                >
                  📝 Take Quiz
                </button>
                <button
                  onClick={() => navigate(`/groups/${group.id}/leaderboard`)}
                  className="text-blue-600 hover:underline"
                >
                  📊 View Leaderboard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
