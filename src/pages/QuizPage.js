// ✅ FILE: src/pages/TestPage.js

import React, { useState, useEffect } from "react";
import Quiz from "../components/Quiz";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { app } from "../firebase"; // Make sure this points to your Firebase init

export default function TestPage({ user, profile, onComplete, quizCompleted }) {
  const db = getFirestore(app);

  // States
  const [gradeFilter, setGradeFilter] = useState(profile?.grade || "");
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [testCart, setTestCart] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);

  // Load all quizzes (metadata only for low reads)
  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const quizzesRef = collection(db, "quizzes");
        const snapshot = await getDocs(quizzesRef);
        const quizList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAvailableQuizzes(quizList);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      }
    }
    fetchQuizzes();
  }, [db]);

  // Filter quizzes by grade
  useEffect(() => {
    if (!gradeFilter) {
      setFilteredQuizzes(availableQuizzes);
    } else {
      setFilteredQuizzes(
        availableQuizzes.filter(q => q.grade === gradeFilter)
      );
    }
  }, [gradeFilter, availableQuizzes]);

  // Add quiz to cart
  const addToCart = (quiz) => {
    if (!testCart.find(q => q.id === quiz.id)) {
      setTestCart([...testCart, quiz]);
    }
  };

  // Remove from cart
  const removeFromCart = (quizId) => {
    setTestCart(testCart.filter(q => q.id !== quizId));
  };

  // Start quiz from cart
  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
  };

  // After quiz complete
  const handleComplete = () => {
    setActiveQuiz(null);
    if (onComplete) onComplete();
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Test Center</h2>

      {/* Grade Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Grades</option>
          {[3,4,6,7,8,9,10,11,12].map(g => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      {/* Available Quizzes */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Available Quizzes</h3>
        {filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuizzes.map(quiz => (
              <div key={quiz.id} className="border p-3 rounded shadow">
                <h4 className="font-bold">{quiz.title}</h4>
                <p className="text-sm text-gray-600">Grade: {quiz.grade}</p>
                <button
                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => addToCart(quiz)}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No quizzes found for this grade.</p>
        )}
      </div>

      {/* Test Cart */}
      {testCart.length > 0 && (
        <div className="mb-6 border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Test Cart</h3>
          {testCart.map(quiz => (
            <div key={quiz.id} className="flex items-center justify-between p-2 border-b">
              <span>{quiz.title}</span>
              <div className="flex gap-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => startQuiz(quiz)}
                >
                  Start
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => removeFromCart(quiz.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Quiz */}
      {activeQuiz && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-4">{activeQuiz.title}</h3>
          <Quiz
            groupId={null}
            quizId={activeQuiz.id}
            user={user}
            onComplete={handleComplete}
          />
        </div>
      )}

      {/* Completion Message */}
      {quizCompleted && !activeQuiz && (
        <div className="mt-4 text-green-600 font-semibold">
          You have completed the quiz!
        </div>
      )}
    </div>
  );
}
