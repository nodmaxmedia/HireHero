import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route so it is only accessible when:
 *   - The user is authenticated (valid, non-expired JWT in localStorage)
 *   - The user's role matches the required `role` prop (if provided)
 *
 * Redirects:
 *   - Not authenticated  →  /login
 *   - Wrong role         →  their own dashboard
 */
export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    const fallback = user.role === 'hr' ? '/dashboard-hr' : '/dashboard-applicant';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
