// src/utils/getMutualFriendSuggestions.js

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get mutual friend suggestions for the given user ID (uid).
 * This function fetches all friend requests and computes suggestions based on mutual friends.
 *
 * @param {string} uid - The user ID for whom to get friend suggestions.
 * @returns {Promise<Array>} - Returns an array of suggested friend objects.
 */
export const getMutualFriendSuggestions = async (uid) => {
  try {
    // Fetch all friend_requests collection documents
    const allRequestsSnapshot = await getDocs(collection(db, 'friend_requests'));

    const myFriends = new Set();
    const suggestions = new Map();

    // Process all friend requests to find your friends
    allRequestsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'accepted') {
        if (data.from === uid) {
          myFriends.add(data.to);
        }
        if (data.to === uid) {
          myFriends.add(data.from);
        }
      }
    });

    // For each friend, find their friends to suggest as mutual friends
    allRequestsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'accepted') {
        if (myFriends.has(data.from) && data.to !== uid && !myFriends.has(data.to)) {
          suggestions.set(data.to, (suggestions.get(data.to) || 0) + 1);
        }
        if (myFriends.has(data.to) && data.from !== uid && !myFriends.has(data.from)) {
          suggestions.set(data.from, (suggestions.get(data.from) || 0) + 1);
        }
      }
    });

    // Convert suggestions Map to an array sorted by mutual friend count descending
    const suggestionArray = Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1]) // sort by count descending
      .map(([userId]) => userId);

    // Optional: Fetch user details for these userIds if needed (e.g., display name, avatar)

    return suggestionArray;
  } catch (error) {
    console.error('Error getting mutual friend suggestions:', error);
    return [];
  }
};
