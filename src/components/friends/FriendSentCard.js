import React, { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function FriendSentCard({ request }) {
  const { name, email, phone, id } = request || {};
  const [loading, setLoading] = useState(false);

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
    <div className="border p-4 rounded shadow-sm bg-white flex flex-col md:flex-row md:justify-between md:items-center">
      <div>
        <p className="font-semibold text-gray-800">{name || "Unknown"}</p>
        <p className="text-sm text-gray-500">{email}</p>
        <p className="text-xs text-gray-400">{phone}</p>
      </div>

      <div className="mt-2 md:mt-0">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 rounded"
        >
          {loading ? "Cancelling..." : "⏪ Cancel Invite"}
        </button>
      </div>
    </div>
  );
}
