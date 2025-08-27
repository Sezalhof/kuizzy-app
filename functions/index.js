// src/functions/index.js
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { handleTestAttemptCreate } from "./onTestAttemptCreate.js";

// ---------- Global defaults ----------
setGlobalOptions({ region: "us-central1", memory: "256MiB", timeoutSeconds: 60 });

// ---------- Admin init ----------
admin.initializeApp();
const db = admin.firestore();

// ---------- Emulator hardening ----------
if (process.env.FIRESTORE_EMULATOR_HOST) db.settings({ host: process.env.FIRESTORE_EMULATOR_HOST, ssl: false });
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  try { admin.auth().useEmulator(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`); } catch {}
}

// ---------- Constants ----------
const MAX_STORED_PLAYERS = 200;

// ---------- Helpers ----------
const combinedScoreOf = (score = 0, remainingTimeSec = 0) => Number(score) + Number(remainingTimeSec) / 60;
const normalizeTimestamp = (tsLike) => {
  if (!tsLike) return admin.firestore.Timestamp.now();
  if (tsLike instanceof admin.firestore.Timestamp) return tsLike;
  if (tsLike instanceof Date) return admin.firestore.Timestamp.fromDate(tsLike);
  if (typeof tsLike === "number") return admin.firestore.Timestamp.fromMillis(tsLike);
  try { if (typeof tsLike.toDate === "function") return tsLike; } catch {}
  return admin.firestore.Timestamp.now();
};
const getTwoMonthPeriod = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const periodNames = ["JanFeb","MarApr","MayJun","JulAug","SepOct","NovDec"];
  return `${year}-${periodNames[Math.floor((month-1)/2)]}`;
};
const slug = (v) => String(v||"").trim().toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").replace(/\s+/g,"-");
const num = (n,d=0)=>Number.isFinite(Number(n))?Number(n):d;

// ---------- Express API ----------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.get("/ping", (_req,res)=>res.json({ok:true,message:"pong"}));

// ---------- Leaderboard Helpers ----------
function attachTodayCombinedScore(players){
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  return (players||[]).map(p=>{
    const attemptedDate = p.dateAttempted?.toDate?p.dateAttempted.toDate():new Date(p.dateAttempted);
    const isToday = attemptedDate >= today && attemptedDate < tomorrow;
    return {...p, todayCombinedScore:isToday?combinedScoreOf(p.score,p.remainingTime):null};
  });
}
async function readLeaderboardDoc(scopeType,scopeId,period){
  const id=`${scopeType}_${scopeId}_${period}`;
  const ref=db.collection("group_leaderboards").doc(id);
  const snap=await ref.get();
  if(!snap.exists) return {leaderboard:[],averageScore:0,averageRemainingMinutes:0,totalCombinedAverage:0,scopeType,scopeId,period};
  const data = snap.data()||{};
  let players=data.players||[];
  players.sort((a,b)=>{
    const ac=Number(a.combinedScore??combinedScoreOf(a.score,a.remainingTime));
    const bc=Number(b.combinedScore??combinedScoreOf(b.score,b.remainingTime));
    if(bc!==ac) return bc-ac;
    if((b.score||0)!==(a.score||0)) return (b.score||0)-(a.score||0);
    return (b.remainingTime||0)-(a.remainingTime||0);
  });
  players=attachTodayCombinedScore(players);
  const {totalScoreSum=0,totalRemainingMinutes=0,totalAttempts=0,totalCombinedAverage=0,averageScore,averageRemainingMinutes}=data;
  return {
    leaderboard:players,
    averageScore:averageScore??(totalAttempts?totalScoreSum/totalAttempts:0),
    averageRemainingMinutes:averageRemainingMinutes??(totalAttempts?totalRemainingMinutes/totalAttempts:0),
    totalCombinedAverage:totalCombinedAverage??((totalAttempts?totalScoreSum/totalAttempts:0)+(totalAttempts?totalRemainingMinutes/totalAttempts:0)),
    scopeType,scopeId,period
  };
}

// ---------- Leaderboard API ----------
app.get("/leaderboard/:groupId", async (req,res)=>{
  try{
    const {groupId} = req.params;
    if(!groupId) return res.status(400).json({error:"Missing groupId"});
    const period=getTwoMonthPeriod();
    const {schoolId,unionId,upazilaId,districtId,divisionId}=req.query||{};
    const jobs=[readLeaderboardDoc("group",groupId,period),readLeaderboardDoc("global","all",period)];
    if(schoolId) jobs.push(readLeaderboardDoc("school",String(schoolId),period));
    if(unionId) jobs.push(readLeaderboardDoc("union",String(unionId),period));
    if(upazilaId) jobs.push(readLeaderboardDoc("upazila",String(upazilaId),period));
    if(districtId) jobs.push(readLeaderboardDoc("district",String(districtId),period));
    if(divisionId) jobs.push(readLeaderboardDoc("division",String(divisionId),period));
    const results=await Promise.all(jobs);
    const scopes={}; results.forEach(r=>{scopes[r.scopeType]=r;});
    res.json({period,scopes});
  }catch{return res.status(500).json({error:"Internal Server Error"});}
});

// Export HTTP function
export const api = onRequest(app);

// ---------- Firestore Trigger ----------
// SIMPLIFIED: Just call handleTestAttemptCreate and let it handle everything
export const testAttemptTrigger = onDocumentCreated(
  "test_attempts/{attemptId}",
  async (event) => {
    try {
      // Let handleTestAttemptCreate handle the user_ranks and members collections
      await handleTestAttemptCreate(event);

      // Now handle the main leaderboard documents with players array
      const data = event.data?.data() || {};
      const userId = data.userId;
      if (!userId) return;

      let userProfile = null;
      try {
        const userSnap = await db.collection("users").doc(userId).get();
        userProfile = userSnap.exists ? userSnap.data() : null;
      } catch {}

      const remainingTimeSec = num(data.remainingTime, 0);
      const score = num(data.score, 0);
      const displayName = data.displayName || userProfile?.displayName || "Anonymous";
      const dateAttempted = normalizeTimestamp(data.createdAt || data.finishedAt);
      const period = data.twoMonthPeriod || getTwoMonthPeriod();

      // FIX: Use the correct groupId priority
      const groupId = data.groupId || userProfile?.groupId || "";
      const schoolId = data.schoolId || slug(userProfile?.school || "");
      const unionId = data.unionId || slug(userProfile?.union || "");
      const upazilaId = data.upazilaId || slug(userProfile?.upazila || "");
      const districtId = data.districtId || slug(userProfile?.district || "");
      const divisionId = data.divisionId || slug(userProfile?.division || "");

      console.log("DEBUG - Final computed values:", {
        userId,
        groupId,
        schoolId,
        userProfileGroupId: userProfile?.groupId,
        dataGroupId: data.groupId
      });

      const scopes = [
        ...(groupId ? [{ type: "group", id: slug(groupId) }] : []),
        ...(schoolId ? [{ type: "school", id: schoolId }] : []),
        ...(unionId ? [{ type: "union", id: unionId }] : []),
        ...(upazilaId ? [{ type: "upazila", id: upazilaId }] : []),
        ...(districtId ? [{ type: "district", id: districtId }] : []),
        ...(divisionId ? [{ type: "division", id: divisionId }] : []),
        { type: "global", id: "all" }
      ];

      const playerEntry = {
        userId,
        displayName,
        score,
        remainingTime: remainingTimeSec,
        combinedScore: combinedScoreOf(score, remainingTimeSec),
        dateAttempted
      };

      for (const scope of scopes) {
        const leaderboardRef = db.collection("group_leaderboards").doc(`${scope.type}_${scope.id}_${period}`);
        console.log("DEBUG - Creating leaderboard doc:", `${scope.type}_${scope.id}_${period}`);
        
        try {
          await db.runTransaction(async tx => {
            const docSnap = await tx.get(leaderboardRef);
            let players = docSnap.exists ? docSnap.data().players || [] : [];
            let totalScoreSum = docSnap.exists ? num(docSnap.data().totalScoreSum, 0) : 0;
            let totalRemainingMinutes = docSnap.exists ? num(docSnap.data().totalRemainingMinutes, 0) : 0;
            let totalAttempts = docSnap.exists ? num(docSnap.data().totalAttempts, 0) : 0;

            const existingIndex = players.findIndex(p => p.userId === userId);
            if (existingIndex >= 0) {
              const existing = players[existingIndex] || {};
              totalScoreSum -= num(existing.score, 0);
              totalRemainingMinutes -= num(existing.remainingTime, 0) / 60;
              totalAttempts -= 1;
              players.splice(existingIndex, 1);
            }

            players.push(playerEntry);
            totalScoreSum += score;
            totalRemainingMinutes += remainingTimeSec / 60;
            totalAttempts += 1;

            const averageScore = totalAttempts ? totalScoreSum / totalAttempts : 0;
            const averageRemainingMinutes = totalAttempts ? totalRemainingMinutes / totalAttempts : 0;
            const totalCombinedAverage = averageScore + averageRemainingMinutes;

            players.sort((a, b) => {
              const bc = combinedScoreOf(b.score, b.remainingTime);
              const ac = combinedScoreOf(a.score, a.remainingTime);
              if (bc !== ac) return bc - ac;
              if (b.score !== a.score) return b.score - a.score;
              return b.remainingTime - a.remainingTime;
            });
            players = players.slice(0, MAX_STORED_PLAYERS);

            tx.set(leaderboardRef, {
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
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          });
        } catch (err) {
          console.error("Transaction error for scope:", scope, err);
        }
      }
    } catch (err) {
      console.error("testAttemptTrigger error:", err);
    }
  }
);