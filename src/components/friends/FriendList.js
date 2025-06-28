// src/components/friends/FriendList.js
import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  or,
  and
} from 'firebase/firestore';
import { db } from '../../firebase';
import FriendCard from './FriendCard';
import useAuth from 'hooks/useAuth';

export default function FriendList({ activeTab }) {
  const [friends, setFriends] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid || !activeTab) return;

    const baseRef = collection(db, 'friend_requests');
    let q;

    if (activeTab === 'accepted') {
      q = query(
        baseRef,
        and(
          or(where('toId', '==', user.uid), where('fromId', '==', user.uid)),
          where('status', '==', 'accepted')
        )
      );
    } else {
      q = query(
        baseRef,
        and(where('toId', '==', user.uid), where('status', '==', activeTab.toLowerCase()))
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          // Mutual logic: figure out the other person
          const otherUserId = data.fromId === user.uid ? data.toId : data.fromId;
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          const userInfo = userDoc.exists() ? userDoc.data() : {};

          return {
            id: docSnap.id,
            ...data,
            name: userInfo.name || 'Unknown',
            email: userInfo.email || '',
            fromId: data.fromId,
            toId: data.toId,
            status: data.status,
          };
        })
      );
      setFriends(data);
    });

    return () => unsubscribe();
  }, [activeTab, user?.uid]);

  if (!user?.uid) {
    return <div className="text-center text-gray-400">Loading user data...</div>;
  }

  return (
    <div className="space-y-3 px-2 sm:px-4">
      {friends.length === 0 ? (
        <p className="text-center text-gray-400">No {activeTab} friends.</p>
      ) : (
        friends.map((f) => (
          <FriendCard
            key={f.id}
            friend={f}
            status={activeTab.toLowerCase()}
            currentUserId={user.uid}
          />
        ))
      )}
    </div>
  );
}
