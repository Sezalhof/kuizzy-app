// src/hooks/useFriendRequests.js
import { useEffect, useState } from 'react';
import {
  collection, query, where, getDocs, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../kuizzy-app/src/firebase';

export const useFriendRequests = () => {
  const currentUser = auth.currentUser;
  const myUid = currentUser?.uid;
  const [incoming, setIncoming] = useState([]);
  const [pending, setPending] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    if (!myUid) return;

    const incomingQuery = query(
      collection(db, 'friend_requests'),
      where('toId', '==', myUid),
      where('status', '==', 'pending')
    );
    const outgoingQuery = query(
      collection(db, 'friend_requests'),
      where('fromId', '==', myUid)
    );

    const unsubIn = onSnapshot(incomingQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncoming(data);
    });

    const unsubOut = onSnapshot(outgoingQuery, (snap) => {
      const pend = [];
      const acc = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.status === 'pending') pend.push(d);
        else if (d.status === 'accepted') acc.push(d);
      });
      setPending(pend);
      setAccepted(acc);
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [myUid]);

  useEffect(() => {
    const uids = [
      ...incoming.map(r => r.fromId),
      ...pending.map(r => r.toId),
      ...accepted.map(r => r.toId)
    ];
    const unique = [...new Set(uids)];

    const fetchUsers = async () => {
      const map = {};
      for (let uid of unique) {
        const q = query(collection(db, 'users'), where('uid', '==', uid));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          const d = doc.data();
          map[uid] = { name: d.name, phone: d.phone };
        });
      }
      setUserMap(map);
    };

    if (unique.length) fetchUsers();
  }, [incoming, pending, accepted]);

  const sendRequest = async (phoneCode) => {
    const snap = await getDocs(query(
      collection(db, 'users'), where('phone', '==', phoneCode)
    ));
    if (snap.empty) throw new Error("User not found");

    const toId = snap.docs[0].id;
    if (toId === myUid) throw new Error("Can't friend yourself");

    const exists = await getDocs(query(
      collection(db, 'friend_requests'),
      where('fromId', '==', myUid),
      where('toId', '==', toId)
    ));
    if (!exists.empty) throw new Error("Already sent");

    await addDoc(collection(db, 'friend_requests'), {
      fromId: myUid,
      toId,
      status: 'pending',
      timestamp: serverTimestamp()
    });
  };

  const handleAction = async (id, status) => {
    await updateDoc(doc(db, 'friend_requests', id), {
      status,
      timestamp: serverTimestamp()
    });
  };

  return { incoming, pending, accepted, userMap, sendRequest, handleAction, currentUser };
};
