import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useUserProfile } from "../../hooks/useUserProfile"; // ✅ named import

export default function InviteFriendsModal({ group, onClose }) {
  const { user } = useUserProfile();
  const [eligibleFriends, setEligibleFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const fetchEligibleFriends = async () => {
      if (!user?.uid || !user?.schoolName || !user?.className) return;

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

        const [sentSnap, recvSnap] = await Promise.all([
          getDocs(q1),
          getDocs(q2),
        ]);

        const sent = sentSnap.docs.map((doc) => doc.data().toId);
        const recv = recvSnap.docs.map((doc) => doc.data().fromId);
        const allFriends = [...new Set([...sent, ...recv])];

        const notInGroup = allFriends.filter(
          (id) =>
            !group.memberIds.includes(id) &&
            !(group.pendingInvites || []).includes(id)
        );

        const enriched = await Promise.all(
          notInGroup.map(async (uid) => {
            const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
            const friendDoc = snap.docs[0];
            const data = friendDoc?.data() || {};

            if (
              data.schoolName === user.schoolName &&
              data.className === user.className
            ) {
              return {
                uid,
                name: data.name || "Unknown",
                email: data.email || uid,
                className: data.className || "N/A",
                schoolName: data.schoolName || "N/A",
              };
            }
            return null;
          })
        );

        const filtered = enriched.filter((f) => f !== null);
        setEligibleFriends(filtered);
      } catch (err) {
        console.error("Error loading eligible friends:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibleFriends();
  }, [user, group]);

  const handleInvite = async (friendId) => {
    setInviting(true);
    try {
      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, {
        pendingInvites: arrayUnion(friendId),
      });
      alert("✅ Invite sent!");
    } catch (err) {
      alert("❌ Failed to invite: " + err.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 text-center text-blue-700">
          Invite Friends to Team
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500 text-center">Loading...</p>
        ) : eligibleFriends.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">
            No friends available from your class & school.
          </p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {eligibleFriends.map((friend) => (
              <li
                key={friend.uid}
                className="flex justify-between items-center border rounded p-2 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-xs text-gray-500">
                    {friend.className} • {friend.schoolName}
                  </p>
                </div>
                <button
                  onClick={() => handleInvite(friend.uid)}
                  className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  disabled={inviting}
                >
                  Invite
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
