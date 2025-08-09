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

    try {
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
    return <p className="text-center text-gray-500 py-6">Loading suggestions...</p>;
  }

  if (suggestions.length === 0) {
    return <p className="text-center text-gray-500 py-6">No friend suggestions available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
      {suggestions.map((sugg) => {
        const alreadySent = sentRequests.has(sugg.uid) || existingRequests.has(sugg.uid);
        return (
          <div
            key={sugg.uid}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col items-center"
          >
            <img
              src={sugg.avatar || "/default-avatar.png"}
              alt={`${sugg.name || "User"} avatar`}
              className="w-full h-48 object-cover"
            />
            <div className="p-4 w-full text-center">
              <h3 className="text-lg font-semibold text-blue-700 truncate" title={sugg.name}>
                {sugg.name || "Unknown User"}
              </h3>
              <p className="text-xs text-gray-500 truncate" title={sugg.email || sugg.uid}>
                {sugg.email || sugg.uid}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3 text-xs text-gray-600">
                {sugg.gender && (
                  <span className="bg-gray-100 px-3 py-1 rounded-full select-none">
                    👤 {sugg.gender}
                  </span>
                )}
                {sugg.grade && (
                  <span className="bg-gray-100 px-3 py-1 rounded-full select-none">
                    📘 Class {sugg.grade}
                  </span>
                )}
                <span className="bg-gray-100 px-3 py-1 rounded-full select-none">
                  🏫 {sugg.school}
                </span>
              </div>
              <button
                onClick={() => sendRequest(sugg.uid)}
                disabled={alreadySent}
                className={`mt-6 w-full py-2 rounded text-sm font-medium transition-colors ${
                  alreadySent
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {alreadySent ? "🕓 Waiting" : "➕ Invite to Join"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
