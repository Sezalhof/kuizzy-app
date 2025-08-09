import React, { useEffect, useState, useMemo } from "react";
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

const PAGE_SIZE = 10;

const FriendList = ({ activeTab }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Fetch friend requests & accepted friends with snapshot for real-time updates
  useEffect(() => {
    if (!user?.uid || !activeTab) return;

    setLoading(true);
    setFriends([]);
    setPage(1);

    const friendRequestsRef = collection(db, "friend_requests");
    let unsubscribe;

    if (activeTab === "friends") {
      // Accepted friends (both fromId and toId)
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
          // Optimize: Fetch user info for each friend only once per UID
          const uniqueUserIds = new Set();
          combinedDocs.forEach((docSnap) => {
            const data = docSnap.data();
            uniqueUserIds.add(data.fromId === user.uid ? data.toId : data.fromId);
          });

          // Batch fetch user info in parallel
          const userDocs = await Promise.all(
            Array.from(uniqueUserIds).map((uid) => getDoc(doc(db, "users", uid)))
          );

          // Map UID to user data
          const userInfoMap = new Map();
          userDocs.forEach((docSnap) => {
            if (docSnap.exists()) {
              userInfoMap.set(docSnap.id, docSnap.data());
            }
          });

          const friendData = combinedDocs.map((docSnap) => {
            const data = docSnap.data();
            const friendUid = data.fromId === user.uid ? data.toId : data.fromId;
            const info = userInfoMap.get(friendUid) || {};
            return {
              id: docSnap.id,
              ...data,
              friendUid,
              friendName: info.name || "Unknown User",
              friendEmail: info.email || "",
              friendPhone: info.phone || "",
              avatar: info.avatar || "/default-avatar.png",
              school: info.school || "",
              class: info.class || "",
            };
          });

          setFriends(friendData);
          setLoading(false);
        } catch (error) {
          console.error("[FriendList] Firestore error:", error);
          setFriends([]);
          setLoading(false);
        }
      };

      const unsubTo = onSnapshot(qTo, (snapshot) => {
        resultsTo = snapshot.docs;
        combineResults();
      });

      const unsubFrom = onSnapshot(qFrom, (snapshot) => {
        resultsFrom = snapshot.docs;
        combineResults();
      });

      unsubscribe = () => {
        unsubTo();
        unsubFrom();
      };
    } else {
      // For pending or sent tabs
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
            const userIds = new Set();
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const otherUserId = data.fromId === user.uid ? data.toId : data.fromId;
              userIds.add(otherUserId);
            });

            const userDocs = await Promise.all(
              Array.from(userIds).map((uid) => getDoc(doc(db, "users", uid)))
            );

            const userInfoMap = new Map();
            userDocs.forEach((docSnap) => {
              if (docSnap.exists()) {
                userInfoMap.set(docSnap.id, docSnap.data());
              }
            });

            const friendData = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const friendUid = data.fromId === user.uid ? data.toId : data.fromId;
              const info = userInfoMap.get(friendUid) || {};
              return {
                id: docSnap.id,
                ...data,
                friendUid,
                friendName: info.name || "Unknown User",
                friendEmail: info.email || "",
                friendPhone: info.phone || "",
                avatar: info.avatar || "/default-avatar.png",
                school: info.school || "",
                class: info.class || "",
              };
            });

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

  // Search filtering (name or email)
  const filteredFriends = useMemo(() => {
    if (!searchTerm) return friends;
    const lowerTerm = searchTerm.toLowerCase();
    return friends.filter(
      (f) =>
        (f.friendName && f.friendName.toLowerCase().includes(lowerTerm)) ||
        (f.friendEmail && f.friendEmail.toLowerCase().includes(lowerTerm))
    );
  }, [searchTerm, friends]);

  // Pagination (lazy load 10 per page)
  const paginatedFriends = useMemo(() => {
    return filteredFriends.slice(0, page * PAGE_SIZE);
  }, [filteredFriends, page]);

  // Load more button visibility
  const canLoadMore = paginatedFriends.length < filteredFriends.length;

  if (!user?.uid) {
    return <div className="text-center text-gray-500 py-6">Loading user data...</div>;
  }

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-6">Loading {activeTab}...</div>
    );
  }

  if (friends.length === 0) {
    return (
      <p className="text-center text-gray-400 py-6">
        No {activeTab === "friends" ? "friends" : activeTab} yet.
      </p>
    );
  }

  return (
    <div className="px-2 sm:px-4 max-w-xl mx-auto">
      <input
        type="text"
        placeholder="Search by name or email..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setPage(1); // reset page when searching
        }}
        className="w-full p-2 mb-4 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="space-y-3">
        {paginatedFriends.map((friend) => {
          const sharedProps = {
            id: friend.id,
            uid: friend.friendUid,
            name: friend.friendName,
            email: friend.friendEmail,
            phone: friend.friendPhone,
            avatar: friend.avatar,
            school: friend.school,
            class: friend.class,
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

      {canLoadMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendList;
