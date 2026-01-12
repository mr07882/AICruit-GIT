import React from 'react';
import { Check, X } from 'lucide-react';

const RequirementMatch = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  const matchedCount = matches.filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {matches.map((match, idx) => (
          <div key={idx}>
            {match ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <X className="w-4 h-4 text-red-600" />
            )}
          </div>
        ))}
      </div>
      <span className="text-gray-600 text-sm">
        {matchedCount}/{matches.length}
      </span>
    </div>
  );
};

export default RequirementMatch;