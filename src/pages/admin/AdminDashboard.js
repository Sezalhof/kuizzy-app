import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import useAuth from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";

import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StudentFilters from "../../components/admin/StudentFilters";
import StudentTable from "../../components/admin/StudentTable";
import StudentModal from "../../components/admin/StudentModal";
import StatsCards from "../../components/admin/StatsCards";

import ExportDropdown from "../../components/admin/ExportDropdown";
import BanButton from "../../components/admin/BanButton";
import WhatsAppCallButton from "../../components/admin/WhatsAppCallButton";
import PageControls from "../../components/admin/PageControls";
import PageSizeSelector from "../../components/admin/PageSizeSelector";

import usePagination from "../../hooks/usePagination";
import { useNavigate, Outlet } from "react-router-dom"; // ✅ Added Outlet for nested routing

const AdminDashboard = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const {
    currentPage,
    pageSize,
    totalPages,
    setPageSize,
    setCurrentPage,
    paginatedData,
  } = usePagination(filteredStudents);

  const navigate = useNavigate(); // ✅ Navigate hook

  const uniqueGrades = useMemo(() => {
    return [...new Set(students.map((s) => s.grade).filter(Boolean))].sort();
  }, [students]);

  const uniqueInstitutions = useMemo(() => {
    return [...new Set(
      students.map((s) => s.institution || s.school || "").filter(Boolean)
    )].sort();
  }, [students]);

  const selectedStudents = students.filter((s) => selectedIds.includes(s.uid));

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedData.map((s) => s.uid);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])]
    );
  };

  const allSelected =
    paginatedData.length > 0 &&
    paginatedData.every((s) => selectedIds.includes(s.uid));

  const saveNote = async (studentUid, note) => {
    try {
      await updateDoc(doc(db, "users", studentUid), { notes: note });
      alert("Note saved successfully.");
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Failed to save note.");
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setStudents(list);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (!user?.uid || !profile || profileLoading) return;
    if (profile.role !== "admin") return;

    fetchStudents();
  }, [user, profile, profileLoading]);

  useEffect(() => {
    let filtered = [...students];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(lower) ||
          s.email?.toLowerCase().includes(lower) ||
          s.uid?.toLowerCase().includes(lower)
      );
    }

    if (filterGrade) filtered = filtered.filter((s) => s.grade === filterGrade);
    if (filterInstitution)
      filtered = filtered.filter(
        (s) =>
          s.institution === filterInstitution || s.school === filterInstitution
      );

    setFilteredStudents(filtered);
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, filterGrade, filterInstitution, students, setCurrentPage]);

  if (profileLoading || loadingStudents) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="p-4 text-center text-red-600 font-semibold">
        ❌ Access Denied: Admins only
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>

      {/* ✅ Go to Seeder Page Button */}
      <button
        onClick={() => navigate("/admin/seed")}
        className="mt-2 mb-4 bg-purple-600 text-white px-4 py-2 rounded"
      >
        Go to Seeder Page
      </button>

      <StatsCards students={filteredStudents} />

      <StudentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterGrade={filterGrade}
        setFilterGrade={setFilterGrade}
        filterInstitution={filterInstitution}
        setFilterInstitution={setFilterInstitution}
        uniqueGrades={uniqueGrades}
        uniqueInstitutions={uniqueInstitutions}
      />

      <div className="flex flex-wrap gap-4 justify-end items-center mb-4">
        <ExportDropdown students={selectedStudents} />
        <BanButton
          selectedStudents={selectedStudents}
          setStudents={setStudents}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
        <WhatsAppCallButton selectedStudents={selectedStudents} />
      </div>

      <StudentTable
        students={paginatedData}
        onCopy={(value) => {
          navigator.clipboard.writeText(value);
          alert("Copied to clipboard!");
        }}
        copiedId={null}
        onDetails={(s) => setSelectedStudent(s)}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        toggleSelectAll={toggleSelectAll}
        allSelected={allSelected}
      />

      <PageControls
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />

      <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />

      <StudentModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onSaveNote={saveNote}
      />

      {/* ✅ For nested route rendering like /admin/seed */}
      <Outlet />
    </div>
  );
};

export default AdminDashboard;
