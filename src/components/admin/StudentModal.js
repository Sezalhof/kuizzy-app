import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import NotesManager from "./NotesManager";

export default function StudentModal({ student, onClose }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [showManageNotes, setShowManageNotes] = useState(false);

  // Fetch notes with useCallback
  const fetchNotes = useCallback(async () => {
    if (!student?.uid) return;
    try {
      const q = query(
        collection(db, "users", student.uid, "notes"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotes(list);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  }, [student?.uid]);

  useEffect(() => {
    setNote("");
    fetchNotes();
  }, [student, fetchNotes]);

  const handleSave = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "users", student.uid, "notes"), {
        text: note.trim(),
        createdAt: serverTimestamp(),
      });
      setNote("");
      await fetchNotes();
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteDoc(doc(db, "users", student.uid, "notes", noteId));
      await fetchNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const handleEditNote = async (noteId, newText) => {
    try {
      await updateDoc(doc(db, "users", student.uid, "notes", noteId), {
        text: newText.trim(),
      });
      await fetchNotes();
    } catch (err) {
      console.error("Error updating note:", err);
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!window.confirm(`Delete ${ids.length} selected notes?`)) return;
    try {
      await Promise.all(
        ids.map((id) =>
          deleteDoc(doc(db, "users", student.uid, "notes", id))
        )
      );
      await fetchNotes();
    } catch (err) {
      console.error("Error bulk deleting notes:", err);
    }
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold">Student Details</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Basic Info */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800">Basic Information</h4>
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>Name:</strong> {student.name || "—"}</p>
                <p><strong>Email:</strong> {student.email || "—"}</p>
                <p><strong>Grade:</strong> {student.grade || "—"}</p>
                <p><strong>Institution:</strong> {student.institution || student.school || "—"}</p>
                <p><strong>Upazila:</strong> {student.upazila || "—"}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Contact Information</h4>
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>Phone (WhatsApp):</strong> {student.phone || "—"}</p>
              </div>
            </div>
          </div>

          {/* Add New Note */}
          <div className="mt-6">
            <label htmlFor="note" className="block font-medium text-gray-800 mb-1">Add Note</label>
            <textarea
              id="note"
              rows={4}
              className="w-full p-2 border rounded"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add notes about this student..."
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
          </div>

          {/* Notes History */}
          <div className="mt-6 flex items-center justify-between">
            <h4 className="text-md font-semibold mb-2">📚 Notes History</h4>
            <button
              onClick={() => setShowManageNotes(true)}
              className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
            >
              🛠️ Manage Notes
            </button>
          </div>

          {notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes yet.</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto text-sm">
              {notes.slice(0, 3).map((n, index) => (
                <li key={n.id} className="border-b pb-2">
                  <div className="text-gray-800">
                    <strong>#{notes.length - index}</strong> — {n.text}
                  </div>
                  <div className="text-xs text-gray-500">
                    {n.createdAt?.toDate?.().toLocaleString() || "Just now"}
                  </div>
                </li>
              ))}
              {notes.length > 3 && (
                <p className="text-xs text-blue-600">…and {notes.length - 3} more. Use Manage Notes to view all.</p>
              )}
            </ul>
          )}

          {/* Close */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Manage Notes Modal */}
      {showManageNotes && (
        <NotesManager
          notes={notes}
          onClose={() => setShowManageNotes(false)}
          onDeleteNote={handleDeleteNote}
          onEditNote={handleEditNote}
          onBulkDelete={handleBulkDelete}
        />
      )}
    </div>
  );
}
