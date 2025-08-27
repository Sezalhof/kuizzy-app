// src/hooks/getUserProfile.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetches the complete user profile from Firestore.
 * @param {string|null} uid - Firebase user ID
 * @returns {Promise<Object|null>} - Profile object or null if not found
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) return null;

    const data = snap.data();

    return {
      uid,
      name: data.name || "Unknown",
      displayName: data.name || "Unknown",
      email: data.email || null,
      phone: data.phone || null,
      gender: data.gender || null,
      religion: data.religion || null,
      grade: data.grade || null,
      role: data.role || null,
      school: data.school || null,
      schoolId: data.schoolId || null,
      groupId: data.groupId || null,
      district: data.district || null,
      districtId: data.districtId || null,
      division: data.division || null,
      divisionId: data.divisionId || null,
      upazila: data.upazila || null,
      upazilaId: data.upazilaId || null,
      union: data.union || null,
      unionId: data.unionId || null,
      countryCode: data.countryCode || null,
      photoURL: data.photoURL || null,
      createdAt: data.createdAt || null,
    };
  } catch (err) {
    console.error("[getUserProfile] Error fetching profile:", err.message || err);
    return null;
  }
}
