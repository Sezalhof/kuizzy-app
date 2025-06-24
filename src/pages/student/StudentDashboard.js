// src/pages/student/StudentDashboard.js
import React from "react";
import GroupInvitesList from "../../components/student/GroupInvitesList";

const StudentDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Welcome, Student!</h1>
      <p className="text-center mb-6">Here you can view and accept group invites from teachers.</p>

      <GroupInvitesList />
    </div>
  );
};

export default StudentDashboard;
