// src/components/tests/TestPlayer.jsx - OPTIMIZED VERSION
import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";

/**
 * TestPlayer Component
 * Props:
 * - test: test object containing questions
 * - onComplete: callback after test finishes
 * - profile: user profile
 * - profileLoading: boolean
 */
export default function TestPlayer({ test, onComplete, profile, profileLoading }) {
  const { user, loading: authLoading } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savingError, setSavingError] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [todayCombinedScore, setTodayCombinedScore] = useState(null);

  const questions = test?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  // Wait for profile or auth loading
  if (authLoading || profileLoading) {
    return <div className="p-4 text-gray-600">Loading...</div>;
  }
  
  if (!profile || !user) {
    return <div className="p-4 text-red-600">User profile not found.</div>;
  }
  
  if (!test) {
    return <div className="p-4 text-red-600">Test not found.</div>;
  }

  const handleStart = () => {
    setPlaying(true);
    setFinished(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setScore(0);
    setSavingError(null);
    setStartedAt(new Date());
    setTodayCombinedScore(null);
  };

  const handleAnswer = (optionIndex) => {
    if (userAnswers[currentQuestion.id] !== undefined) return;

    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));

    if (optionIndex === currentQuestion.correct) setScore((prev) => prev + 1);

    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setFinished(true);
    setPlaying(false);

    const finishedAt = new Date();
    const elapsedSec = Math.max(
      0,
      Math.round((finishedAt.getTime() - (startedAt ?? finishedAt).getTime()) / 1000)
    );
    const remainingTime = Math.max(0, (test.duration ?? 900) - elapsedSec);
    const combinedScore = Number(score || 0) + remainingTime / 60;
    setTodayCombinedScore(combinedScore.toFixed(2));

    // Pass result object to parent component
    try {
      await onComplete?.({
        rawScore: score,
        totalQuestions,
        userAnswers,
        startedAt,
        finishedAt,
        combinedScore,
      });
    } catch (error) {
      console.error("Error completing test:", error);
      setSavingError(error.message || "Failed to save test results");
    }
  };

  // UI Rendering
  if (!playing) {
    return (
      <div className="p-4 border rounded shadow">
        <h2 className="text-xl font-bold mb-4">{test.title}</h2>
        <p className="text-gray-600 mb-4">
          Questions: {totalQuestions} | Duration: {Math.floor((test.duration || 900) / 60)} minutes
        </p>
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Start Test
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="p-4 border rounded shadow">
        <h2 className="text-xl font-bold mb-4">Test Completed: {test.title}</h2>
        <div className="space-y-2 mb-4">
          <p>
            Your Score: {score} / {totalQuestions} ({((score / totalQuestions) * 100).toFixed(1)}%)
          </p>
          {todayCombinedScore && (
            <p className="font-semibold text-green-600">
              Combined Score: {todayCombinedScore}
            </p>
          )}
        </div>
        
        {savingError && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Error saving results:</p>
            <p className="text-red-700 text-sm">{savingError}</p>
          </div>
        )}
        
        <button
          onClick={() => {
            setFinished(false);
            setPlaying(false);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{test.title}</h2>
        <div className="text-sm text-gray-600">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        ></div>
      </div>
      
      <p className="mb-6 text-lg font-semibold">{currentQuestion.text}</p>
      
      <div className="space-y-3">
        {currentQuestion.options.map((opt, idx) => {
          const isAnswered = userAnswers[currentQuestion.id] !== undefined;
          const isSelected = userAnswers[currentQuestion.id] === idx;
          const isCorrect = idx === currentQuestion.correct;
          
          let buttonClass = "block w-full text-left px-4 py-3 border rounded-lg transition-colors ";
          
          if (isAnswered) {
            if (isSelected && isCorrect) {
              buttonClass += "bg-green-100 border-green-300 text-green-800";
            } else if (isSelected && !isCorrect) {
              buttonClass += "bg-red-100 border-red-300 text-red-800";
            } else if (isCorrect) {
              buttonClass += "bg-green-50 border-green-200 text-green-700";
            } else {
              buttonClass += "bg-gray-50 border-gray-200 text-gray-600";
            }
          } else {
            buttonClass += "hover:bg-blue-50 hover:border-blue-300 border-gray-300";
          }
          
          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={isAnswered}
              className={buttonClass}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}