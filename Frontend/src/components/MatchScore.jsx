import React from 'react';

const MatchScore = ({ score }) => {
  if (score === null || score === undefined) {
    return <span className="text-gray-500">N/A</span>;
  }

  // Convert score out of 10 to percentage (0-10 → 0-100)
  const percentage = Math.round(score * 10);

  const getScoreColor = (percentage) => {
    if (percentage >= 70) return { text: 'text-green-600', bg: 'bg-green-600' };
    if (percentage >= 50) return { text: 'text-orange-500', bg: 'bg-orange-500' };
    return { text: 'text-red-600', bg: 'bg-red-600' };
  };

  const colors = getScoreColor(percentage);

  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-1">
        <span className={`font-bold ${colors.text}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colors.bg}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default MatchScore;