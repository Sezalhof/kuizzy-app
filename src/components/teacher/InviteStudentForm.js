import React, { useState } from "react";
import { db } from "../../../kuizzy-app/src/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import useAuth from "../../hooks/useAuth";


const InviteStudentForm = () => {
  const { currentUser } = useAuth(); // current teacher user
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleInvite = async () => {
    if (!studentIdentifier) {
      alert("Please enter a student UID or phone number.");
      return;
    }

    try {
      setIsSending(true);
      await addDoc(collection(db, "group_invites"), {
        type: "teacher",
        fromId: currentUser.uid, // teacher UID
        toIdentifier: studentIdentifier,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      alert("Invite sent successfully!");
      setStudentIdentifier("");
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Failed to send invite.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      maxWidth: "400px",
      margin: "20px auto",
      padding: "20px",
      border: "1px solid #ddd",
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
    }}>
      <h2 style={{ fontSize: "20px", marginBottom: "10px" }}>Invite a Student</h2>
      <input
        type="text"
        placeholder="Enter student UID or phone number"
        value={studentIdentifier}
        onChange={(e) => setStudentIdentifier(e.target.value)}
        style={{
          padding: "8px",
          width: "100%",
          marginBottom: "12px",
          borderRadius: "6px",
          border: "1px solid #ccc"
        }}
      />
      <button
        onClick={handleInvite}
        disabled={isSending}
        style={{
          padding: "10px 16px",
          borderRadius: "6px",
          backgroundColor: "#4f46e5",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}
      >
        {isSending ? "Sending..." : "Send Invite"}
      </button>
    </div>
  );
};

export default InviteStudentForm;
