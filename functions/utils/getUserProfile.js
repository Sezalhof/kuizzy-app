import admin from "firebase-admin"; // just import, do NOT call initializeApp()

export async function getUserProfile(userId) {
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(userId).get();
  return userSnap.exists ? userSnap.data() : null;
}
