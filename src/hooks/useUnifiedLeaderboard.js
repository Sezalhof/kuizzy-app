// src/hooks/useUnifiedLeaderboard.js - DEBUG VERSION
import { useState, useEffect, useCallback, useRef } from "react";
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
  const normalizedPeriod = typeof periodInput === "string" ? periodInput : periodInput?.label || periodInput?.value || "";
  
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingScopes, setLoadingScopes] = useState({});
  const [errors, setErrors] = useState({});
  const [availableScopes, setAvailableScopes] = useState([]);
  const groupListenersRef = useRef({});

  // Test function to check what's in the database
  const debugDatabase = useCallback(async () => {
    if (!DEBUG_MODE) return;
    
    console.log("=== DATABASE DEBUG ===");
    console.log("Period:", normalizedPeriod);
    console.log("User Profile:", userProfile);
    
    try {
      // First, let's see ALL documents in scores collection
      const allScoresQuery = query(collection(db, "scores"));
      const allScoresSnapshot = await getDocs(allScoresQuery);
      
      console.log("Total documents in scores collection:", allScoresSnapshot.size);
      
      const allDocs = [];
      allScoresSnapshot.forEach(doc => {
        allDocs.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("All documents:", allDocs);
      
      // Check for documents with the current period
      const periodDocs = allDocs.filter(doc => doc.twoMonthPeriod === normalizedPeriod);
      console.log(`Documents with period ${normalizedPeriod}:`, periodDocs);
      
      // Check for documents with the user's group ID
      const groupDocs = allDocs.filter(doc => doc.groupId === userProfile?.groupId);
      console.log(`Documents with groupId ${userProfile?.groupId}:`, groupDocs);
      
      // Check for documents with both period and group ID
      const periodAndGroupDocs = allDocs.filter(doc => 
        doc.twoMonthPeriod === normalizedPeriod && doc.groupId === userProfile?.groupId
      );
      console.log(`Documents with both period and group:`, periodAndGroupDocs);
      
    } catch (error) {
      console.error("Database debug error:", error);
    }
  }, [normalizedPeriod, userProfile]);

  // Run debug check when component mounts
  useEffect(() => {
    if (DEBUG_MODE && userProfile) {
      debugDatabase();
    }
  }, [debugDatabase, userProfile]);

  const fetchScope = useCallback(
    async (scopeKey, append = false, scopeId = null, limit = PAGE_SIZE) => {
      if (!userId || !normalizedPeriod) {
        console.log("Missing userId or period:", { userId, normalizedPeriod });
        return;
      }

      const field = SCOPE_FIELD_MAP[scopeKey];
      const rawIdValue = scopeId ?? (field ? userProfile?.[field] : null);
      
      console.log(`=== FETCH SCOPE: ${scopeKey} ===`);
      console.log(`Field: ${field}, Raw ID: ${rawIdValue}`);
      console.log(`Period: ${normalizedPeriod}`);

      if (field && !rawIdValue && scopeKey !== "global") {
        console.log(`Scope ${scopeKey} not available - missing field value`);
        setErrors(prev => ({ ...prev, [scopeKey]: "Scope not available" }));
        setLoadingScopes(prev => ({ ...prev, [scopeKey]: false }));
        return;
      }

      try {
        setLoadingScopes(prev => ({ ...prev, [scopeKey]: true }));
        
        const scoresCollection = collection(db, "scores");
        
        // Build query step by step
        let queryConstraints = [
          where("twoMonthPeriod", "==", normalizedPeriod)
        ];
        
        // Add scope-specific filter if needed
        if (scopeKey !== "global" && field && rawIdValue) {
          queryConstraints.push(where(field, "==", rawIdValue));
        }
        
        // Add ordering - BUT ONLY if we have the right indexes
        // For now, let's try without ordering to see if we can get data
        console.log("Query constraints:", queryConstraints);
        
        const q = query(scoresCollection, ...queryConstraints);
        
        const snapshot = await getDocs(q);
        console.log(`Query result for ${scopeKey}:`, snapshot.size, "documents");
        
        let entries = [];
        snapshot.forEach(doc => {
          entries.push({ ...doc.data(), id: doc.id });
        });
        
        console.log(`Raw entries for ${scopeKey}:`, entries);

        // Manual sorting (since we removed orderBy temporarily)
        entries.sort((a, b) => {
          if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
          if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity))
            return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
          return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
        });

        // Deduplicate by userId (keep latest)
        const dedupMap = new Map();
        entries.forEach(entry => {
          const existing = dedupMap.get(entry.userId);
          if (!existing || (entry.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0)) {
            dedupMap.set(entry.userId, entry);
          }
        });
        entries = Array.from(dedupMap.values());

        // Re-sort after dedup
        entries.sort((a, b) => {
          if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
          if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity))
            return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
          return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
        });

        // Assign rank
        entries.forEach((entry, idx) => {
          entry.rank = idx + 1;
        });

        console.log(`Final entries for ${scopeKey}:`, entries);

        // Update state based on scope type
        if (scopeKey === "group") {
          const groupKey = sanitizeId(rawIdValue);
          setLeaderboards(prev => ({
            ...prev,
            group: {
              ...prev.group,
              [groupKey]: { entries, hasMore: false }
            }
          }));
        } else {
          setLeaderboards(prev => ({
            ...prev,
            [scopeKey]: { entries, hasMore: false }
          }));
        }

      } catch (error) {
        console.error(`Error fetching ${scopeKey}:`, error);
        setErrors(prev => ({ ...prev, [scopeKey]: error.message }));
      } finally {
        setLoadingScopes(prev => ({ ...prev, [scopeKey]: false }));
      }
    },
    [userId, userProfile, normalizedPeriod]
  );

  // Initialize available scopes
  useEffect(() => {
    if (!userProfile) return;
    
    const scopes = Object.keys(SCOPE_FIELD_MAP).filter(
      k => !SCOPE_FIELD_MAP[k] || userProfile[SCOPE_FIELD_MAP[k]]
    );
    
    console.log("Available scopes:", scopes);
    setAvailableScopes(scopes);
    
    // Fetch each scope
    scopes.forEach(scope => {
      console.log(`Fetching scope: ${scope}`);
      fetchScope(scope);
    });
  }, [userProfile, fetchScope]);

  const listenGroup = useCallback((groupId) => {
    if (!userId || !normalizedPeriod || !groupId) {
      console.log("Cannot listen to group - missing params:", { userId, normalizedPeriod, groupId });
      return;
    }

    const groupKey = sanitizeId(groupId);
    
    if (groupListenersRef.current[groupKey]) {
      console.log(`Already listening to group ${groupId}`);
      return;
    }

    console.log(`Setting up listener for group: ${groupId}`);

    try {
      const groupQuery = query(
        collection(db, "scores"),
        where("twoMonthPeriod", "==", normalizedPeriod),
        where("groupId", "==", groupId)
      );

      const unsubscribe = onSnapshot(
        groupQuery,
        (snapshot) => {
          console.log(`Live update for group ${groupId}: ${snapshot.size} documents`);
          
          let entries = [];
          snapshot.forEach(doc => {
            entries.push({ ...doc.data(), id: doc.id });
          });

          // Process entries (dedup, sort, rank)
          const dedupMap = new Map();
          entries.forEach(entry => {
            const existing = dedupMap.get(entry.userId);
            if (!existing || (entry.finishedAt?.toMillis?.() ?? 0) > (existing.finishedAt?.toMillis?.() ?? 0)) {
              dedupMap.set(entry.userId, entry);
            }
          });
          entries = Array.from(dedupMap.values());

          entries.sort((a, b) => {
            if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
            if ((a.timeTaken ?? Infinity) !== (b.timeTaken ?? Infinity))
              return (a.timeTaken ?? Infinity) - (b.timeTaken ?? Infinity);
            return (b.finishedAt?.toMillis?.() ?? 0) - (a.finishedAt?.toMillis?.() ?? 0);
          });

          entries.forEach((entry, idx) => {
            entry.rank = idx + 1;
          });

          console.log(`Processed entries for group ${groupId}:`, entries);

          setLeaderboards(prev => ({
            ...prev,
            group: {
              ...prev.group,
              [groupKey]: { entries, hasMore: false }
            }
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
  }, [userId, normalizedPeriod]);

  const stopListeningGroup = useCallback((groupId) => {
    const groupKey = sanitizeId(groupId);
    if (groupListenersRef.current[groupKey]) {
      groupListenersRef.current[groupKey]();
      delete groupListenersRef.current[groupKey];
    }
  }, []);

  const loadLeaderboardPage = useCallback(
    (scopeKey, append = false, scopeId = null, limit = PAGE_SIZE) => {
      fetchScope(scopeKey, append, scopeId, limit);
    },
    [fetchScope]
  );

  return {
    leaderboards,
    loadingScopes,
    errors,
    availableScopes,
    listenGroup,
    stopListeningGroup,
    loadLeaderboardPage,
  };
}