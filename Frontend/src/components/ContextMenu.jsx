import React, { useEffect, useRef } from 'react';

const ContextMenu = ({
  x,
  y,
  isVisible,
  onClose,
  candidate,
  onAIInterview,
  onHumanInterview,
  onViewProfile,
  onAccept,
  onReject,
  isEnded
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleMenuClick = (action) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${y}px`,
        left: `${x}px`,
        zIndex: 9999
      }}
      className="bg-white border border-gray-300 rounded shadow-lg w-48"
    >
      <button
        onClick={() => handleMenuClick(() => onAIInterview(candidate))}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b"
      >
        🤖 AI Interview
      </button>

      <button
        onClick={() => handleMenuClick(() => onHumanInterview(candidate))}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b"
      >
        👤 Human Interview
      </button>

      <button
        onClick={() => handleMenuClick(() => onViewProfile(candidate))}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b"
      >
        👁️ View Profile
      </button>

      <button
        onClick={() => handleMenuClick(() => onAccept(candidate))}
        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 border-b"
      >
        ✓ Accept
      </button>

      <button
        onClick={() => handleMenuClick(() => onReject(candidate))}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >
        ✕ Reject
      </button>
    </div>
  );
};

export default ContextMenu;
