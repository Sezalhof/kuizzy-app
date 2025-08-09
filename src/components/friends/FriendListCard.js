import React, { useEffect, useState } from "react";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { toast } from "react-toastify";

export default function FriendListCard({ user }) {
  const { user: currentUser } = useAuth();
  const [userInfo, setUserInfo] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    uid: user.uid,
    avatar: user.avatar || "/default-avatar.png",
    school: user.school || "",
    grade: user.grade || "",  // Changed from class to grade for consistency
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch only if missing avatar or school or grade
    if (user.avatar && user.school && user.grade) {
      setUserInfo(user);
      return;
    }

    const fetchDetails = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserInfo((prev) => ({
            ...prev,
            name: data.name || prev.name,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            avatar: data.avatar || prev.avatar,
            school: data.school || prev.school,
            grade: data.grade || prev.grade,
          }));
        }
      } catch (err) {
        console.error("[FriendListCard] Error fetching user data:", err);
      }
    };

    fetchDetails();
  }, [user]);

  const handleUnfriend = async () => {
    setLoading(true);
    try {
      const ref1 = doc(db, "friend_requests", `${currentUser.uid}_${user.uid}`);
      const ref2 = doc(db, "friend_requests", `${user.uid}_${currentUser.uid}`);
      await Promise.allSettled([deleteDoc(ref1), deleteDoc(ref2)]);
      toast.info("❌ You unfriended this user.");
    } catch (error) {
      toast.error("❌ Failed to unfriend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white rounded shadow-sm p-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center space-x-3 min-w-0">
        <img
          src={userInfo.avatar || "/default-avatar.png"}
          alt={`${userInfo.name}'s avatar`}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
        />
        <div className="truncate min-w-0">
          <p className="text-gray-900 font-semibold truncate">{userInfo.name || "Unknown User"}</p>
          <p className="text-xs text-gray-500 truncate">{userInfo.email || userInfo.uid}</p>
          <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-600">
            {userInfo.school && (
              <span className="bg-gray-100 px-2 py-0.5 rounded select-none truncate max-w-full">
                🏫 {userInfo.school}
              </span>
            )}
            {userInfo.grade && (
              <span className="bg-gray-100 px-2 py-0.5 rounded select-none truncate max-w-full">
                📘 Grade {userInfo.grade}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={handleUnfriend}
        disabled={loading}
        className="ml-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded whitespace-nowrap"
      >
        {loading ? "Removing..." : "❌ Unfriend"}
      </button>
    </div>
  );
}
