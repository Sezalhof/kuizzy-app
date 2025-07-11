import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function RequireStudent({ children }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser || userRole !== "student") {
    return <Navigate to="/" replace />;
  }

  return children;
}
