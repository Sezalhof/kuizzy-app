// src/utils/groupUtils.js - UPDATED: Defensive fallback since upstream sanitization handles most cases

export const INVALID_GROUP_PATTERNS = [
  'nnn', 'null', 'undefined', 'none', 'n/a', '',
  'test', 'placeholder', 'temp', 'dummy', 'sample', 'default'
];

// Enhanced UUID pattern for modern group IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a group ID is legitimate for Firestore operations
 * Now primarily defensive since useUserProfile.js handles main sanitization
 * @param {string} groupId - The group ID to validate
 * @returns {boolean} - True if the group ID is valid
 */
export function isValidGroupId(groupId) {
  if (!groupId || typeof groupId !== 'string') {
    return false;
  }
  
  const sanitized = groupId.trim();
  
  // Empty or too short
  if (sanitized.length < 3) {
    return false;
  }
  
  // Check against known invalid patterns (defensive)
  const lowerSanitized = sanitized.toLowerCase();
  if (INVALID_GROUP_PATTERNS.includes(lowerSanitized)) {
    return false;
  }
  
  // Check if it's all the same character (like "nnn", "aaa", etc.)
  if (sanitized.split('').every(char => char === sanitized[0])) {
    return false;
  }
  
  // Reject obvious school/class derivations (defensive check)
  if (lowerSanitized.includes('_class') || 
      lowerSanitized.includes(' class') ||
      lowerSanitized.includes('school_') ||
      lowerSanitized.includes('_grade')) {
    return false;
  }
  
  // Accept UUID format (most common valid case)
  if (UUID_PATTERN.test(sanitized)) {
    return true;
  }
  
  // For non-UUID formats, be more restrictive (defensive)
  if (sanitized.includes(' ') || sanitized.includes('_')) {
    return false;
  }
  
  // Must be alphanumeric with minimum complexity
  if (!/^[a-zA-Z0-9-]+$/.test(sanitized) || sanitized.length < 8) {
    return false;
  }
  
  return true;
}

/**
 * Defensive filter for group IDs (should rarely be needed now)
 * @param {Array<string>} groupIds - Array of group IDs to filter
 * @param {boolean} logFiltered - Whether to log filtered items (for debugging)
 * @returns {Array<string>} - Array of valid group IDs
 */
export function filterValidGroups(groupIds, logFiltered = false) {
  if (!Array.isArray(groupIds)) {
    return [];
  }
  
  const validGroups = [];
  const invalidGroups = [];
  
  groupIds.forEach(groupId => {
    if (isValidGroupId(groupId)) {
      validGroups.push(groupId);
    } else {
      invalidGroups.push(groupId);
    }
  });
  
  // Remove duplicates
  const uniqueValidGroups = [...new Set(validGroups)];
  
  // Log filtered items only if any were found (should be rare now)
  if (logFiltered && invalidGroups.length > 0) {
    console.warn(`🛡️ Defensive filter caught ${invalidGroups.length} invalid group IDs:`, invalidGroups);
    console.warn('↳ This suggests upstream sanitization may need attention');
  }
  
  return uniqueValidGroups;
}

/**
 * DEPRECATED: Use profile.groups from useUserProfile.js instead
 * This function now mainly serves as a defensive fallback
 * @param {Object} userProfile - User profile object
 * @returns {Array<string>} - Array of valid group IDs
 */
export function extractValidGroups(userProfile) {
  if (!userProfile || typeof userProfile !== 'object') {
    return [];
  }
  
  // Primary: Use sanitized groups from useUserProfile.js
  if (Array.isArray(userProfile.groups) && userProfile.groups.length > 0) {
    // Profile groups should already be sanitized by useUserProfile.js
    return userProfile.groups;
  }
  
  // Defensive fallback for direct access patterns (should be rare)
  const { groupId, group } = userProfile;
  const fallbackGroups = [groupId, group].filter(Boolean);
  
  if (fallbackGroups.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('🛡️ Using defensive fallback group extraction - profile.groups from useUserProfile should be used instead');
    }
    return filterValidGroups(fallbackGroups, process.env.NODE_ENV === 'development');
  }
  
  return [];
}

/**
 * Gets the best group ID to use from available options
 * @param {Array<string>} validGroups - Array of valid group IDs
 * @param {string|null} preferredGroupId - Optional preferred group ID
 * @returns {string|null} - Best group ID to use, or null if none available
 */
export function getBestGroupId(validGroups, preferredGroupId = null) {
  if (!Array.isArray(validGroups) || validGroups.length === 0) {
    return null;
  }
  
  // If preferred group is provided and valid, use it
  if (preferredGroupId && validGroups.includes(preferredGroupId)) {
    return preferredGroupId;
  }
  
  // Otherwise, return the first valid group
  return validGroups[0];
}

/**
 * Assigns a user to a group if not already present
 * @param {Object} userProfile - User profile object to modify
 * @param {string} groupId - Group ID to assign
 * @returns {boolean} - True if added, false if already present or invalid
 */
export function assignUserToGroup(userProfile, groupId) {
  if (!userProfile || !groupId || !isValidGroupId(groupId)) {
    return false;
  }
  
  // Ensure groups array exists
  if (!userProfile.groups) {
    userProfile.groups = [];
  }
  
  // Check if already in group
  if (userProfile.groups.includes(groupId)) {
    return false; // already in group
  }
  
  // Add to group
  userProfile.groups.push(groupId);
  return true; // successfully assigned
}

/**
 * Removes a user from a group
 * @param {Object} userProfile - User profile object to modify
 * @param {string} groupId - Group ID to remove
 * @returns {boolean} - True if removed, false if not found
 */
export function removeUserFromGroup(userProfile, groupId) {
  if (!userProfile || !groupId || !userProfile.groups) {
    return false;
  }
  
  const index = userProfile.groups.indexOf(groupId);
  if (index === -1) {
    return false; // not in group
  }
  
  userProfile.groups.splice(index, 1);
  return true; // successfully removed
}

/**
 * Validates if a user profile has any valid groups
 * @param {Object} userProfile - User profile object
 * @returns {boolean} - True if user has at least one valid group
 */
export function hasValidGroups(userProfile) {
  return !!(userProfile?.groups?.length > 0);
}

/**
 * Sanitizes a group ID for use as a React key or object property
 * @param {string} groupId - Group ID to sanitize
 * @returns {string} - Sanitized group ID safe for use as key
 */
export function sanitizeGroupId(groupId) {
  if (!groupId || typeof groupId !== 'string') {
    return '';
  }
  
  return groupId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Debug function to get group validation info (development only)
 * @param {Object} userProfile - User profile object
 * @returns {Object|null} - Debug information about groups
 */
export function getGroupDebugInfo(userProfile) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  if (!userProfile) {
    return { error: 'No user profile provided' };
  }
  
  const sanitizedGroups = userProfile.groups || [];
  const bestGroupId = getBestGroupId(sanitizedGroups);
  
  return {
    profile: { 
      groupId: userProfile.groupId, 
      group: userProfile.group, 
      groups: userProfile.groups 
    },
    sanitizedGroups,
    bestGroupId,
    hasValidGroups: sanitizedGroups.length > 0,
    totalValid: sanitizedGroups.length,
    dataSource: Array.isArray(userProfile.groups) ? 'profile.groups (✅ sanitized)' : 'fallback (⚠️ needs attention)'
  };
}