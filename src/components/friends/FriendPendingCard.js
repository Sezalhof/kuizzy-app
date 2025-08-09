import React, { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function FriendPendingCard({ request }) {
  const [userInfo, setUserInfo] = useState({
    name: "",
    grade: "",
    school: "",
    avatar: "/default-avatar.png",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const snap = await getDoc(doc(db, "users", request.fromId));
        if (snap.exists()) {
          const data = snap.data();
          setUserInfo({
            name: data.name || "Unknown",
            grade: data.grade || "",
            school: data.school || "",
            avatar: data.avatar || "/default-avatar.png",
          });
        }
      } catch (err) {
        console.error("[FriendPendingCard] Error fetching sender info:", err);
      }
    };

    fetchUserInfo();
  }, [request.fromId]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "friend_requests", request.id), {
        status: "accepted",
      });
      toast.success("🎉 Friend added to your team!");
    } catch (error) {
      toast.error("❌ Couldn't accept the invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "friend_requests", request.id));
      toast.info("❌ Invite declined.");
    } catch (error) {
      toast.error("⚠️ Failed to reject invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white rounded shadow-sm p-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center space-x-3 min-w-0">
        <img
          src={userInfo.avatar}
          alt={`${userInfo.name}'s avatar`}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          loading="lazy"
        />
        <div className="truncate min-w-0">
          <p className="text-gray-900 font-semibold truncate">{userInfo.name}</p>
          <p className="text-xs text-gray-500 truncate">📘 Class {userInfo.grade}</p>
          <p className="text-xs text-gray-400 truncate">🏫 {userInfo.school}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded whitespace-nowrap"
        >
          {loading ? "Adding..." : "🎉 Join Team"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded whitespace-nowrap"
        >
          {loading ? "Rejecting..." : "❌ No Thanks"}
        </button>
      </div>
    </div>
  );
}
