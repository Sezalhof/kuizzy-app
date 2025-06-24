import { useEffect, useState } from 'react';
import { db, auth, provider } from "./firebase"; //
import { doc, getDoc } from 'firebase/firestore';

export default function StudentProfile() {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to view your profile.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudentData(docSnap.data());
        } else {
          setError('Profile data not found. Please complete enrollment.');
        }
      } catch (err) {
        setError('Error fetching profile: ' + err.message);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-4 bg-red-100 text-red-700 rounded-xl shadow">
        <p>{error}</p>
      </div>
    );
  }

  const { name, upazila, grade, institution, fatherPhone, motherPhone, friendGroup, email } = studentData;

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-3xl shadow-lg border border-blue-200">
      <h2 className="text-3xl font-extrabold text-center text-blue-700 mb-6">📄 Student Profile</h2>

      <div className="grid gap-4">
        <ProfileField label="Name" value={name} />
        <ProfileField label="Email" value={email} />
        <ProfileField label="Grade / Level" value={grade} />
        <ProfileField label="Upazila" value={upazila} />
        <ProfileField label="Institution" value={institution} />
        <ProfileField label="Friend Group" value={friendGroup} />
        <ProfileField label="Father's Phone" value={fatherPhone} />
        <ProfileField label="Mother's Phone" value={motherPhone} />
      </div>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b pb-2">
      <span className="text-gray-600 font-semibold">{label}</span>
      <span className="text-gray-900 font-medium">{value || '—'}</span>
    </div>
  );
}
