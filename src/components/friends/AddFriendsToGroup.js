import React from "react";

export default function AddFriendsToGroup({ friendsToAdd, onAdd }) {
  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Add More Friends:</h3>
      {friendsToAdd.length === 0 ? (
        <p className="text-gray-400 text-sm">No available friends to add.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {friendsToAdd.map((f) => (
            <button
              key={f.uid}
              onClick={() => onAdd(f.uid)}
              className="text-left border rounded p-2 text-sm hover:bg-gray-50"
            >
              <p className="font-medium">{f.name}</p>
              <p className="text-xs text-gray-500">{f.email}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
