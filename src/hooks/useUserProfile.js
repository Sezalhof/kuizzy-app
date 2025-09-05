// src/hooks/useUserProfile.js - FIXED: Sanitize groups at source
import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const DEBUG = false; // Set to true only for debugging

// UUID validation pattern for valid groups
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Known invalid patterns to filter out
const INVALID_PATTERNS = [
  'nnn', 'null', 'undefined', 'none', 'n/a', '', 'test', 
  'placeholder', 'temp', 'dummy', 'sample', 'default'
];

/**
 * Validates if a group ID is legitimate for Firestore operations
 */
function isValidGroupId(groupId) {
  if (!groupId || typeof groupId !== 'string') {
    return false;
  }
  
  const sanitized = groupId.trim();
  
  // Empty or too short
  if (sanitized.length < 3) {
    return false;
  }
  
  // Check against known invalid patterns
  const lowerSanitized = sanitized.toLowerCase();
  if (INVALID_PATTERNS.includes(lowerSanitized)) {
    return false;
  }
  
  // Check if it's all the same character (like "nnn", "aaa", etc.)
  if (sanitized.split('').every(char => char === sanitized[0])) {
    return false;
  }
  
  // Reject obvious school/class derivations
  if (lowerSanitized.includes('_class') || 
      lowerSanitized.includes(' class') ||
      lowerSanitized.includes('school_') ||
      lowerSanitized.includes('_grade')) {
    return false;
  }
  
  // Accept UUID format (most reliable valid case)
  if (UUID_PATTERN.test(sanitized)) {
    return true;
  }
  
  // For non-UUID formats, be more restrictive
  // Must not contain spaces or obvious invalid patterns
  if (sanitized.includes(' ') || sanitized.includes('_')) {
    return false;
  }
  
  // Must be alphanumeric with some complexity
  if (!/^[a-zA-Z0-9-]+$/.test(sanitized) || sanitized.length < 8) {
    return false;
  }
  
  return true;
}

/**
 * Sanitizes and validates groups from raw profile data
 */
async function sanitizeProfileGroups(rawProfile) {
  if (!rawProfile || typeof rawProfile !== 'object') {
    return [];
  }
  
  // Collect potential group IDs from various profile fields
  const candidates = [
    rawProfile.groupId,
    rawProfile.group,
    ...(Array.isArray(rawProfile.groups) ? rawProfile.groups : [])
  ].filter(Boolean);
  
  if (candidates.length === 0) {
    return [];
  }
  
  // First pass: basic validation
  const validCandidates = candidates
    .map(id => typeof id === 'string' ? id.trim() : null)
    .filter(id => id && isValidGroupId(id));
  
  if (validCandidates.length === 0) {
    if (DEBUG) {
      console.log('🚫 No valid group candidates after basic validation:', candidates);
    }
    return [];
  }
  
  // Second pass: verify existence in Firestore (batch check)
  try {
    const uniqueCandidates = [...new Set(validCandidates)];
    const BATCH_SIZE = 10; // Firestore 'in' query limit
    const verifiedGroups = [];
    
    for (let i = 0; i < uniqueCandidates.length; i += BATCH_SIZE) {
      const batch = uniqueCandidates.slice(i, i + BATCH_SIZE);
      
      try {
        const q = query(collection(db, "groups"), where("__name__", "in", batch));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
          verifiedGroups.push(doc.id);
        });
      } catch (error) {
        if (DEBUG) {
          console.warn('⚠️ Error verifying group batch:', batch, error);
        }
        // On verification error, fall back to basic validation for this batch
        verifiedGroups.push(...batch);
      }
    }
    
    if (DEBUG && verifiedGroups.length !== validCandidates.length) {
      const unverified = validCandidates.filter(id => !verifiedGroups.includes(id));
      console.log('🔍 Groups filtered out during Firestore verification:', unverified);
    }
    
    return verifiedGroups;
    
  } catch (error) {
    console.warn('⚠️ Group verification failed, using basic validation only:', error);
    return [...new Set(validCandidates)]; // Fallback to basic validation
  }
}

export function useUserProfile(uid) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        if (DEBUG) {
          console.log('📥 Fetching profile for UID:', uid);
        }

        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("User profile not found");
          setProfile(null);
          return;
        }

        const rawProfile = docSnap.data();
        
        if (DEBUG) {
          console.log('📥 Raw profile data:', rawProfile);
          console.log('📥 Raw groups before sanitization:', {
            groupId: rawProfile.groupId,
            group: rawProfile.group,
            groups: rawProfile.groups
          });
        }

        // ✅ SANITIZE GROUPS AT SOURCE
        const sanitizedGroups = await sanitizeProfileGroups(rawProfile);
        
        // Create sanitized profile with clean groups array
        const sanitizedProfile = {
          ...rawProfile,
          groups: sanitizedGroups, // Always array of valid group IDs only
          // Keep original fields for backward compatibility but don't use them downstream
          _originalGroupId: rawProfile.groupId, // For debugging only
          _originalGroup: rawProfile.group, // For debugging only
        };

        if (DEBUG) {
          console.log('✅ Groups after sanitization:', sanitizedGroups);
          console.log('✅ Sanitized profile groups field:', sanitizedProfile.groups);
          console.log('✅ Profile ready for downstream use');
        }

        setProfile(sanitizedProfile);

      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  // Return sanitized profile with guaranteed clean groups array
  return { 
    profile, 
    loading, 
    error,
    // Helper getters for common access patterns
    validGroups: profile?.groups || [], // Always returns array of valid group IDs
    primaryGroupId: profile?.groups?.[0] || null, // First valid group ID or null
    hasGroups: (profile?.groups?.length || 0) > 0,
  };
}