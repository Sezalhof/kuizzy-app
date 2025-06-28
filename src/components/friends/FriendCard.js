// src/components/friends/FriendCard.js
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import useAuth from "../../hooks/useAuth";

export default function FriendCard({ friend, status }) {
  const [senderData, setSenderData] = useState({ name: "", email: "" });
  const [groupName, setGroupName] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const { user } = useAuth();

  const currentUserId = auth.currentUser?.uid;
  const otherUserId =
    currentUserId === friend.fromId ? friend.toId : friend.fromId;

  // 🔄 Fetch friend user data
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        if (!otherUserId) return;
        const userRef = doc(db, "users", otherUserId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setSenderData({
            name: data.name || "",
            email: data.email || "",
          });
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch sender info:", err.message);
      }
    };

    loadUserInfo();
  }, [otherUserId]);

  // 🧠 Initials fallback
  const getInitials = () => {
    const name = senderData.name || friend.name || "";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // 🎯 Update friend request status
  const handleAction = async (newStatus) => {
    try {
      await updateDoc(doc(db, "friend_requests", friend.id), {
        status: newStatus,
      });
      console.log(`✅ Friend status updated to: ${newStatus}`);
    } catch (err) {
      console.error(`❌ Failed to update status to ${newStatus}:`, err);
    }
  };

  // 👥 Group creation — Only allowed if both sides accepted
  const handleGroupCreate = async () => {
    if (!groupName || !user?.uid || !otherUserId) return;

    try {
      // Check if mutual friend request exists
      const reverseCheck = query(
        collection(db, "friend_requests"),
        where("fromId", "==", otherUserId),
        where("toId", "==", user.uid),
        where("status", "==", "accepted")
      );

      const reverseSnap = await getDocs(reverseCheck);
      if (reverseSnap.empty) {
        setGroupMessage("❌ You must be accepted friends to create a group.");
        return;
      }

      const groupRef = doc(collection(db, "groups"));
      await setDoc(groupRef, {
        name: groupName,
        members: [user.uid, otherUserId],
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setGroupMessage(`✅ Group "${groupName}" created!`);
      setGroupName("");
    } catch (err) {
      setGroupMessage(`❌ Failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-white shadow-sm border">
      {/* Friend Info */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            {getInitials() || "👤"}
          </div>
          <div>
            <p className="font-semibold capitalize">
              {senderData.name || friend.name || "👤 Unknown"}
            </p>
            <p className="text-xs text-gray-500">
              {senderData.email || friend.phone || otherUserId}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === "pending" && (
            <>
              <Button size="sm" onClick={() => handleAction("accepted")}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction("rejected")}
              >
                Reject
              </Button>
            </>
          )}

          {status === "accepted" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("blocked")}
              >
                Block
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction("removed")}
              >
                Unfriend
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Group creation form */}
      {status === "accepted" && (
        <div className="mt-2 flex flex-col gap-1">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="border px-2 py-1 rounded text-sm"
          />
          <Button size="sm" onClick={handleGroupCreate}>
            Create Group
          </Button>
          {groupMessage && (
            <p className="text-xs text-gray-500 mt-1">{groupMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
