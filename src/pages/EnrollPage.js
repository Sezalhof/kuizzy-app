// src/pages/EnrollPage.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { updateUserProfile } from "../utils/firestoreUtils";

export default function EnrollPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const uid = user?.uid || null;
  const { profile, loading: profileLoading } = useUserProfile(uid);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    countryCode: "+88",
    school: "",
    grade: "",
    role: "student",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form if profile partially exists
  useEffect(() => {
    if (profile && !profileLoading) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        countryCode: profile.countryCode || "+88",
        school: profile.school || "",
        grade: profile.grade || "",
        role: profile.role || "student",
      });
    }
  }, [profile, profileLoading]);

  // Redirect if profile is already complete
  useEffect(() => {
    if (
      profile?.name &&
      profile?.role &&
      profile?.school &&
      profile?.grade &&
      profile?.phone
    ) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  // Show loading while UID or profile is loading
  if (!uid || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-lg animate-pulse" aria-live="polite" aria-busy="true">
          Loading...
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(""); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uid) return;

    const { name, phone, countryCode, school, grade, role } = formData;

    if (!name || !phone || !school || !grade || !role) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(uid, {
        name,
        phone,
        countryCode,
        school,
        grade,
        role,
        email: user?.email || "", // ✅ Automatically pulled from Firebase Auth
        createdAt: profile?.createdAt ?? Date.now(),
      });
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded-xl">
      <h2 className="text-2xl font-semibold text-center mb-6">Complete Your Profile</h2>
      {error && <div className="mb-4 text-red-500 text-sm" role="alert">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="form-instructions">
        <input
          name="name"
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          aria-required="true"
          aria-label="Full Name"
        />
        <div className="flex space-x-2">
          <input
            name="countryCode"
            type="text"
            value={formData.countryCode}
            onChange={handleChange}
            className="w-1/3 p-2 border rounded"
            aria-label="Country Code"
            aria-required="true"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className="w-2/3 p-2 border rounded"
            aria-required="true"
            aria-label="Phone Number"
          />
        </div>
        <input
          name="school"
          type="text"
          placeholder="School Name"
          value={formData.school}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          aria-required="true"
          aria-label="School Name"
        />
        <input
          name="grade"
          type="text"
          placeholder="Class / Grade"
          value={formData.grade}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          aria-required="true"
          aria-label="Class or Grade"
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          aria-required="true"
          aria-label="Role"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
