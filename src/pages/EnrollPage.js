// src/pages/EnrollPage.js
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { updateUserProfile, getAllSchoolsGrouped, getGenderOptions, getReligionOptions, getClassOptions, clearSchoolsCache } from "../utils/firestoreUtils";

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
    divisionId: "",
    districtId: "",
    upazilaId: "",
    unionId: "",
    schoolId: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [schoolsData, setSchoolsData] = useState({});
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredUpazilas, setFilteredUpazilas] = useState([]);
  const [filteredUnions, setFilteredUnions] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const genderOptions = getGenderOptions();
  const religionOptions = getReligionOptions();
  const classOptions = getClassOptions();

  // Fetch schools on mount
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

  // Populate form from profile
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
        divisionId: profile.division || "",
        districtId: profile.district || "",
        upazilaId: profile.upazila || "",
        unionId: profile.union || "",
        schoolId: profile.school || "",
      }));
    }
  }, [profile, profileLoading]);

  // Auto-redirect if profile is complete
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

  // Filter districts/upazilas/unions/schools based on formData
  useEffect(() => {
    const { division, district, upazila, union } = formData;

    setFilteredDistricts(
      division && schoolsData[division] ? Object.keys(schoolsData[division]) : []
    );

    setFilteredUpazilas(
      division && district && schoolsData[division]?.[district]
        ? Object.keys(schoolsData[division][district])
        : []
    );

    setFilteredUnions(
      division && district && upazila && schoolsData[division]?.[district]?.[upazila]
        ? Object.keys(schoolsData[division][district][upazila])
        : []
    );

    setFilteredSchools(
      division &&
        district &&
        upazila &&
        union &&
        Array.isArray(schoolsData[division]?.[district]?.[upazila]?.[union])
        ? schoolsData[division][district][upazila][union].filter((name) =>
            name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : []
    );
  }, [formData, schoolsData, searchTerm]);

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
      ...(name === "division" ? { district: "", upazila: "", union: "", school: "" } : {}),
      ...(name === "district" ? { upazila: "", union: "", school: "" } : {}),
      ...(name === "upazila" ? { union: "", school: "" } : {}),
      ...(name === "union" ? { school: "" } : {}),
    }));

    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      name, phone, countryCode, division, district, upazila,
      union, school, grade, role, gender, religion
    } = formData;

    if (!name || !phone || !division || !district || !upazila || !union || !school || !grade || !role || !gender || !religion) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(uid, {
        name, phone, countryCode, division, district, upazila, union, school,
        grade, role, gender, religion,
        email: user?.email || "",
        createdAt: profile?.createdAt ?? Date.now(),
        divisionId: division,
        districtId: district,
        upazilaId: upazila,
        unionId: union,
        schoolId: school,
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
      <h2 className="text-2xl font-semibold text-center mb-6">Complete Your Profile</h2>
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

        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select Gender</option>
          {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select name="religion" value={formData.religion} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select Religion</option>
          {religionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select name="division" value={formData.division} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select Division</option>
          {Object.keys(schoolsData).map((division) => <option key={division} value={division}>{division}</option>)}
        </select>

        <select name="district" value={formData.district} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select District</option>
          {filteredDistricts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>

        <select name="upazila" value={formData.upazila} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select Upazila</option>
          {filteredUpazilas.map((upa) => <option key={upa} value={upa}>{upa}</option>)}
        </select>

        <select name="union" value={formData.union} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select Union / Pouroshava</option>
          {filteredUnions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>

        <input
          type="text"
          placeholder="Search School Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <select name="school" value={formData.school} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select School</option>
          {filteredSchools.map((school) => <option key={school} value={school}>{school}</option>)}
        </select>

        <select name="grade" value={formData.grade} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Select Class/Grade</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>

        <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
