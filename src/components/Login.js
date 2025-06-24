import React from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/quiz');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <button
        onClick={handleLogin}
        className="px-6 py-3 text-white bg-black rounded-xl shadow-xl text-lg font-semibold hover:bg-gray-800 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;
