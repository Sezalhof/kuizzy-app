import React, { useEffect, useState } from "react";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
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
    school: "",
    class: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

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
            school: data.school || "",
            class: data.class || "",
          }));
        }
      } catch (err) {
        console.error("[FriendListCard] Error fetching user data:", err);
      }
    };

    fetchDetails();
  }, [user.uid]);

  const handleUnfriend = async () => {
    setLoading(true);
    try {
      const ref1 = doc(db, "friend_requests", `${currentUser.uid}_${user.uid}`);
      const ref2 = doc(db, "friend_requests", `${user.uid}_${currentUser.uid}`);
      await Promise.allSettled([deleteDoc(ref1), deleteDoc(ref2)]);
      toast.info("❌ Sorry! You unfriended this user.");
    } catch (error) {
      toast.error("❌ Failed to unfriend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-4 rounded shadow-sm bg-white flex flex-col md:flex-row md:justify-between md:items-center">
      <div>
        <p className="font-semibold text-gray-800">{userInfo.name}</p>
        <p className="text-sm text-gray-500">{userInfo.email}</p>
        <p className="text-xs text-gray-400">{userInfo.phone}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
          {userInfo.school && (
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              🏫 {userInfo.school}
            </span>
          )}
          {userInfo.class && (
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              📘 Class {userInfo.class}
            </span>
          )}
          <span className="bg-green-100 px-2 py-0.5 rounded">✅ Friend</span>
        </div>
      </div>

      <div className="mt-2 md:mt-0">
        <button
          onClick={handleUnfriend}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {loading ? "Removing..." : "❌ Sorry!"}
        </button>
      </div>
    </div>
  );
}
