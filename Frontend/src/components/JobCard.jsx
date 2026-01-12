import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthService';
import { Pause, Play, XCircle, Minus, Edit3, CheckCircle, Briefcase, Users, Calendar, Trash2, MoreVertical } from 'lucide-react';

const JobCard = ({ job, onOptionsClick, onDelete, onPause, onResume, onEdit, onComplete }) => {
  const navigate = useNavigate();
  const [isSelected, setIsSelected] = useState(false);
  const [localStatus, setLocalStatus] = useState(() => ((job && (job.status || job.JobStatus)) || '').toString().trim().toLowerCase());
  const longPressTimerRef = useRef(null);
  const wasLongPressRef = useRef(false);
  const cardRef = useRef(null);

  useEffect(() => {
    setLocalStatus(((job && (job.status || job.JobStatus)) || '').toString().trim().toLowerCase());
  }, [job && job.status, job && job.JobStatus, job]);

  const handleCardClick = () => {
    if (wasLongPressRef.current) {
      wasLongPressRef.current = false;
      return;
    }
    navigate(`/job/${job.id}/candidates`);
  };

  const handleOptionsClick = (e) => {
    e.stopPropagation();
    if (onOptionsClick) onOptionsClick(job);
  };

  const startPress = (e) => {
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      setIsSelected(true);
    }, 600);
  };

  const endPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => {
      wasLongPressRef.current = false;
    }, 0);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(job.id);
    setIsSelected(false);
  };

  useEffect(() => {
    if (!isSelected) return undefined;

    const onOutside = (ev) => {
      if (!cardRef.current) return;
      if (!cardRef.current.contains(ev.target)) {
        setIsSelected(false);
      }
    };

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);

    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [isSelected]);

  const currentUser = authService.getUser();
  const userRole = currentUser && (currentUser.Role || currentUser.role) || null;
  const userEmail = currentUser && (currentUser.Email || currentUser.email) || null;

  let candidateStatus = null;
  if (userRole === 'Candidate' && userEmail && job.intrinsics && Array.isArray(job.intrinsics.Candidates)) {
    const cand = job.intrinsics.Candidates.find(c => c && c.Email && String(c.Email).trim().toLowerCase() === String(userEmail).trim().toLowerCase());
    if (cand) candidateStatus = cand.ApplicationStatus || null;
  }

  const isCandidate = userRole === 'Candidate';
  const isShortlisted = candidateStatus === 'Shortlisted For AI-Interview';
  const isAccepted = candidateStatus === 'Accepted';
  const isRejected = candidateStatus === 'Rejected';

  const clickable = !isCandidate || (isCandidate && isShortlisted);

  let statusStyle = '';
  if (isCandidate && isShortlisted) statusStyle = 'bg-purple-50 bg-opacity-60 border-purple-200';
  else if (isCandidate && isAccepted) statusStyle = 'bg-green-50 bg-opacity-60 border-green-200';
  else if (isCandidate && isRejected) statusStyle = 'bg-red-50 bg-opacity-60 border-red-200';

  // Normalize status for display
  const normalizedStatus = (localStatus || job && (job.status || job.JobStatus) || '').toString().toLowerCase();
  const displayStatus = normalizedStatus === 'ongoing' ? 'Active' : 
                        normalizedStatus === 'ended' ? 'Closed' : 
                        normalizedStatus === 'paused' ? 'Paused' : '';

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const jobDate = formatDate(job.createdAt || job.CreatedAt || job.JobCreatedAt || job.CreatedOn || job.PostedOn);

  return (
    <div
      ref={cardRef}
      onMouseDown={startPress}
      onTouchStart={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchEnd={endPress}
      onClick={clickable ? () => {
        if (isCandidate && isShortlisted) {
          const jobId = job.intrinsics && job.intrinsics.JobID ? job.intrinsics.JobID : job.id;
          const qEmail = encodeURIComponent(userEmail || '');
          navigate(`/interview-setup?jobId=${jobId}&email=${qEmail}`);
          return;
        }
        handleCardClick();
      } : undefined}
      className={`relative rounded-xl border p-6 transition-all ${clickable ? 'hover:shadow-md cursor-pointer' : ''} ${statusStyle || 'bg-white border-gray-200'}`}
      style={{ width: '400px', height: '220px' }}
      {...(clickable ? { role: 'button', tabIndex: 0 } : {})}
    >
      {/* Long-press action buttons */}
      {isSelected && !isCandidate && (
        <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const isPaused = (localStatus || '').toString().toLowerCase() === 'paused';
              if (isPaused) {
                setLocalStatus('ongoing');
                if (onResume) onResume(job.id);
              } else {
                setLocalStatus('paused');
                if (onPause) onPause(job.id);
              }
              setIsSelected(false);
            }}
            className="w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center text-white shadow-lg transition-colors"
            title={(localStatus || '').toString().toLowerCase() === 'paused' ? 'Resume Job' : 'Pause Job'}
          >
            {(localStatus || '').toString().toLowerCase() === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(job.id);
              setIsSelected(false);
            }}
            className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white shadow-lg transition-colors"
            title="Edit Job"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onComplete) onComplete(job.id);
              setIsSelected(false);
            }}
            className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-colors"
            title="End Job"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors"
            title="Delete Job"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Job Title and Status */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{job.position || job.title}</h3>
          {job.title && job.position && job.title !== job.position && (
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
              <Briefcase className="w-4 h-4" />
              <span>{job.title}</span>
            </div>
          )}
        </div>
        
        {!isCandidate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSelected(!isSelected);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Job Description */}
      {!isCandidate && job.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {job.description}
        </p>
      )}
      {!isCandidate && !job.description && job.position && (
        <p className="text-gray-600 text-sm mb-4">
          {job.position === 'Backend Developer' ? 'Node.js and Postgres experience required.' :
           job.position === 'Product Designer' ? 'UI/UX design for mobile apps.' :
           job.position === 'Senior Frontend Engineer' ? 'We are looking for a React expert.' :
           'Join our team and make an impact.'}
        </p>
      )}

      {/* Footer with Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {!isCandidate && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{job.candidatesCount || 0} Applied</span>
            </div>
          )}
          {jobDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{jobDate}</span>
            </div>
          )}
        </div>

        {/* Display Candidate Status and Job Status */}
        {isCandidate && (
          <div className="flex flex-col items-end">
            {candidateStatus && (
              <span className="px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 mb-1">
                {candidateStatus}
              </span>
            )}
            {displayStatus && (
              <span className={`px-3 py-1 rounded-md text-sm font-medium ${
              normalizedStatus === 'ongoing' ? 'bg-green-100 text-green-700' :
              normalizedStatus === 'paused' ? 'bg-yellow-100 text-yellow-700' :
              normalizedStatus === 'ended' ? 'bg-gray-100 text-gray-700' :
              'bg-gray-100 text-gray-700'
            }`}>
                {displayStatus}
              </span>
            )}
          </div>
        )}

        {!isCandidate && displayStatus && (
          <span className={`px-3 py-1 rounded-md text-sm font-medium ${
          normalizedStatus === 'ongoing' ? 'bg-green-100 text-green-700' :
          normalizedStatus === 'paused' ? 'bg-yellow-100 text-yellow-700' :
          normalizedStatus === 'ended' ? 'bg-gray-100 text-gray-700' :
          'bg-gray-100 text-gray-700'
        }`} style={{ alignSelf: 'flex-end' }}>
          {displayStatus}
        </span>
        )}
      </div>
    </div>
  );
};

export default JobCard;