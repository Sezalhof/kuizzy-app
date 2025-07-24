// src/components/admin/BanButton.js
import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function BanButton({ selectedStudents, onBanned }) {
  const handleBan = async () => {
    if (selectedStudents.length === 0) {
      alert("Select students to ban.");
      return;
    }

    if (!window.confirm(`Ban ${selectedStudents.length} selected students?`)) return;

    try {
      const updates = selectedStudents.map((s) =>
        updateDoc(doc(db, "users", s.uid), { active: false })
      );
      await Promise.all(updates);
      alert("Selected students have been banned.");
      onBanned(); // callback to update local state
    } catch (err) {
      console.error("Error banning students:", err);
      alert("Failed to ban students.");
    }
  };

  return (
    <button
      onClick={handleBan}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      🛡️ Ban Selected
    </button>
  );
}
