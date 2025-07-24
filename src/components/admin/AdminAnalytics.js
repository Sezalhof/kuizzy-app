// src/components/admin/AdminAnalytics.js

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

export default function AdminAnalytics({ students }) {
  // Group students by grade and institution
  const gradeCounts = {};
  const institutionCounts = {};

  students.forEach((student) => {
    if (student.grade) {
      gradeCounts[student.grade] = (gradeCounts[student.grade] || 0) + 1;
    }
    if (student.institution) {
      institutionCounts[student.institution] = (institutionCounts[student.institution] || 0) + 1;
    }
  });

  const gradeData = Object.entries(gradeCounts).map(([grade, count]) => ({
    name: grade,
    count,
  }));

  const institutionData = Object.entries(institutionCounts).map(([institution, count]) => ({
    name: institution,
    count,
  }));

  return (
    <div className="my-10 space-y-10">
      <h2 className="text-xl font-semibold">📊 Students per Grade</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={gradeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: "Grade", position: "insideBottom", dy: 10 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3b82f6" name="Students" />
        </BarChart>
      </ResponsiveContainer>

      <h2 className="text-xl font-semibold">🏫 Students per Institution</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={institutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={150} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#10b981" name="Students" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
