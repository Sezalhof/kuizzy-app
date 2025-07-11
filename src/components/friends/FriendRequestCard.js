// src/components/friends/FriendRequestCard.js
import React, { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function FriendRequestCard({ user }) {
  const [userInfo, setUserInfo] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    uid: user.uid,
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
            email: data.email || "",
            phone: data.phone || "",
            uid: user.uid,
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
    <div className="border p-4 rounded shadow-sm bg-white flex flex-col md:flex-row md:justify-between md:items-center">
      <div>
        <p className="font-semibold text-gray-800">{userInfo.name}</p>
        <p className="text-sm text-gray-500">{userInfo.email}</p>
        <p className="text-xs text-gray-400">{userInfo.phone}</p>
      </div>

      <div className="mt-2 md:mt-0 flex gap-2">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded"
        >
          ✅ Accept
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );
}
