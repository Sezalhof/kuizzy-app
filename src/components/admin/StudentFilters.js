// src/components/admin/StudentFilters.js
import React from "react";
import { Search } from "lucide-react";

export default function StudentFilters({
  searchTerm,
  setSearchTerm,
  filterGrade,
  setFilterGrade,
  filterInstitution,
  setFilterInstitution,
  uniqueGrades,
  uniqueInstitutions,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1 flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name, email, or UID..."
          className="flex-1 bg-transparent outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <select
        className="bg-gray-50 p-3 rounded-lg"
        value={filterGrade}
        onChange={(e) => setFilterGrade(e.target.value)}
      >
        <option value="">All Grades</option>
        {uniqueGrades.map((grade) => (
          <option key={grade} value={grade}>
            Grade {grade}
          </option>
        ))}
      </select>

      <select
        className="bg-gray-50 p-3 rounded-lg"
        value={filterInstitution}
        onChange={(e) => setFilterInstitution(e.target.value)}
      >
        <option value="">All Institutions</option>
        {uniqueInstitutions.map((inst) => (
          <option key={inst} value={inst}>
            {inst}
          </option>
        ))}
      </select>
    </div>
  );
}
