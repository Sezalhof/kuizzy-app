import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function FriendCard({ friend, status }) {
  const [senderData, setSenderData] = useState({ name: "", email: "" });

  // 🔄 Fetch user details from `users` collection
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userRef = doc(db, "users", friend.fromId || friend.id || "");
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
  }, [friend.fromId, friend.id]);

  // ✅ Accept / Reject / Block actions
  const handleAction = async (newStatus) => {
    try {
      const ref = doc(db, "friend_requests", friend.id);
      await updateDoc(ref, { status: newStatus });
      console.log(`✅ Friend status updated to: ${newStatus}`);
    } catch (err) {
      console.error(`❌ Failed to update status to ${newStatus}:`, err);
    }
  };

  // 👤 Avatar initials
  const getInitials = () => {
    const name = senderData.name || friend.name || "";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm border">
      {/* Avatar + Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
          {getInitials() || "👤"}
        </div>
        <div>
          <p className="font-semibold capitalize">
            {senderData.name || friend.name || "👤 Unknown"}
          </p>
          <p className="text-xs text-gray-500">
            {senderData.email || friend.phone || friend.uid || "no info"}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {status === "pending" && (
          <>
            <Button size="sm" onClick={() => handleAction("accepted")}>
              Accept
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction("rejected")}
            >
              Reject
            </Button>
          </>
        )}

        {status === "accepted" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("blocked")}
          >
            Block
          </Button>
        )}
      </div>
    </div>
  );
}
