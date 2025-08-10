import React from "react";
import { useParams } from "react-router-dom";
import Quiz from "../components/Quiz";

export default function GroupQuizPage() {
  const { groupId } = useParams();

  console.log("[GroupQuizPage] groupId param:", groupId);  // <-- Add this

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Group Quiz</h2>
      <Quiz groupId={groupId} />
    </div>
  );
}
