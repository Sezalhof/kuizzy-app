// src/utils/firestoreUtils.js

import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  addDoc 
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Updates or creates a user profile in the Firestore 'users' collection.
 *
 * @param {string} uid - Firebase Auth UID of the user.
 * @param {object} profileData - The profile fields to save.
 */
export async function updateUserProfile(uid, profileData) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, profileData, { merge: true }); // merge = preserve existing fields
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    throw error;
  }
}

/**
 * Fetches the top quiz scores for leaderboard display.
 *
 * @param {number} limitCount - Maximum number of scores to fetch (default: 10).
 * @returns {Promise<Array>} - An array of top score documents.
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
 *
 * @param {string} uid - Firebase user ID.
 * @param {string} email - User's email address.
 * @param {number} score - Score achieved.
 * @param {number} timeTaken - Time taken to complete the quiz.
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
