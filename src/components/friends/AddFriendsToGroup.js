import React from "react";

export default function AddFriendsToGroup({ friendsToAdd, onAdd }) {
  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Add More Guests👥:</h3>
      {friendsToAdd.length === 0 ? (
        <p className="text-gray-400 text-sm">Invite👥to the Guest Room first!</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {friendsToAdd.map((f) => (
            <button
              key={f.uid}
              onClick={() => onAdd(f.uid)}
              className="text-left border rounded p-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              {f.photoURL ? (
                <img
                  src={f.photoURL}
                  alt={`${f.name} profile`}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/fallback-logo.png"; // your fallback image path
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs">
                  ?
                </div>
              )}
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-gray-500">
                  {f.grade ? `Grade: ${f.grade}` : "Grade: N/A"} |{" "}
                  {f.school ? `School: ${f.school}` : "School: N/A"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
