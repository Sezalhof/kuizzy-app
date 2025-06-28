import { doc, getDoc, updateDoc, arrayUnion, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Ensure a user is added to the group's memberIds list.
 * - If group does not exist, create it (for edge cases like testing).
 * - If group exists, ensure user is in the members list.
 *
 * @param {string} groupId - Firestore document ID of the group
 * @param {string} userId - UID of the user to be added
 * @param {string} name - Optional group name (only needed for creation fallback)
 */
export async function ensureUserInGroup(groupId, userId, name = "Unnamed Group") {
  if (!groupId || !userId) {
    console.warn("Missing groupId or userId");
    return;
  }

  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) {
    console.log("Group does not exist — creating fallback group");
    await setDoc(groupRef, {
      name,
      ownerId: userId,
      memberIds: [userId],
      createdAt: serverTimestamp(),
    });
  } else {
    const groupData = groupSnap.data();
    if (!groupData.memberIds?.includes(userId)) {
      console.log("Adding user to group memberIds");
      await updateDoc(groupRef, {
        memberIds: arrayUnion(userId),
      });
    }
  }
}
