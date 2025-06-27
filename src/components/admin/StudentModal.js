// src/components/admin/StudentModal.js
import React from "react";

export default function StudentModal({ student, onClose }) {
  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold">Student Details</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800">Basic Information</h4>
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>Name:</strong> {student.name || "—"}</p>
                <p><strong>Email:</strong> {student.email || "—"}</p>
                <p><strong>Grade:</strong> {student.grade || "—"}</p>
                <p><strong>Institution:</strong> {student.institution || "—"}</p>
                <p><strong>Upazila:</strong> {student.upazila || "—"}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Contact Information</h4>
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>Phone (WhatsApp):</strong> {student.phone || "—"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
