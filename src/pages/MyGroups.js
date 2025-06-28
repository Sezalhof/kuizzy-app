import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import GroupCard from "../../components/friends/GroupCard";

export default function MyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (!user) return;

    const loadGroups = async () => {
      const q = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", user.uid)
      );
      const snap = await getDocs(q);
      const result = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setGroups(result);
    };

    loadGroups();
  }, [user]);

  const handleLeftGroup = (groupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Your Groups</h2>
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} onLeft={handleLeftGroup} />
      ))}
    </div>
  );
}
