// ✅ FILE: src/hooks/useFriends.js

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "./useAuth";

export default function useFriends() {
  const { user } = useAuth();
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [acceptedFriendsDetailed, setAcceptedFriendsDetailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchFriends = async () => {
      setLoading(true);
      try {
        // ✅ Get all accepted friend requests
        const q1 = query(
          collection(db, "friend_requests"),
          where("status", "==", "accepted"),
          where("fromId", "==", user.uid)
        );
        const q2 = query(
          collection(db, "friend_requests"),
          where("status", "==", "accepted"),
          where("toId", "==", user.uid)
        );

        const [sentSnap, recvSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const sentIds = sentSnap.docs.map((doc) => doc.data().toId);
        const receivedIds = recvSnap.docs.map((doc) => doc.data().fromId);
        const allFriendIds = [...new Set([...sentIds, ...receivedIds])];

        setAcceptedFriends(allFriendIds);

        // ✅ Get friend profiles
        const friendDetails = await Promise.all(
          allFriendIds.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              const data = snap.exists() ? snap.data() : {};
              return {
                uid,
                name: data.name || "Unknown",
                email: data.email || uid,
                photoURL: data.photoURL || "",
                class: data.class || "",
                school: data.school || "",
              };
            } catch (err) {
              console.warn("Error fetching user:", uid, err);
              return {
                uid,
                name: "Unknown",
                email: uid,
              };
            }
          })
        );

        setAcceptedFriendsDetailed(friendDetails);
        setError(null);
      } catch (err) {
        console.error("❌ Failed to fetch friends:", err);
        setError("Failed to fetch friends.");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user?.uid]);

  return {
    acceptedFriends,            // UIDs of all accepted friends
    acceptedFriendsDetailed,    // With name, email, etc.
    acceptedFriendsWithData: acceptedFriendsDetailed, // ✅ Alias used in several files
    loading,
    error,
  };
}
