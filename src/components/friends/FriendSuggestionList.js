import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { toast } from "react-toastify";

export default function FriendSuggestionList() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [existingRequests, setExistingRequests] = useState(new Set());
  const [alreadyFriends, setAlreadyFriends] = useState(new Set());

  // Load current user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setUserProfile({ uid: user.uid, ...profileData });

          const friendSet = new Set();
          if (profileData.friends && Array.isArray(profileData.friends)) {
            profileData.friends.forEach((f) => {
              if (typeof f === "string") friendSet.add(f);
              else if (f?.uid) friendSet.add(f.uid);
            });
          }
          setAlreadyFriends(friendSet);
        }
      } catch (err) {
        toast.error("⚠️ Failed to load your profile.");
      }
    };

    fetchProfile();
  }, [user]);

  // Load existing requests (both directions)
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.uid) return;

      try {
        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(query(collection(db, "friend_requests"), where("fromId", "==", user.uid))),
          getDocs(query(collection(db, "friend_requests"), where("toId", "==", user.uid))),
        ]);

        const ids = new Set();
        sentSnap.forEach((doc) => ids.add(doc.data().toId));
        receivedSnap.forEach((doc) => ids.add(doc.data().fromId));
        setExistingRequests(ids);
      } catch (err) {
        console.error("Error checking requests:", err);
      }
    };

    fetchRequests();
  }, [user]);

  // Load suggestions based on same school and class
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user || !userProfile) return;

      try {
        const snapshot = await getDocs(
          query(
            collection(db, "users"),
            where("school", "==", userProfile.school),
            where("grade", "==", userProfile.grade)
          )
        );

        const potential = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = docSnap.id;

          if (
            uid === user.uid ||
            existingRequests.has(uid) ||
            alreadyFriends.has(uid)
          ) {
            return;
          }

          const suggestion = { uid, ...data };

          if (data.gender === userProfile.gender) {
            potential.unshift(suggestion);
          } else {
            potential.push(suggestion);
          }
        });

        setSuggestions(potential);
      } catch (err) {
        toast.error("❌ Failed to fetch friend suggestions.");
      }
    };

    fetchSuggestions();
  }, [user, userProfile, existingRequests, alreadyFriends]);

  const sendRequest = async (toId) => {
    if (sentRequests.has(toId)) {
      toast.info("⚠️ Already requested.");
      return;
    }

    const sortedIds = [user.uid, toId].sort();
    const requestId = `${sortedIds[0]}_${sortedIds[1]}`;

    try {
      const existing = await getDoc(doc(db, "friend_requests", requestId));
      if (existing.exists()) {
        toast.info("⚠️ Request already exists.");
        return;
      }

      await addDoc(collection(db, "friend_requests"), {
        fromId: user.uid,
        toId,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      toast.success("✅ Invite sent!");
      setSentRequests((prev) => new Set(prev).add(toId));
    } catch (err) {
      toast.error("❌ Failed to send invite.");
    }
  };

  if (!user || !userProfile) {
    return <p className="text-sm text-gray-500">Loading suggestions...</p>;
  }

  if (suggestions.length === 0) {
    return <p className="text-sm text-gray-500">No friend suggestions right now.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {suggestions.map((sugg) => {
        const alreadySent = sentRequests.has(sugg.uid) || existingRequests.has(sugg.uid);

        return (
          <div
            key={sugg.uid}
            className="border p-4 rounded bg-white shadow-sm hover:bg-gray-50 transition"
          >
            <p className="font-semibold text-blue-700">{sugg.name || "Unknown User"}</p>
            <p className="text-xs text-gray-500">{sugg.email || sugg.uid}</p>

            <div className="flex flex-wrap gap-2 text-xs mt-2">
              {sugg.gender && (
                <span className="bg-gray-100 px-2 py-0.5 rounded">👤 {sugg.gender}</span>
              )}
              {sugg.grade && (
                <span className="bg-gray-100 px-2 py-0.5 rounded">📘 Class {sugg.grade}</span>
              )}
              <span className="bg-gray-100 px-2 py-0.5 rounded">🏫 {sugg.school}</span>
            </div>

            <button
              onClick={() => sendRequest(sugg.uid)}
              disabled={alreadySent}
              className={`mt-3 px-3 py-1 rounded text-sm ${
                alreadySent
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {alreadySent ? "🕓 Waiting" : "➕ Invite to Join"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
