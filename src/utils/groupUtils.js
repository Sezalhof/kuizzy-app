// src/utils/groupUtils.js
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Assign a user to a manually created group.
 * This is used by GroupCreator.js to assign users to real group UUIDs and names.
 */
export async function assignUserToGroup(uid, groupInfo) {
  if (!uid || !groupInfo?.groupId || !groupInfo?.groupName) return;

  try {
    const userRef = doc(db, "users", uid);

    await updateDoc(userRef, {
      groups: arrayUnion(groupInfo.groupId), // keep track of all joined groups
      group: groupInfo.groupName,            // legacy single group field
      groupId: groupInfo.groupId,            // primary group assignment
    });

    console.log(
      `✅ User ${uid} assigned to group: ${groupInfo.groupName} (${groupInfo.groupId})`
    );
  } catch (err) {
    console.error(`[assignUserToGroup] Failed for user ${uid}:`, err);
  }
}

/**
 * Auto-assign users to default groups based on school + grade.
 * This preserves older behavior for users not manually assigned to groups.
 */
export async function autoAssignMissingGroups() {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("groupId", "==", null));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("ℹ️ No users need auto-group assignment");
      return;
    }

    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.schoolId && data.grade) {
        const groupId = `${data.schoolId}_${data.grade}`.replace(/\s+/g, "_");
        batch.update(docSnap.ref, {
          groupId,
          group: `${data.schoolId} - ${data.grade}`,
          groups: arrayUnion(groupId), // also add to multi-group list
        });
      }
    });

    await batch.commit();
    console.log(`✅ Auto-assigned ${snapshot.docs.length} users to groups`);
  } catch (error) {
    console.error("❌ Failed to auto-assign groups:", error);
  }
}
