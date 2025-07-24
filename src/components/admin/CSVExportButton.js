import React from "react";

export default function CSVExportButton({ students }) {
  const handleExport = () => {
    if (!students || students.length === 0) {
      alert("No student data available for export.");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Grade",
      "Institution",
      "Upazila",
    ];

    const rows = students.map((student) => [
      student.name || "",
      student.email || "",
      student.phone || "",
      student.grade || "",
      student.institution || "",
      student.upazila || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) =>
            typeof val === "string" && val.includes(",")
              ? `"${val.replace(/"/g, '""')}"`
              : val
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `students_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
    >
      ⬇️ Export CSV
    </button>
  );
}
