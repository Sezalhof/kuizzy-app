// src/components/admin/PaginationControls.js

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  perPage,
  setPerPage,
}) {
  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mt-6 space-y-4 md:space-y-0">
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <label htmlFor="perPage" className="text-sm">
          Students per page:
        </label>
        <select
          id="perPage"
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="p-2 border rounded"
        >
          {[10, 20, 30, 50].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
