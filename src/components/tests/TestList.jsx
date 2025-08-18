// src/components/tests/TestList.jsx
import React from "react";

export default function TestList({ tests, onAdd, selectedGrade }) {
  if (!tests?.length) {
    return (
      <div className="p-4 text-gray-500">No tests available for {selectedGrade}.</div>
    );
  }

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-lg font-bold mb-2">Available Tests ({selectedGrade})</h2>
      <div className="grid grid-cols-1 gap-4">
        {tests.map((test) => (
          <div key={test.id} className="p-4 border rounded hover:shadow-lg transition">
            <h3 className="font-semibold">{test.title}</h3>
            <p className="text-sm text-gray-500">Grade: {test.grade}</p>
            <button
              onClick={() => onAdd(test)}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title={`Add "${test.title}" (${test.grade}) to ExamTable`}
            >
              Add to ExamTable
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
