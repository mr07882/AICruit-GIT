import React from 'react';

const InfoCard = ({ title, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-purple-300 transition-colors text-left w-full"
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </button>
  );
};

export default InfoCard;