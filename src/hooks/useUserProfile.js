import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// 🔄 Local cache for profiles
const profileCacheByUid = new Map();

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

  const profile = useMemo(() => {
    if (!rawProfile || !uid) return null;

    const cached = profileCacheByUid.get(uid);
    if (cached && cached._stable) {
      console.log(`[useUserProfile] Returning cached profile for UID ${uid}`);
      return cached;
    }

    const stableProfile = {
      ...rawProfile,
      createdAt: rawProfile.createdAt ?? null,
      _stable: true,
    };

    profileCacheByUid.set(uid, stableProfile);
    console.log(`[useUserProfile] 🆕 Caching new profile for UID ${uid}`);
    return stableProfile;
  }, [rawProfile, uid]);

  useEffect(() => {
    let mounted = true;

    console.groupCollapsed("[useUserProfile] Subscription Start");
    console.log("UID:", uid);
    console.log("Retry:", retryCount);
    console.groupEnd();

    if (!uid || typeof uid !== "string") {
      console.warn("[useUserProfile] Invalid UID – doing cleanup");
      cleanup();
      return;
    }

    const cached = profileCacheByUid.get(uid);
    if (uid === previousUid.current && retryCount === 0 && cached && cached._stable) {
      console.log("[useUserProfile] ✅ Using cached stable profile");
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
        if (lastSnapshotPendingWrites.current === pendingWrites && rawProfile !== null) {
          console.log("[useUserProfile] 🔁 Duplicate snapshot – skipping");
          return;
        }

        lastSnapshotPendingWrites.current = pendingWrites;

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("[useUserProfile] 📥 Snapshot data received:", data);
          console.log("[PROFILE LOAD] Data shape:", Object.keys(data).join(", "));

          if (isProfileIncomplete(data)) {
            console.warn("[useUserProfile] ❗ Profile incomplete");
            setRawProfile(null);
            setError("Profile incomplete");
            setLoading(false);
            return;
          }

          const shouldUpdate = rawProfile === null || profileDataChanged(data, rawProfile);
          if (shouldUpdate) {
            console.log("[useUserProfile] 🔄 Profile updated");
            setRawProfile(data);
            profileCacheByUid.set(uid, {
              ...data,
              createdAt: data.createdAt ?? null,
              _stable: true,
            });
          } else {
            console.log("[useUserProfile] ✅ Profile unchanged");
          }

          setError(null);
          setLoading(false);
        } else {
          console.warn("[useUserProfile] ❌ Profile not found");
          setRawProfile(null);
          setError("Profile does not exist.");
          setLoading(false);
        }
      },
      (err) => {
        if (!mounted) return;
        console.error("[useUserProfile] ❌ Snapshot error:", err);
        setError("Failed to fetch profile.");
        setLoading(false);

        if (retryCount < 3) {
          const delay = 1000 * (retryCount + 1);
          console.warn(`[useUserProfile] Retrying in ${delay}ms...`);
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
      console.log("[useUserProfile] 🔚 Cleanup on unmount or UID change");
    };
  }, [uid, retryCount, profileDataChanged, rawProfile]);

  return useMemo(() => {
    console.log(`[useUserProfile] Return for UID ${uid}`, {
      loading,
      error,
      hasProfile: !!profile,
    });
    return { profile, loading, error, hasProfile: !!profile };
  }, [profile, loading, error, uid]);
}
