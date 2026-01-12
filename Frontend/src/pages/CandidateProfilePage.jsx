import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar, ResumeScoreCard, InfoCard } from '../components';
import { candidateService } from '../services/CandidateService';
import { apiFetch } from '../services/AuthService';
import { useNotifications } from '../components/Notifications';

const ResumeViewer = ({ url }) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!url) return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
      <svg className="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-lg font-medium">Resume not available</p>
    </div>
  );

  const cleaned = url.split('#')[0].split('?')[0];
  const ext = (cleaned.split('.').pop() || '').toLowerCase();

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const ToolbarButton = ({ onClick, children, title }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-gray-600 hover:text-gray-900"
    >
      {children}
    </button>
  );

  const ViewerContent = () => {
    if (ext === 'pdf') {
      return (
        <iframe
          title="resume-pdf"
          src={`${url}#toolbar=0`}
          className="w-full h-full"
          style={{ border: 'none', transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        />
      );
    }

    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
      const embed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      return (
        <iframe
          title="office-viewer"
          src={embed}
          className="w-full h-full"
          style={{ border: 'none' }}
        />
      );
    }

    return (
      <div className="p-8 flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-700 mb-6 font-medium">Preview not available for this file type</p>
          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Resume
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Modern Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <ToolbarButton onClick={handleZoomOut} title="Zoom Out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </ToolbarButton>
            <div className="px-3 py-1 text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {zoom}%
            </div>
            <ToolbarButton onClick={handleZoomIn} title="Zoom In">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={handleResetZoom} title="Reset Zoom">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </ToolbarButton>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
          <ToolbarButton 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </ToolbarButton>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <ViewerContent />
      </div>
    </div>
  );
};

const CandidateProfilePage = () => {
  const navigate = useNavigate();
  const { candidateId, jobId, email } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCandidateProfile();
  }, [candidateId, jobId, email]);

  const { showConfirm } = useNotifications();
  const { show } = useNotifications();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const loadCandidateProfile = async () => {
    try {
      setIsLoading(true);
      if (jobId && email) {
        const resp = await candidateService.getJobCandidateDetails(jobId, decodeURIComponent(email));
        const cand = resp.Candidate || {};
        setCandidate({
          name: cand.FullName || decodeURIComponent(email) || resp.Email,
          email: resp.Email || decodeURIComponent(email),
          cvLink: cand.CVLink || null,
          cvScore: cand.CVScore || null,
          aiInterviewScore: cand.AIInterviewScore || null,
          compositeScore: cand.CompositeScore || null,
          resumeBreakdown: cand.ResumeBreakdown || null,
          flags: [],
          applicationStatus: cand.ApplicationStatus || ''
        });
      } else if (candidateId) {
        const data = await candidateService.getCandidateProfile(candidateId);
        setCandidate(data);
      }
    } catch (error) {
      console.error('Failed to load candidate profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    const confirmed = await showConfirm(`Are you sure you want to accept ${candidate.name}?`);
    if (!confirmed) return;
    try {
      const body = { Email: candidate.email, JobID: jobId, PromoteTo: 'Accept' };
      const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Candidate accepted successfully!');
      navigate(-1);
    } catch (error) {
      console.error('Failed to accept candidate:', error);
      alert('Failed to accept candidate');
    }
  };

  const handleReject = async () => {
    const confirmed = await showConfirm(`Are you sure you want to reject ${candidate.name}?`);
    if (!confirmed) return;
    try {
      const body = { Email: candidate.email, JobID: jobId, PromoteTo: 'Reject' };
      const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      alert('Candidate rejected successfully!');
      navigate(-1);
    } catch (error) {
      console.error('Failed to reject candidate:', error);
      alert('Failed to reject candidate');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-lg font-medium text-gray-700">Loading Candidate Profile...</div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="text-xl text-gray-600 font-medium">Candidate not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Navbar />

      <div className="flex pt-16 h-screen">
        {/* Left Panel - Candidate Details */}
        <div className="w-1/2 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-12">
            {/* Header Section with Enhanced Design */}
            <div className="mb-8">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to List</span>
              </button>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-2xl transition-all duration-300">
                {/* Name and Status */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {!isEditingName ? (
                          <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">{candidate.name}</h1>
                            <button
                              onClick={() => { setNameDraft(candidate.name); setIsEditingName(true); }}
                              className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
                              title="Edit name"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value)}
                              className="px-3 py-2 border rounded-lg text-lg"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  setIsSavingName(true);
                                  const res = await candidateService.updateCandidateName(candidate.email, nameDraft);
                                  if (res && res.user) {
                                    setCandidate(prev => ({ ...prev, name: res.user.FullName }));
                                    show('Candidate name updated');
                                  }
                                  setIsEditingName(false);
                                } catch (err) {
                                  console.error('Failed to update name:', err);
                                  alert('Failed to update name');
                                } finally {
                                  setIsSavingName(false);
                                }
                              }}
                              disabled={isSavingName}
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all"
                            >
                              {isSavingName ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setIsEditingName(false); setNameDraft(''); }}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        <p className="text-sm text-gray-500 mt-1">{candidate.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-sm font-semibold text-purple-700">{candidate.applicationStatus || 'N/A'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 mt-8">
                  <button
                    onClick={handleAccept}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>

            {/* Scores Section */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="text-sm text-gray-500 mb-2 font-medium">AI Interview</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {candidate.aiInterviewScore != null ? candidate.aiInterviewScore : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="text-sm text-gray-500 mb-2 font-medium">CV Score</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {candidate.cvScore != null ? candidate.cvScore : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="text-sm text-gray-500 mb-2 font-medium">Composite</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                    {candidate.compositeScore != null ? candidate.compositeScore : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Flags Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-200 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                </svg>
                Flags
              </h3>
              {candidate.flags && candidate.flags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.flags.map((f, i) => (
                    <span key={i} className="px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No flags raised
                </div>
              )}
            </div>

            {/* Resume Breakdown */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-200 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Resume Breakdown
              </h3>
              {candidate.resumeBreakdown ? (
                <div className="space-y-5">
                  {Object.entries(candidate.resumeBreakdown).map(([key, val]) => {
                    const scoreMatch = val?.match(/Score:\s*(\d+)\/10/);
                    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

                    return (
                      <div key={key} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-base font-semibold text-gray-800">{key}</h4>
                          {score !== null && (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${score * 10}%` }}
                                />
                              </div>
                              <span className={`text-lg font-bold ${
                                score >= 7 ? 'text-green-600' : score >= 5 ? 'text-orange-500' : 'text-red-600'
                              }`}>
                                {score}/10
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          {val?.replace(/Score:\s*\d+\/10\n?/, '') || '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Resume breakdown not available</p>
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="mb-8">
            </div>
          </div>
        </div>

        {/* Right Panel - Resume Viewer */}
        <div className="w-1/2 border-l border-gray-200 bg-white/80 backdrop-blur-sm">
          <ResumeViewer url={candidate.cvLink} />
        </div>
      </div>
    </div>
  );
};

export default CandidateProfilePage;