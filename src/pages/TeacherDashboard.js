import React from 'react';
import InviteStudentForm from "../components/teacher/InviteStudentForm";

const TeacherDashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-center">Welcome, Teacher!</h1>
      <p className="text-center mb-6">This is your dashboard. Here you can:</p>
      <ul className="mb-8 list-disc list-inside">
        <li>View your students</li>
        <li>Create and review quizzes</li>
        <li>Track student performance</li>
        <li>Post announcements</li>
        <li>Upload materials</li>
      </ul>

      <hr className="my-6" />

      {/* 🔗 Invite Student Feature */}
      <InviteStudentForm />
    </div>
  );
};

export default TeacherDashboard;
