// src/pages/LeaderboardPage.js
import React from 'react';
import Leaderboard from '../components/Leaderboard';

export default function LeaderboardPage({ leaderboardData }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <h2 className="text-3xl font-semibold mb-4 text-blue-700">Top Players</h2>
      <Leaderboard data={leaderboardData} />
    </div>
  );
}
