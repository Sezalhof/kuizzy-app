import React from "react";

export default function StatsCards({ students }) {
  // Calculate unique institutions and grades
  const uniqueInstitutions = [...new Set(students.map((s) => s.institution).filter(Boolean))];
  const uniqueGrades = [...new Set(students.map((s) => s.grade).filter(Boolean))];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg shadow">
        <p className="text-sm text-blue-600">Total Students</p>
        <p className="text-2xl font-bold">{students.length}</p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg shadow">
        <p className="text-sm text-green-600">Unique Institutions</p>
        <p className="text-2xl font-bold">{uniqueInstitutions.length}</p>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg shadow">
        <p className="text-sm text-purple-600">Grade Levels</p>
        <p className="text-2xl font-bold">{uniqueGrades.length}</p>
      </div>
    </div>
  );
}
