// src/pages/EnrollPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  updateUserProfile,
  getAllSchoolsGrouped,
  getGenderOptions,
  getReligionOptions,
} from "../utils/firestoreUtils";

export default function EnrollPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid || null;
  const { profile, loading: profileLoading } = useUserProfile(uid);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    countryCode: "+88",
    division: "",
    district: "",
    upazila: "",
    union: "",
    school: "",
    grade: "",
    gender: "",
    religion: "",
    role: "student",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [schoolsData, setSchoolsData] = useState({});
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredUpazilas, setFilteredUpazilas] = useState([]);
  const [filteredUnions, setFilteredUnions] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);

  const genderOptions = getGenderOptions();
  const religionOptions = getReligionOptions();

  useEffect(() => {
    async function fetchSchools() {
      try {
        const data = await getAllSchoolsGrouped();
        setSchoolsData(data || {});
      } catch (err) {
        console.error("Failed to load schools data:", err);
      }
    }
    fetchSchools();
  }, []);

  useEffect(() => {
    if (profile && !profileLoading) {
      setFormData((prev) => ({
        ...prev,
        name: profile.name || "",
        phone: profile.phone || "",
        countryCode: profile.countryCode || "+88",
        division: profile.division || "",
        district: profile.district || "",
        upazila: profile.upazila || "",
        union: profile.union || "",
        school: profile.school || "",
        grade: profile.grade || "",
        gender: profile.gender || "",
        religion: profile.religion || "",
        role: profile.role || "student",
      }));
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (
      profile?.name &&
      profile?.phone &&
      profile?.school &&
      profile?.grade &&
      profile?.role
    ) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    const { division, district, upazila, union } = formData;

    if (division && schoolsData[division]) {
      setFilteredDistricts(Object.keys(schoolsData[division]));
    } else {
      setFilteredDistricts([]);
    }

    if (division && district && schoolsData[division]?.[district]) {
      setFilteredUpazilas(Object.keys(schoolsData[division][district]));
    } else {
      setFilteredUpazilas([]);
    }

    if (
      division &&
      district &&
      upazila &&
      schoolsData[division]?.[district]?.[upazila]
    ) {
      setFilteredUnions(Object.keys(schoolsData[division][district][upazila]));
    } else {
      setFilteredUnions([]);
    }

    if (
      division &&
      district &&
      upazila &&
      union &&
      Array.isArray(
        schoolsData[division]?.[district]?.[upazila]?.[union]
      )
    ) {
      setFilteredSchools(
        schoolsData[division][district][upazila][union]
      );
    } else {
      setFilteredSchools([]);
    }
  }, [
    formData.division,
    formData.district,
    formData.upazila,
    formData.union,
    schoolsData,
  ]);

  

  if (!uid || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "division"
        ? { district: "", upazila: "", union: "", school: "" }
        : {}),
      ...(name === "district"
        ? { upazila: "", union: "", school: "" }
        : {}),
      ...(name === "upazila" ? { union: "", school: "" } : {}),
      ...(name === "union" ? { school: "" } : {}),
    }));

    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      name,
      phone,
      countryCode,
      division,
      district,
      upazila,
      union,
      school,
      grade,
      role,
      gender,
      religion,
    } = formData;

    if (
      !name ||
      !phone ||
      !division ||
      !district ||
      !upazila ||
      !union ||
      !school ||
      !grade ||
      !role ||
      !gender ||
      !religion
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(uid, {
        name,
        phone,
        countryCode,
        division,
        district,
        upazila,
        union,
        school,
        grade,
        role,
        gender,
        religion,
        email: user?.email || "",
        createdAt: profile?.createdAt ?? Date.now(),
      });
      navigate("/dashboard");
    } catch (err) {
      setError("❌ Failed to save profile. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded-xl">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Complete Your Profile
      </h2>

      {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <div className="flex space-x-2">
          <input
            name="countryCode"
            type="text"
            value={formData.countryCode}
            onChange={handleChange}
            className="w-1/3 p-2 border rounded"
            required
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className="w-2/3 p-2 border rounded"
            required
          />
        </div>

        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Gender</option>
          {genderOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          name="religion"
          value={formData.religion}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Religion</option>
          {religionOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          name="division"
          value={formData.division}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Division</option>
          {Object.keys(schoolsData).map((division) => (
            <option key={division} value={division}>
              {division}
            </option>
          ))}
        </select>

        <select
          name="district"
          value={formData.district}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select District</option>
          {filteredDistricts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>

        <select
          name="upazila"
          value={formData.upazila}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Upazila</option>
          {filteredUpazilas.map((upazila) => (
            <option key={upazila} value={upazila}>
              {upazila}
            </option>
          ))}
        </select>

        <select
          name="union"
          value={formData.union}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Union / Pouroshava</option>
          {filteredUnions.map((union) => (
            <option key={union} value={union}>
              {union}
            </option>
          ))}
        </select>

        <select
          name="school"
          value={formData.school}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select School</option>
          {filteredSchools.map((schoolName) => (
            <option key={schoolName} value={schoolName}>
              {schoolName}
            </option>
          ))}
        </select>

        <select
          name="grade"
          value={formData.grade}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Class/Grade</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={`Class ${i + 1}`}>
              {`Class ${i + 1}`}
            </option>
          ))}
        </select>

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
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
