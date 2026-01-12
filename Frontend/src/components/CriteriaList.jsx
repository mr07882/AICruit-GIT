import React from 'react';

const CriteriaList = ({ items, onRemove, readOnly = false }) => {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg group hover:border-gray-300 transition-colors"
        >
          <div className="flex-1 text-gray-700">{item}</div>
          {!readOnly && onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-gray-400 text-center py-8">No criteria added yet</p>
      )}
    </div>
  );
};

export default CriteriaList;