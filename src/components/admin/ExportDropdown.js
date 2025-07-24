// src/components/admin/ExportDropdown.js
import React, { useRef, useEffect, useState } from "react";
import CSVExportButton from "./CSVExportButton";
import PDFExportButton from "./PDFExportButton";

export default function ExportDropdown({ students }) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={exportRef}>
      <button
        onClick={() => setExportOpen((o) => !o)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        ⬇️ Export
      </button>
      {exportOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10 space-y-1 p-2">
          <CSVExportButton students={students} />
          <PDFExportButton students={students} />
        </div>
      )}
    </div>
  );
}
