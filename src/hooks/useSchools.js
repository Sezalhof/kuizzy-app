// src/hooks/useSchools.js
import { useState, useEffect, useCallback } from "react";
import { getAllSchoolsGrouped, clearSchoolsCache } from "../utils/firestoreUtils";

/**
 * useSchools hook
 * Provides all schools data, grouped by division/district, with search and filtering
 */
export function useSchools({ groupBy = "division", useCache = true } = {}) {
  const [schools, setSchools] = useState([]);
  const [groupedSchools, setGroupedSchools] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchools = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllSchoolsGrouped({ groupBy, forceRefresh });
      const flatList = Object.values(data).flatMap(group => {
        if (group.schools) return group.schools;
        // fallback for nested grouping
        return Object.values(group).flatMap(sub => sub.schools || []);
      });

      setSchools(flatList);
      setGroupedSchools(data);
    } catch (err) {
      setError(err.message || "Failed to load schools.");
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  useEffect(() => {
    fetchSchools(!useCache);
  }, [fetchSchools, useCache]);

  // Force refetch
  const refetch = useCallback(() => {
    if (!useCache) {
      clearSchoolsCache();
    }
    fetchSchools(true);
  }, [fetchSchools, useCache]);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Search schools by name
  const searchSchools = useCallback((term) => {
    const lowerTerm = term.toLowerCase();
    return schools.filter(s => s.name.toLowerCase().includes(lowerTerm));
  }, [schools]);

  // Get schools by division/district/other
  const getSchoolsByLocation = useCallback((key, value) => {
    return schools.filter(s => s[key] === value);
  }, [schools]);

  return {
    schools,
    groupedSchools,
    loading,
    error,
    fetchSchools,
    refetch,
    clearError,
    searchSchools,
    getSchoolsByLocation,
  };
}
