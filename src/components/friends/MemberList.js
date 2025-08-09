import React from "react";

export default function MemberList({ members, user, isOwner, onAction }) {
  if (!members || members.length === 0)
    return <p className="text-center text-gray-400">No members in this group.</p>;

  return (
    <div className="mb-6">
      <h3 className="text-md font-semibold mb-2">Current Members:</h3>

      {members.map((m) => (
        <div
          key={m.uid}
          className="flex items-center justify-between border p-2 rounded hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            {m.photoURL ? (
              <img
                src={m.photoURL}
                alt={`${m.name} profile`}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/fallback-logo.png";
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-lg">
                ?
              </div>
            )}

            <div>
              <p className="font-medium">{m.name || "Unknown User"}</p>
              <p className="text-xs text-gray-500 truncate">
                📘 Grade {m.grade || "N/A"} | 🏫 {m.school || "N/A"}
              </p>
            </div>
          </div>

          {isOwner && m.uid !== user.uid && (
            <button
              onClick={() => onAction("remove", m)}
              className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              aria-label={`Remove ${m.name} from group`}
            >
              ⋮
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
