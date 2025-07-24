import React from "react";
import { setDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useUserProfile } from "../../hooks/useUserProfile";
import useAuth from "../../hooks/useAuth";

const SeedDataPage = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.uid ?? null);

  const handleSeedData = async () => {
    try {
      const schoolsRef = doc(db, 'schools', 'dhaka_school_id');
      await setDoc(schoolsRef, {
        name: 'Dhaka School',
        cityCorporation: 'Dhaka North',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Tejgaon',
        address: '123 Main St',
        createdAt: Date.now(),
      });

      const classRef = doc(db, 'grades', 'class3_id');
      await setDoc(classRef, {
        name: 'Class 3',
        description: 'Third grade students',
        createdAt: Date.now(),
      });

      alert('Firestore data seeded successfully!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data.');
    }
  };

  if (!user) {
    return <div className="p-6 text-center text-red-600">You must be logged in to view this page.</div>;
  }

  if (profileLoading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (profileError) {
    return <div className="p-6 text-center text-red-600">Error loading profile: {profileError}</div>;
  }

  if (!profile || profile.role !== "admin") {
    return <div className="p-6 text-center text-red-600">You must be an admin to seed data.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Seed Data Page</h1>
      <button
        onClick={handleSeedData}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Seed Firestore Data
      </button>
    </div>
  );
};

export default SeedDataPage;
