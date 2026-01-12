import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../services/AuthService';

// Wrapper for routes that require authentication.
// If the user is not authenticated, redirect them to the landing page ('/').
// Note: keep `/candidate-drop-cv` as a public route (do not wrap that one with ProtectedRoute).
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  if (isAuthenticated()) return children;
  // Redirect unauthenticated users to landing page
  return <Navigate to="/" replace state={{ from: location }} />;
};

export default ProtectedRoute;
