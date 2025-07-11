// src/App.js
import "./App.css";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useAuth from "./hooks/useAuth";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import { useUserProfile } from "./hooks/useUserProfile";

import Navbar from "./components/Navbar";
import AppRoutes from "./routes/AppRoutes";
import { db } from "./firebase";

function App() {
  const {
    user,
    userRole,
    login,
    logout,
    loading: authLoading,
    authError,
    isAuthenticating,
  } = useAuth();

  const uid = typeof user?.uid === "string" ? user.uid : null;
  useAuthRedirect(user, authLoading);

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(uid);

  const [routesMounted, setRoutesMounted] = useState(false);
  const [quizState, setQuizState] = useState({
    completed: false,
    score: 0,
    timeTaken: 0,
  });

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);

  useEffect(() => {
    setRoutesMounted(false);
    setQuizState({ completed: false, score: 0, timeTaken: 0 });
  }, [uid]);

  const fullyReady = useMemo(() => {
    const result = user !== null && !authLoading && !profileLoading;
    console.log("[App] 🧠 Calculated fullyReady:", result, {
      user,
      authLoading,
      profileLoading,
    });
    return result;
  }, [user, authLoading, profileLoading]);
  
  useEffect(() => {
    console.groupCollapsed("[App] 🧠 State Check");
    console.log("[App] Auth Loading:", authLoading);
    console.log("[App] User:", user);
    console.log("[App] Profile Loading:", profileLoading);
    console.log("[App] Profile:", profile);
    console.log("[App] ➕ fullyReady evaluated:", fullyReady);
    console.groupEnd();
  }, [authLoading, user, profileLoading, profile, fullyReady]);

  const appState = useMemo(() => {
    if (authLoading) return { loading: true, message: "Authenticating..." };
    if (!user) return { loading: false, showLogin: true };
    if (profileLoading) return { loading: true, message: "Loading profile..." };
    if (profileError) return { loading: false, needsEnrollment: true, error: profileError };
    if (!profile) return { loading: false, needsEnrollment: true };
    return { loading: false, ready: true };
  }, [authLoading, user, profileLoading, profile, profileError]);

  useEffect(() => {
    if (authError) toast.error(authError);
  }, [authError]);

  useEffect(() => {
    if (!appState.ready || !routesMounted) return;

    let isMounted = true;
    setLeaderboardLoading(true);
    setLeaderboardError(null);

    (async () => {
      try {
        const q = query(
          collection(db, "scores"),
          orderBy("score", "desc"),
          orderBy("timeTaken", "asc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (isMounted) {
          setLeaderboardData(data);
        }
      } catch (err) {
        if (isMounted) {
          setLeaderboardError("Failed to load leaderboard.");
          toast.error("Failed to load leaderboard");
        }
      } finally {
        if (isMounted) setLeaderboardLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [appState.ready, routesMounted]);

  const handleRoutesMounted = useCallback(() => {
    if (!routesMounted) {
      setRoutesMounted(true);
    }
  }, [routesMounted]);

  const handleQuizComplete = useCallback(
    async (score, duration) => {
      setQuizState({ completed: true, score, timeTaken: duration });

      if (!user) {
        toast.error("Please log in to save your score");
        return;
      }

      try {
        await addDoc(collection(db, "scores"), {
          uid: user.uid,
          email: user.email,
          score,
          timeTaken: duration,
          timestamp: Date.now(),
        });
        toast.success("Score saved!");

        if (appState.ready && routesMounted) {
          setRoutesMounted((prev) => !prev); // triggers leaderboard reload
        }
      } catch (err) {
        toast.error("Failed to save score. Please try again.");
      }
    },
    [user, appState.ready, routesMounted]
  );

  const handleLogin = useCallback(async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  }, [login]);

  if (appState.loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-700">
        <div className="text-lg animate-pulse text-center">
          {appState.message}
          <div className="text-sm mt-2 text-gray-500">
            UID: {uid || "null"} | Profile: {profile ? "Loaded" : "Pending"}
          </div>
          {authError && (
            <div className="text-red-500 text-sm mt-2">{authError}</div>
          )}
        </div>
      </div>
    );
  }

  if (appState.showLogin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-4xl font-bold mb-6">Welcome to Kuizzy!</h1>
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
            {authError}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={isAuthenticating}
          className={`px-6 py-3 rounded-xl transition shadow text-white font-medium ${
            isAuthenticating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isAuthenticating ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            "Sign in with Google"
          )}
        </button>
        <p className="text-gray-500 text-sm mt-4">
          Please allow popups if blocked by your browser
        </p>
      </div>
    );
  }

  if (appState.needsEnrollment) {
    return (
      <div className="min-h-screen bg-white text-gray-800 p-4">
        <Navbar
          user={user}
          userRole={userRole}
          profile={profile}
          onLogout={logout}
        />
        <AppRoutes
          fullyReady={false}
          user={user}
          userRole={userRole}
          profile={profile}
          authLoading={authLoading}
          profileLoading={profileLoading}
          profileError={profileError}
          leaderboardData={[]} // Wait until enrolled
          leaderboardLoading={false}
          leaderboardError={null}
          quizCompleted={quizState.completed}
          score={quizState.score}
          timeTaken={quizState.timeTaken}
          handleQuizComplete={handleQuizComplete}
          onLogout={logout}
          onMounted={handleRoutesMounted}
        />
        <ToastContainer position="top-right" autoClose={3000} pauseOnHover newestOnTop closeOnClick />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4">
      <Navbar
        user={user}
        userRole={userRole}
        profile={profile}
        onLogout={logout}
      />
      <AppRoutes
        fullyReady={appState.ready}
        user={user}
        userRole={userRole}
        profile={profile}
        authLoading={authLoading}
        profileLoading={profileLoading}
        profileError={profileError}
        leaderboardData={leaderboardData}
        leaderboardLoading={leaderboardLoading}
        leaderboardError={leaderboardError}
        quizCompleted={quizState.completed}
        score={quizState.score}
        timeTaken={quizState.timeTaken}
        handleQuizComplete={handleQuizComplete}
        onLogout={logout}
        onMounted={handleRoutesMounted}
      />
      <ToastContainer position="top-right" autoClose={3000} pauseOnHover newestOnTop closeOnClick />
    </div>
  );
}

export default App;
