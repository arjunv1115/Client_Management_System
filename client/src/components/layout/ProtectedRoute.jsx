import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-sm text-muted">
          <Spinner className="h-6 w-6 text-primary" />
          <p>Opening your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}

export function RoleRoute({ roles, children, allowClient = false }) {
  const { user, isClient } = useAuth();
  const location = useLocation();

  if (isClient && !allowClient) {
    return <Navigate to="/client-portal" replace />;
  }
  if (!isClient && allowClient && !roles) {
    return children;
  }
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={isClient ? '/client-portal' : '/unauthorized'} replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function ClientOnly({ children }) {
  const { isClient } = useAuth();
  if (!isClient) return <Navigate to="/dashboard" replace />;
  return children;
}
