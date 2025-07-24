// src/components/admin/PDFExportButton.js
import React from "react";
import jsPDF from "jspdf";

export default function PDFExportButton({ students }) {
  const handleExport = () => {
    if (students.length === 0) {
      alert("Select students first!");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Selected Students List", 14, 20);

    const headers = ["Name", "Email", "Phone", "Grade", "Institution"];
    const rows = students.map((s) => [
      s.name || "-",
      s.email || "-",
      s.phone || "-",
      s.grade || "-",
      s.institution || s.school || "-",
    ]);

    let y = 30;
    doc.setFontSize(12);
    doc.text(headers.join(" | "), 14, y);
    y += 8;
    rows.forEach((row) => {
      doc.text(row.join(" | "), 14, y);
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("students.pdf");
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      📄 Export PDF
    </button>
  );
}
