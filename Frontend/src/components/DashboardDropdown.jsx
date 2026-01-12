import React from 'react';
import { ChevronDown } from 'lucide-react';

const JobOptionsDropdown = ({ jobId, isOpen, onToggle, onPause, onResume, onEdit, onDelete, onComplete, isPaused, hideTrigger = false }) => {
  return (
    <div className="relative">
      {!hideTrigger && (
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>Option</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-40 z-30">
          {isPaused ? (
            <button 
              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
              onClick={() => {
                onResume(jobId);
                onToggle();
              }}
            >
              Resume
            </button>
          ) : (
            <button 
              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
              onClick={() => {
                onPause(jobId);
                onToggle();
              }}
            >
              Pause
            </button>
          )}
          <button 
            className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
            onClick={() => {
              onEdit(jobId);
              onToggle();
            }}
          >
            Edit
          </button>
          <button 
            className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
            onClick={() => {
              if (onComplete) onComplete(jobId);
              onToggle();
            }}
          >
            Completed
          </button>
          {/* Delete moved to long-press badge on the JobCard; removed from dropdown */}
        </div>
      )}
    </div>
  );
};

export default JobOptionsDropdown;