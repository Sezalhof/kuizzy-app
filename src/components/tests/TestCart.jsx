// src/components/tests/TestCart.jsx
import React from "react";

export default function TestCart({ cart, onRemove, onPlay }) {
  if (!cart.length) {
    return (
      <div className="p-4 border rounded shadow text-gray-500">
        Your ExamTable is empty.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-lg font-bold mb-2">Queued Tests in ExamTable</h2>
      <ul className="space-y-2">
        {cart.map((test) => (
          <li key={test.id} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-semibold">{test.title}</p>
              <p className="text-sm text-gray-500">Grade: {test.grade}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onPlay(test.id)}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                title={`Start "${test.title}"`}
              >
                Play
              </button>
              <button
                onClick={() => onRemove(test.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                title={`Remove "${test.title}" from ExamTable`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
