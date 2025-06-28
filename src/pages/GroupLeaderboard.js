// src/pages/GroupLeaderboard.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

export default function GroupLeaderboard() {
  const { groupId } = useParams();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupScores = async () => {
      setLoading(true);

      try {
        const scoreQuery = query(
          collection(db, "scores"),
          where("groupId", "==", groupId)
        );
        const scoreSnap = await getDocs(scoreQuery);
        const rawScores = scoreSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sorted = rawScores
          .filter((s) => s.userId && s.value != null)
          .sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return a.timeTaken - b.timeTaken;
          });

        const enriched = await Promise.all(
          sorted.map(async (entry) => {
            const userQuery = query(
              collection(db, "users"),
              where("uid", "==", entry.userId)
            );
            const userSnap = await getDocs(userQuery);
            const userDoc = userSnap.docs[0];
            const userData = userDoc?.data() || {};

            return {
              ...entry,
              name: userData.name || "Unknown",
              email: userData.email || "",
            };
          })
        );

        setScores(enriched);
      } catch (err) {
        console.error("Failed to load group scores:", err);
      }

      setLoading(false);
    };

    fetchGroupScores();
  }, [groupId]);

  if (loading) {
    return <div className="text-center mt-10 text-gray-500">Loading leaderboard...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Group Leaderboard</h2>

      {scores.length === 0 ? (
        <p className="text-gray-500">No scores yet for this group.</p>
      ) : (
        <div className="space-y-3">
          {scores.map((entry, index) => (
            <div
              key={entry.id}
              className="flex justify-between items-center bg-white shadow-sm border p-3 rounded"
            >
              <div>
                <p className="font-semibold">
                  #{index + 1} {entry.name}
                </p>
                <p className="text-xs text-gray-500">{entry.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Score: {entry.value}</p>
                <p className="text-xs text-gray-500">Time: {entry.timeTaken}s</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(
                    entry.timestamp?.toDate?.() || entry.timestamp
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
