import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import type { JSX } from 'react';

export function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-canvas-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canvas-700 border-t-brand-400" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
