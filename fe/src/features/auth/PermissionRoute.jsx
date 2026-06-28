import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';

function PermissionRoute({ permission }) {
  const { user } = useAuth();
  const permissions = new Set(user?.permissions || []);

  if (!permissions.has(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PermissionRoute;
