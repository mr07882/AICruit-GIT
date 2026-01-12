import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthService';
import SettingsModal from './SettingsModal';

const Navbar = ({ variant = 'default', onFeedback, onLogout }) => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (variant === 'landing') {
    return (
      <nav className="bg-black text-white px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">AI-Cruit</h1>
          <div className="flex gap-6">
            <button
              onClick={() => navigate('/login')}
              className="hover:text-gray-300 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="hover:text-gray-300 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>
    );
  }

  if (variant === 'dashboard' || variant ==='candidate-drop-cv') {
    const currentUser = authService.getUser();
    const userRole = currentUser && (currentUser.role || currentUser.Role) ? String(currentUser.role || currentUser.Role).toLowerCase() : null;
    const isSuperAdmin = userRole === 'superadmin';

    return (
      <>
        <nav className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold">AI-Cruit</h1>
            <div className="flex gap-6 items-center">
              <button
                onClick={onFeedback}
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Feedback
              </button>
              
              {/* Settings Button - Only for Super Admin */}
              {isSuperAdmin && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-gray-700 hover:text-purple-600 transition-colors group relative"
                  title="Notification Settings"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={onLogout}
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </>
    );
  }

  // Default navbar (for other pages)
  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI-Cruit</h1>
      </div>
    </nav>
  );
};

export default Navbar;