import React, { useEffect } from "react";
import useAuth from "../hooks/useAuth";
import useUserProfile from "../hooks/useUserProfile";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import InviteStudentForm from "../components/teacher/InviteStudentForm";

const TeacherDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const validUid = !authLoading && typeof user?.uid === "string" ? user.uid : null;

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(validUid);

  useEffect(() => {
    console.log("[TeacherDashboard] Auth user:", user);
    console.log("[TeacherDashboard] Profile loading:", profileLoading);
    console.log("[TeacherDashboard] Profile data:", profile);
    console.log("[TeacherDashboard] Profile error:", profileError);
  }, [user, profileLoading, profile, profileError]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-[40vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="text-center mt-20 text-red-600">
        Missing profile. Please enroll or refresh.
      </div>
    );
  }

  const isTeacher = profile?.role === "teacher";

  if (!isTeacher) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 text-center text-red-600 font-semibold">
        ⚠️ You do not have teacher access.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">
        👋 Welcome{profile?.name ? `, ${profile.name}` : ""}!
      </h1>
      <p className="text-center mb-6">This is your dashboard. Here you can:</p>
      <ul className="mb-8 list-disc list-inside">
        <li>View your students</li>
        <li>Create and review quizzes</li>
        <li>Track student performance</li>
        <li>Post announcements</li>
        <li>Upload materials</li>
      </ul>

      <hr className="my-6" />

      {/* 🔗 Invite Student Feature */}
      <InviteStudentForm />
    </div>
  );
};

export default TeacherDashboard;
