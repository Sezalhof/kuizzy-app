import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  and,
  or,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import FriendListCard from "./FriendListCard";
import FriendRequestCard from "./FriendRequestCard";
import FriendSentCard from "./FriendSentCard";

const tabs = [
  { key: "friends", label: "🏡 Guest Room" },
  { key: "pending", label: "Incoming Requests" },
  { key: "sent", label: "Sent Requests" },
];

export default function FriendTabsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("friends");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !activeTab) return;

    setLoading(true);
    const ref = collection(db, "friend_requests");
    let q;

    if (activeTab === "friends") {
      q = query(
        ref,
        and(
          or(where("toId", "==", user.uid), where("fromId", "==", user.uid)),
          where("status", "==", "accepted")
        )
      );
    } else if (activeTab === "pending") {
      q = query(ref, and(where("toId", "==", user.uid), where("status", "==", "pending")));
    } else if (activeTab === "sent") {
      q = query(ref, and(where("fromId", "==", user.uid), where("status", "==", "pending")));
    } else {
      setData([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          setData([]);
          setLoading(false);
          return;
        }

        const items = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const req = docSnap.data();
            let otherUid;

            if (activeTab === "sent") {
              otherUid = req.toId;
            } else if (activeTab === "pending") {
              otherUid = req.fromId;
            } else {
              // friends tab
              otherUid = req.fromId === user.uid ? req.toId : req.fromId;
            }

            const userSnap = await getDoc(doc(db, "users", otherUid));
            const profile = userSnap.exists() ? userSnap.data() : {};

            return {
              id: docSnap.id,
              uid: otherUid,
              name: profile.name || "",
              email: profile.email || "",
              phone: profile.phone || "",
              fromId: req.fromId,
              toId: req.toId,
              status: req.status,
            };
          })
        );

        setData(items);
        setLoading(false);
      },
      (error) => {
        console.error("FriendTabsView Firestore error:", error);
        setData([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTab, user?.uid]);

  const renderContent = () => {
    if (loading)
      return <p className="text-center text-gray-500">Loading...</p>;

    if (data.length === 0)
      return (
        <p className="text-center text-gray-400">
          No {activeTab === "friends" ? "friends" : activeTab} found.
        </p>
      );

    return (
      <div className="space-y-3">
        {data.map((user) => {
          if (activeTab === "sent")
            return <FriendSentCard key={user.id} user={user} />;
          if (activeTab === "pending")
            return <FriendRequestCard key={user.id} user={user} />;
          if (activeTab === "friends")
            return <FriendListCard key={user.id} user={user} />;
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex justify-center gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-blue-600"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
