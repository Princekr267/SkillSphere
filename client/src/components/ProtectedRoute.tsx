import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'client' | 'freelancer' | 'admin'>;
}

/**
 * Route protection wrapper. Blocks unauthenticated users or users with incorrect roles.
 * Waits for auth loading to finish before making any redirect decisions.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, loading } = useAuth();

  // Wait for token verification before redirecting — prevents flashing to /login
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-line-gray"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-route-teal animate-spin"></div>
          </div>
          <p className="text-slate text-xs font-mono uppercase tracking-widest animate-pulse">
            Loading SkillSphere...
          </p>
        </div>
      </div>
    );
  }

  // If there is no token or authenticated user, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // If role isn't authorized, redirect to the user's own dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'client') return <Navigate to="/client-dashboard" replace />;
    if (user.role === 'freelancer') return <Navigate to="/freelancer-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
