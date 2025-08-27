import { collection, doc, addDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Returns the current 2-month period string, e.g., "2025-JulAug"
 */
export function getTwoMonthPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const buckets = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
  const idx = Math.floor((month - 1) / 2);
  return `${year}-${buckets[idx]}`;
}

/**
 * Save quiz/test attempt and update ONLY user ranks, group leaderboard (if groupId exists), and global leaderboard
 */
export async function saveAttempt({
  userId,
  testId = null,
  score = 0,
  totalQuestions = 0,
  groupId = null, // ACTUAL group document ID (UUID or normalized)
  displayName = "Anonymous",
  photoURL = null,
  startedAt = null,
  finishedAt = null,
  testDurationSec = 900,
  userAnswers = {},
  // Store these for reference but don't create leaderboards for them
  schoolId = null,
  unionId = null,
  upazilaId = null,
  districtId = null,
  divisionId = null,
}) {
  if (!userId) throw new Error("Missing userId");
  if (!startedAt || !finishedAt) throw new Error("Missing timestamps");

  const elapsedSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
  const remainingTime = Math.max(0, testDurationSec - elapsedSec);
  const combinedScore = Number(score) + remainingTime / 60;
  const twoMonthPeriod = getTwoMonthPeriod();

  console.log("=== SaveAttempt Debug ===");
  console.log("userId:", userId);
  console.log("groupId:", groupId);
  console.log("schoolId:", schoolId);
  console.log("=========================");

  // --- Save attempt to test_attempts collection ---
  const attemptData = {
    userId,
    testId,
    displayName,
    photoURL,
    score: Number(score),
    totalQuestions: Number(totalQuestions),
    combinedScore,
    timeTaken: elapsedSec,
    remainingTime,
    groupId,
    schoolId,
    unionId,
    upazilaId,
    districtId,
    divisionId,
    twoMonthPeriod,
    startedAt,
    finishedAt,
    userAnswers,
    createdAt: serverTimestamp(),
  };

  const attemptRef = await addDoc(collection(db, "test_attempts"), attemptData);
  console.log("✅ Test attempt saved:", attemptRef.id);

  // --- 1. Update user_ranks (user's personal best) ---
  const userRankRef = doc(db, "user_ranks", userId);
  await setDoc(userRankRef, {
    userId,
    displayName,
    photoURL,
    score: Number(score),
    totalQuestions: Number(totalQuestions),
    combinedScore,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log("✅ User rank updated");

  // --- 2. Update group leaderboard ONLY if groupId exists ---
  if (groupId) {
    // Use the exact groupId - don't modify it
    const groupLeaderboardId = `${groupId}_${twoMonthPeriod}`;
    const groupRankRef = doc(db, "group_leaderboards", groupLeaderboardId, "members", userId);
    
    await setDoc(groupRankRef, {
      userId,
      displayName,
      photoURL,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      combinedScore,
      schoolId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("✅ Group leaderboard updated:", groupLeaderboardId);
  } else {
    console.log("❌ No groupId provided, skipping group leaderboard");
  }

  // --- 3. Update global leaderboard ---
  const globalLeaderboardId = `global_all_${twoMonthPeriod}`;
  const globalRef = doc(db, "group_leaderboards", globalLeaderboardId, "members", userId);
  
  await setDoc(globalRef, {
    userId,
    displayName,
    photoURL,
    score: Number(score),
    totalQuestions: Number(totalQuestions),
    combinedScore,
    schoolId,
    unionId,
    upazilaId,
    districtId,
    divisionId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log("✅ Global leaderboard updated:", globalLeaderboardId);

  console.log("=== SaveAttempt Complete ===");
  return attemptRef.id;
}

/**
 * Optionally ensure user is in the group members array
 */
export async function ensureUserInGroup(groupId, userId) {
  if (!groupId || !userId) return;
  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, {
    memberIds: arrayUnion(userId),
  });
}