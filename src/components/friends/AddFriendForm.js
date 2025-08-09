import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const COUNTRY_CODE_SUGGESTIONS = ["+880", "+1", "+44", "+91", "+61", "+81"];

export default function AddFriendForm() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [countryCodeHint, setCountryCodeHint] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUserProfile({ uid: user.uid, ...snap.data() });
      }
    };
    fetchProfile();
  }, [user]);

  const isProbablyPhone = (input) => /^[+0-9\s\-()]+$/.test(input.trim());
  const normalizePhone = (phone) => phone.replace(/[\s\-()]/g, "");

  const ensureCountryCode = (input) => {
    const cleaned = normalizePhone(input);

    if (/^01\d{8}$/.test(cleaned)) {
      return "+880" + cleaned.slice(1);
    }

    if (/^8801\d{8}$/.test(cleaned)) {
      return "+" + cleaned;
    }

    if (/^\+8801\d{8}$/.test(cleaned)) {
      return cleaned;
    }

    if (!cleaned.startsWith("+")) {
      setCountryCodeHint(
        `📌 Did you mean one of these country codes? ${COUNTRY_CODE_SUGGESTIONS.join(", ")}`
      );
    }

    return cleaned;
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearchResult(null);
    setMessage("");
    setCountryCodeHint("");

    const input = searchInput.trim();
    if (!input) {
      setMessage("Please enter a phone number or email to search.");
      setLoading(false);
      return;
    }

    const isPhone = isProbablyPhone(input);
    const isEmail = /\S+@\S+\.\S+/.test(input);

    try {
      let q;

      if (isPhone) {
        const normalized = ensureCountryCode(input);
        q = query(collection(db, "users"), where("phone", "==", normalized));
      } else if (isEmail) {
        q = query(collection(db, "users"), where("email", "==", input.toLowerCase()));
      } else {
        setMessage("❌ Please enter a valid phone number or email.");
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage("❌ No user found with that phone/email.");
      } else {
        const foundUser = querySnapshot.docs[0];
        const foundUid = foundUser.id;

        if (foundUid === user.uid) {
          setMessage("You can't invite yourself.");
          setLoading(false);
          return;
        }

        const isAlreadyTeammate =
          userProfile?.friends?.some((f) => f === foundUid || f?.uid === foundUid);
        if (isAlreadyTeammate) {
          setMessage("✔️ You are already teammates!");
          setLoading(false);
          return;
        }

        const sentReqs = await getDocs(
          query(
            collection(db, "friend_requests"),
            where("fromId", "==", user.uid),
            where("toId", "==", foundUid),
            where("status", "==", "pending")
          )
        );
        if (!sentReqs.empty) {
          setMessage("⏳ Already invited! Check outgoing invites.");
          setLoading(false);
          return;
        }

        const receivedReqs = await getDocs(
          query(
            collection(db, "friend_requests"),
            where("fromId", "==", foundUid),
            where("toId", "==", user.uid),
            where("status", "==", "pending")
          )
        );
        if (!receivedReqs.empty) {
          setMessage("📥 This user already invited you. Check incoming invites.");
          setLoading(false);
          return;
        }

        setSearchResult({ uid: foundUid, ...foundUser.data() });
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessage("❌ An error occurred while searching.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;

    try {
      const targetUid = searchResult.uid;
      const sortedIds = [user.uid, targetUid].sort();
      const requestId = `${sortedIds[0]}_${sortedIds[1]}`;
      const ref = doc(db, "friend_requests", requestId);
      const existing = await getDoc(ref);

      if (!existing.exists()) {
        await setDoc(ref, {
          fromId: user.uid,
          toId: targetUid,
          status: "pending",
          createdAt: serverTimestamp(),
        });
        setMessage("✅ Invite sent!");
        setSearchResult(null);
        setSearchInput("");
        setCountryCodeHint("");
      } else {
        setMessage("⚠️ You already sent a request to this user.");
      }
    } catch (error) {
      console.error("Send request error:", error);
      setMessage("❌ Failed to send invite.");
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold">Invite a Friend by Phone or Email</h3>
      <div className="flex gap-2">
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter phone number or email"
          disabled={loading}
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {countryCodeHint && (
        <p className="text-sm text-yellow-700">{countryCodeHint}</p>
      )}

      {searchResult && (
        <div className="border rounded p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {searchResult.photoURL ? (
              <img
                src={searchResult.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/fallback-logo.png"; // fallback image path
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
                ?
              </div>
            )}
            <div>
              <p className="font-medium">{searchResult.name || "Unnamed User"}</p>
              <p className="text-sm text-gray-600">
                {searchResult.grade ? `Grade: ${searchResult.grade}` : "Grade: N/A"}
              </p>
              <p className="text-sm text-gray-600">
                {searchResult.school ? `School: ${searchResult.school}` : "School: N/A"}
              </p>
            </div>
          </div>

          <Button onClick={handleSendRequest}>➕ Invite to Join</Button>
        </div>
      )}

      {message && <p className="text-sm text-blue-600">{message}</p>}
    </div>
  );
}
