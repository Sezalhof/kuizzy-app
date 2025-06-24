// src/components/RequireTeacher.js
import React from "react";

export default function RequireTeacher({ userRole, children }) {
  if (userRole !== "teacher") {
    return (
      <div className="text-center text-red-600 font-bold mt-10">
        Access Denied — Teachers only
      </div>

      // Optional: if you'd prefer redirect instead of message, use this:
      // <Navigate to="/" replace />
    );
  }

  return children;
}
