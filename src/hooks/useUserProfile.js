import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// 🔄 In-memory cache
const profileCacheByUid = new Map();
const LOCAL_STORAGE_KEY_PREFIX = "userProfile_";

export function useUserProfile(uid) {
  const [rawProfile, setRawProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryTimer = useRef(null);
  const unsubscribeRef = useRef(null);
  const lastSnapshotPendingWrites = useRef(null);
  const previousUid = useRef(null);

  const profileDataChanged = useCallback((a, b) => {
    return JSON.stringify(a) !== JSON.stringify(b);
  }, []);

  const isProfileIncomplete = (data) => {
    return !data || Object.keys(data).length === 0 || !data.role;
  };

  // 🆕 Load from in-memory cache or localStorage instantly
  useEffect(() => {
    if (!uid) return;

    const cached = profileCacheByUid.get(uid);
    if (cached) {
      setRawProfile(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        profileCacheByUid.set(uid, parsed);
        setRawProfile(parsed);
        setLoading(false);
        setError(null);
      } catch {
        // Ignore parse errors
      }
    }
  }, [uid]);

  const profile = useMemo(() => {
    if (!rawProfile || !uid) return null;

    const cached = profileCacheByUid.get(uid);
    if (cached && cached._stable) {
      return cached;
    }

    const stableProfile = {
      ...rawProfile,
      createdAt: rawProfile.createdAt ?? null,
      avatar: rawProfile.avatar ?? "/default-avatar.png", // Fallback avatar
      _stable: true,
    };

    // Cache in memory + localStorage
    profileCacheByUid.set(uid, stableProfile);
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(stableProfile)
    );

    return stableProfile;
  }, [rawProfile, uid]);

  useEffect(() => {
    let mounted = true;

    if (!uid || typeof uid !== "string") {
      cleanup();
      return;
    }

    const cached = profileCacheByUid.get(uid);
    if (uid === previousUid.current && retryCount === 0 && cached && cached._stable) {
      setRawProfile(cached);
      setLoading(false);
      setError(null);
      return;
    }

    previousUid.current = uid;
    setLoading(true);
    setError(null);

    const userRef = doc(db, "users", uid);
    unsubscribeRef.current?.();
    clearTimeout(retryTimer.current);

    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (!mounted) return;

        const pendingWrites = docSnap.metadata.hasPendingWrites;
        if (
          lastSnapshotPendingWrites.current === pendingWrites &&
          rawProfile !== null
        ) {
          return;
        }

        lastSnapshotPendingWrites.current = pendingWrites;

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (isProfileIncomplete(data)) {
            setRawProfile(null);
            setError("Profile incomplete");
            setLoading(false);
            return;
          }

          const shouldUpdate =
            rawProfile === null || profileDataChanged(data, rawProfile);

          if (shouldUpdate) {
            const newProfile = {
              ...data,
              createdAt: data.createdAt ?? null,
              avatar: data.avatar ?? "/default-avatar.png",
              _stable: true,
            };
            setRawProfile(newProfile);
            profileCacheByUid.set(uid, newProfile);
            localStorage.setItem(
              `${LOCAL_STORAGE_KEY_PREFIX}${uid}`,
              JSON.stringify(newProfile)
            );
          }

          setError(null);
          setLoading(false);
        } else {
          setRawProfile(null);
          setError("Profile does not exist.");
          setLoading(false);
        }
      },
      (err) => {
        if (!mounted) return;
        setError("Failed to fetch profile.");
        setLoading(false);

        if (retryCount < 3) {
          const delay = 1000 * (retryCount + 1);
          retryTimer.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, delay);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    function cleanup() {
      unsubscribeRef.current?.();
      clearTimeout(retryTimer.current);
      if (mounted) {
        setRawProfile(null);
        setLoading(false);
        setError(null);
      }
    }

    return () => {
      mounted = false;
      cleanup();
    };
  }, [uid, retryCount, profileDataChanged, rawProfile]);

  return useMemo(() => {
    return { profile, loading, error, hasProfile: !!profile };
  }, [profile, loading, error]);
}
