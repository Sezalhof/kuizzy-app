// src/components/friends/FriendList.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import FriendCard from './FriendCard';
import useAuth from 'hooks/useAuth'; // ✅ correct

export default function FriendList({ activeTab }) {
  const [friends, setFriends] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid || !activeTab) return; // ✅ prevent crashing if user not ready

    const q = query(
      collection(db, 'friend_requests'),
      where('toId', '==', user.uid),
      where('status', '==', activeTab.toLowerCase()) // pending | accepted | blocked
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(data);
    });

    return () => unsubscribe();
  }, [activeTab, user?.uid]); // ✅ use optional chaining

  // Show loading state while user is undefined/null
  if (!user?.uid) {
    return <div className="text-center text-gray-400">Loading user data...</div>;
  }

  return (
    <div className="space-y-3">
      {friends.length === 0 ? (
        <p className="text-center text-gray-400">No {activeTab} friends.</p>
      ) : (
        friends.map((f) => (
          <FriendCard key={f.id} friend={f} status={activeTab.toLowerCase()} />
        ))
      )}
    </div>
  );
}
