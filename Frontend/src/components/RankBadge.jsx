import React from 'react';

const RankBadge = ({ rank }) => {
  const getRankColor = (rank) => {
    const colors = {
      1: 'bg-blue-50 text-blue-600 border-blue-200',
      2: 'bg-purple-50 text-purple-600 border-purple-200',
      3: 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return colors[rank] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const display = rank === null || rank === undefined ? 'N/A' : `#${rank}`;

  return (
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border font-bold ${getRankColor(rank)}`}>
      {display}
    </div>
  );
};

export default RankBadge;