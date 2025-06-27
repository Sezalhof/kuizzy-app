import React, { useEffect, useState, useMemo } from "react";
import StudentFilters from "../../components/admin/StudentFilters";
import StatsCards from "../../components/admin/StatsCards";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { PhoneCall, ClipboardCopy } from "lucide-react";

export default function AdminDashboard({ user, userRole }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user || userRole !== "admin") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStudents(data);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user, userRole]);

  const uniqueGrades = [...new Set(students.map((s) => s.grade).filter(Boolean))];
  const uniqueInstitutions = [...new Set(students.map((s) => s.institution).filter(Boolean))];

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        Object.values(s).join(" ").toLowerCase().includes(search);
      const matchesGrade = !filterGrade || s.grade === filterGrade;
      const matchesInstitution =
        !filterInstitution || s.institution?.toLowerCase().includes(filterInstitution.toLowerCase());
      return matchesSearch && matchesGrade && matchesInstitution;
    });
  }, [students, searchTerm, filterGrade, filterInstitution]);

  const handleCopy = async (value, id) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openStudentDetails = (student) => {
    setSelectedStudent(student);
  };

  const closeStudentDetails = () => {
    setSelectedStudent(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" aria-busy="true">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 bg-red-100 text-red-700 rounded-xl shadow">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>This page is restricted to admin users only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded-3xl shadow-md border border-gray-200">
      <h1 className="text-3xl font-bold text-blue-700 mb-6 text-center">🎓 Student Management</h1>

      <StatsCards students={students} />

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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Institution
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{student.name || "—"}</div>
                  <div className="text-sm text-gray-500">{student.email || "—"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {student.grade || "—"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{student.institution || "—"}</div>
                  <div className="text-sm text-gray-500">{student.upazila || "—"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="px-4 py-2">{student.phone || '—'}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`tel:${student.phone}`, "_self")}
                      className="text-green-600 hover:text-green-800"
                      title="Call"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopy(student.phone, student.id)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Copy phone"
                    >
                      <ClipboardCopy className="w-4 h-4" />
                    </button>
                    {copiedId === student.id && (
                      <span className="text-xs text-green-500">Copied!</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openStudentDetails(student)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="text-center p-8 text-gray-500">No students found matching your criteria</div>
        )}
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold">Student Details</h3>
                <button
                  onClick={closeStudentDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800">Basic Information</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedStudent.name || "—"}</p>
                    <p><strong>Email:</strong> {selectedStudent.email || "—"}</p>
                    <p><strong>Grade:</strong> {selectedStudent.grade || "—"}</p>
                    <p><strong>Institution:</strong> {selectedStudent.institution || "—"}</p>
                    <p><strong>Upazila:</strong> {selectedStudent.upazila || "—"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Contact</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>Phone:</strong> {selectedStudent.phone || "—"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeStudentDetails}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}