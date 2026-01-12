import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink } from 'lucide-react';
import {
  Navbar,
  RankBadge,
  CandidateAvatar,
  ExperienceList,
  MatchScore,
  RequirementMatch,
  StatusBadge,
  ContextMenu,
  InterviewStatsCard,
  Button,
  FileUpload
} from '../components';
import { apiFetch } from '../services/AuthService';
import { candidateService } from '../services/CandidateService';
import { jobService } from '../services/JobService';
import { useNotifications } from '../components/Notifications';

const CandidateRankingPage = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [jobData, setJobData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;
  const [showHAModal, setShowHAModal] = useState(false);
  const [haList, setHaList] = useState([]);
  const [haLoading, setHaLoading] = useState(false);
  const [newHAEmail, setNewHAEmail] = useState('');
  const [newHAFullName, setNewHAFullName] = useState('');
  const [haMessage, setHaMessage] = useState(null); // { type: 'error'|'success', text: string }
  const [contextMenu, setContextMenu] = useState({ isVisible: false, x: 0, y: 0, candidate: null });

  const [showAddCandidatesModal, setShowAddCandidatesModal] = useState(false);
  const [addedFiles, setAddedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluatingResumes, setIsEvaluatingResumes] = useState(false);

  useEffect(() => {
    loadCandidateData();
  }, [jobId]);

  // Poll for new candidates and refresh automatically when new entries appear
  useEffect(() => {
    if (!jobId) return undefined;

    let mounted = true;
    const intervalMs = 5000; // poll every 5 seconds

    const checkForUpdates = async () => {
      try {
        const data = await candidateService.getCandidateRanking(jobId);
        if (!mounted) return;

        // Always update jobData with latest data (force refresh)
        setJobData(data);

        // Check if all candidates have been fully evaluated (have CV scores)
        const newTotal = Number(data?.stats?.totalCandidates || 0);
        const newCount = (data?.candidates || []).length;
        if (isEvaluatingResumes && newCount > 0) {
          const allHaveScores = data.candidates.every(c => c.cvScore != null || c.CV_Score != null);
          const countMatch = newTotal === newCount;
          if (allHaveScores && countMatch) {
            setIsEvaluatingResumes(false);
          }
        }
      } catch (err) {
        // non-fatal polling error
      }
    };

    const id = setInterval(checkForUpdates, intervalMs);
    checkForUpdates();

    return () => { mounted = false; clearInterval(id); };
  }, [jobId, isEvaluatingResumes]);

  const { showConfirm } = useNotifications();

  const loadCandidateData = async () => {
    try {
      setIsLoading(true);
      const data = await candidateService.getCandidateRanking(jobId);
      setJobData(data);
    } catch (error) {
      console.error('Failed to load candidate data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHiringAssistants = async () => {
    if (!jobId) return;
    setHaLoading(true);
    try {
      const res = await apiFetch(`/api/AllHiringAssistants?jobId=${encodeURIComponent(jobId)}`, { method: 'GET' });
      if (!res.ok) {
        console.error('Failed to fetch HAs', res.status);
        setHaList([]);
        return;
      }
      const json = await res.json();
      // Expecting { TotalHiringAssistants, HiringAssistants: [{ Email, FullName }] }
      const list = (json.HiringAssistants || []).map((h, idx) => ({ id: idx + 1, email: h.Email || '', name: h.FullName || '' }));
      setHaList(list);
    } catch (err) {
      console.error('Error loading hiring assistants', err);
      setHaList([]);
    } finally {
      setHaLoading(false);
    }
  };

  const handleInviteHA = async () => {
    const email = (newHAEmail || '').trim();
    const name = (newHAFullName || '').trim();
    if (!name) return alert('Enter full name');
    if (!email) return alert('Enter email');
    try {
      setHaMessage(null);
      const res = await apiFetch('/api/InviteHiringAssistant', { method: 'POST', body: JSON.stringify({ JobID: jobId, Email: email, FullName: name }) });
      if (!res.ok) {
        let body;
        try { body = await res.json(); } catch (e) { body = { message: await res.text() }; }
        const errMsg = (body && body.message) ? body.message : `Request failed (${res.status})`;
        setHaMessage({ type: 'error', text: errMsg });
        return;
      }
      // success
      let body;
      try { body = await res.json(); } catch (e) { body = null; }
      setHaMessage({ type: 'success', text: (body && body.message) ? body.message : 'Hiring assistant invited' });
      setNewHAEmail('');
      setNewHAFullName('');
      await fetchHiringAssistants();
    } catch (err) {
      console.error('Failed to invite HA', err);
      const msg = err && err.message ? err.message : 'Failed to invite hiring assistant';
      setHaMessage({ type: 'error', text: msg });
    }
  };

  const handleRemoveHA = async (email) => {
    const confirmed = await showConfirm(`Remove ${email} from this job?`);
    if (!confirmed) return;
    try {
      const res = await apiFetch('/api/RemoveHiringAssistant', { method: 'POST', body: JSON.stringify({ JobID: jobId, Email: email }) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Hiring assistant removed');
      await fetchHiringAssistants();
    } catch (err) {
      console.error('Failed to remove HA', err);
      alert('Failed to remove hiring assistant');
    }
  };

  const handleFileSelectForAdd = (file) => {
    setAddedFiles(prev => [...prev, file]);
  };

  const handleRemoveAddedFile = (index) => {
    setAddedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAddedCandidates = async () => {
    if (!jobId) return alert('Missing job id');
    if (!addedFiles || addedFiles.length === 0) return alert('Select files first');
    
    // Generate placeholder emails for these files
    let placeholderEmails = '';
    try {
      const existingCount = (jobData && jobData.stats && jobData.stats.totalCandidates) ? parseInt(jobData.stats.totalCandidates, 10) : 0;
      const start = existingCount + 1;
      const placeholders = addedFiles.map((_, i) => `CA${start + i}@example.com`);
      placeholderEmails = placeholders.join(',');
    } catch (e) {
      // fallback: still submit without placeholders
      console.warn('Failed to generate placeholder emails', e);
    }
    
    setIsUploading(true);
    try {
      const result = await jobService.uploadCandidates({
        jobId,
        files: addedFiles,
        candidateEmails: placeholderEmails
      });

      // Close modal immediately
      setAddedFiles([]);
      setShowAddCandidatesModal(false);

      // Show success message
      alert(`${result.candidatesProcessed} candidate(s) added. ${result.note || 'Evaluations are processing in the background.'}`);

      // Mark that resumes are being evaluated
      setIsEvaluatingResumes(true);

      // If async (202), backend processes in background without polling
      if (result.isAsync) {
        console.log('📌 Resume evaluation queued for background processing');
      } else {
        // Sync response, reload immediately
        await loadCandidateData();
        setIsEvaluatingResumes(false);
      }
    } catch (err) {
      console.error('Failed to add candidates', err);
      alert(`❌ Failed to add candidates: ${err.message}`);
    } finally {
      setIsUploading(false);
      setShowAddCandidatesModal(false);
    }
  };

  const handleAIInterview = async (candidate) => {
    try {
      const body = { Email: candidate.email, JobID: jobId, PromoteTo: 'InviteForAIInterview' };
      const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Candidate shortlisted for AI interview');
      await loadCandidateData();
    } catch (error) {
      console.error('Failed to invite for AI interview:', error);
      alert('Failed to invite for AI interview. Please try again.');
    }
  };

  const handleHumanInterview = async (candidate) => {
    try {
      const body = { Email: candidate.email, JobID: jobId, PromoteTo: 'InviteForHumanInterview' };
      const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Candidate shortlisted for human interview');
      await loadCandidateData();
    } catch (error) {
      console.error('Failed to invite for human interview:', error);
      alert('Failed to invite for human interview. Please try again.');
    }
  };

  const handleViewProfile = (candidate) => {
    // Navigate to candidate profile page for this job and candidate email
    const email = encodeURIComponent(candidate.email || '');
    navigate(`/job/${jobId}/candidate/${email}/profile`);
  };

  const handleReject = async (candidate) => {
    try {
      const confirmed = await showConfirm('Are you sure you want to reject this candidate?');
      if (!confirmed) return;
      const body = { Email: candidate.email, JobID: jobId, PromoteTo: 'Reject' };
      const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Candidate rejected');
      await loadCandidateData();
    } catch (error) {
      console.error('Failed to reject candidate:', error);
      alert('Failed to reject candidate. Please try again.');
    }
  };

  const handleAccept = async (candidate) => {
    try {
      const confirmed = await showConfirm('Accept this candidate?');
      if (!confirmed) return;
      const body = { Email: candidate.email, JobID: jobId, PromoteTo: 'Accept' };
      const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Candidate accepted');
      await loadCandidateData();
    } catch (error) {
      console.error('Failed to accept candidate:', error);
      alert('Failed to accept candidate. Please try again.');
    }
  };

  const filteredCandidates = (jobData?.candidates || []).filter(candidate => {
    const name = (candidate.name || '').toString().toLowerCase();
    const email = (candidate.email || '').toString().toLowerCase();
    const status = (candidate.status || '').toString().trim();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const notUnknown = status.toLowerCase() !== 'unknown';
    const matchesStatus = (selectedStatus === 'All') || (status.toLowerCase() === selectedStatus.toLowerCase());
    // Exclude placeholder/dummy candidates (e.g., "candidate1", "ca1@example.com") and those with all scores missing
    const isPlaceholder = name.startsWith('candidate') || email.startsWith('ca') && email.endsWith('@example.com');
    const hasRealScore = candidate.cvScore != null || candidate.CV_Score != null || candidate.matchScore != null || candidate.compositeScore != null;
    return matchesSearch && notUnknown && matchesStatus && !isPlaceholder && hasRealScore;
  });

  const isEnded = (jobData && jobData.job && jobData.job.status && String(jobData.job.status).toLowerCase() === 'ended');

  // Sort candidates by composite score (descending) by default. Fall back to matchScore or cvScore.
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    const aVal = Number(a.compositeScore ?? a.CompositeScore ?? a.matchScore ?? a.cvScore ?? a.CV_Score ?? 0) || 0;
    const bVal = Number(b.compositeScore ?? b.CompositeScore ?? b.matchScore ?? b.cvScore ?? b.CV_Score ?? 0) || 0;
    return bVal - aVal;
  });

  // Pagination for candidate list (use sortedCandidates)
  const totalCandidates = sortedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalCandidates / PAGE_SIZE));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCandidates]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCandidates);
  const paginatedCandidates = sortedCandidates.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-lg font-medium text-gray-700">Loading Candidates...</div>
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Failed to load data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Navbar variant="dashboard" />

      <main className={`max-w-7xl mx-auto px-8 py-12 ${isEnded ? 'opacity-60' : ''}`}>
        {/* Header Section with Enhanced Design */}
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-2">
            <button 
              onClick={() => {
                try { sessionStorage.setItem('dashboardShowLoading', '1'); } catch (e) {}
                navigate('/dashboard');
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
              style={{ pointerEvents: 'auto' }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back To Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                {jobData.job.title}
              </h1>
              {jobData.job.link && (
                <a href={jobData.job.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 mt-1 transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
            <p className="text-gray-600 text-lg font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              Candidate Ranking And Evaluation
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={async () => { setHaMessage(null); setShowHAModal(true); await fetchHiringAssistants(); }} 
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isEnded}
            >
              Add Hiring Assistants
            </button>
            <button 
              onClick={() => setShowAddCandidatesModal(true)} 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isEnded}
            >
              Add More Candidates
            </button>
          </div>
        </div>

        {/* Stats Grid (glassmorphism) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[{
            title: 'Total Candidates', type: 'totalCandidates', value: jobData.stats.totalCandidates
          },{
            title: 'Invites Sent', type: 'invitesSent', value: jobData.stats.interviewInvitesSent
          },{
            title: 'Scheduled', type: 'scheduled', value: jobData.stats.interviewsScheduled
          },{
            title: 'Pending', type: 'pending', value: jobData.stats.interviewsPending
          },{
            title: 'Completed', type: 'completed', value: jobData.stats.interviewsCompleted
          }].map((s, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105" style={{ animation: `fadeInUp 0.4s ease-out ${i * 0.06}s both` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <InterviewStatsCard type={s.type} value={s.value} />
            </div>
          ))}
        </div>

        {/* Search and Filter Section (modern) */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="relative w-full px-6 py-4 pl-14 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-lg hover:shadow-xl"
              />
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-purple-500" />
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
              <div className="relative px-6 py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-all duration-300 shadow-lg hover:shadow-xl">
                <label className="sr-only">Filter by status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent border-0 text-sm font-medium outline-none cursor-pointer text-gray-700 pr-8"
                >
                  {[ 'All', 'Rejected', 'Shortlisted For AI-Interview', 'AI-Interview Completed', 'Shortlisted For Human Interview', 'Human Interview Completed', 'Accepted', 'CV Processed' ].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Ranking Table */}
        <div className="space-y-4">
          <div className="relative group" style={{ animation: `fadeInUp 0.4s ease-out both` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 hover:border-purple-300 shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Candidate ranking</h3>
              {(jobData?.stats?.totalCandidates !== filteredCandidates.length) && (
                <div className="text-sm text-purple-600 font-medium">Please wait while all candidates are being uploaded</div>
              )}
            </div>

            {/* Always show the table, but if candidate counts do not match, show the purple message */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Candidate</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Overall match score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">CV-Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Interview Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Flags</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCandidates.map((candidate, idx) => (
                    <tr
                      key={candidate.id}
                      className={`border-b border-gray-100 ${isEnded ? '' : 'hover:bg-gray-50 cursor-pointer'}`}
                      onClick={!isEnded ? () => handleViewProfile(candidate) : undefined}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isEnded) {
                          setContextMenu({
                            isVisible: true,
                            x: e.clientX,
                            y: e.clientY,
                            candidate
                          });
                        }
                      }}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4">
                        <RankBadge rank={startIndex + idx + 1} />
                      </td>
                      {/* Candidate */}
                      <td className="py-4 px-4">
                        <CandidateAvatar 
                          initials={candidate.initials}
                          name={candidate.name}
                          email={candidate.email}
                        />
                      </td>
                      {/* Match Score */}
                      <td className="py-4 px-4">
                        <MatchScore score={candidate.matchScore} />
                      </td>
                      {/* CV Score */}
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700 font-medium">
                          {candidate.cvScore != null ? `${candidate.cvScore}` : 'N/A'}
                        </div>
                      </td>
                      {/* Interview Score */}
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700 font-medium">
                          {candidate.interviewScore != null ? `${candidate.interviewScore}` : 'N/A'}
                        </div>
                      </td>
                      {/* Flags (count) */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                            {Array.isArray(candidate.flags) ? candidate.flags.length : 'N/A'}
                          </span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="py-4 px-4">
                        <StatusBadge 
                          status={candidate.status}
                          statusColor={candidate.statusColor}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCandidates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No candidates found matching your search
                </div>
              )}
            </div>
            {/* Pagination controls for candidates */}
            {totalCandidates > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-8 px-4">
                <div className="text-sm font-medium text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200">
                  Showing <span className="text-purple-600 font-bold">{startIndex + 1} - {endIndex}</span> of <span className="font-bold">{totalCandidates}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                      currentPage <= 1
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white shadow-md hover:shadow-lg border border-gray-200'
                    }`}>
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[44px] h-11 rounded-lg font-medium transition-all duration-300 ${
                          p === currentPage
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-110'
                            : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-purple-300'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                      currentPage >= totalPages
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white shadow-md hover:shadow-lg border border-gray-200'
                    }`}>
                    Next
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
      {/* Hiring Assistants Modal */}
      {showHAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Hiring Assistants</h3>
              <button onClick={() => { setShowHAModal(false); setHaMessage(null); }} className="text-gray-500">Close</button>
            </div>

              <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Invite Hiring Assistant</label>
              <div className="space-y-3">
                <input
                  value={newHAFullName}
                  onChange={(e) => setNewHAFullName(e.target.value)}
                  type="text"
                  placeholder="Full name"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  value={newHAEmail}
                  onChange={(e) => setNewHAEmail(e.target.value)}
                  type="email"
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="flex justify-end mt-1">
                  <Button onClick={handleInviteHA}>Invite</Button>
                </div>
                {haMessage && (
                  <div className={`mt-3 text-sm ${haMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                    {haMessage.text}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Current assistants for this job</h4>
              {haLoading ? (
                <div className="text-gray-500">Loading...</div>
              ) : haList.length === 0 ? (
                <div className="text-gray-500">No assistants assigned</div>
              ) : (
                <div className="max-h-56 overflow-y-auto pr-2 space-y-2">
                  {haList.map(h => (
                    <div key={h.email} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{h.name || h.email}</div>
                        <div className="text-xs text-gray-500">{h.email}</div>
                      </div>
                      <div>
                        <button onClick={() => handleRemoveHA(h.email)} className="px-3 py-1 text-sm border rounded-lg text-red-600">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add More Candidates Modal */}
      {showAddCandidatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Candidates (Upload CVs)</h3>
              <button onClick={() => setShowAddCandidatesModal(false)} className="text-gray-500">Close</button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Drop CV files here (pdf/doc/docx). They will be added to this job.</p>
              <div className="mt-4">
                <FileUpload onFileSelect={handleFileSelectForAdd} acceptedFormats=".pdf,.doc,.docx" maxSize={10} />
              </div>
            </div>

            {addedFiles.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Files to upload</h4>
                <div className={`space-y-2 ${addedFiles.length > 3 ? 'max-h-60 overflow-y-auto pr-2' : ''}`}>
                  {addedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-gray-500">{(f.size/1024/1024).toFixed(2)} MB</div>
                      </div>
                      <div>
                        <button onClick={() => handleRemoveAddedFile(i)} className="px-3 py-1 text-sm border rounded-lg text-red-600">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => { setAddedFiles([]); setShowAddCandidatesModal(false); }} className="px-4 py-2 border rounded-lg">Cancel</button>
              <Button onClick={handleSubmitAddedCandidates} disabled={isUploading || addedFiles.length === 0}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        onClose={() => setContextMenu({ ...contextMenu, isVisible: false })}
        candidate={contextMenu.candidate}
        onAIInterview={handleAIInterview}
        onHumanInterview={handleHumanInterview}
        onViewProfile={handleViewProfile}
        onAccept={handleAccept}
        onReject={handleReject}
        isEnded={isEnded}
      />

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CandidateRankingPage;