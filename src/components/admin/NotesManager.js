// src/components/admin/NotesManager.js
import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";

export default function NotesManager({
  notes,
  onClose,
  onDeleteNote,
  onEditNote,
  onBulkDelete,
}) {
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showActions, setShowActions] = useState(null);
  const [editStates, setEditStates] = useState({});

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === notes.length) setSelected([]);
    else setSelected(notes.map((n) => n.id));
  };

  const startEdit = (id, text) => {
    setEditStates({ [id]: text });
  };

  const handleEditChange = (id, value) => {
    setEditStates((prev) => ({ ...prev, [id]: value }));
  };

  const saveEdit = (id) => {
    const newText = editStates[id];
    onEditNote(id, newText);
    setEditStates((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] min-h-[500px] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">📚 Manage Notes</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => setManageMode((m) => !m)}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              {manageMode ? "Cancel Manage" : "🛠️ Manage Mode"}
            </button>
            {manageMode && notes.length > 0 && (
              <label className="text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.length === notes.length}
                  onChange={toggleAll}
                  className="mr-2"
                />
                Select All
              </label>
            )}
            {manageMode && selected.length > 0 && (
              <button
                onClick={() => onBulkDelete(selected)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                🗑️ Delete Selected ({selected.length})
              </button>
            )}
          </div>

          {notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes found.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-[60vh] overflow-y-auto">
              {notes.map((note, index) => (
                <li
                  key={note.id}
                  className="border rounded p-2 flex items-start justify-between"
                >
                  <div className="flex-1">
                    {editStates[note.id] !== undefined ? (
                      <div>
                        <textarea
                          className="w-full p-1 border rounded text-sm"
                          value={editStates[note.id]}
                          onChange={(e) =>
                            handleEditChange(note.id, e.target.value)
                          }
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => saveEdit(note.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() =>
                              setEditStates((prev) => {
                                const p = { ...prev };
                                delete p[note.id];
                                return p;
                              })
                            }
                            className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-gray-800">
                          <strong>#{notes.length - index}</strong> — {note.text}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {note.createdAt?.toDate?.().toLocaleString() ||
                            "Just now"}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ml-2 flex flex-col items-end">
                    {manageMode && (
                      <input
                        type="checkbox"
                        className="mb-2"
                        checked={selected.includes(note.id)}
                        onChange={() => toggleSelect(note.id)}
                      />
                    )}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowActions((prev) =>
                            prev === note.id ? null : note.id
                          )
                        }
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {showActions === note.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10 text-sm">
                          <button
                            onClick={() => startEdit(note.id, note.text)}
                            className="block w-full px-3 py-1 hover:bg-gray-100 text-left"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="block w-full px-3 py-1 hover:bg-gray-100 text-left text-red-600"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
