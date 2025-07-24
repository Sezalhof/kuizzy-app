import React from "react";
import StudentContactButtons from "./StudentContactButtons";

export default function StudentTable({
  students,
  onCopy,
  copiedId,
  onDetails,
  selectedIds = [],
  toggleSelect,
  toggleSelectAll,
  allSelected,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleSelectAll()}
                aria-label="Select all students"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Institution
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact (WhatsApp)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student) => {
            const uid = student.uid || student.id;
            const isSelected = selectedIds.includes(uid);

            return (
              <tr key={uid} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(uid)}
                    aria-label={`Select student ${student.name}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{student.name || "—"}</div>
                  <div className="text-sm text-gray-500">
                    {student.email || "—"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {student.grade || "—"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {student.institution || student.school || "—"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {student.upazila || "—"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {student.phone ? (
                    <StudentContactButtons
                      student={student}
                      copiedId={copiedId}
                      onCopy={onCopy}
                    />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onDetails(student)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {students.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          No students found matching your criteria
        </div>
      )}
    </div>
  );
}
