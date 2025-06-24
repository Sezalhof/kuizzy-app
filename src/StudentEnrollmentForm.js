import { useState } from 'react';
import { db, auth } from "./firebase"; // Removed unused 'provider'
import { doc, setDoc } from 'firebase/firestore';

const grades = [
  'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7',
  'Class 8', 'Class 9', 'Class 10', 'HSC 1st Year', 'HSC 2nd Year',
  'BA/BSc 1st Year', '2nd Year', '3rd Year', '4th Year', 'MA/MSc'
];

export default function StudentEnrollmentForm() {
  const [formData, setFormData] = useState({
    name: '',
    upazila: '',
    fatherPhone: '',
    motherPhone: '',
    institution: '',
    grade: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert('Please log in first!');
      return;
    }

    setLoading(true);
    try {
      const friendGroup = formData.grade.toLowerCase().replace(/\s+/g, '');
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        ...formData,
        friendGroup,
        createdAt: new Date()
      });
      setSubmitted(true);
    } catch (err) {
      alert('Error saving data: ' + err.message);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 text-center bg-green-100 rounded-2xl shadow">
        <h2 className="text-xl font-bold text-green-700 mb-2">Enrollment Successful 🎉</h2>
        <p className="text-green-600">You can now access quizzes and friend features.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-2xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-800">Student Enrollment</h2>

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
        name="fatherPhone"
        placeholder="Father's Phone"
        type="tel"
        value={formData.fatherPhone}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        name="motherPhone"
        placeholder="Mother's Phone"
        type="tel"
        value={formData.motherPhone}
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
        {grades.map((grade, idx) => (
          <option key={idx} value={grade}>{grade}</option>
        ))}
      </select>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 text-white rounded-xl transition-all duration-300 ${
          loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
