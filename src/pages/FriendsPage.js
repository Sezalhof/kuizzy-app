// src/pages/FriendsPage.js
import React, { useState } from "react";
import FriendList from "../components/friends/FriendList";
import FriendSuggestionList from "../components/friends/FriendSuggestionList";

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-center mb-4">Friends</h1>

      {/* Tabs */}
      <div className="flex justify-center mb-6 space-x-4">
        {["pending", "accepted", "blocked"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize px-4 py-2 rounded ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Friend List */}
      <FriendList activeTab={activeTab} />

      {/* Suggestions */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-2">People You May Know</h2>
        <FriendSuggestionList />
      </div>
    </div>
  );
}
