import React, { useState } from "react";
import FriendList from "../components/friends/FriendList";
import FriendSuggestionList from "../components/friends/FriendSuggestionList";

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState("Pending"); // default tab

  const tabs = ["Pending", "Accepted", "Blocked"];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Friends</h1>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6 space-x-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded font-semibold border ${
              activeTab === tab
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Friend List */}
      <div className="mb-10">
        <FriendList activeTab={activeTab} />
      </div>

      {/* Friend Suggestions */}
      <div className="border-t pt-6">
        <FriendSuggestionList />
      </div>
    </div>
  );
}
