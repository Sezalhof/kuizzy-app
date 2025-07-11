import React from "react";

export default function ConfirmActionModal({ user, actionType, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-5 w-72 text-center">
        <h3 className="font-semibold text-lg mb-2">Confirm Action</h3>
        <p className="text-sm mb-4">
          Are you sure you want to <strong>{actionType}</strong> <br />
          <span className="text-blue-600">{user.name}</span>?
        </p>
        <div className="flex justify-between mt-4">
          <button
            onClick={onCancel}
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
