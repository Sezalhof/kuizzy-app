// src/utils/firestoreUtils.js

import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Updates or creates a user profile in the Firestore 'users' collection.
 */
export async function updateUserProfile(uid, profileData) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, profileData, { merge: true });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    throw error;
  }
}

/**
 * Fetches the top quiz scores for leaderboard display.
 */
export async function fetchTopScores(limitCount = 10) {
  const q = query(
    collection(db, "scores"),
    orderBy("score", "desc"),
    orderBy("timeTaken", "asc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Saves a quiz score to Firestore.
 */
export async function saveQuizScore(uid, email, score, timeTaken) {
  await addDoc(collection(db, "scores"), {
    uid,
    email,
    score,
    timeTaken,
    timestamp: Date.now(),
  });
}

/**
 * Groups all schools by division, district, and upazila.
 */
export async function getAllSchoolsGrouped() {
  const snapshot = await getDocs(collection(db, "schools"));
  const grouped = {};

  snapshot.forEach((doc) => {
    const { division, district, upazila, name } = doc.data();
    if (!grouped[division]) grouped[division] = {};
    if (!grouped[division][district]) grouped[division][district] = {};
    if (!grouped[division][district][upazila])
      grouped[division][district][upazila] = [];
    grouped[division][district][upazila].push(name);
  });

  return grouped;
}
