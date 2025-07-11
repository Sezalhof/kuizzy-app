import React from "react";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../hooks/useAuth";

export default function GroupCard({ group, onLeft }) {
  const { user } = useAuth();

  const handleLeave = async () => {
    if (!user || !group?.id) return;
    const confirmed = window.confirm(`Leave group "${group.name}"?`);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayRemove(user.uid),
      });
      alert("✅ Left group");
      onLeft && onLeft(group.id);
    } catch (err) {
      console.error("❌ Failed to leave group:", err);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow flex justify-between items-center bg-white mb-2">
      <div>
        <h3 className="font-semibold text-lg">{group.name}</h3>
        <p className="text-sm text-gray-500">
          Members: {group.memberIds?.length || 0}
        </p>
      </div>
      <button
        onClick={handleLeave}
        className="bg-yellow-200 hover:bg-yellow-300 px-3 py-1 rounded text-sm"
      >
        Leave
      </button>
    </div>
  );
}
