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
  const { user } = useAuth(); // Confirm this matches your auth hook
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState([]); // track which invites are processing

  const studentUid = user?.uid;
  const studentPhone = user?.phone || "";

  useEffect(() => {
    if (!studentUid && !studentPhone) return;

    let isMounted = true;

    const fetchInvites = async () => {
      try {
        // Firestore doesn't support multiple 'where' filters with 'in' easily, so fetch separately and merge:
        const invitesByUidQuery = query(
          collection(db, "group_invites"),
          where("toIdentifier", "==", studentUid),
          where("status", "==", "pending")
        );
        const invitesByPhoneQuery = query(
          collection(db, "group_invites"),
          where("toIdentifier", "==", studentPhone),
          where("status", "==", "pending")
        );

        const [uidSnap, phoneSnap] = await Promise.all([
          getDocs(invitesByUidQuery),
          getDocs(invitesByPhoneQuery),
        ]);

        // Merge and remove duplicates by id
        const allDocs = [...uidSnap.docs, ...phoneSnap.docs];
        const uniqueInvitesMap = new Map();
        allDocs.forEach((doc) => {
          if (!uniqueInvitesMap.has(doc.id)) {
            uniqueInvitesMap.set(doc.id, { id: doc.id, ...doc.data() });
          }
        });
        if (isMounted) {
          setInvites(Array.from(uniqueInvitesMap.values()));
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch invites:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchInvites();

    return () => {
      isMounted = false;
    };
  }, [studentUid, studentPhone]);

  const handleAccept = async (invite) => {
    if (processingIds.includes(invite.id)) return; // prevent double click
    setProcessingIds((ids) => [...ids, invite.id]);

    try {
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
    } catch (err) {
      alert("Failed to accept invite: " + err.message);
    } finally {
      setProcessingIds((ids) => ids.filter((id) => id !== invite.id));
    }
  };

  const handleReject = async (invite) => {
    if (processingIds.includes(invite.id)) return;
    setProcessingIds((ids) => [...ids, invite.id]);

    try {
      const inviteRef = doc(db, "group_invites", invite.id);
      await updateDoc(inviteRef, { status: "rejected" });
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      alert("Failed to reject invite: " + err.message);
    } finally {
      setProcessingIds((ids) => ids.filter((id) => id !== invite.id));
    }
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
            {/* Replace with teacher name if you have it */}
            <p><strong>From:</strong> Teacher {invite.fromId}</p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => handleAccept(invite)}
              disabled={processingIds.includes(invite.id)}
              className={`px-3 py-1 rounded text-white ${
                processingIds.includes(invite.id)
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Accept
            </button>
            <button
              onClick={() => handleReject(invite)}
              disabled={processingIds.includes(invite.id)}
              className={`px-3 py-1 rounded text-white ${
                processingIds.includes(invite.id)
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
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
