import React from "react";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";

export default function GroupCard({ group, onLeft }) {
  const { user } = useAuth();

  const handleLeave = async () => {
    if (!user || !group?.id) return;
    const confirmLeave = window.confirm(`Leave group "${group.name}"?`);
    if (!confirmLeave) return;

    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayRemove(user.uid),
      });
      alert("✅ You left the group");
      onLeft && onLeft(group.id);
    } catch (err) {
      console.error("❌ Failed to leave group:", err);
    }
  };

  return (
    <div className="bg-white border p-4 rounded-lg shadow-sm mb-3 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-bold text-blue-700 mb-1">{group.name}</h3>
        <p className="text-sm text-gray-600">
          Group ID:{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
            {group.id}
          </code>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Total Members: {group.memberIds?.length || 0}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Created At:{" "}
          {group.createdAt?.toDate?.().toLocaleString() || "Unknown"}
        </p>
      </div>

      <button
        onClick={handleLeave}
        className="text-sm bg-yellow-200 hover:bg-yellow-300 px-3 py-1 rounded"
      >
        Leave
      </button>
    </div>
  );
}
