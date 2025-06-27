// src/components/friends/FriendSuggestionList.js
import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "hooks/useAuth";
import { Button } from "../ui/button";

// Utils
import { getMutualFriendSuggestions } from "../../utils/getMutualFriendSuggestions";

export default function FriendSuggestionList() {
  const { currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch friend suggestions based on mutual friends
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchSuggestions = async () => {
      try {
        const mutuals = await getMutualFriendSuggestions(currentUser.uid);
        setSuggestions(mutuals);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [currentUser?.uid]);

  const handleSendRequest = async (targetUid) => {
    if (!currentUser?.uid) return;

    try {
      const requestRef = doc(db, "friend_requests", `${currentUser.uid}_${targetUid}`);
      const existingRequest = await getDoc(requestRef);

      if (!existingRequest.exists()) {
        await setDoc(requestRef, {
          from: currentUser.uid,
          to: targetUid,
          status: "pending",
          createdAt: new Date()
        });
        alert("Friend request sent!");
      } else {
        alert("Friend request already sent.");
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-10">Loading suggestions...</div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className="text-center text-gray-500 py-10">No friend suggestions found.</div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">People You May Know</h2>
      {suggestions.map((user) => (
        <div
          key={user.uid}
          className="flex items-center justify-between bg-white p-4 rounded shadow"
        >
          <div>
            <p className="font-medium">{user.displayName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <Button onClick={() => handleSendRequest(user.uid)}>Add Friend</Button>
        </div>
      ))}
    </div>
  );
}
