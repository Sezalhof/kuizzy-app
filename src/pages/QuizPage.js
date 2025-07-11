// ✅ FILE: src/pages/QuizPage.js

import React from "react";
import Quiz from "../components/Quiz";

export default function QuizPage({ user, profile, onComplete, quizCompleted }) {
  const groupId = null; // This is regular quiz page, so groupId is null

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quiz</h2>
      <Quiz
        groupId={groupId}
        user={user}
        onComplete={onComplete}
      />

      {quizCompleted && (
        <div className="mt-4 text-green-600 font-semibold">
          You have completed the quiz!
        </div>
      )}
    </div>
  );
}
