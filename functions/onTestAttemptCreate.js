import admin from "firebase-admin";
import { getUserProfile } from "./utils/getUserProfile.js";
import { normalizeId } from "./utils/normalizeId.js";

export const handleTestAttemptCreate = async (event) => {
  const db = admin.firestore();
  const attempt = event.data?.data() || {};
  const userId = attempt.userId;
  if (!userId) return;

  const score = Number(attempt.score || 0);
  const totalQuestions = Number(attempt.totalQuestions || 0);
  const combinedScore = Number(attempt.combinedScore ?? score);

  try {
    // Fetch user profile
    const userProfile = await getUserProfile(userId);

    // Use attempt values first, then fallback to profile
    const displayName = attempt.displayName || userProfile?.displayName || "Anonymous";
    const photoURL = attempt.photoURL || userProfile?.photoURL || null;

    // FIX: Get the correct groupId - prioritize attempt.groupId, then userProfile.groupId
    const groupId = attempt.groupId || userProfile?.groupId || null;

    // Normalize IDs for leaderboard docs
    const districtIdNorm = normalizeId(attempt.district || userProfile?.district);
    const divisionIdNorm = normalizeId(attempt.division || userProfile?.division);
    const schoolIdNorm = normalizeId(attempt.school || userProfile?.school);
    const unionIdNorm = normalizeId(attempt.union || userProfile?.union);
    const upazilaIdNorm = normalizeId(attempt.upazila || userProfile?.upazila);

    // 2-month period for aggregation
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const buckets = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
    const twoMonthPeriod = `${year}-${buckets[Math.floor((month - 1) / 2)]}`;

    const batch = db.batch();

    // --- Update global user_ranks ---
    const userRankRef = db.collection("user_ranks").doc(userId);
    batch.set(
      userRankRef,
      {
        userId,
        displayName,
        photoURL,
        score,
        totalQuestions,
        combinedScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // --- Update group_leaderboards (FIXED: use proper groupId, not school name) ---
    if (groupId) {
      // This creates: group_leaderboards/{actualGroupId}/members/{userId}
      const groupRankRef = db
        .collection("group_leaderboards")
        .doc(groupId) // Use the actual groupId, not slugified
        .collection("members")
        .doc(userId);

      batch.set(
        groupRankRef,
        {
          userId,
          displayName,
          score,
          totalQuestions,
          combinedScore,
          schoolId: schoolIdNorm,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // --- Update normalized district, division, school, union, upazila leaderboards ---
    const leaderboardTypes = [
      { type: "district", id: districtIdNorm },
      { type: "division", id: divisionIdNorm },
      { type: "school", id: schoolIdNorm },
      { type: "union", id: unionIdNorm },
      { type: "upazila", id: upazilaIdNorm },
    ];

    leaderboardTypes.forEach(({ type, id }) => {
      if (!id) return;
      const docRef = db
        .collection("group_leaderboards")
        .doc(`${type}_${id}_${twoMonthPeriod}`)
        .collection("members")
        .doc(userId);

      batch.set(
        docRef,
        {
          userId,
          displayName,
          score,
          totalQuestions,
          combinedScore,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    // --- Update global leaderboard ---
    const globalRef = db
      .collection("group_leaderboards")
      .doc(`global_all_${twoMonthPeriod}`)
      .collection("members")
      .doc(userId);

    batch.set(
      globalRef,
      {
        userId,
        displayName,
        score,
        totalQuestions,
        combinedScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    console.error("[onTestAttemptCreate] Error:", err.message || err);
  }
};