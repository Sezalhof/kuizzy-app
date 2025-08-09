// src/pages/EditProfilePage.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  updateUserProfile,
  getAllSchoolsGrouped,
  getClassOptions,
  getGenderOptions,
  getReligionOptions,
} from "../utils/firestoreUtils";

const EditProfilePage = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid ?? null);
  const navigate = useNavigate();

  // Initial form state keys aligned to profile structure
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "",
    religion: "",
    schoolDivision: "",
    schoolDistrict: "",
    schoolUpazila: "",
    schoolUnion: "",
    schoolName: "",
    class: "",
  });

  // Schools data nested: division → district → upazila → union → schools[]
  const [schoolOptions, setSchoolOptions] = useState({});

  const classOptions = getClassOptions();
  const genderOptions = getGenderOptions();
  const religionOptions = getReligionOptions();

  // Load all schools grouped nested by division → district → upazila → union → schools array
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const schools = await getAllSchoolsGrouped();
        setSchoolOptions(schools || {});
      } catch (err) {
        console.error("Failed to fetch schools:", err);
        setSchoolOptions({});
      }
    };
    fetchSchools();
  }, []);

  // Prefill form with profile data when loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        gender: profile.gender || "",
        religion: profile.religion || "",
        schoolDivision: profile.schoolDivision || "",
        schoolDistrict: profile.schoolDistrict || "",
        schoolUpazila: profile.schoolUpazila || "",
        schoolUnion: profile.schoolUnion || "",
        schoolName: profile.schoolName || "",
        class: profile.class || "",
      });
    }
  }, [profile]);

  // Filtered dropdown options based on current selections
  const filteredDistricts = formData.schoolDivision
    ? Object.keys(schoolOptions[formData.schoolDivision] || {})
    : [];

  const filteredUpazilas = formData.schoolDivision && formData.schoolDistrict
    ? Object.keys(
        schoolOptions[formData.schoolDivision]?.[formData.schoolDistrict] || {}
      )
    : [];

  const filteredUnions = formData.schoolDivision &&
    formData.schoolDistrict &&
    formData.schoolUpazila
    ? Object.keys(
        schoolOptions[formData.schoolDivision]?.[formData.schoolDistrict]?.[
          formData.schoolUpazila
        ] || {}
      )
    : [];

  const filteredSchools = formData.schoolDivision &&
    formData.schoolDistrict &&
    formData.schoolUpazila &&
    formData.schoolUnion
    ? schoolOptions[formData.schoolDivision]?.[formData.schoolDistrict]?.[
        formData.schoolUpazila
      ]?.[formData.schoolUnion] || []
    : [];

  // Handle cascading resets on parent select change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "schoolDivision" && {
        schoolDistrict: "",
        schoolUpazila: "",
        schoolUnion: "",
        schoolName: "",
      }),
      ...(name === "schoolDistrict" && {
        schoolUpazila: "",
        schoolUnion: "",
        schoolName: "",
      }),
      ...(name === "schoolUpazila" && {
        schoolUnion: "",
        schoolName: "",
      }),
      ...(name === "schoolUnion" && {
        schoolName: "",
      }),
    }));
  };

  // Submit updated profile data
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    // Validation for all required fields
    if (
      !formData.fullName ||
      !formData.phone ||
      !formData.gender ||
      !formData.religion ||
      !formData.schoolDivision ||
      !formData.schoolDistrict ||
      !formData.schoolUpazila ||
      !formData.schoolUnion ||
      !formData.schoolName ||
      !formData.class
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      // Save profile update
      await updateUserProfile(user.uid, formData);
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to update profile.");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

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
          name="schoolDivision"
          value={formData.schoolDivision}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Division</option>
          {Object.keys(schoolOptions).map((division) => (
            <option key={division} value={division}>
              {division}
            </option>
          ))}
        </select>

        <select
          name="schoolDistrict"
          value={formData.schoolDistrict}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
          disabled={!filteredDistricts.length}
        >
          <option value="">Select District</option>
          {filteredDistricts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>

        <select
          name="schoolUpazila"
          value={formData.schoolUpazila}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
          disabled={!filteredUpazilas.length}
        >
          <option value="">Select Upazila</option>
          {filteredUpazilas.map((upazila) => (
            <option key={upazila} value={upazila}>
              {upazila}
            </option>
          ))}
        </select>

        <select
          name="schoolUnion"
          value={formData.schoolUnion}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
          disabled={!filteredUnions.length}
        >
          <option value="">Select Union / Pouroshava</option>
          {filteredUnions.map((union) => (
            <option key={union} value={union}>
              {union}
            </option>
          ))}
        </select>

        <select
          name="schoolName"
          value={formData.schoolName}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
          disabled={!filteredSchools.length}
        >
          <option value="">Select School</option>
          {filteredSchools.map((schoolName) => (
            <option key={schoolName} value={schoolName}>
              {schoolName}
            </option>
          ))}
        </select>

        <select
          name="class"
          value={formData.class}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Class</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Update Profile
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;
