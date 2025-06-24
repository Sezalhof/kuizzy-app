// src/components/RequireTeacher.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner"; // Reusable loading component

export default function RequireTeacher({ children }) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Verifying access..." />;
  }

  if (userRole !== "teacher") {
    return (
      <Navigate 
        to="/" 
        replace 
        state={{ from: "teacher", message: "Teachers only area" }} 
      />
    );
  }

  return children;
}