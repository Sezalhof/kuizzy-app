import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import useAuth from "../hooks/useAuth";
import { ensureUserInGroup } from "../utils/groupHelpers";

const questions = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
    answer: 2,
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    answer: 1,
  },
  {
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    answer: 1,
  },
];

function Quiz({ onComplete, groupId = null }) {
  const { user } = useAuth();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionClick = (index) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    const correct = questions[currentQuestionIndex].answer === index;
    if (correct) setScore(score + 1);

    setTimeout(() => {
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption(null);
      } else {
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        const finalScore = score + (correct ? 1 : 0);
        handleSubmitScore(finalScore, timeTaken);
        onComplete && onComplete(finalScore, timeTaken);
      }
    }, 800);
  };

  const handleSubmitScore = async (finalScore, duration) => {
    if (!user?.uid || !groupId) {
      return;
    }

    try {
      console.log("🛡 Current user auth UID:", user.uid);
      console.log("🧾 Submitting score with:", {
        userId: user.uid,
        groupId,
        value: finalScore,
        timeTaken: duration,
      });

      await ensureUserInGroup(groupId, user.uid);
      await addDoc(collection(db, "scores"), {
        userId: user.uid,
        groupId: groupId,
        value: finalScore,
        timeTaken: duration,
        timestamp: serverTimestamp(),
        quizType: "general",
        subject: "science",
      });
      
     } catch (err) {

    }
  };

  if (currentQuestionIndex >= questions.length) {
    return (
      <div className="text-center mt-10">
        <h2 className="text-3xl font-bold">Thanks for your efforts!</h2>
        <p className="text-gray-600 mt-2">Your quiz is done!</p>
      </div>
    );
  }

  const q = questions[currentQuestionIndex];

  return (
    <div className="max-w-xl mx-auto bg-white p-6 shadow-lg rounded-xl">
      <h2 className="text-xl font-semibold mb-4">
        Question {currentQuestionIndex + 1} of {questions.length}
      </h2>
      <p className="text-lg mb-6">{q.question}</p>
      <div className="grid gap-4">
        {q.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(index)}
            className={`px-4 py-2 rounded-lg transition duration-300
              ${selectedOption === null
                ? "bg-gray-200 hover:bg-blue-200"
                : index === q.answer
                ? "bg-green-500 text-white animate-pulse"
                : index === selectedOption
                ? "bg-red-500 text-white shake"
                : "bg-gray-100 text-gray-400"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Quiz;