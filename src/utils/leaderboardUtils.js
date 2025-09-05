// src/utils/leaderboardUtils.js - FIXED DEDUPLICATION
import DEBUG_CONFIG from "../config/debug";

/**
 * Deduplicate leaderboard entries: one best entry per user per period.
 * FIX: Preserves more entries by using proper comparison logic
 * @param {Array} entries - Array of test_attempts documents for a period/group.
 * @param {Boolean} sortByScore - Whether to sort descending by score (default: true)
 * @returns {Array} deduplicated and sorted leaderboard with full entry data
 */
export function getCleanLeaderboard(entries = [], sortByScore = true) {
  if (!entries?.length) return [];

  const DEBUG_MODE = DEBUG_CONFIG.isEnabled("DEDUPLICATION");

  // Map to store best entry per user (not just score)
  const bestEntries = new Map();

  if (DEBUG_MODE) {
    console.log(`🧹 Starting deduplication with ${entries.length} entries`);
    console.log(`Sample input entries:`, entries.slice(0, 3).map(e => ({
      userId: e.userId,
      score: e.combinedScore || e.score,
      timeTaken: e.timeTaken,
      displayName: e.displayName
    })));
  }

  entries.forEach((entry, index) => {
    const uid = entry.userId;
    if (!uid) {
      if (DEBUG_MODE) {
        console.warn(`⚠️ Entry ${index} has no userId, skipping:`, entry);
      }
      return;
    }

    // Get the numeric score - check multiple possible fields
    const score = Number(entry.combinedScore ?? entry.score ?? 0);
    const timeTaken = entry.timeTaken ?? Infinity;
    const finishedAt = entry.finishedAt?.toMillis?.() ?? entry.finishedAt?.getTime?.() ?? 0;

    // FIX 1: Create current entry object with normalized fields
    const currentEntry = {
      ...entry,
      combinedScore: score,
      timeTaken: timeTaken,
      finishedAtMs: finishedAt
    };

    if (!bestEntries.has(uid)) {
      // First entry for this user
      bestEntries.set(uid, currentEntry);
      if (DEBUG_MODE) {
        console.log(`✅ New user ${uid}: score=${score}, time=${timeTaken}`);
      }
      return;
    }

    const existing = bestEntries.get(uid);
    const existingScore = Number(existing.combinedScore ?? existing.score ?? 0);
    const existingTime = existing.timeTaken ?? Infinity;
    const existingFinished = existing.finishedAtMs ?? 0;

    // FIX 2: More lenient comparison logic
    let shouldReplace = false;

    if (score > existingScore) {
      shouldReplace = true; // Higher score wins
      if (DEBUG_MODE) {
        console.log(`🔄 User ${uid}: better score ${score} > ${existingScore}`);
      }
    } else if (Math.abs(score - existingScore) < 0.001) { // FIX: Handle floating point comparison
      if (timeTaken < existingTime) {
        shouldReplace = true; // Same score, faster time wins
        if (DEBUG_MODE) {
          console.log(`🔄 User ${uid}: same score, faster time ${timeTaken} < ${existingTime}`);
        }
      } else if (Math.abs(timeTaken - existingTime) < 1 && finishedAt > existingFinished) {
        shouldReplace = true; // Same score and time, more recent wins
        if (DEBUG_MODE) {
          console.log(`🔄 User ${uid}: same score/time, more recent`);
        }
      }
    }

    if (shouldReplace) {
      bestEntries.set(uid, currentEntry);
    } else if (DEBUG_MODE) {
      console.log(`❌ User ${uid}: keeping existing (${existingScore}, ${existingTime}) over (${score}, ${timeTaken})`);
    }
  });

  const deduped = Array.from(bestEntries.values());

  if (DEBUG_MODE) {
    console.log(`🎯 Deduplication results: ${entries.length} → ${deduped.length}`);
    console.log(`Top 3 deduplicated entries:`, deduped.slice(0, 3).map(e => ({
      userId: e.userId,
      score: e.combinedScore,
      timeTaken: e.timeTaken,
      displayName: e.displayName
    })));
    
    // Additional debugging: show which users were processed
    const uniqueUsers = [...new Set(entries.map(e => e.userId))].filter(Boolean);
    const processedUsers = [...bestEntries.keys()];
    console.log(`Unique users in input: ${uniqueUsers.length}, processed: ${processedUsers.length}`);
    
    if (uniqueUsers.length !== processedUsers.length) {
      const missing = uniqueUsers.filter(u => !processedUsers.includes(u));
      console.warn(`⚠️ Missing users after deduplication:`, missing);
    }
  }

  if (!sortByScore) return deduped;

  // FIX 3: Improved sorting logic
  return deduped.sort((a, b) => {
    const scoreA = Number(a.combinedScore ?? a.score ?? 0);
    const scoreB = Number(b.combinedScore ?? b.score ?? 0);
    
    // Primary: Higher score wins
    if (Math.abs(scoreB - scoreA) > 0.001) return scoreB - scoreA;
    
    // Secondary: Lower time wins (faster)
    const timeA = a.timeTaken ?? Infinity;
    const timeB = b.timeTaken ?? Infinity;
    if (Math.abs(timeA - timeB) > 0.5) return timeA - timeB;
    
    // Tertiary: More recent wins
    const finishedA = a.finishedAtMs ?? 0;
    const finishedB = b.finishedAtMs ?? 0;
    return finishedB - finishedA;
  });
}

/**
 * FIX 4: More lenient validation - don't filter out too many entries
 * @param {Object} entry - Test attempt entry
 * @returns {Boolean} true if entry is valid
 */
export function isValidLeaderboardEntry(entry) {
  if (!entry || !entry.userId) {
    return false;
  }
  
  // Check if we have a valid score (allow 0)
  const score = entry.combinedScore ?? entry.score;
  if (typeof score !== 'number' || isNaN(score)) {
    return false;
  }
  
  // FIX: More lenient timestamp checking
  if (!entry.finishedAt && !entry.createdAt && !entry.timestamp) {
    return false;
  }
  
  return true;
}

/**
 * Add ranks to sorted leaderboard entries, handling ties correctly
 * FIX 5: Better tie handling and rank assignment
 * @param {Array} sortedEntries - Already sorted leaderboard entries
 * @returns {Array} entries with rank property added
 */
export function addRanksToEntries(sortedEntries) {
  if (!sortedEntries?.length) return sortedEntries;

  let currentRank = 1;
  
  return sortedEntries.map((entry, index) => {
    if (index > 0) {
      const prev = sortedEntries[index - 1];
      const currentScore = Number(entry.combinedScore ?? entry.score ?? 0);
      const prevScore = Number(prev.combinedScore ?? prev.score ?? 0);
      const currentTime = entry.timeTaken ?? Infinity;
      const prevTime = prev.timeTaken ?? Infinity;
      
      // FIX: Use epsilon comparison for floating point scores
      const scoreDiff = Math.abs(currentScore - prevScore);
      const timeDiff = Math.abs(currentTime - prevTime);
      
      // Update rank only if score or time is meaningfully different
      if (scoreDiff > 0.001 || timeDiff > 0.5) {
        currentRank = index + 1;
      }
    }
    
    return { ...entry, rank: currentRank };
  });
}

/**
 * FIX 6: Additional utility for debugging deduplication issues
 * @param {Array} entries - Raw entries before deduplication
 * @returns {Object} Analysis of potential deduplication issues
 */
export function analyzeDeduplicationIssues(entries = []) {
  const analysis = {
    totalEntries: entries.length,
    usersWithMultipleEntries: 0,
    entriesWithoutUserId: 0,
    entriesWithoutScore: 0,
    entriesWithoutTimestamp: 0,
    averageEntriesPerUser: 0,
    duplicateDetails: {}
  };

  const userCounts = {};
  
  entries.forEach((entry, index) => {
    // Count entries without userId
    if (!entry.userId) {
      analysis.entriesWithoutUserId++;
      return;
    }

    // Count entries without score
    const score = entry.combinedScore ?? entry.score;
    if (typeof score !== 'number' || isNaN(score)) {
      analysis.entriesWithoutScore++;
    }

    // Count entries without timestamp
    if (!entry.finishedAt && !entry.createdAt && !entry.timestamp) {
      analysis.entriesWithoutTimestamp++;
    }

    // Track user entry counts
    if (!userCounts[entry.userId]) {
      userCounts[entry.userId] = [];
    }
    userCounts[entry.userId].push({
      index,
      score: score,
      timeTaken: entry.timeTaken,
      displayName: entry.displayName
    });
  });

  // Analyze users with multiple entries
  Object.entries(userCounts).forEach(([userId, userEntries]) => {
    if (userEntries.length > 1) {
      analysis.usersWithMultipleEntries++;
      analysis.duplicateDetails[userId] = {
        count: userEntries.length,
        entries: userEntries
      };
    }
  });

  analysis.averageEntriesPerUser = entries.length / Object.keys(userCounts).length || 0;

  return analysis;
}