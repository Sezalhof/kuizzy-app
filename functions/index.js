// functions/index.js
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";

// ---------- Global defaults (region/memory/timeout) ----------
setGlobalOptions({
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 60,
});

// ---------- Admin init ----------
admin.initializeApp();
const db = admin.firestore();

// ---------- Emulator hardening ----------
const isFirestoreEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const isAuthEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (isFirestoreEmulator) {
  console.log("🔥 Firestore Emulator:", process.env.FIRESTORE_EMULATOR_HOST);
  db.settings({
    host: process.env.FIRESTORE_EMULATOR_HOST,
    ssl: false,
  });
}

if (isAuthEmulator) {
  console.log("🔥 Auth Emulator:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
  try {
    admin.auth().useEmulator(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  } catch (e) {
    console.warn("Auth useEmulator() not available:", e?.message || e);
  }
}

// ---------- Constants ----------
const COMBINED_FACTOR = 100; // kept for compatibility
const MAX_STORED_PLAYERS = 200;

// ---------- Helpers ----------
function combinedScoreOf(score = 0, remainingTimeSec = 0) {
  // Your UI uses "score + minutes" as combined.
  // We'll keep this helper (sec-based) but convert to minutes to match the trigger’s stored value.
  return Number(score || 0) + Number(remainingTimeSec || 0) / 60;
}

function normalizeTimestamp(tsLike) {
  if (!tsLike) return admin.firestore.Timestamp.now();
  if (tsLike instanceof admin.firestore.Timestamp) return tsLike;
  if (tsLike instanceof Date) return admin.firestore.Timestamp.fromDate(tsLike);
  if (typeof tsLike === "number") return admin.firestore.Timestamp.fromMillis(tsLike);
  try {
    if (typeof tsLike.toDate === "function") return tsLike;
  } catch (_) {}
  return admin.firestore.Timestamp.now();
}

function getTwoMonthPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const periodNames = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
  const periodIndex = Math.floor((month - 1) / 2);
  return `${year}-${periodNames[periodIndex]}`;
}

// Consistent ID for location/school strings
function slug(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

// Safely read attempt fields
function num(n, d = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : d;
}

// ---------- Express API ----------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ---------- Mock Schools API ----------
app.get("/api/mockSchools", (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: "school_001", name: "Tejgaon Government High School" },
      { id: "school_002", name: "Motijheel Ideal School & College" },
    ],
  });
});

// ---------- Ping ----------
app.get("/ping", (_req, res) => res.json({ ok: true, message: "pong" }));

// Utility to compute todayCombinedScore for already-stored players
function attachTodayCombinedScore(players) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return (players || []).map((p) => {
    const attemptedDate = p.dateAttempted?.toDate
      ? p.dateAttempted.toDate()
      : new Date(p.dateAttempted);
    const isToday = attemptedDate >= today && attemptedDate < tomorrow;

    // p.combinedScore already stored as score + minutes in the trigger
    const todayCombinedScore = isToday
      ? (Number(p.score || 0) + Number(p.remainingTime || 0) / 60)
      : null;

    return { ...p, todayCombinedScore };
  });
}

// Read a single leaderboard doc and return normalized response
async function readLeaderboardDoc(scopeType, scopeId, period) {
  const id = `${scopeType}_${scopeId}_${period}`;
  const ref = db.collection("group_leaderboards").doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    return {
      leaderboard: [],
      averageScore: 0,
      averageRemainingMinutes: 0,
      totalCombinedAverage: 0,
      scopeType,
      scopeId,
      period,
    };
  }

  const data = snap.data() || {};
  let players = data.players || [];

  // Sort by combinedScore desc (fallback to score then remainingTime if combinedScore missing)
  players.sort((a, b) => {
    const ac = Number(a.combinedScore ?? (a.score || 0) + (a.remainingTime || 0) / 60);
    const bc = Number(b.combinedScore ?? (b.score || 0) + (b.remainingTime || 0) / 60);
    if (bc !== ac) return bc - ac;
    // tie-breakers
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return (b.remainingTime || 0) - (a.remainingTime || 0);
  });

  players = attachTodayCombinedScore(players);

  const {
    totalScoreSum = 0,
    totalRemainingMinutes = 0,
    totalAttempts = 0,
    totalCombinedAverage = 0,
    averageScore,
    averageRemainingMinutes,
  } = data;

  return {
    leaderboard: players,
    averageScore: averageScore ?? (totalAttempts ? totalScoreSum / totalAttempts : 0),
    averageRemainingMinutes:
      averageRemainingMinutes ?? (totalAttempts ? totalRemainingMinutes / totalAttempts : 0),
    totalCombinedAverage:
      totalCombinedAverage ??
      ((totalAttempts ? totalScoreSum / totalAttempts : 0) +
        (totalAttempts ? totalRemainingMinutes / totalAttempts : 0)),
    scopeType,
    scopeId,
    period,
  };
}

// ---------- Leaderboard API ----------
// Returns a unified payload with whichever scopes are available:
// - Always returns TEAM for :groupId and GLOBAL for "all"
// - Optionally returns SCHOOL/UNION/UPAZILA/DISTRICT/DIVISION if query params are supplied
//   e.g. /leaderboard/43f1420...?schoolId=6a15e...&unionId=kapasia&upazilaId=sundarganj&...
app.get("/leaderboard/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return res.status(400).json({ error: "Missing groupId" });

    const period = getTwoMonthPeriod();

    // Optional scope IDs via query
    const {
      schoolId,
      unionId,
      upazilaId,
      districtId,
      divisionId,
    } = req.query || {};

    // Always include team (groupId) and global (all)
    const jobs = [
      readLeaderboardDoc("team", groupId, period),
      readLeaderboardDoc("global", "all", period),
    ];

    // Include optional scopes if provided
    if (schoolId) jobs.push(readLeaderboardDoc("school", String(schoolId), period));
    if (unionId) jobs.push(readLeaderboardDoc("union", String(unionId), period));
    if (upazilaId) jobs.push(readLeaderboardDoc("upazila", String(upazilaId), period));
    if (districtId) jobs.push(readLeaderboardDoc("district", String(districtId), period));
    if (divisionId) jobs.push(readLeaderboardDoc("division", String(divisionId), period));

    const results = await Promise.all(jobs);

    // Return keyed by scopeType for convenience
    const scopes = {};
    results.forEach((r) => {
      scopes[r.scopeType] = r;
    });

    res.json({ period, scopes });
  } catch (err) {
    console.error("[/leaderboard] error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Export HTTP function
export const api = onRequest(app);

// ---------- Firestore Trigger: on new test_attempts doc ----------
export const onScoreCreate = onDocumentCreated("test_attempts/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot || !snapshot.exists) return;

  const data = snapshot.data();

  // NOTE: many of your historical docs don't have these. We make them optional and try to derive.
  const userId = data.userId;
  if (!userId) return;

  // Remaining time (seconds) — tolerate missing; compute if possible
  let remainingTimeSec = num(data.remainingTime, null);
  if (remainingTimeSec == null) {
    const startedAt = data.startedAt?.toDate
      ? data.startedAt.toDate()
      : data.startedAt
        ? new Date(data.startedAt)
        : null;
    const finishedAt = data.finishedAt?.toDate
      ? data.finishedAt.toDate()
      : data.finishedAt
        ? new Date(data.finishedAt)
        : null;
    const testDurationSec = num(data.testDurationSec, null);
    if (startedAt && finishedAt && Number.isFinite(testDurationSec)) {
      const elapsed = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
      remainingTimeSec = Math.max(0, testDurationSec - elapsed);
    } else {
      remainingTimeSec = 0;
    }
  }

  const score = num(data.score, 0);
  const remainingMinutes = remainingTimeSec / 60;
  const displayName = data.displayName || "Anonymous";
  const dateAttempted = normalizeTimestamp(data.createdAt || data.finishedAt);

  // Attempt period (prefer stored twoMonthPeriod, else compute)
  const period = data.twoMonthPeriod || getTwoMonthPeriod();

  // ---- Derive scope IDs ----
  // TEAM/GROUP (only if provided)
  const groupId = data.groupId || data.groupUID || data.groupUid || null;

  // Pull user profile to enrich location/school if missing on attempt
  let userProfile = null;
  try {
    const userSnap = await db.collection("users").doc(userId).get();
    userProfile = userSnap.exists ? userSnap.data() : null;
  } catch (e) {
    console.warn("[onScoreCreate] could not read user profile:", e?.message || e);
  }

  // SCHOOL: prefer a stable UID if available
  // - attempt.schoolId / attempt.schoolUID
  // - users/{uid}.school (name) -> try to map to schools collection (uid), else slug(name)
  let schoolId = data.schoolId || data.schoolUID || data.schoolUid || null;
  if (!schoolId) {
    const schoolName = data.school || userProfile?.school || null;
    if (schoolName) {
      try {
        // try to map to schools collection (by name) to get UID
        const q = await db
          .collection("schools")
          .where("name", "==", schoolName)
          .limit(1)
          .get();
        if (!q.empty) {
          schoolId = q.docs[0]?.data()?.uid || q.docs[0]?.id || slug(schoolName);
        } else {
          schoolId = slug(schoolName);
        }
      } catch {
        schoolId = slug(schoolName);
      }
    }
  }

  // GEO scopes from attempt, else user profile; use slug for stability
  const unionId =
    data.unionId || data.union || userProfile?.union ? slug(data.unionId || data.union || userProfile?.union) : null;
  const upazilaId =
    data.upazilaId || data.upazila || userProfile?.upazila
      ? slug(data.upazilaId || data.upazila || userProfile?.upazila)
      : null;
  const districtId =
    data.districtId || data.district || userProfile?.district
      ? slug(data.districtId || data.district || userProfile?.district)
      : null;
  const divisionId =
    data.divisionId || data.division || userProfile?.division
      ? slug(data.divisionId || data.division || userProfile?.division)
      : null;

  // --- Scopes to update ---
  const scopes = [
    // team only if we have a groupId
    ...(groupId ? [{ type: "team", id: String(groupId) }] : []),
    ...(schoolId ? [{ type: "school", id: String(schoolId) }] : []),
    ...(unionId ? [{ type: "union", id: String(unionId) }] : []),
    ...(upazilaId ? [{ type: "upazila", id: String(upazilaId) }] : []),
    ...(districtId ? [{ type: "district", id: String(districtId) }] : []),
    ...(divisionId ? [{ type: "division", id: String(divisionId) }] : []),
    { type: "global", id: "all" },
  ];

  // Player record to push
  const playerEntry = {
    userId,
    displayName,
    score,
    remainingTime: remainingTimeSec,
    combinedScore: score + remainingMinutes, // EXACT formula you use in UI
    dateAttempted,
  };

  for (const scope of scopes) {
    const leaderboardRef = db.collection("group_leaderboards").doc(`${scope.type}_${scope.id}_${period}`);

    try {
      await db.runTransaction(async (tx) => {
        const docSnap = await tx.get(leaderboardRef);

        let players = docSnap.exists ? docSnap.data().players || [] : [];
        let totalScoreSum = docSnap.exists ? num(docSnap.data().totalScoreSum, 0) : 0;
        let totalRemainingMinutes = docSnap.exists ? num(docSnap.data().totalRemainingMinutes, 0) : 0;
        let totalAttempts = docSnap.exists ? num(docSnap.data().totalAttempts, 0) : 0;

        // Remove existing latest entry for this user (we track "latest attempt per user" model)
        const existingIndex = players.findIndex((p) => p.userId === userId);
        if (existingIndex >= 0) {
          const existing = players[existingIndex] || {};
          totalScoreSum -= num(existing.score, 0);
          totalRemainingMinutes -= num(existing.remainingTime, 0) / 60;
          totalAttempts -= 1;
          players.splice(existingIndex, 1);
        }

        // Add new attempt
        players.push(playerEntry);

        // Update totals (running sums)
        totalScoreSum += score;
        totalRemainingMinutes += remainingMinutes;
        totalAttempts += 1;

        const averageScore = totalAttempts ? totalScoreSum / totalAttempts : 0;
        const averageRemainingMinutes = totalAttempts ? totalRemainingMinutes / totalAttempts : 0;
        const totalCombinedAverage = averageScore + averageRemainingMinutes;

        // Sort by combinedScore desc, tie-breakers score desc, remainingTime desc
        players.sort((a, b) => {
          const bc = num(b.combinedScore, num(b.score, 0) + num(b.remainingTime, 0) / 60);
          const ac = num(a.combinedScore, num(a.score, 0) + num(a.remainingTime, 0) / 60);
          if (bc !== ac) return bc - ac;
          if (num(b.score, 0) !== num(a.score, 0)) return num(b.score, 0) - num(a.score, 0);
          return num(b.remainingTime, 0) - num(a.remainingTime, 0);
        });

        // Keep top N players
        players = players.slice(0, MAX_STORED_PLAYERS);

        tx.set(
          leaderboardRef,
          {
            scopeType: scope.type,
            scopeId: scope.id,
            period,
            players,
            totalScoreSum,
            totalRemainingMinutes,
            totalAttempts,
            averageScore,
            averageRemainingMinutes,
            totalCombinedAverage,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      console.log(
        `[onScoreCreate] Updated ${scope.type}/${scope.id}/${period} for user ${userId} (score ${score}, remMin ${remainingMinutes.toFixed(
          3
        )})`
      );
    } catch (err) {
      console.error(`[onScoreCreate] Failed updating ${scope.type} leaderboard:`, err);
    }
  }
});
