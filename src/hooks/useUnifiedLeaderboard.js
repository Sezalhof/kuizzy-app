// src/hooks/useUnifiedLeaderboard.js - PRODUCTION READY VERSION
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getCleanLeaderboard, isValidLeaderboardEntry, addRanksToEntries } from "../utils/leaderboardUtils";
import { extractValidGroups, getBestGroupId } from "../utils/groupUtils";

const PAGE_SIZE = 20;
const DEBUG_MODE = process.env.NODE_ENV === 'development' && false; // Set to true only for debugging

const SCOPE_FIELD_MAP = {
  global: null,
  school: "schoolId",
  union: "unionId",
  upazila: "upazilaId",
  district: "districtId",
  division: "divisionId",
  group: "groupId",
};

function sanitizeId(id) {
  if (!id) return "";
  return String(id).trim();
}

export function useUnifiedLeaderboard(userId, userProfile, periodInput, mode = "live") {
  const normalizedPeriod = useMemo(() => {
    if (!periodInput) return "";
    return typeof periodInput === "string"
      ? periodInput
      : periodInput?.label || periodInput?.value || "";
  }, [periodInput]);

  const [leaderboards, setLeaderboards] = useState({});
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});
  const [availableScopes, setAvailableScopes] = useState([]);
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to prevent duplicate listeners and track initialization
  const groupListenersRef = useRef(new Map());
  const initializationRef = useRef(false);
  const lastInitParamsRef = useRef("");

  // Enhanced readiness check
  const isReady = useCallback(() => {
    const hasUserId = !!(userId && userId !== "");
    const hasPeriod = !!(normalizedPeriod && normalizedPeriod !== "");
    const hasProfile = !!(userProfile && typeof userProfile === 'object');
    
    return hasUserId && hasPeriod && hasProfile;
  }, [userId, normalizedPeriod, userProfile]);

  // Extract and memoize valid user groups using utility function from groupUtils.js
  const userGroups = useMemo(() => extractValidGroups(userProfile), [userProfile]);

  const fetchScope = useCallback(
    async (scopeKey, append = false, scopeId = null, limit = PAGE_SIZE) => {
      if (!userId || !normalizedPeriod || !userProfile) {
        if (DEBUG_MODE) {
          console.log("Cannot fetch scope - missing required data:", { 
            scopeKey, 
            hasUserId: !!userId, 
            hasPeriod: !!normalizedPeriod, 
            hasProfile: !!userProfile 
          });
        }
        return;
      }

      const field = SCOPE_FIELD_MAP[scopeKey];
      const rawIdValue = scopeId ?? (field ? userProfile?.[field] : null);

      // For non-global scopes, check if user has the required field
      if (field && !rawIdValue && scopeKey !== "global") {
        const errorMsg = `User not assigned to any ${scopeKey}`;
        setErrors((prev) => ({ ...prev, [scopeKey]: errorMsg }));
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
        
        // Set empty state for unavailable scopes
        if (scopeKey === "group") {
          setLeaderboards((prev) => ({
            ...prev,
            group: { ...prev.group }
          }));
        } else {
          setLeaderboards((prev) => ({
            ...prev,
            [scopeKey]: { entries: [], hasMore: false, isEmpty: true }
          }));
        }
        return;
      }

      try {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: true }));
        setErrors((prev) => ({ ...prev, [scopeKey]: null }));

        const scoresCollection = collection(db, "test_attempts");
        let queryConstraints = [where("twoMonthPeriod", "==", normalizedPeriod)];

        // Add regional filter for non-global scopes
        if (scopeKey !== "global" && field && rawIdValue) {
          queryConstraints.push(where(field, "==", rawIdValue));
        }

        const q = query(scoresCollection, ...queryConstraints);
        const snapshot = await getDocs(q);

        let entries = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          entries.push({ ...data, id: doc.id });
        });

        // Filter valid entries
        const validEntries = entries.filter(isValidLeaderboardEntry);

        // Handle empty results gracefully
        if (validEntries.length === 0) {
          setErrors((prev) => ({ ...prev, [scopeKey]: null }));
          
          if (scopeKey === "group") {
            const groupKey = sanitizeId(rawIdValue);
            setLeaderboards((prev) => ({
              ...prev,
              group: {
                ...prev.group,
                [groupKey]: { entries: [], hasMore: false, isEmpty: true }
              }
            }));
          } else {
            setLeaderboards((prev) => ({
              ...prev,
              [scopeKey]: { entries: [], hasMore: false, isEmpty: true }
            }));
          }
          return;
        }

        // Clean and deduplicate entries - keep best score per user
        const cleanedEntries = getCleanLeaderboard(validEntries, true);
        const rankedEntries = addRanksToEntries(cleanedEntries);

        // Update leaderboards state
        if (scopeKey === "group") {
          const groupKey = sanitizeId(rawIdValue);
          setLeaderboards((prev) => ({
            ...prev,
            group: {
              ...prev.group,
              [groupKey]: { entries: rankedEntries, hasMore: false, isEmpty: false },
            },
          }));
        } else {
          setLeaderboards((prev) => ({
            ...prev,
            [scopeKey]: { entries: rankedEntries, hasMore: false, isEmpty: false },
          }));
        }

      } catch (error) {
        console.error(`Error fetching ${scopeKey} leaderboard:`, error);
        setErrors((prev) => ({ ...prev, [scopeKey]: error.message }));
      } finally {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
      }
    },
    [userId, userProfile, normalizedPeriod]
  );

  // Initialize leaderboards - prevent duplicate initialization
  useEffect(() => {
    const ready = isReady();
    
    if (!ready) {
      if (DEBUG_MODE) {
        console.log("Waiting for required data before initializing leaderboard...");
      }
      setInitialized(false);
      initializationRef.current = false;
      return;
    }

    // Create a stable key for current parameters
    const currentParams = `${userId}-${normalizedPeriod}-${JSON.stringify(userGroups.sort())}`;
    
    // Prevent duplicate initialization with same parameters
    if (initializationRef.current && lastInitParamsRef.current === currentParams) {
      if (DEBUG_MODE) {
        console.log("Leaderboard already initialized with same parameters, skipping...");
      }
      return;
    }

    if (DEBUG_MODE) {
      console.log("Initializing leaderboard with data:", {
        userId,
        period: normalizedPeriod,
        validGroupsCount: userGroups.length,
        paramsChanged: lastInitParamsRef.current !== currentParams
      });
    }

    initializationRef.current = true;
    lastInitParamsRef.current = currentParams;

    // Determine available scopes based on user profile
    const scopes = Object.keys(SCOPE_FIELD_MAP).filter((k) => {
      if (k === "global") return true;
      if (k === "group") return userGroups.length > 0;
      
      const field = SCOPE_FIELD_MAP[k];
      return field && userProfile[field];
    });

    setAvailableScopes(scopes);

    // Clear previous results
    setLeaderboards({});
    setErrors({});
    setLoadingScopes({});

    // Fetch all scopes except group
    const nonGroupScopes = scopes.filter(scope => scope !== 'group');
    if (DEBUG_MODE && nonGroupScopes.length > 0) {
      console.log("Fetching non-group scopes:", nonGroupScopes);
    }
    
    nonGroupScopes.forEach((scope) => {
      fetchScope(scope);
    });

    // Fetch all valid user groups
    if (userGroups.length > 0) {
      if (DEBUG_MODE) {
        console.log("Fetching group scopes:", userGroups);
      }
      userGroups.forEach((groupId) => {
        fetchScope('group', false, groupId);
      });
    }

    setInitialized(true);
    
    if (DEBUG_MODE) {
      console.log("Leaderboard initialization complete");
    }

  }, [userId, normalizedPeriod, userGroups, userProfile, fetchScope, isReady]);

  const listenGroup = useCallback(
    (groupId) => {
      if (!isReady() || !groupId) {
        if (DEBUG_MODE) {
          console.log("Cannot listen to group - not ready or missing groupId");
        }
        return;
      }

      const groupKey = sanitizeId(groupId);

      // Prevent duplicate listeners using Map
      if (groupListenersRef.current.has(groupKey)) {
        if (DEBUG_MODE) {
          console.log(`Already listening to group: ${groupId}, skipping duplicate`);
        }
        return; // Already listening
      }

      if (DEBUG_MODE) {
        console.log(`Setting up live listener for group: ${groupId}`);
      }

      try {
        const groupQuery = query(
          collection(db, "test_attempts"),
          where("twoMonthPeriod", "==", normalizedPeriod),
          where("groupId", "==", groupId)
        );

        const unsubscribe = onSnapshot(
          groupQuery,
          (snapshot) => {
            if (DEBUG_MODE && snapshot.docChanges().length > 0) {
              console.log(`Live update for group ${groupId}: ${snapshot.size} docs, ${snapshot.docChanges().length} changes`);
            }

            let entries = [];
            snapshot.forEach((doc) => {
              entries.push({ ...doc.data(), id: doc.id });
            });

            // Filter and process entries
            const validEntries = entries.filter(isValidLeaderboardEntry);
            const cleanedEntries = getCleanLeaderboard(validEntries, true);
            const rankedEntries = addRanksToEntries(cleanedEntries);

            if (DEBUG_MODE) {
              console.log(`Live processed entries for group ${groupId}: ${validEntries.length} → ${cleanedEntries.length} → ${rankedEntries.length}`);
            }

            setLeaderboards((prev) => ({
              ...prev,
              group: {
                ...prev.group,
                [groupKey]: { 
                  entries: rankedEntries, 
                  hasMore: false, 
                  isEmpty: rankedEntries.length === 0 
                },
              },
            }));
          },
          (error) => {
            console.error(`Error in live listener for group ${groupId}:`, error);
            setErrors((prev) => ({
              ...prev,
              group: `Live update error: ${error.message}`
            }));
          }
        );

        groupListenersRef.current.set(groupKey, unsubscribe);
        return () => {
          unsubscribe();
          groupListenersRef.current.delete(groupKey);
        };
      } catch (error) {
        console.error(`Error setting up group listener:`, error);
      }
    },
    [isReady, normalizedPeriod]
  );

  // Setup live listeners after initialization - Fix ESLint warning
  useEffect(() => {
    if (!initialized || !isReady() || mode !== "live" || userGroups.length === 0) {
      return;
    }

    // Capture the current listeners ref at effect setup time
    const currentListeners = groupListenersRef.current;

    if (DEBUG_MODE) {
      console.log("Setting up live listeners for groups:", userGroups);
    }

    // Setup listeners for valid groups only
    userGroups.forEach(groupId => {
      listenGroup(groupId);
    });

    // Cleanup function - use the captured reference
    return () => {
      if (DEBUG_MODE) {
        console.log("Cleaning up all group listeners");
      }
      currentListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      currentListeners.clear();
    };
  }, [initialized, isReady, mode, userGroups, listenGroup]);

  const stopListeningGroup = useCallback((groupId) => {
    const groupKey = sanitizeId(groupId);
    const unsubscribe = groupListenersRef.current.get(groupKey);
    if (unsubscribe) {
      if (DEBUG_MODE) {
        console.log(`Stopping listener for group: ${groupId}`);
      }
      unsubscribe();
      groupListenersRef.current.delete(groupKey);
    }
  }, []);

  const loadLeaderboardPage = useCallback(
    (scopeKey, append = false, scopeId = null, limit = PAGE_SIZE) => {
      if (!isReady()) {
        if (DEBUG_MODE) {
          console.log("Cannot load leaderboard page - not ready");
        }
        return;
      }
      fetchScope(scopeKey, append, scopeId, limit);
    },
    [fetchScope, isReady]
  );

  const readyState = isReady();

  // Get the best group ID for UI components
  const bestGroupId = useMemo(() => {
    return getBestGroupId(userGroups);
  }, [userGroups]);

  return {
    leaderboards,
    loadingScopes,
    errors,
    availableScopes,
    listenGroup,
    stopListeningGroup,
    loadLeaderboardPage,
    isReady: readyState,
    initialized,
    userGroups, // Now contains only valid groups
    bestGroupId, // Best group ID to use in UI
    // Debug info only in development
    debug: DEBUG_MODE ? {
      userId: !!userId,
      period: normalizedPeriod,
      profileLoaded: !!userProfile,
      initializationComplete: initialized,
      lastInitParams: lastInitParamsRef.current,
      validGroupsCount: userGroups.length
    } : undefined
  };
}