import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    console.log("🧩 [AdminDashboard] Mounted");
    console.log("👤 [AdminDashboard] Auth user:", user);
    console.log("📄 [AdminDashboard] Profile loading:", profileLoading);
    console.log("🧬 [AdminDashboard] Profile:", profile);
  }, [user, profile, profileLoading]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user?.uid || !profile || profileLoading) {
        console.log("⏳ [AdminDashboard] Waiting for UID or profile to load...");
        return;
      }

      console.log("🚀 [AdminDashboard] Fetching users from Firestore...");

      try {
        const usersRef = collection(db, "users");

        const studentsSnap = await getDocs(query(usersRef, where("role", "==", "student")));
        const teachersSnap = await getDocs(query(usersRef, where("role", "==", "teacher")));

        const studentsList = studentsSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
        const teachersList = teachersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

        console.log("🎓 [AdminDashboard] Students loaded:", studentsList);
        console.log("👩‍🏫 [AdminDashboard] Teachers loaded:", teachersList);

        setStudents(studentsList);
        setTeachers(teachersList);
      } catch (error) {
        console.error("❌ [AdminDashboard] Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [user?.uid, profile, profileLoading]);

  if (profileLoading || loadingUsers) {
    console.log("🔄 [AdminDashboard] Showing loading spinner...");
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  if (!profile || profile.role !== "admin") {
    console.warn("🚫 [AdminDashboard] Access denied. Not an admin.");
    return (
      <div className="p-4 text-center text-red-600 font-semibold">
        ❌ Access Denied: Admins only
      </div>
    );
  }

  console.log("✅ [AdminDashboard] Rendering admin dashboard UI");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Admin Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">👩‍🎓 All Students ({students.length})</h2>
        <ul className="space-y-2">
          {students.map((student) => (
            <li key={student.uid} className="p-3 bg-white rounded shadow flex justify-between">
              <span>{student.name}</span>
              <span className="text-sm text-gray-500">
                {student.grade} - {student.school}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">👨‍🏫 All Teachers ({teachers.length})</h2>
        <ul className="space-y-2">
          {teachers.map((teacher) => (
            <li key={teacher.uid} className="p-3 bg-white rounded shadow flex justify-between">
              <span>{teacher.name}</span>
              <span className="text-sm text-gray-500">{teacher.email}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
