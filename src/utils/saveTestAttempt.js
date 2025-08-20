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
 * Client-safe: assumes Firestore rules allow authenticated user to write.
 */
export async function saveTestAttempt(payload) {
  const {
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
  } = payload;

  try {
    if (!userId) throw new Error("Missing userId!");
    if (!testId) throw new Error("Missing testId!");
    if (!startedAt || !finishedAt) throw new Error("Missing timestamps!");

    console.log("[saveTestAttempt] Payload received:", payload);

    // Numeric values
    const validScore = Number(score) || 0;
    const validTotalQuestions = Number(totalQuestions) || 0;

    // Elapsed and remaining time
    const elapsedSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
    const remainingTime = Math.max(0, testDurationSec - elapsedSec);

    // Combined score
    const combinedScore = validScore + remainingTime / 60;
    const twoMonthPeriod = getTwoMonthPeriod();

    // Test attempt payload
    const attemptPayload = {
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

    console.log("[saveTestAttempt] Attempt payload prepared:", attemptPayload);

    // Save attempt
    let attemptRef;
    try {
      attemptRef = await addDoc(collection(db, "test_attempts"), attemptPayload);
      console.log("[saveTestAttempt] Test attempt saved with ID:", attemptRef.id);
    } catch (err) {
      console.error("[saveTestAttempt] Failed to save test_attempt:", err.code, err.message);
      throw err;
    }

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

      console.log("[saveTestAttempt] Updating group leaderboard:", updatedLeaderboard);
      await setDoc(leaderboardRef, updatedLeaderboard, { merge: true });
    }

    // --- Update user ranks (global, school, team) ---
    const scopes = [{ key: "global", value: global ? true : false }];
    if (schoolId) scopes.push({ key: "school", value: schoolId });
    if (groupId) scopes.push({ key: "team", value: groupId });

    for (const { key, value } of scopes) {
      if (!value) continue;
      const rankRef = doc(
        db,
        "user_ranks",
        `${userId}_${key}_${value === true ? twoMonthPeriod : value}_${twoMonthPeriod}`
      );
      const rankPayload = {
        userId,
        displayName: displayName ?? "Unknown",
        score: validScore,
        totalQuestions: validTotalQuestions,
        combinedScore,
        lastAttemptAt: serverTimestamp(),
      };
      console.log(`[saveTestAttempt] Updating user rank (${key}):`, rankPayload);
      await setDoc(rankRef, rankPayload, { merge: true });
    }

    return attemptRef.id;
  } catch (err) {
    console.error("[saveTestAttempt] Error caught:", err.code, err.message);
    throw err;
  }
}
