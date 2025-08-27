// src/pages/friends/MyGroups.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import GroupCard from "../../components/friends/GroupCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

export default function MyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadGroups = async () => {
      setLoading(true);
      setError("");
      try {
        const q = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        const result = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setGroups(result);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
        setError("Failed to load your groups. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [user]);

  const handleLeftGroup = (groupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center mt-6 text-red-600">
        {error}
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="text-center mt-6 text-gray-500">
        You are not part of any groups yet.
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Your Groups</h2>
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} onLeft={handleLeftGroup} />
      ))}
    </div>
  );
}
