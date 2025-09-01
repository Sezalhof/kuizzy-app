// functions/src/aggregateLeaderboard.js
import admin from "firebase-admin";
admin.initializeApp();

const db = admin.firestore();

// Helper to get current 2-month period (aligned with saveTestAttempt)
function getTwoMonthPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const buckets = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
  const idx = Math.floor((month - 1) / 2);
  return `${year}-${buckets[idx]}`;
}

async function aggregateLeaderboards({ cleanOldAttempts = false } = {}) {
  const period = getTwoMonthPeriod();
  console.log(`[aggregateLeaderboards] Aggregating leaderboard for period: ${period}`);

  // Fetch all test attempts for the period
  const attemptsSnap = await db
    .collection("test_attempts")
    .where("twoMonthPeriod", "==", period)
    .get();

  if (attemptsSnap.empty) {
    console.log("[aggregateLeaderboards] No test attempts found.");
    return;
  }

  // Aggregate per user
  const userStats = new Map(); // userId => { totalScore, totalTime, totalCombined, count, displayName, email, schoolId, groupId }

  attemptsSnap.forEach(doc => {
    const data = doc.data();
    const { userId, displayName, email, schoolId, groupId, score, remainingTime, combinedScore } = data;
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        totalScore: 0,
        totalRemainingMinutes: 0,
        totalCombined: 0,
        count: 0,
        displayName: displayName || "Unknown",
        email: email || userId,
        schoolId: schoolId || null,
        groupId: groupId || null,
      });
    }

    const stats = userStats.get(userId);
    stats.totalScore += score ?? 0;
    stats.totalRemainingMinutes += (remainingTime ?? 0) / 60;
    stats.totalCombined += combinedScore ?? 0;
    stats.count += 1;
  });

  const batch = db.batch();

  // Prepare leaderboard entries with rolling combined scores
  let userLeaderboard = [];
  for (const [userId, stats] of userStats.entries()) {
    const avgScore = stats.count ? stats.totalScore / stats.count : 0;
    const avgRemaining = stats.count ? stats.totalRemainingMinutes / stats.count : 0;
    const avgCombinedNew = stats.count ? stats.totalCombined / stats.count : 0;

    // Fetch previous leaderboard entry (if any)
    const prevDocRef = db.collection("leaderboards").doc("global").collection(period).doc(userId);
    const prevDocSnap = await prevDocRef.get();
    const prevCombined = prevDocSnap.exists ? prevDocSnap.data().avgCombined ?? 0 : 0;
    const prevCount = prevDocSnap.exists ? prevDocSnap.data().count ?? 1 : 0;

    // Rolling combined score
    const rolledCombined = (prevCombined * prevCount + avgCombinedNew) / (prevCount + 1);
    const newCount = prevCount + 1;

    userLeaderboard.push({
      userId,
      displayName: stats.displayName,
      email: stats.email,
      avgScore,
      avgRemaining,
      avgCombined: rolledCombined,
      count: newCount,
      schoolId: stats.schoolId,
      groupId: stats.groupId,
      period,
    });
  }

  // Sort by combined metric descending
  userLeaderboard.sort((a, b) => b.avgCombined - a.avgCombined);

  // Write global leaderboard
  userLeaderboard.forEach((entry, idx) => {
    const docRef = db
      .collection("leaderboards")
      .doc("global")
      .collection(period)
      .doc(entry.userId);

    batch.set(docRef, {
      rank: idx + 1,
      displayName: entry.displayName,
      email: entry.email,
      avgScore: entry.avgScore,
      avgRemaining: entry.avgRemaining,
      avgCombined: entry.avgCombined,
      count: entry.count,
      schoolId: entry.schoolId,
      groupId: entry.groupId,
      period: entry.period,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Aggregate per school
  const schoolMap = new Map();
  userLeaderboard.forEach(e => {
    if (!e.schoolId) return;
    if (!schoolMap.has(e.schoolId)) schoolMap.set(e.schoolId, { totalCombined: 0, count: 0 });
    const s = schoolMap.get(e.schoolId);
    s.totalCombined += e.avgCombined;
    s.count += 1;
  });

  const schoolLeaderboard = [];
  schoolMap.forEach((stats, schoolId) => {
    const avgCombined = stats.count ? stats.totalCombined / stats.count : 0;
    schoolLeaderboard.push({ schoolId, avgCombined });
  });

  schoolLeaderboard.sort((a, b) => b.avgCombined - a.avgCombined);
  schoolLeaderboard.forEach((entry, idx) => {
    const docRef = db.collection("leaderboards").doc("school").collection(entry.schoolId).doc(period);
    batch.set(docRef, {
      rank: idx + 1,
      avgCombined: entry.avgCombined,
      period,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Optionally delete old test_attempts now that we rolled them
  if (cleanOldAttempts) {
    attemptsSnap.forEach(doc => doc.ref.delete());
  }

  await batch.commit();
  console.log("[aggregateLeaderboards] Aggregation complete.");
}

// HTTP endpoint for manual trigger
export const scheduledLeaderboardAggregation = async (req, res) => {
  try {
    await aggregateLeaderboards({ cleanOldAttempts: false }); // set true if you want to delete old attempts
    res.status(200).send("Leaderboard aggregation completed.");
  } catch (err) {
    console.error("Aggregation error:", err);
    res.status(500).send("Leaderboard aggregation failed.");
  }
};

// Callable function for testing
export const callableAggregateLeaderboard = async (data, context) => {
  try {
    await aggregateLeaderboards({ cleanOldAttempts: data?.cleanOldAttempts ?? false });
    return { success: true };
  } catch (err) {
    console.error("Aggregation error:", err);
    return { success: false, error: err.message };
  }
};
