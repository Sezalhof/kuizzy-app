import React, { useState, useEffect } from "react";
import { saveTestAttempt } from "../../utils/saveTestAttempt";

export default function TestPlayer({ test, onComplete, userId, profile }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savingError, setSavingError] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [todayCombinedScore, setTodayCombinedScore] = useState(null);

  useEffect(() => {
    console.log("[TestPlayer] Component mounted. Profile:", profile, "UserId:", userId);
  }, [profile, userId]);

  if (!test)
    return <div className="p-4 text-red-600">Test not found in ExamTable.</div>;

  const questions = test.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  const handleStart = () => {
    setPlaying(true);
    setFinished(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setScore(0);
    setSavingError(null);
    setStartedAt(new Date());
    setTodayCombinedScore(null);

    console.log("[TestPlayer] Test started:", test.id, "Time:", new Date());
  };

  const handleAnswer = (optionIndex) => {
    if (userAnswers[currentQuestion.id] !== undefined) return;

    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));

    if (optionIndex === currentQuestion.correct) setScore((prev) => prev + 1);

    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else handleFinish();
  };

  const handleFinish = async () => {
    setFinished(true);
    setPlaying(false);

    console.log("[TestPlayer] handleFinish triggered");
    console.log("[TestPlayer] User profile:", profile);
    console.log("[TestPlayer] UserId prop:", userId);
    console.log("[TestPlayer] Test object:", test);
    console.log("[TestPlayer] Current Score:", score, "of", totalQuestions);
    console.log("[TestPlayer] User answers:", userAnswers);

    try {
      const finishedAt = new Date();
      const elapsedSec = Math.max(
        0,
        Math.round((finishedAt.getTime() - (startedAt ?? finishedAt).getTime()) / 1000)
      );
      const remainingTime = Math.max(0, (test.duration ?? 900) - elapsedSec);
      const combinedScore = Number(score || 0) + remainingTime / 60;

      setTodayCombinedScore(combinedScore.toFixed(2));

      const payload = {
        userId: userId,
        displayName: profile?.displayName ?? "Unknown",
        testId: test.id,
        score: score ?? 0,
        totalQuestions: totalQuestions ?? 0,
        userAnswers: userAnswers ?? {},
        startedAt: startedAt ?? new Date(),
        finishedAt,
        testDurationSec: test.duration ?? 900,
        groupId: null, // removed for rules safety
        createdAt: new Date(),
      };

      console.log("[TestPlayer] Payload prepared for saveTestAttempt:", payload);

      if (!payload.userId) {
        console.error("[TestPlayer] Missing userId! Attempt not saved.", payload);
        setSavingError("Missing userId. Cannot save test attempt.");
        return;
      }

      await saveTestAttempt(payload); // Firestore write
      setSavingError(null);
      console.log("[TestPlayer] Test attempt saved successfully.");
    } catch (err) {
      setSavingError(err.message);
      console.error("[TestPlayer] Failed to save test attempt:", err.code, err.message);
    }

    onComplete?.(score, totalQuestions, userAnswers, startedAt, new Date());
  };

  if (!playing) {
    return (
      <div className="p-4 border rounded shadow">
        <h2 className="text-xl font-bold mb-4">Playing: {test.title}</h2>
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
        <h2 className="text-xl font-bold mb-4">Test Finished: {test.title}</h2>
        <p>
          Your Score: {score} / {totalQuestions}
        </p>
        {todayCombinedScore && (
          <p className="font-semibold mt-1">
            Today’s Combined Score: {todayCombinedScore}
          </p>
        )}
        {savingError && (
          <p className="text-red-600 mt-2">Failed to save attempt: {savingError}</p>
        )}
        <button
          onClick={() => {
            setFinished(false);
            setPlaying(false);
          }}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">{test.title}</h2>
      <p className="mb-2">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </p>
      <p className="mb-4 font-semibold">{currentQuestion.text}</p>
      <div className="space-y-2">
        {currentQuestion.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(idx)}
            disabled={userAnswers[currentQuestion.id] !== undefined}
            className="block w-full text-left px-4 py-2 border rounded hover:bg-blue-100"
            style={{
              backgroundColor:
                userAnswers[currentQuestion.id] === idx
                  ? idx === currentQuestion.correct
                    ? "lightgreen"
                    : "#fca5a5"
                  : "",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
