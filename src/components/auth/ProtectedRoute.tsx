import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingScreen } from '../LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireProfile?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireProfile = false,
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen progress={1} status="Checking your library card…" />;
  }

  // Must be signed in with Google
  if (!user) {
    return (
      <Navigate
        to="/join"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  // For routes requiring a full profile (/lobby, /room/:code)
  if (requireProfile && !profile) {
    return (
      <Navigate
        to="/setup"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return children;
};
