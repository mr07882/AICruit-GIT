import React from 'react';

const StatusBadge = ({ status, statusColor }) => {
  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-50 text-green-700',
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-50 text-blue-700',
      red: 'bg-red-50 text-red-700'
    };
    return colors[color] || 'bg-gray-100 text-gray-700';
  };

  const display = status || 'N/A';

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getColorClasses(statusColor)}`}>
      {display}
    </span>
  );
};

export default StatusBadge;