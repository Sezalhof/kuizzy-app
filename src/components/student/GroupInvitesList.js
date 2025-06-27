import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import useAuth from "../../hooks/useAuth";

const GroupInvitesList = () => {
  const { currentUser } = useAuth(); // student user
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const studentUid = currentUser?.uid;
  const studentPhone = currentUser?.phone || ""; // assume phone is stored in profile

  useEffect(() => {
    const fetchInvites = async () => {
      if (!studentUid) return;

      const q = query(
        collection(db, "group_invites"),
        where("toIdentifier", "in", [studentUid, studentPhone]),
        where("status", "==", "pending")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInvites(data);
      setLoading(false);
    };

    fetchInvites();
  }, [studentUid, studentPhone]);

  const handleAccept = async (invite) => {
    const inviteRef = doc(db, "group_invites", invite.id);

    // Update invite status
    await updateDoc(inviteRef, {
      status: "accepted",
      toId: studentUid,
    });

    // Add student to teacher group
    const teacherGroupRef = doc(db, "teacher_groups", invite.fromId);
    await updateDoc(teacherGroupRef, {
      students: arrayUnion(studentUid),
    });

    alert("Joined teacher's group!");
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  const handleReject = async (invite) => {
    const inviteRef = doc(db, "group_invites", invite.id);
    await updateDoc(inviteRef, { status: "rejected" });
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  if (loading) return <p>Loading invites...</p>;
  if (invites.length === 0) return <p>No pending invites.</p>;

  return (
    <div className="p-4 border rounded-xl max-w-xl mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4">Pending Group Invites</h2>
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex justify-between items-center border p-2 rounded mb-2"
        >
          <div>
            <p><strong>From:</strong> Teacher {invite.fromId}</p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => handleAccept(invite)}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Accept
            </button>
            <button
              onClick={() => handleReject(invite)}
              className="px-3 py-1 bg-red-500 text-white rounded"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupInvitesList;
