// src/components/Navbar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import fallbackLogo from "../assets/fallback-logo.png";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Navbar({ user, profile, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = profile?.role;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout?.();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[Navbar] Logout failed:", err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <img src={fallbackLogo} alt="Logo" className="h-8 w-8 rounded-full" />
        <span className="font-bold text-lg">Kuizzy</span>
      </Link>

      {/* Links */}
      <div className="flex gap-4 items-center">
        <Link
          to="/"
          className={`hover:underline ${isActive("/") ? "font-bold" : ""}`}
        >
          Home
        </Link>

        {/* Student Links */}
        {user && userRole === "student" && (
          <>
            <Link
              to="/dashboard"
              className={`hover:underline ${isActive("/dashboard") ? "font-bold" : ""}`}
            >
              Dashboard
            </Link>
            <Link
              to="/friends"
              className={`hover:underline ${isActive("/friends") ? "font-bold" : ""}`}
            >
              Friends
            </Link>
            <Link
              to="/groups"
              className={`hover:underline ${isActive("/groups") ? "font-bold" : ""}`}
            >
              Groups
            </Link>
            <Link
              to="/leaderboard?scope=global"
              className={`hover:underline ${isActive("/leaderboard") ? "font-bold" : ""}`}
            >
              Leaderboard
            </Link>
            <Link
              to="/quiz"
              className={`hover:underline ${isActive("/quiz") ? "font-bold" : ""}`}
            >
              Quiz
            </Link>
          </>
        )}

        {/* Admin/Teacher Links */}
        {(userRole === "admin" || userRole === "teacher") && user && (
          <Link
            to="/admin"
            className={`hover:underline ${isActive("/admin") ? "font-bold" : ""}`}
          >
            Admin Dashboard
          </Link>
        )}

        {/* Enroll Link for logged-in users without role */}
        {user && !userRole && (
          <Link
            to="/enroll"
            className={`hover:underline ${isActive("/enroll") ? "font-bold" : ""}`}
          >
            Enroll
          </Link>
        )}

        {/* Leaderboard for guests */}
        {!user && (
          <Link
            to="/leaderboard?scope=global"
            className={`hover:underline ${isActive("/leaderboard") ? "font-bold" : ""}`}
          >
            Leaderboard
          </Link>
        )}
      </div>

      {/* User Section */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2">
            <img
              src={profile?.photoURL || user.photoURL || fallbackLogo}
              alt="User"
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackLogo;
              }}
            />
            <span className="text-sm font-medium truncate max-w-[150px]">
              {profile?.name || user.displayName || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/"
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
