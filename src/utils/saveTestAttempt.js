// src/utils/saveTestAttempt.js
import { addDoc, collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Helper to get current 2-month period
export function getTwoMonthPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const buckets = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
  const idx = Math.floor((month - 1) / 2);
  return `${year}-${buckets[idx]}`;
}

/**
 * Saves a test attempt and updates leaderboards (global, school, team/group)
 */
export async function saveTestAttempt({
  userId,
  displayName,
  schoolId,
  unionId,
  upazilaId,
  districtId,
  divisionId,
  global = false,
  testId,
  score,
  totalQuestions,
  userAnswers,
  startedAt,
  finishedAt,
  testDurationSec = 900,
  groupId = null,
}) {
  if (!userId) throw new Error("Missing userId!");
  if (!testId) throw new Error("Missing testId!");

  // Ensure numeric values
  const validScore = Number(score) || 0;
  const validTotalQuestions = Number(totalQuestions) || 0;

  // Compute elapsed time and remaining time
  const elapsedSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
  const remainingTime = Math.max(0, testDurationSec - elapsedSec);

  // Combined score
  const combinedScore = validScore + remainingTime / 60;

  const twoMonthPeriod = getTwoMonthPeriod();

  const payload = {
    userId,
    displayName: displayName ?? "Unknown",
    schoolId: schoolId ?? null,
    unionId: unionId ?? null,
    upazilaId: upazilaId ?? null,
    districtId: districtId ?? null,
    divisionId: divisionId ?? null,
    global,
    testId,
    score: validScore,
    totalQuestions: validTotalQuestions,
    userAnswers: userAnswers ?? {},
    startedAt,
    finishedAt,
    createdAt: serverTimestamp(),
    remainingTime,
    combinedScore,
    twoMonthPeriod,
    groupId,
  };

  // Replace undefined with null
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined) payload[k] = null;
  });

  // Save the test attempt
  const attemptRef = await addDoc(collection(db, "test_attempts"), payload);

  // --- Update group leaderboard ---
  if (groupId) {
    const leaderboardRef = doc(db, "group_leaderboards", groupId);
    const leaderboardSnap = await getDoc(leaderboardRef);

    let leaderboard = {
      totalScoreSum: 0,
      totalRemainingMinutes: 0,
      totalAttempts: 0,
      averageScore: 0,
      averageRemainingMinutes: 0,
      totalCombinedAverage: 0,
      lastAttemptCombined: 0,
    };

    if (leaderboardSnap.exists()) leaderboard = leaderboardSnap.data();

    const newTotalScoreSum = leaderboard.totalScoreSum + validScore;
    const newTotalRemainingMinutes = leaderboard.totalRemainingMinutes + remainingTime / 60;
    const newTotalAttempts = leaderboard.totalAttempts + 1;
    const newAverageScore = newTotalScoreSum / newTotalAttempts;
    const newAverageRemainingMinutes = newTotalRemainingMinutes / newTotalAttempts;
    const newTotalCombinedAverage = newAverageScore + newAverageRemainingMinutes;

    const updatedLeaderboard = {
      totalScoreSum: newTotalScoreSum,
      totalRemainingMinutes: newTotalRemainingMinutes,
      totalAttempts: newTotalAttempts,
      averageScore: newAverageScore,
      averageRemainingMinutes: newAverageRemainingMinutes,
      totalCombinedAverage: newTotalCombinedAverage,
      lastAttemptCombined: combinedScore,
    };

    await setDoc(leaderboardRef, updatedLeaderboard, { merge: true });
  }

  // --- Update user rank documents for global, school, and team ---
  const scopes = [{ key: "global", value: global ? true : false }];
  if (schoolId) scopes.push({ key: "school", value: schoolId });
  if (groupId) scopes.push({ key: "team", value: groupId });

  for (const { key, value } of scopes) {
    if (!value) continue;
    const rankRef = doc(db, "user_ranks", `${userId}_${key}_${value === true ? twoMonthPeriod : value}_${twoMonthPeriod}`);
    await setDoc(rankRef, {
      userId,
      displayName: displayName ?? "Unknown",
      score: validScore,
      totalQuestions: validTotalQuestions,
      combinedScore,
      lastAttemptAt: serverTimestamp(),
    }, { merge: true });
  }

  return attemptRef.id;
}
