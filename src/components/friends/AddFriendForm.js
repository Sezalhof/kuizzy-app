// src/components/friends/AddFriendForm.js
import React, { useState } from "react";
import { collection, doc, getDocs, query, where, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "hooks/useAuth";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function AddFriendForm() {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setSearchResult(null);
    setMessage("");

    try {
      const q = query(collection(db, "users"), where("phone", "==", phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage("No user found with that phone number.");
      } else {
        const foundUser = querySnapshot.docs[0];
        if (foundUser.id === user.uid) {
          setMessage("You can't send a request to yourself.");
        } else {
          setSearchResult({ uid: foundUser.id, ...foundUser.data() });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessage("An error occurred while searching.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user?.uid) return;

    const requestId = `${user.uid}_${searchResult.uid}`;
    const ref = doc(db, "friend_requests", requestId);
    const existing = await getDoc(ref);

    if (!existing.exists()) {
      await setDoc(ref, {
        fromId: user.uid,
        toId: searchResult.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setMessage("Friend request sent!");
      setSearchResult(null);
      setPhone("");
    } else {
      setMessage("You already sent a request to this user.");
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold">Add a Friend by Phone</h3>
      <div className="flex gap-2">
        <Input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {searchResult && (
        <div className="border rounded p-3 flex items-center justify-between">
          <div>
            <p className="font-medium">{searchResult.name || "Unnamed User"}</p>
            <p className="text-sm text-gray-500">{searchResult.email}</p>
          </div>
          <Button onClick={handleSendRequest}>Send Friend Request</Button>
        </div>
      )}

      {message && <p className="text-sm text-blue-600">{message}</p>}
    </div>
  );
}
