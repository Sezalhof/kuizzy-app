import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import FriendListCard from "./FriendListCard";
import FriendSentCard from "./FriendSentCard";
import FriendPendingCard from "./FriendPendingCard";

const FriendList = ({ activeTab }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !activeTab) return;

    setLoading(true);
    const friendRequestsRef = collection(db, "friend_requests");
    let unsubscribe;

    if (activeTab === "friends") {
      const qTo = query(
        friendRequestsRef,
        where("toId", "==", user.uid),
        where("status", "==", "accepted")
      );
      const qFrom = query(
        friendRequestsRef,
        where("fromId", "==", user.uid),
        where("status", "==", "accepted")
      );

      let resultsTo = [];
      let resultsFrom = [];

      const unsubTo = onSnapshot(qTo, (snapshot) => {
        resultsTo = snapshot.docs;
        combineResults();
      });

      const unsubFrom = onSnapshot(qFrom, (snapshot) => {
        resultsFrom = snapshot.docs;
        combineResults();
      });

      const combineResults = async () => {
        const combinedDocs = Array.from(
          new Map(
            [...resultsTo, ...resultsFrom].map((docSnap) => [docSnap.id, docSnap])
          ).values()
        );

        if (combinedDocs.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        try {
          const friendDataPromises = combinedDocs.map(async (docSnap) => {
            const data = docSnap.data();
            const otherUserId = data.fromId === user.uid ? data.toId : data.fromId;
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            const userInfo = userDoc.exists() ? userDoc.data() : {};

            return {
              id: docSnap.id,
              ...data,
              friendUid: otherUserId,
              friendName: userInfo.name || "Unknown User",
              friendEmail: userInfo.email || "",
              friendPhone: userInfo.phone || "",
            };
          });

          const friendData = await Promise.all(friendDataPromises);
          setFriends(friendData);
          setLoading(false);
        } catch (error) {
          console.error("[FriendList] Firestore error:", error);
          setFriends([]);
          setLoading(false);
        }
      };

      unsubscribe = () => {
        unsubTo();
        unsubFrom();
      };
    } else {
      let q;

      if (activeTab === "pending") {
        q = query(
          friendRequestsRef,
          where("toId", "==", user.uid),
          where("status", "==", "pending")
        );
      } else if (activeTab === "sent") {
        q = query(
          friendRequestsRef,
          where("fromId", "==", user.uid),
          where("status", "==", "pending")
        );
      } else {
        setFriends([]);
        setLoading(false);
        return;
      }

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          if (snapshot.empty) {
            setFriends([]);
            setLoading(false);
            return;
          }

          try {
            const friendDataPromises = snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              const otherUserId = data.fromId === user.uid ? data.toId : data.fromId;
              const userDoc = await getDoc(doc(db, "users", otherUserId));
              const userInfo = userDoc.exists() ? userDoc.data() : {};

              return {
                id: docSnap.id,
                ...data,
                friendUid: otherUserId,
                friendName: userInfo.name || "Unknown User",
                friendEmail: userInfo.email || "",
                friendPhone: userInfo.phone || "",
              };
            });

            const friendData = await Promise.all(friendDataPromises);
            setFriends(friendData);
            setLoading(false);
          } catch (error) {
            console.error("[FriendList] Firestore error:", error);
            setFriends([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error("[FriendList] Firestore error:", error);
          setFriends([]);
          setLoading(false);
        }
      );
    }

    return () => unsubscribe && unsubscribe();
  }, [activeTab, user?.uid]);

  if (!user?.uid) {
    return <div className="text-center text-gray-500">Loading user data...</div>;
  }

  if (loading) {
    return (
      <div className="text-center text-gray-500">Loading {activeTab}...</div>
    );
  }

  if (friends.length === 0) {
    return (
      <p className="text-center text-gray-400">
        No {activeTab === "friends" ? "friends" : activeTab} yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 px-2 sm:px-4">
      {friends.map((friend) => {
        const sharedProps = {
          id: friend.id,
          uid: friend.friendUid,
          name: friend.friendName,
          email: friend.friendEmail,
          phone: friend.friendPhone,
          status: friend.status,
          fromId: friend.fromId,
          toId: friend.toId,
        };

        if (activeTab === "friends") {
          return <FriendListCard key={friend.id} user={sharedProps} />;
        } else if (activeTab === "sent") {
          return <FriendSentCard key={friend.id} request={sharedProps} />;
        } else if (activeTab === "pending") {
          return <FriendPendingCard key={friend.id} request={sharedProps} />;
        }

        return null;
      })}
    </div>
  );
};

export default FriendList;
