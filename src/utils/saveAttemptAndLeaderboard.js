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
 * Save quiz/test attempt and update:
 * 1. test_attempts (raw attempts)
 * 2. user_ranks (personal bests)
 * 3. group_leaderboards/{groupId_period} (if groupId provided)
 * 4. global leaderboard
 */
export async function saveAttempt({
  userId,
  testId = null,
  score = 0,
  totalQuestions = 0,
  groupId = null, // actual group UUID
  displayName = "Anonymous",
  photoURL = null,
  startedAt = null,
  finishedAt = null,
  testDurationSec = 900,
  userAnswers = {},
  schoolId = null,   // kept for reference in user/global
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
  const period = getTwoMonthPeriod();

  // --- Save attempt to test_attempts ---
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
    twoMonthPeriod: period,
    startedAt,
    finishedAt,
    userAnswers,
    createdAt: serverTimestamp(),
  };

  const attemptRef = await addDoc(collection(db, "test_attempts"), attemptData);
  console.log("✅ Test attempt saved:", attemptRef.id);

  // --- Update user_ranks ---
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

  // --- Update group leaderboard ---
  if (groupId) {
    const groupLeaderboardId = `${groupId}_${period}`;
    const groupRankRef = doc(db, "group_leaderboards", groupLeaderboardId, "members", userId);

    await setDoc(groupRankRef, {
      userId,
      displayName,
      photoURL,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      combinedScore,
      schoolId, // optional extra context
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log("✅ Group leaderboard updated:", groupLeaderboardId);
  }

  // --- Update global leaderboard ---
  const globalLeaderboardId = `global_all_${period}`;
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

  return attemptRef.id;
}

/**
 * Utility: ensure user exists in group.members
 */
export async function ensureUserInGroup(groupId, userId) {
  if (!groupId || !userId) return;
  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, { memberIds: arrayUnion(userId) });
}
