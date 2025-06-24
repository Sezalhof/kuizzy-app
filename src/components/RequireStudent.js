import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

const RequireStudent = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!currentUser) return <Navigate to="/" replace />;
  if (userRole !== "student") return <Navigate to="/" replace />;

  return children;
};

export default RequireStudent;
