import React, { useState, useEffect } from "react";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function FriendSentCard({ user }) {
  const { name, grade, school, uid, id } = user || {};
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: name || "",
    grade: grade || "",
    school: school || "",
    avatar: "/default-avatar.png",
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, "users", uid));
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
        console.error("[FriendSentCard] Error fetching user info:", err);
      }
    };

    fetchUserInfo();
  }, [uid]);

  const handleCancel = async () => {
    if (!id) {
      toast.error("❌ Invalid invite ID.");
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, "friend_requests", id));
      toast.info("⏪ Invite cancelled.");
    } catch (error) {
      toast.error("❌ Failed to cancel invite.");
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
          onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
        />
        <div className="truncate min-w-0">
          <p className="text-gray-900 font-semibold truncate">{userInfo.name}</p>
          <p className="text-xs text-gray-500 truncate">📘 Grade {userInfo.grade}</p>
          <p className="text-xs text-gray-400 truncate">🏫 {userInfo.school}</p>
        </div>
      </div>

      <div className="mt-2 md:mt-0">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 rounded whitespace-nowrap"
        >
          {loading ? "Cancelling..." : "⏪ Cancel Invite"}
        </button>
      </div>
    </div>
  );
}
