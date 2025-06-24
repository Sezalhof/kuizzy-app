import React from 'react';

const TeacherDashboard = () => {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome, Teacher!</h1>
      <p>This is your dashboard. Here you can:</p>
      <ul className="mt-4 list-disc list-inside">
        <li>View your students</li>
        <li>Create and review quizzes</li>
        <li>Track student performance</li>
        <li>Post announcements</li>
        <li>Upload materials</li>
      </ul>
    </div>
  );
};

export default TeacherDashboard;