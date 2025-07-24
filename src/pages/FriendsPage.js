import React, { useState } from "react";
import FriendList from "../components/friends/FriendList";
import AddFriendForm from "../components/friends/AddFriendForm";
import FriendSuggestionList from "../components/friends/FriendSuggestionList";

const tabs = [
  { key: "friends", label: "🤗 My Teammates" },
  { key: "pending", label: "📥 Incoming Invites" },
  { key: "sent", label: "📤 Outgoing Invites" },
];

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState("friends");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
        🤗 My Teammates
      </h1>

      {/* Tabs */}
      <div className="flex justify-center space-x-6 mb-6 border-b border-gray-300">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-semibold ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Friend Form & Suggestions */}
      {activeTab === "friends" && (
        <>
          <div className="mb-6">
            <AddFriendForm />
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              💡 Meet Future Teammates!
            </h2>
            <FriendSuggestionList />
          </div>
        </>
      )}

      {/* Friend List (accepted / pending / sent based on tab) */}
      <FriendList activeTab={activeTab} />
    </div>
  );
}
