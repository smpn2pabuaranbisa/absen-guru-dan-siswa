import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { Role } from "@/types";

interface ProtectedRouteProps {
  allowedRoles?: Role | Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!rolesArray.includes(user.role)) {
      // If user tries to access a route for a different role, redirect them to their respective home
      const redirectPath = 
        user.role === "guru" ? "/guru/home" : 
        user.role === "satpam" ? "/kiosk" :
        user.role === "wali" ? "/wali/home" :
        "/admin/dashboard";
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <Outlet />;
}
