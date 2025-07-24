// src/components/admin/PageControls.js
import React from "react";

export default function PageControls({ currentPage, totalPages, setCurrentPage }) {
  return (
    <div className="flex justify-between items-center mt-4">
      <button
        className="px-4 py-2 rounded bg-gray-300 disabled:opacity-50"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      >
        ← Previous
      </button>
      <span>
        Page {currentPage} / {totalPages}
      </span>
      <button
        className="px-4 py-2 rounded bg-gray-300 disabled:opacity-50"
        disabled={currentPage >= totalPages}
        onClick={() => setCurrentPage((p) => p + 1)}
      >
        Next →
      </button>
    </div>
  );
}
