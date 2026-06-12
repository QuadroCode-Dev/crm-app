import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
