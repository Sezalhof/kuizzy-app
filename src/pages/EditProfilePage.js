import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  console.log("📄 [EnrollPage] UID:", user?.uid);
  console.log("🧬 [EnrollPage] Profile:", profile);
  console.log("⏳ [EnrollPage] Profile Loading:", profileLoading);

  const [formData, setFormData] = useState({
    name: '',
    upazila: '',
    institution: '',
    grade: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || profileLoading || !profile) return;
      setFormData({
        name: profile.name || '',
        upazila: profile.upazila || '',
        institution: profile.institution || '',
        grade: profile.grade || ''
      });
      setLoading(false);
    };
    fetchProfile();
  }, [user, profile, profileLoading]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const friendGroup = formData.grade.toLowerCase().replace(/\s+/g, '');
    await setDoc(doc(db, 'users', user.uid), {
      ...formData,
      email: user.email,
      uid: user.uid,
      friendGroup,
      updatedAt: new Date()
    });
    navigate('/profile');
  };

  if (loading || profileLoading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-2xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-800">Edit Profile</h2>

      <input
        name="name"
        placeholder="Full Name"
        value={formData.name}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        name="upazila"
        placeholder="Upazila"
        value={formData.upazila}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        name="institution"
        placeholder="Institution Name"
        value={formData.institution}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        name="grade"
        value={formData.grade}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select Your Grade/Level</option>
        {[
          'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7',
          'Class 8', 'Class 9', 'Class 10', 'HSC 1st Year', 'HSC 2nd Year',
          'BA/BSc 1st Year', '2nd Year', '3rd Year', '4th Year', 'MA/MSc'
        ].map((grade, idx) => (
          <option key={idx} value={grade}>{grade}</option>
        ))}
      </select>

      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition duration-200"
      >
        Save Changes
      </button>
    </form>
  );
}
