import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';

function RoleRoute({ allowedRoles = [] }) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
