// src/App.js
import React, { useCallback, useEffect, useState } from "react";
import { collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";

import { db } from "./firebase";
import useAuth from "./hooks/useAuth";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";

import "./App.css";

function App() {
  const { user, userRole, login, logout, loading } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);

  useAuthRedirect(user, loading); // 🚀 Smart redirect to /enroll if profile incomplete

  const fetchLeaderboardData = useCallback(async () => {
    try {
      const scoresQuery = query(
        collection(db, "scores"),
        orderBy("score", "desc"),
        orderBy("timeTaken", "asc"),
        limit(10)
      );
      const snapshot = await getDocs(scoresQuery);
      setLeaderboardData(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  const handleQuizComplete = useCallback(
    async (score, duration) => {
      setScore(score);
      setTimeTaken(duration);
      setQuizCompleted(true);

      if (user) {
        try {
          await addDoc(collection(db, "scores"), {
            email: user.email,
            score,
            timeTaken: duration,
            timestamp: Date.now(),
          });
          fetchLeaderboardData();
        } catch (error) {
          console.error("Error saving quiz score:", error);
        }
      }
    },
    [user, fetchLeaderboardData]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to Kuizzy!</h1>
        <button
          onClick={login}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition duration-300 shadow"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4">
      <Navbar user={user} userRole={userRole} onLogout={logout} />
<AppRoutes
  user={user}
  userRole={userRole}
  leaderboardData={leaderboardData}
  quizCompleted={quizCompleted}
  score={score}
  timeTaken={timeTaken}
  handleQuizComplete={handleQuizComplete}
  onLogout={logout} // ✅ pass real logout function
/>
    </div>
  );
}

export default App;
