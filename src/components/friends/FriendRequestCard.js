import React, { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function FriendRequestCard({ user }) {
  const [userInfo, setUserInfo] = useState({
    name: user.name || "",
    grade: user.grade || "",
    school: user.school || "",
    avatar: user.avatar || "/default-avatar.png",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user.uid) return;

    const fetchDetails = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
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
        console.error("Error fetching user data:", err.message);
      }
    };

    fetchDetails();
  }, [user.uid]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "friend_requests", user.id), {
        status: "accepted",
      });
      toast.success("✅ Friend request accepted!");
    } catch (err) {
      toast.error("❌ Failed to accept request.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "friend_requests", user.id));
      toast.info("🚫 Friend request rejected.");
    } catch (err) {
      toast.error("❌ Failed to reject request.");
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

      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded whitespace-nowrap"
        >
          ✅ Accept
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded whitespace-nowrap"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );
}
