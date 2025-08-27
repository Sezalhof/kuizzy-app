// src/utils/firestoreUtils.js
import { doc, setDoc, collection, getDocs, query, orderBy, limit, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getTwoMonthPeriod } from '../utils/saveAttemptAndLeaderboard';


// 🔹 Updates or creates a user profile
export async function updateUserProfile(uid, profileData) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, profileData, { merge: true });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    throw error;
  }
}

// 🔹 Fetch top quiz scores
export async function fetchTopScores(limitCount = 10) {
  const q = query(
    collection(db, "scores"),
    orderBy("score", "desc"),
    orderBy("timeTaken", "asc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// 🔹 Save a quiz score (rules-compliant, group-ready)
export async function saveQuizScore(uid, score, timeTaken, groupId = null) {
  // Replace with actual currentUser.uid in frontend
  const currentUser = uid; // Placeholder for auth check
  if (uid !== currentUser) {
    throw new Error("Cannot save score for another user");
  }

  try {
    const twoMonthPeriod = getTwoMonthPeriod();

    await addDoc(collection(db, "scores"), {
      uid,
      score,
      timeTaken,
      twoMonthPeriod,
      groupId: groupId || null,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Error saving quiz score:", error);
    throw error;
  }
}

// 🔹 In-memory cache for schools
let schoolsCache = {
  data: null,
  timestamp: null,
  isLoading: false,
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// 🔹 Get all schools grouped by division > district > upazila > union_or_pouroshava
export async function getAllSchoolsGrouped({ forceRefresh = false } = {}) {
  if (!forceRefresh && schoolsCache.data && schoolsCache.timestamp) {
    const age = Date.now() - schoolsCache.timestamp;
    if (age < CACHE_DURATION) return schoolsCache.data;
  }

  if (schoolsCache.isLoading) {
    while (schoolsCache.isLoading) await new Promise(r => setTimeout(r, 100));
    return schoolsCache.data;
  }

  schoolsCache.isLoading = true;
  try {
    const snapshot = await getDocs(collection(db, "schools"));
    const grouped = {};

    snapshot.forEach((doc) => {
      const school = doc.data();
      const { division, district, upazila, union_or_pouroshava, name } = school;
      if (!division || !district || !upazila || !union_or_pouroshava || !name) return;

      if (!grouped[division]) grouped[division] = {};
      if (!grouped[division][district]) grouped[division][district] = {};
      if (!grouped[division][district][upazila]) grouped[division][district][upazila] = {};
      if (!grouped[division][district][upazila][union_or_pouroshava])
        grouped[division][district][upazila][union_or_pouroshava] = [];

      grouped[division][district][upazila][union_or_pouroshava].push(name);
    });

    // Sort schools alphabetically
    Object.keys(grouped).forEach((division) => {
      Object.keys(grouped[division]).forEach((district) => {
        Object.keys(grouped[division][district]).forEach((upazila) => {
          Object.keys(grouped[division][district][upazila]).forEach((union) => {
            grouped[division][district][upazila][union].sort();
          });
        });
      });
    });

    schoolsCache.data = grouped;
    schoolsCache.timestamp = Date.now();

    return grouped;
  } catch (error) {
    console.error("❌ Error grouping schools:", error);
    throw error;
  } finally {
    schoolsCache.isLoading = false;
  }
}

// 🔹 Clear schools cache
export function clearSchoolsCache() {
  schoolsCache = { data: null, timestamp: null, isLoading: false };
}

// 🔹 Get all unions grouped by division > district > upazila
export async function getAllUnionsGrouped() {
  try {
    const snapshot = await getDocs(collection(db, "unions"));
    const grouped = {};

    snapshot.forEach((doc) => {
      const { division, district, upazila, union } = doc.data();
      if (!division || !district || !upazila || !union) return;

      if (!grouped[division]) grouped[division] = {};
      if (!grouped[division][district]) grouped[division][district] = {};
      if (!grouped[division][district][upazila]) grouped[division][district][upazila] = [];

      if (!grouped[division][district][upazila].includes(union)) {
        grouped[division][district][upazila].push(union);
      }
    });

    Object.keys(grouped).forEach((div) => {
      Object.keys(grouped[div]).forEach((dist) => {
        Object.keys(grouped[div][dist]).forEach((upa) => {
          grouped[div][dist][upa].sort();
        });
      });
    });

    return grouped;
  } catch (error) {
    console.error("❌ Error grouping unions:", error);
    throw error;
  }
}

// 🔹 Static dropdown helpers
export function getGenderOptions() {
  return ["Male", "Female", "Other"];
}

export function getReligionOptions() {
  return ["Islam", "Hinduism", "Buddhism", "Christianity", "Other"];
}

export function getClassOptions() {
  return [
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "HSC 1st Year",
    "HSC 2nd Year",
    "BA/BSc 1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "MA/MSc",
  ];
}
