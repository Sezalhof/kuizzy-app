// ✅ FILE: src/components/forms/UserProfileForm.js

import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../kuizzy-app/src/firebase";
import { toast } from "react-toastify";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const COUNTRY_CODE = "+88"; // Default: Bangladesh

export default function UserProfileForm({ user, onComplete }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setGender(data.gender || "");
        setPhone(data.phone || "");
      }
    };
    fetchProfile();
  }, [user?.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !gender) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        phone,
        gender,
        email: user.email,
        photoURL: user.photoURL || "",
        school: "Class 3", // Default or can be customized
        createdAt: Date.now(),
      });
      toast.success("Profile saved successfully!");
      onComplete();
    } catch (err) {
      toast.error("Error saving profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white p-6 rounded shadow-md"
    >
      <h2 className="text-xl font-semibold mb-4 text-blue-700 text-center">
        Complete Your Profile
      </h2>
      <label className="block mb-2 font-medium">Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        required
      />

      <label className="block mb-2 font-medium">Gender</label>
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        required
      >
        <option value="">Select Gender</option>
        {GENDER_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <label className="block mb-2 font-medium">Phone Number</label>
      <div className="flex items-center border rounded mb-4 overflow-hidden">
        <span className="px-3 bg-gray-100 text-gray-600">{COUNTRY_CODE}</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 outline-none"
          placeholder="1XXXXXXXXX"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
