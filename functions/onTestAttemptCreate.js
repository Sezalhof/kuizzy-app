import admin from "firebase-admin";
import { getUserProfile } from "./utils/getUserProfile.js";

export const handleTestAttemptCreate = async (event) => {
  console.log("🔥 Cloud Function: handleTestAttemptCreate triggered");
  
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

    // Get the correct groupId - prioritize attempt.groupId, then userProfile.groupId
    const groupId = attempt.groupId || userProfile?.groupId || null;

    // 2-month period for aggregation
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const buckets = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
    const twoMonthPeriod = `${year}-${buckets[Math.floor((month - 1) / 2)]}`;

    const batch = db.batch();

    console.log("📊 Updating leaderboards for user:", userId);

    // --- 1. Update global user_ranks ---
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
    console.log("✅ User rank queued for update");

    // --- 2. Update group leaderboard (ONLY if proper groupId exists) ---
    if (groupId && groupId !== attempt.schoolId) {
      // Only create group leaderboard for actual group IDs, not school names
      const groupRankRef = db
        .collection("group_leaderboards")
        .doc(`${groupId}_${twoMonthPeriod}`)
        .collection("members")
        .doc(userId);

      batch.set(
        groupRankRef,
        {
          userId,
          displayName,
          photoURL,
          score,
          totalQuestions,
          combinedScore,
          schoolId: attempt.schoolId || userProfile?.schoolId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log("✅ Group leaderboard queued:", `${groupId}_${twoMonthPeriod}`);
    } else {
      console.log("❌ No valid groupId, skipping group leaderboard");
    }

    // --- 3. Update global leaderboard ONLY ---
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
        photoURL,
        score,
        totalQuestions,
        combinedScore,
        // Store geographic info for reference but don't create separate leaderboards
        schoolId: attempt.schoolId || userProfile?.schoolId,
        unionId: attempt.unionId || userProfile?.unionId,
        upazilaId: attempt.upazilaId || userProfile?.upazilaId,
        districtId: attempt.districtId || userProfile?.districtId,
        divisionId: attempt.divisionId || userProfile?.divisionId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log("✅ Global leaderboard queued");

    // 🚫 REMOVED: All geographic leaderboard creation
    // No more district_, division_, school_, union_, upazila_ leaderboards

    await batch.commit();
    console.log("🎉 Cloud Function: All leaderboards updated successfully");
    
  } catch (err) {
    console.error("❌ Cloud Function Error:", err.message || err);
  }
};