import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function saveQuizResult({ userId, score, timeTaken, groupId = null, profile }) {
  if (!userId || !profile) throw new Error("Missing user or profile info");

  const resultDoc = {
    userId,
    score,
    timeTaken,
    groupId,
    school: profile.school || null,
    union: profile.union || null,
    upazila: profile.upazila || null,
    district: profile.district || null,
    division: profile.division || null,
    timestamp: serverTimestamp(),
  };

  await addDoc(collection(db, "scores"), resultDoc);
}
