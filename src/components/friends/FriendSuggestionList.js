// src/components/friends/FriendSuggestionList.js
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { Button } from "../ui/button";

export default function FriendSuggestionList() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user?.uid) return;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserInfo(snap.data());
      }
    };
    fetchUserInfo();
  }, [user?.uid]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!userInfo?.class || !userInfo?.school) return;

      const usersQuery = query(
        collection(db, "users"),
        where("class", "==", userInfo.class),
        where("school", "==", userInfo.school)
      );
      const snapshot = await getDocs(usersQuery);

      const results = [];
      for (const docSnap of snapshot.docs) {
        if (docSnap.id === user.uid) continue;

        const data = docSnap.data();
        const otherUserId = docSnap.id;
        const reqId1 = `${user.uid}_${otherUserId}`;
        const reqId2 = `${otherUserId}_${user.uid}`;
        const [req1, req2] = await Promise.all([
          getDoc(doc(db, "friend_requests", reqId1)),
          getDoc(doc(db, "friend_requests", reqId2)),
        ]);

        if (!req1.exists() && !req2.exists()) {
          results.push({ uid: otherUserId, ...data });
        }
      }

      setSuggestions(results);
    };

    fetchSuggestions();
  }, [userInfo]);

  const handleSendRequest = async (toUser) => {
    const requestId = `${user.uid}_${toUser.uid}`;
    try {
      await setDoc(doc(db, "friend_requests", requestId), {
        fromId: user.uid,
        toId: toUser.uid,
        status: "pending",
        createdAt: new Date(),
      });
      setMessage(`Friend request sent to ${toUser.name || toUser.email}`);
    } catch (err) {
      console.error("Send request failed:", err);
      setMessage("Failed to send friend request");
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      const userQuery = query(collection(db, "users"));
      const snapshot = await getDocs(userQuery);
      let found = null;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          docSnap.id !== user.uid &&
          (data.email === search.trim() || data.phone === search.trim())
        ) {
          found = { uid: docSnap.id, ...data };
        }
      });

      if (!found) {
        setMessage("No user found with that phone or email");
        return;
      }

      const reqId1 = `${user.uid}_${found.uid}`;
      const reqId2 = `${found.uid}_${user.uid}`;

      const [req1, req2] = await Promise.all([
        getDoc(doc(db, "friend_requests", reqId1)),
        getDoc(doc(db, "friend_requests", reqId2)),
      ]);

      if (req1.exists() || req2.exists()) {
        setMessage("Request already exists or you're already friends.");
        return;
      }

      await handleSendRequest(found);
    } catch (err) {
      console.error("Search error:", err);
      setMessage("Error searching user.");
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-bold">People You May Know</h2>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by phone or email"
          className="border px-3 py-1 rounded text-sm w-full sm:w-64"
        />
        <Button size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {message && (
        <p className="text-sm text-blue-600 font-medium">{message}</p>
      )}

      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-400">No suggestions right now.</p>
      ) : (
        suggestions.map((user) => (
          <div
            key={user.uid}
            className="flex justify-between items-center p-3 bg-white border shadow-sm rounded"
          >
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-gray-500">
                {user.class} • {user.school}
              </p>
            </div>
            <Button size="sm" onClick={() => handleSendRequest(user)}>
              Send Request
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
