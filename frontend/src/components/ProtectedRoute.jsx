import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PortalLoader } from "./PortalLayout";

export function ProtectedRoute({ children }) {
  const { loading, token } = useAuth();

  if (loading) {
    return <PortalLoader kicker="Loading Session" title="Restoring your application..." />;
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
