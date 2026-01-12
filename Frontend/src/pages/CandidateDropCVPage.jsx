import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { apiFetch, isAuthenticated, authService } from '../services/AuthService';

const CandidateDropCVPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [criteriaNonNegotiable, setCriteriaNonNegotiable] = useState([]);
  const [criteriaAdditional, setCriteriaAdditional] = useState([]);
  const [jobId, setJobId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jid = params.get('jobId') || '';
    setJobId(jid);

    if (!isAuthenticated()) {
      navigate(`/login?redirect=/candidate-drop-cv&jobId=${jid}`);
      return;
    }

    // Determine view-only mode for staff roles opening the JobLink
    try {
      const u = authService.getUser && authService.getUser();
      const role = u && (u.role || u.Role || '') || '';
      const rl = String(role).trim().toLowerCase();
      if (rl === 'superadmin' || rl === 'recruiter' || rl === 'hiringassistant') {
        setIsViewOnly(true);
      } else {
        setIsViewOnly(false);
      }
    } catch (e) {
      setIsViewOnly(false);
    }

    if (!jid) return;

    (async () => {
      try {
        setIsLoading(true);
        const resp = await apiFetch('/api/Public/JobIntrinsics', {
          method: 'POST',
          body: JSON.stringify({ JobID: jid }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          console.warn('Failed to fetch job intrinsics:', txt || resp.status);
          setIsLoading(false);
          return;
        }
        const data = await resp.json();
        setJobTitle(data.JobTitle || '');
        setCompanyName(data.CompanyName || '');
        setJobDescription(data.JobDescription || '');
        setJobStatus(data.JobStatus || '');
        const evalCrit = data.EvaluationCriteria || { NonNegotiable: [], Additional: [] };
        setCriteriaNonNegotiable(Array.isArray(evalCrit.NonNegotiable) ? evalCrit.NonNegotiable : []);
        setCriteriaAdditional(Array.isArray(evalCrit.Additional) ? evalCrit.Additional : []);
      } catch (err) {
        console.error('Error fetching job details', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [location.search, navigate]);

  const MAX_FILES = 1;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const isValidType = file.type === 'application/pdf' || 
                         file.type === 'application/msword' || 
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isValidSize = file.size <= MAX_FILE_SIZE;
      return isValidType && isValidSize;
    });

    // If single-file mode, replace any existing file with the newly provided one
    if (MAX_FILES === 1) {
      if (validFiles.length === 0) return;
      // take the first valid file and replace
      setFiles([validFiles[0]]);
      return;
    }

    const remainingSlots = MAX_FILES - files.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    setFiles(prev => [...prev, ...filesToAdd]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('Please upload at least one CV');
      return;
    }

    // Submit files to public AddResumes endpoint with JobID
    (async () => {
      try {
        setIsLoading(true);
        const form = new FormData();
        if (!jobId) {
          alert('Job identifier missing from the link. Cannot submit.');
          setIsLoading(false);
          return;
        }
        form.append('JobID', jobId);

        // Retrieve the logged-in user's email robustly
        let email = null;

        try {
          // 1) Prefer the stored user object via authService
          const storedUser = authService.getUser && authService.getUser();
          if (storedUser && storedUser.email) {
            email = storedUser.email;
          }

          // 2) If not present, try decoding the JWT token payload (if available)
          if (!email) {
            const token = localStorage.getItem('token');
            if (token) {
              try {
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(atob(parts[1]));
                  email = payload.email || payload.Email || payload.sub || null;
                }
              } catch (e) {
                console.warn('Failed to parse token payload for email', e);
              }
            }
          }

          // 3) Final fallback: ask backend for current user details
          if (!email) {
            const response = await apiFetch('/api/UserDetails');
            console.log('UserDetails API response:', response);
            if (response.ok) {
              const userData = await response.json();
              console.log('Parsed user data:', userData);
              email = userData.email || userData.Email || null;
            } else {
              const errorText = await response.text();
              console.error('Failed to fetch user details:', errorText);
            }
          }
        } catch (err) {
          console.error('Error while resolving user email:', err);
        }

        if (!email) {
          alert('User email not found. Please log in again.');
          setIsLoading(false);
          navigate(`/login?redirect=/candidate-drop-cv&jobId=${jobId}`);
          return;
        }

        // Prevent duplicate application: check if this email already exists for the job
        try {
          const checkResp = await apiFetch('/api/Public/JobIntrinsics', {
            method: 'POST',
            body: JSON.stringify({ JobID: jobId }),
          });
          if (checkResp.ok) {
            const jobData = await checkResp.json();
            const existingCandidates = Array.isArray(jobData.Candidates) ? jobData.Candidates : [];
            const alreadyApplied = existingCandidates.some(c => c && c.Email && String(c.Email).trim().toLowerCase() === String(email).trim().toLowerCase());
            if (alreadyApplied) {
              alert('You have already applied for this job.');
              setIsLoading(false);
              return;
            }
          } else {
            console.warn('Could not verify existing applications before submit');
          }
        } catch (checkErr) {
          console.error('Error checking existing applications:', checkErr);
        }

        for (const f of files) {
          form.append('cvs', f, f.name);
        }

        // Add the email to the FormData payload using the backend-expected key
        // Backend expects `candidateEmails` (comma-separated string) or file.fieldname containing an email
        form.append('candidateEmails', email);

        // Debug: log what we're about to send
        try {
          for (const pair of form.entries()) {
            console.log('Form entry:', pair[0], pair[1]);
          }
        } catch (e) {
          // ignore
        }

        const res = await apiFetch('/api/Public/AddResumes', {
          method: 'POST',
          body: form,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed (${res.status})`);
        }

        const json = await res.json();
        alert(`Resume uploaded successully.`);
        // clear files after successful submit
        setFiles([]);
        // optionally navigate to a thank-you page or back to home
        navigate('/dashboard');
      } catch (err) {
        console.error('Submission error', err);
        alert('Failed to submit CV(s). Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFeedback = () => {
    alert('Feedback feature coming soon!');
  };

  const handleLogout = () => {
    (async () => {
      try {
        // Call backend logout if implemented (noop if mock)
        if (authService && authService.logout) await authService.logout();
      } catch (e) {
        console.warn('authService.logout failed', e);
      }
      try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
      navigate('/');
    })();
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Navbar 
        variant="candidate-drop-cv"
        onFeedback={handleFeedback}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header Card */}
        <div className="mb-12">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">{companyName || 'Company'}</h1>
                <p className="text-xl font-semibold text-purple-600 mt-3">{jobTitle || 'Role Title'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Description Card */}
        {jobDescription && (
          <div className="mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 hover:border-purple-300 p-8 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{jobDescription}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recruitment Criteria */}
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 hover:border-purple-300 p-8 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Recruitment Criteria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-bold text-purple-600 mb-4 uppercase tracking-wide">Non-negotiable</h4>
                  {criteriaNonNegotiable && criteriaNonNegotiable.length > 0 ? (
                    <ul className="space-y-2">
                      {criteriaNonNegotiable.map((c, idx) => (
                        <li key={`nn-${idx}`} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></span>
                          <span className="text-gray-700">{c}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No non-negotiable criteria provided.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-blue-600 mb-4 uppercase tracking-wide">Additional</h4>
                  {criteriaAdditional && criteriaAdditional.length > 0 ? (
                    <ul className="space-y-2">
                      {criteriaAdditional.map((c, idx) => (
                        <li key={`ad-${idx}`} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                          <span className="text-gray-700">{c}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No additional criteria provided.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 hover:border-purple-300 p-8 hover:shadow-2xl transition-all duration-300">
          {/* Candidate metadata inputs removed */}
          {/* Show status banners for paused/ended jobs */}
          {jobStatus && jobStatus.toString().toLowerCase() === 'paused' && (
            <div className="mb-6 p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200 text-yellow-800 flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>This job has been paused for now. Please come back later.</span>
            </div>
          )}
          {jobStatus && jobStatus.toString().toLowerCase() === 'ended' && (
            <div className="mb-6 p-4 rounded-xl bg-gray-100 border-2 border-gray-300 text-gray-700 flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 112.5 5.5a.75.75 0 00-1.5 0 7.5 7.5 0 1111.977-6.977A.75.75 0 1013.477 3.89z" clipRule="evenodd" />
              </svg>
              <span>This job has ended. The submission link is no longer valid.</span>
            </div>
          )}

          {/* Upload Section */}
          <div className="mb-8">
            {isViewOnly && (
              <div className="mb-4 p-4 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-800 flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>You are viewing this job as a staff user (view-only). Candidate submission is disabled.</span>
              </div>
            )}
            <p className="text-gray-600 mb-6 font-medium">
              Attach your resume in PDF or DOCX format (Max 5MB)
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 bg-white/50'
              }`}
              style={{ pointerEvents: ((jobStatus || '').toString().toLowerCase() === 'paused' || (jobStatus || '').toString().toLowerCase() === 'ended' || isViewOnly) ? 'none' : 'auto' }}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={(jobStatus || '').toString().toLowerCase() === 'paused' || (jobStatus || '').toString().toLowerCase() === 'ended' || isViewOnly}
              />
              <label htmlFor="file-upload" className={`cursor-pointer block ${((jobStatus || '').toString().toLowerCase() === 'paused' || (jobStatus || '').toString().toLowerCase() === 'ended' || isViewOnly) ? 'cursor-not-allowed opacity-60' : ''}`}>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                    <Upload size={28} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-lg">Drag and drop your resume or browse</p>
                    <p className="text-sm text-gray-500 mt-2">PDF or DOCX - Maximum 5MB</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">
                  Uploaded Files ({files.length}/{MAX_FILES})
                </p>
                <button
                  onClick={() => setFiles([])}
                  disabled={isViewOnly}
                  className={`text-sm font-medium transition-colors ${isViewOnly ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-white/80 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      disabled={isViewOnly}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isViewOnly ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-50'}`}
                    >
                      <X size={18} className="text-gray-500 hover:text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning (only show when max > 1) */}
          {MAX_FILES > 1 && files.length >= MAX_FILES && (
            <div className="mb-8 flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                You've reached the maximum limit of {MAX_FILES} files. Remove some to add more.
              </p>
            </div>
          )}

          {/* Footer Buttons: Back (left) and Submit (right) */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              <button
                onClick={handleBack}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-all border-2 ${isLoading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white hover:border-purple-300 shadow-lg hover:shadow-xl'}`}
              >
                Back
              </button>
            </div>

            <div>
              <button
                onClick={handleSubmit}
                disabled={files.length === 0 || isLoading || (jobStatus || '').toString().toLowerCase() === 'paused' || (jobStatus || '').toString().toLowerCase() === 'ended' || isViewOnly}
                className={`px-8 py-3 rounded-lg font-medium transition-all shadow-lg ${
                  (files.length === 0 || isLoading || (jobStatus || '').toString().toLowerCase() === 'paused' || (jobStatus || '').toString().toLowerCase() === 'ended' || isViewOnly)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:shadow-xl hover:scale-105'
                }`}
              >
                {isLoading ? 'Submitting...' : 'Submit Resume'}
              </button>
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CandidateDropCVPage;