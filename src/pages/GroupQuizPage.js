import React from "react";
import { useParams } from "react-router-dom";
import Quiz from "../components/Quiz"; // make sure the path is correct!

export default function GroupQuizPage() {
  const { groupId } = useParams();

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Group Quiz</h2>
      <Quiz groupId={groupId} />
    </div>
  );
}
