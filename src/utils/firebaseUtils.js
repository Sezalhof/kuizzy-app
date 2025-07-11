import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../kuizzy-app/src/firebase';

export const saveResult = async (email, score, time) => {
  try {
    await addDoc(collection(db, 'scores'), {
      email,
      score,
      time,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error saving result:', error);
  }
};

export const fetchLeaderboard = async () => {
  try {
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, orderBy('score', 'desc'), orderBy('time', 'asc'), limit(10));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};
