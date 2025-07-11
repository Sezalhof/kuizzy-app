// ✅ FILE: src/pages/GroupLeaderboardPage.js

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import GroupLeaderboard from "../components/GroupLeaderboard";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function GroupLeaderboardPage() {
  const { groupId } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const fetchScores = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "scores"),
          where("groupId", "==", groupId)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(results);
      } catch (err) {
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [groupId]);

  if (!groupId) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center text-red-600">
        Invalid group ID. Please go back to{" "}
        <Link to="/groups" className="underline text-blue-600">
          Groups
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        🏆 Group Leaderboard
      </h1>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <GroupLeaderboard groupId={groupId} data={data} />
      )}
    </div>
  );
}
