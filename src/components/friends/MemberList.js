import React from "react";

export default function MemberList({ members, user, isOwner, onAction }) {
  return (
    <div className="mb-6">
      <h3 className="text-md font-semibold mb-2">Current Members:</h3>
      {members.map((m) => (
        <div
          key={m.uid}
          className="flex items-center justify-between border p-2 rounded hover:bg-gray-50"
        >
          <div>
            <p className="font-medium">{m.name}</p>
            <p className="text-xs text-gray-500">{m.email}</p>
          </div>
          {isOwner && m.uid !== user.uid && (
            <button
              onClick={() => onAction("remove", m)}
              className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              ⋮
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
