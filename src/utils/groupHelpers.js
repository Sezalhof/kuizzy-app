// src/utils/groupHelpers.js
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // <-- use relative path inside src/

export async function ensureUserInGroup(groupId, userId) {
  const ref = doc(db, "groups", groupId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const group = snap.data();
  if (!group.memberIds?.includes(userId)) {
    await updateDoc(ref, {
      memberIds: arrayUnion(userId),
    });
  }
}

export async function createGroupWithMembers(name, ownerId, memberIds) {
  const allMembers = Array.from(new Set([ownerId, ...memberIds]));
  await addDoc(collection(db, "groups"), {
    name,
    ownerId,
    memberIds: allMembers,
    createdAt: serverTimestamp(),
  });
}

export async function batchAddMembers(groupId, newUserIds) {
  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, {
    memberIds: arrayUnion(...newUserIds),
  });
}

export async function addMembersToGroup(groupId, members) {
  const ref = doc(db, "groups", groupId);
  await updateDoc(ref, {
    memberIds: arrayUnion(...members),
  });
}
