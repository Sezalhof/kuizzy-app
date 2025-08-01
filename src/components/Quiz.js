import React, { useState, useEffect } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { toast } from "react-toastify";
import { ensureUserInGroup } from "../utils/groupHelpers";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

export default function Quiz({ groupId = null, onComplete }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [groupUid, setGroupUid] = useState(null); // 🔹 added

  const questions = [
    { id: 1, question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correctAnswer: "4" },
    { id: 2, question: "Capital of Bangladesh?", options: ["Chittagong", "Barisal", "Dhaka", "Sylhet"], correctAnswer: "Dhaka" },
    { id: 3, question: "React is a ___ library?", options: ["Python", "CSS", "JavaScript", "PHP"], correctAnswer: "JavaScript" },
  ];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const currentQuestion = questions[questionIndex];

  // 🔹 Load groupUid on mount
  useEffect(() => {
    const fetchGroupUid = async () => {
      if (!groupId) return;
      try {
        const docSnap = await getDoc(doc(db, "groups", groupId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupUid(data.groupUid || groupId); // fallback to doc ID
        }
      } catch (err) {
        console.error("[Quiz] Failed to fetch groupUid:", err);
      }
    };
    fetchGroupUid();
  }, [groupId]);

  const handleOptionClick = (option) => {
    if (selectedOption) return;

    const isCorrect = option === currentQuestion.correctAnswer;
    setSelectedOption(option);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setScore((prev) => prev + 10);
    }

    setTimeout(() => {
      setSelectedOption(null);
      setFeedback(null);
      if (questionIndex < questions.length - 1) {
        setQuestionIndex((prev) => prev + 1);
      } else {
        submitFinalScore();
      }
    }, 1000);
  };

  const submitFinalScore = async () => {
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);
    setTimeTaken(duration);

    if (!user) {
      toast.error("You must be logged in to submit.");
      return;
    }

    if (!groupId) {
      toast.error("❌ Cannot submit score: Group ID is missing.");
      return;
    }

    setSubmitting(true);
    try {
      await ensureUserInGroup(groupId, user.uid);

      await addDoc(collection(db, "scores"), {
        userId: user.uid,
        email: user.email,
        score,
        timeTaken: duration,
        timestamp: Date.now(),
        groupId,
        groupUid: groupUid || groupId, // ✅ fixed
      });

      setSubmitted(true);
      toast.success("🎉 Quiz submitted successfully!");

      if (onComplete) {
        onComplete(score, duration, groupUid || groupId);
      }
    } catch (err) {
      console.error("❌ Quiz submission failed:", err);
      toast.error("❌ Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setScore(0);
    setTimeTaken(0);
    setSubmitted(false);
    setSubmitting(false);
    setQuestionIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setStartTime(Date.now());
  };

  return (
    <div className="p-4 bg-white rounded shadow max-w-md mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4 text-blue-700">📝 Quiz Time</h2>

      {!submitted ? (
        <>
          <p className="mb-3 font-medium">{currentQuestion.question}</p>
          <div className="grid grid-cols-1 gap-2">
            {currentQuestion.options.map((option) => {
              const isSelected = option === selectedOption;
              const userWasCorrect = feedback === "correct" && isSelected;
              const userWasWrong = feedback === "wrong" && isSelected;

              return (
                <button
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  className={clsx(
                    "w-full px-4 py-2 rounded text-left border transition duration-200",
                    {
                      "bg-green-100 border-green-600 text-green-800": userWasCorrect,
                      "bg-red-100 border-red-500 text-red-700 animate-shake": userWasWrong,
                      "hover:bg-blue-100": !selectedOption,
                    }
                  )}
                  disabled={!!selectedOption}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {feedback && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              {feedback === "correct" ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span>Correct!</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="w-5 h-5 text-red-600" />
                  <span>Wrong! Correct answer: {currentQuestion.correctAnswer}</span>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center">
          <p className="text-2xl font-semibold text-green-600 mb-2">🎉 Well Done!</p>
          <p className="text-lg text-gray-800 mb-2">
            You scored <span className="font-bold">{score}</span> out of {questions.length * 10}
          </p>
          <p className="text-sm text-gray-500 mb-2">⏱ Time Taken: {timeTaken} seconds</p>
          {groupUid && (
            <p className="text-xs text-gray-400 mb-2">
              Group UID: <code>{groupUid}</code>
            </p>
          )}
          <button
            onClick={handleRetry}
            disabled={submitting}
            className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            🔁 Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
}
