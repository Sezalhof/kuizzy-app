import React, { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function FriendPendingCard({ request }) {
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
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
            email: data.email || "",
            phone: data.phone || "",
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
          {loading ? "Adding..." : "🎉 Join Team"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
        >
          {loading ? "Rejecting..." : "❌ No Thanks"}
        </button>
      </div>
    </div>
  );
}
