// src/pages/student/StudentDashboard.js
import React from "react";
import { Link } from "react-router-dom";
import GroupInvitesList from "../../components/student/GroupInvitesList";

const StudentDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Welcome, Student!</h1>
      <p className="text-center mb-6">
        Here you can view and accept group invites from teachers.
      </p>

      <GroupInvitesList />

      {/* Friends Page Button */}
      <div className="mt-10 text-center">
        <Link
          to="/friends"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
        >
          Go to Friends Page
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
