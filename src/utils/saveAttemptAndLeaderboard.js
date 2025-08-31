import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import { getTwoMonthPeriod } from "./dateUtils"; // ✅ centralized

const DEBUG_MODE = false;

function log(...args) {
  if (DEBUG_MODE) console.log("[saveAttempt]", ...args);
}

export async function saveAttempt({
  userId,
  testId = null,
  score = 0,
  totalQuestions = 0,
  groupId = null,
  displayName = "Anonymous",
  photoURL = null,
  startedAt = null,
  finishedAt = null,
  testDurationSec = 900,
  userAnswers = {},
  schoolId = null,
  unionId = null,
  upazilaId = null,
  districtId = null,
  divisionId = null,
  combinedScore = null,
}) {
  if (!userId) throw new Error("Missing userId");
  if (!startedAt || !finishedAt) throw new Error("Missing timestamps");

  const elapsedSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
  const remainingTime = Math.max(0, testDurationSec - elapsedSec);

  const finalCombinedScore =
    combinedScore != null
      ? Number(combinedScore)
      : Number(score) + remainingTime / 60;

  const period = getTwoMonthPeriod();

  const attemptData = {
    userId,
    testId,
    displayName,
    photoURL,
    score: Number(score),
    totalQuestions: Number(totalQuestions),
    combinedScore: finalCombinedScore,
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
  log("✅ Test attempt saved:", attemptRef.id);

  const userRankRef = doc(db, "user_ranks", userId);
  await setDoc(
    userRankRef,
    {
      userId,
      displayName,
      photoURL,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      combinedScore: finalCombinedScore,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  log("✅ User rank updated");

  if (groupId) {
    const groupLeaderboardId = `${groupId}_${period}`;
    const groupRankRef = doc(db, "group_leaderboards", groupLeaderboardId, "members", userId);
    await setDoc(
      groupRankRef,
      {
        userId,
        displayName,
        photoURL,
        score: Number(score),
        totalQuestions: Number(totalQuestions),
        combinedScore: finalCombinedScore,
        schoolId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    log("✅ Group leaderboard updated:", groupLeaderboardId);
  }

  const globalLeaderboardId = `global_all_${period}`;
  const globalRef = doc(db, "group_leaderboards", globalLeaderboardId, "members", userId);
  await setDoc(
    globalRef,
    {
      userId,
      displayName,
      photoURL,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      combinedScore: finalCombinedScore,
      schoolId,
      unionId,
      upazilaId,
      districtId,
      divisionId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  log("✅ Global leaderboard updated:", globalLeaderboardId);

  return attemptRef.id;
}

export async function ensureUserInGroup(groupId, userId) {
  if (!groupId || !userId) return;
  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, { memberIds: arrayUnion(userId) });
}
