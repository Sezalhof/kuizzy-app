import React from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import useAuth from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";

const SeedDataPage = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.uid ?? null);
  const functions = getFunctions();

  const handleSeedData = async () => {
    try {
      const seedFirestoreData = httpsCallable(functions, "seedFirestoreData");
      const result = await seedFirestoreData();
      alert(result.data.message || "Seeded successfully");
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Failed to seed data.");
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
    <div className="p-6 max-w-md mx-auto">
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
