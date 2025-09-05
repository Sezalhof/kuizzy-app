// src/hooks/useOptimizedLeaderboard.js - Performance optimizations
import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot
} from 'firebase/firestore';

// Firestore composite index configurations needed:
// Collection: test_attempts
// Fields: twoMonthPeriod (Ascending), combinedScore (Descending), finishedAt (Descending)
// Fields: twoMonthPeriod (Ascending), groupId (Ascending), combinedScore (Descending)
// Fields: twoMonthPeriod (Ascending), schoolId (Ascending), combinedScore (Descending)
// etc. for each scope field

export function useOptimizedLeaderboard(userId, userProfile, period, options = {}) {
  const { pageSize = 50, enableRealtime = false } = options;
  
  const [leaderboards, setLeaderboards] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  // Optimized fetch with proper sorting at database level
  const fetchScopeOptimized = useCallback(async (scopeKey, scopeValue = null) => {
    if (!period || !userId) return;

    setLoading(prev => ({ ...prev, [scopeKey]: true }));
    
    try {
      let constraints = [
        where('twoMonthPeriod', '==', period),
        orderBy('combinedScore', 'desc'),
        orderBy('finishedAt', 'desc'),
        limit(pageSize)
      ];

      // Add scope filter if not global
      if (scopeKey !== 'global' && scopeValue) {
        const scopeField = getScopeField(scopeKey);
        if (scopeField) {
          constraints.splice(1, 0, where(scopeField, '==', scopeValue));
        }
      }

      const q = query(collection(db, 'test_attempts'), ...constraints);
      
      let unsubscribe;
      if (enableRealtime) {
        unsubscribe = onSnapshot(q, (snapshot) => {
          processSnapshot(snapshot, scopeKey);
        });
      } else {
        const snapshot = await getDocs(q);
        processSnapshot(snapshot, scopeKey);
      }

      return unsubscribe;
    } catch (error) {
      console.error(`Error fetching ${scopeKey}:`, error);
      setErrors(prev => ({ ...prev, [scopeKey]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [scopeKey]: false }));
    }
  }, [period, userId, pageSize, enableRealtime]);

  const processSnapshot = (snapshot, scopeKey) => {
    const entries = [];
    const userMap = new Map(); // For deduplication

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Skip invalid entries
      if (!data.userId || typeof data.combinedScore !== 'number') return;
      
      const existing = userMap.get(data.userId);
      
      // Keep highest score per user, or latest if scores equal
      if (!existing || 
          data.combinedScore > existing.combinedScore ||
          (data.combinedScore === existing.combinedScore && 
           data.finishedAt?.toMillis() > existing.finishedAt?.toMillis())) {
        userMap.set(data.userId, { ...data, id: doc.id });
      }
    });

    const deduplicatedEntries = Array.from(userMap.values())
      .sort((a, b) => {
        if (b.combinedScore !== a.combinedScore) {
          return b.combinedScore - a.combinedScore;
        }
        return (b.finishedAt?.toMillis() || 0) - (a.finishedAt?.toMillis() || 0);
      });

    // Add ranks
    deduplicatedEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    setLeaderboards(prev => ({
      ...prev,
      [scopeKey]: {
        entries: deduplicatedEntries,
        hasMore: deduplicatedEntries.length === pageSize,
        lastUpdated: new Date()
      }
    }));
  };

  const getScopeField = (scopeKey) => {
    const fieldMap = {
      school: 'schoolId',
      union: 'unionId',
      upazila: 'upazilaId',
      district: 'districtId',
      division: 'divisionId',
      group: 'groupId'
    };
    return fieldMap[scopeKey];
  };

  return {
    leaderboards,
    loading,
    errors,
    fetchScope: fetchScopeOptimized
  };
}