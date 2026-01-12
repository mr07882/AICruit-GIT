import React from 'react';

const CandidateAvatar = ({ initials, name, email }) => {
  const displayName = name || 'N/A';
  const displayEmail = email || 'N/A';
  const displayInitials = initials || (displayName !== 'N/A' ? displayName.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'NA');

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center font-semibold text-gray-700">
        {displayInitials}
      </div>
      <div>
        <p className="font-medium text-gray-900">{displayName}</p>
        <p className="text-sm text-gray-500">{displayEmail}</p>
      </div>
    </div>
  );
};

export default CandidateAvatar;