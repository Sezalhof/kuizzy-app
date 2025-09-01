// src/hooks/useUnifiedLeaderboard.js - COMPREHENSIVE FIX
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit as firestoreLimit,
} from "firebase/firestore";

const DEBUG_MODE = true;
const PAGE_SIZE = 20;

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
  // 🔧 FIX 1: Better parameter validation
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
  const groupListenersRef = useRef({});

  // 🔧 FIX 2: Early validation to prevent null userId calls
  const isReady = useCallback(() => {
    const ready = !!(userId && normalizedPeriod && userProfile);
    if (!ready && DEBUG_MODE) {
      console.log("🚫 Leaderboard not ready:", {
        userId: !!userId,
        normalizedPeriod: !!normalizedPeriod,
        userProfile: !!userProfile,
        actualValues: { userId, normalizedPeriod, userProfile: userProfile?.displayName }
      });
    }
    return ready;
  }, [userId, normalizedPeriod, userProfile]);

  // Enhanced debug helper
  const debugDatabase = useCallback(async () => {
    if (!DEBUG_MODE || !isReady()) return;

    console.log("=== ENHANCED DATABASE DEBUG ===");
    console.log("Period:", normalizedPeriod);
    console.log("User Profile:", userProfile);
    console.log("User ID:", userId);

    try {
      const allScoresQuery = query(collection(db, "test_attempts"));
      const allScoresSnapshot = await getDocs(allScoresQuery);

      console.log(
        "Total documents in test_attempts collection:",
        allScoresSnapshot.size
      );

      const allDocs = [];
      allScoresSnapshot.forEach((doc) => {
        const data = doc.data();
        allDocs.push({ id: doc.id, ...data });
      });

      // 🔧 FIX 3: Enhanced group analysis for multiple groups
      const userGroups = [...new Set([
        userProfile?.groupId,
        userProfile?.group,
        ...(userProfile?.groups || [])
      ].filter(Boolean))];
      
      console.log("👥 User belongs to groups:", userGroups);

      const allGroups = [...new Set(allDocs.map((doc) => doc.groupId).filter(Boolean))];
      console.log("📊 All available groups in database:", allGroups);

      // Check which user groups have data
      userGroups.forEach(groupId => {
        const groupDocs = allDocs.filter(doc => doc.groupId === groupId);
        console.log(`📈 Documents for user's group ${groupId}:`, groupDocs.length);
      });

      const periodDocs = allDocs.filter(
        (doc) => doc.twoMonthPeriod === normalizedPeriod
      );
      console.log(`📅 Documents with period ${normalizedPeriod}:`, periodDocs.length);

      // Regional analysis
      const regionalAnalysis = {
        schoolId: allDocs.filter(doc => doc.schoolId === userProfile?.schoolId).length,
        unionId: allDocs.filter(doc => doc.unionId === userProfile?.unionId).length,
        upazilaId: allDocs.filter(doc => doc.upazilaId === userProfile?.upazilaId).length,
        districtId: allDocs.filter(doc => doc.districtId === userProfile?.districtId).length,
        divisionId: allDocs.filter(doc => doc.divisionId === userProfile?.divisionId).length,
      };

      console.log("🗺️ Regional scope analysis:", regionalAnalysis);

    } catch (error) {
      console.error("Database debug error:", error);
    }
  }, [normalizedPeriod, userProfile, userId, isReady]);

  useEffect(() => {
    if (DEBUG_MODE && isReady()) {
      debugDatabase();
    }
  }, [debugDatabase]);

  // 🔧 FIX 4: Improved deduplication strategy
  const deduplicateEntries = useCallback((entries, strategy = 'latest') => {
    if (!entries || entries.length === 0) return [];

    const dedupMap = new Map();
    
    entries.forEach((entry, index) => {
      const existing = dedupMap.get(entry.userId);
      
      if (!existing) {
        console.log(`➕ Adding first entry for user ${entry.userId}:`, {
          combinedScore: entry.combinedScore,
          timeTaken: entry.timeTaken,
          finishedAt: entry.finishedAt?.toDate?.()
        });
        dedupMap.set(entry.userId, entry);
        return;
      }

      let shouldReplace = false;
      
      switch (strategy) {
        case 'latest':
          // Keep the most recent attempt
          shouldReplace = (entry.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0);
          break;
        case 'highest':
          // Keep the highest scoring attempt
          shouldReplace = (entry.combinedScore ?? 0) > (existing.combinedScore ?? 0);
          break;
        case 'best':
          // Keep highest score, then latest if tied
          const scoreDiff = (entry.combinedScore ?? 0) - (existing.combinedScore ?? 0);
          if (scoreDiff > 0) {
            shouldReplace = true;
          } else if (scoreDiff === 0) {
            shouldReplace = (entry.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0);
          }
          break;
        default:
          shouldReplace = (entry.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0);
      }

      if (shouldReplace) {
        console.log(`🔄 Replacing entry for user ${entry.userId} (${strategy} strategy):`, {
          old: { score: existing.combinedScore, time: existing.finishedAt?.toDate?.() },
          new: { score: entry.combinedScore, time: entry.finishedAt?.toDate?.() }
        });
        dedupMap.set(entry.userId, entry);
      } else {
        console.log(`⏭️ Keeping existing entry for user ${entry.userId}`);
      }
    });
    
    return Array.from(dedupMap.values());
  }, []);

  const fetchScope = useCallback(
    async (scopeKey, append = false, scopeId = null, limit = PAGE_SIZE) => {
      // 🔧 FIX 5: Strict validation before any queries
      if (!isReady()) {
        console.log("❌ Cannot fetch scope - not ready:", { scopeKey, userId, normalizedPeriod, userProfile: !!userProfile });
        return;
      }

      const field = SCOPE_FIELD_MAP[scopeKey];
      const rawIdValue = scopeId ?? (field ? userProfile?.[field] : null);

      console.log(`=== FETCH SCOPE: ${scopeKey} ===`);
      console.log(`Field: ${field}, Raw ID: ${rawIdValue}`);
      console.log(`Period: ${normalizedPeriod}`);
      console.log(`User Profile:`, userProfile);

      // For non-global scopes, check if user has the required field
      if (field && !rawIdValue && scopeKey !== "global") {
        console.log(`❌ Scope ${scopeKey} not available - missing field value`);
        console.log(`💡 User profile missing field: ${field}`);
        setErrors((prev) => ({ 
          ...prev, 
          [scopeKey]: `Missing ${field} in user profile` 
        }));
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
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
          console.log(`🔍 Adding regional filter: ${field} == ${rawIdValue}`);
        }

        console.log("Query constraints:", queryConstraints);

        const q = query(scoresCollection, ...queryConstraints);
        const snapshot = await getDocs(q);
        
        console.log(`📊 Query result for ${scopeKey}: ${snapshot.size} documents`);

        let entries = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          entries.push({ ...data, id: doc.id });
        });

        console.log(`🔧 Raw entries for ${scopeKey}:`, entries.length);

        // 🔧 FIX 6: Better filtering for completed test attempts
        const validEntries = entries.filter(entry => {
          const isValid = entry.combinedScore !== undefined && 
                          entry.finishedAt && 
                          entry.userId &&
                          typeof entry.combinedScore === 'number' &&
                          !isNaN(entry.combinedScore);
          
          if (!isValid && DEBUG_MODE) {
            console.log(`❌ Filtering out invalid entry:`, {
              id: entry.id,
              userId: entry.userId,
              combinedScore: entry.combinedScore,
              finishedAt: !!entry.finishedAt,
              hasValidScore: typeof entry.combinedScore === 'number' && !isNaN(entry.combinedScore)
            });
          }
          return isValid;
        });

        console.log(`✅ Valid entries after filtering: ${validEntries.length}/${entries.length}`);

        if (validEntries.length === 0) {
          console.log(`⚠️ No valid completed test attempts found for ${scopeKey} scope`);
          setErrors((prev) => ({ 
            ...prev, 
            [scopeKey]: `No completed test attempts available` 
          }));
        }

        // 🔧 FIX 7: Use improved deduplication
        const deduplicatedEntries = deduplicateEntries(validEntries, 'best'); // or 'latest' or 'highest'

        // Sort final entries
        const sortedEntries = deduplicatedEntries.sort((a, b) => {
          if (b.combinedScore !== a.combinedScore)
            return b.combinedScore - a.combinedScore;
          if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity))
            return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
          return (
            (b.finishedAt?.toMillis?.() ?? 0) -
            (a.finishedAt?.toMillis?.() ?? 0)
          );
        });

        // Add ranks
        sortedEntries.forEach((entry, idx) => {
          entry.rank = idx + 1;
        });

        console.log(`✅ Final entries for ${scopeKey}:`, sortedEntries.length);

        if (scopeKey === "group") {
          const groupKey = sanitizeId(rawIdValue);
          setLeaderboards((prev) => ({
            ...prev,
            group: {
              ...prev.group,
              [groupKey]: { entries: sortedEntries, hasMore: false },
            },
          }));
        } else {
          setLeaderboards((prev) => ({
            ...prev,
            [scopeKey]: { entries: sortedEntries, hasMore: false },
          }));
        }
      } catch (error) {
        console.error(`❌ Error fetching ${scopeKey}:`, error);
        setErrors((prev) => ({ ...prev, [scopeKey]: error.message }));
      } finally {
        setLoadingScopes((prev) => ({ ...prev, [scopeKey]: false }));
      }
    },
    [userId, userProfile, normalizedPeriod, isReady, deduplicateEntries]
  );

  // 🔧 FIX 8: Handle multiple groups properly
  useEffect(() => {
    if (!isReady()) return;

    // Get all user groups
    const userGroups = [...new Set([
      userProfile?.groupId,
      userProfile?.group,
      ...(userProfile?.groups || [])
    ].filter(Boolean))];

    console.log("🔄 Setting up leaderboard for user groups:", userGroups);

    const scopes = Object.keys(SCOPE_FIELD_MAP).filter((k) => {
      if (k === "global") return true; // Global is always available
      if (k === "group") return userGroups.length > 0; // Group available if user has groups
      
      const field = SCOPE_FIELD_MAP[k];
      const hasField = field && userProfile[field];
      console.log(`Checking scope ${k}: field=${field}, value=${userProfile[field]}, available=${hasField}`);
      return hasField;
    });

    console.log("Available scopes based on user profile:", scopes);
    setAvailableScopes(scopes);

    // Clear previous results
    setLeaderboards({});
    setErrors({});

    // Fetch all scopes except group
    scopes.filter(scope => scope !== 'group').forEach((scope) => {
      console.log(`🚀 Fetching scope: ${scope}`);
      fetchScope(scope);
    });

    // 🔧 FIX 9: Fetch all user groups
    userGroups.forEach((groupId) => {
      console.log(`🚀 Fetching group scope: ${groupId}`);
      fetchScope('group', false, groupId);
    });
  }, [userProfile, fetchScope, isReady]);

  // 🔧 FIX 10: Enhanced group listener for multiple groups
  const listenGroup = useCallback(
    (groupId) => {
      if (!isReady() || !groupId) {
        console.log("Cannot listen to group - not ready or missing groupId:", {
          isReady: isReady(),
          userId,
          normalizedPeriod,
          groupId,
        });
        return;
      }

      const groupKey = sanitizeId(groupId);

      if (groupListenersRef.current[groupKey]) {
        console.log(`Already listening to group ${groupId}`);
        return;
      }

      console.log(`🎧 Setting up listener for group: ${groupId}`);

      try {
        const groupQuery = query(
          collection(db, "test_attempts"),
          where("twoMonthPeriod", "==", normalizedPeriod),
          where("groupId", "==", groupId)
        );

        const unsubscribe = onSnapshot(
          groupQuery,
          (snapshot) => {
            console.log(
              `🔄 Live update for group ${groupId}: ${snapshot.size} documents`
            );

            let entries = [];
            snapshot.forEach((doc) => {
              entries.push({ ...doc.data(), id: doc.id });
            });

            // Filter and deduplicate
            const validEntries = entries.filter(entry => 
              entry.combinedScore !== undefined && 
              entry.finishedAt && 
              entry.userId &&
              typeof entry.combinedScore === 'number' &&
              !isNaN(entry.combinedScore)
            );

            const deduplicatedEntries = deduplicateEntries(validEntries, 'best');

            const sortedEntries = deduplicatedEntries.sort((a, b) => {
              if (b.combinedScore !== a.combinedScore)
                return b.combinedScore - a.combinedScore;
              if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity))
                return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
              return (
                (b.finishedAt?.toMillis?.() ?? 0) -
                (a.finishedAt?.toMillis?.() ?? 0)
              );
            });

            sortedEntries.forEach((entry, idx) => {
              entry.rank = idx + 1;
            });

            console.log(`✅ Processed entries for group ${groupId}:`, sortedEntries.length);

            setLeaderboards((prev) => ({
              ...prev,
              group: {
                ...prev.group,
                [groupKey]: { entries: sortedEntries, hasMore: false },
              },
            }));
          },
          (error) => {
            console.error(`Error listening to group ${groupId}:`, error);
          }
        );

        groupListenersRef.current[groupKey] = unsubscribe;
        return () => unsubscribe();
      } catch (error) {
        console.error(`Error setting up group listener:`, error);
      }
    },
    [isReady, userId, normalizedPeriod, deduplicateEntries]
  );

  // 🔧 FIX 11: Listen to all user groups automatically
  useEffect(() => {
    if (!isReady()) return;

    const userGroups = [...new Set([
      userProfile?.groupId,
      userProfile?.group,
      ...(userProfile?.groups || [])
    ].filter(Boolean))];

    console.log("🎧 Auto-listening to user groups:", userGroups);

    userGroups.forEach(groupId => {
      listenGroup(groupId);
    });

    // Cleanup function
    return () => {
      Object.values(groupListenersRef.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      groupListenersRef.current = {};
    };
  }, [isReady, userProfile, listenGroup]);

  const stopListeningGroup = useCallback((groupId) => {
    const groupKey = sanitizeId(groupId);
    if (groupListenersRef.current[groupKey]) {
      groupListenersRef.current[groupKey]();
      delete groupListenersRef.current[groupKey];
    }
  }, []);

  const loadLeaderboardPage = useCallback(
    (scopeKey, append = false, scopeId = null, limit = PAGE_SIZE) => {
      if (!isReady()) {
        console.log("Cannot load leaderboard page - not ready");
        return;
      }
      fetchScope(scopeKey, append, scopeId, limit);
    },
    [fetchScope, isReady]
  );

  // 🔧 FIX 12: Enhanced return object with multiple groups
  return {
    leaderboards,
    loadingScopes,
    errors,
    availableScopes,
    listenGroup,
    stopListeningGroup,
    loadLeaderboardPage,
    // New utilities
    isReady: isReady(),
    userGroups: [...new Set([
      userProfile?.groupId,
      userProfile?.group,
      ...(userProfile?.groups || [])
    ].filter(Boolean))],
  };
}

