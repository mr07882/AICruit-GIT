import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Button, StatsCard, JobCard } from '../components';
import { authService } from '../services/AuthService';
import { dashboardService } from '../services/DashboardService';
import { useNotifications } from '../components/Notifications';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobStatus, setSelectedJobStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  const { showConfirm } = useNotifications();

  useEffect(() => {
    try { const show = sessionStorage.getItem('dashboardShowLoading'); if (show) { setIsLoading(true); sessionStorage.removeItem('dashboardShowLoading'); } } catch (e) {}
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const cu = authService.getUser();
      const role = cu && (cu.role || cu.Role) || null;
      const email = cu && (cu.Email || cu.email) || null;
      const data = await dashboardService.getDashboardData({ userRole: role, email });
      setStats(data.stats);
      setJobs(data.jobs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    navigate('/');
  }, [navigate]);

  const handleFeedback = useCallback(() => {
    alert('Feedback feature coming soon!');
  }, []);

  const handleGetStarted = useCallback(() => {
    navigate('/create-shortlist');
  }, [navigate]);

  const handleAddRecruiters = useCallback(() => {
    navigate('/manage-recruiters');
  }, [navigate]);

  const handlePauseJob = useCallback(async (jobId) => {
    setJobs(prev => prev.map(j => (String(j.id) === String(jobId) || String(j.JobID) === String(jobId)) ? ({ ...j, status: 'paused', JobStatus: 'paused' }) : j));
    try {
      await dashboardService.pauseJob(jobId);
      alert('Job paused successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to pause job:', error);
      alert('Failed to pause job');
      await loadDashboardData();
    }
  }, []);

  const handleResumeJob = useCallback(async (jobId) => {
    setJobs(prev => prev.map(j => (String(j.id) === String(jobId) || String(j.JobID) === String(jobId)) ? ({ ...j, status: 'ongoing', JobStatus: 'ongoing' }) : j));
    try {
      await dashboardService.resumeJob(jobId);
      alert('Job resumed successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to resume job:', error);
      alert('Failed to resume job');
      await loadDashboardData();
    }
  }, []);

  const handleEditJob = useCallback((jobId) => {
    navigate(`/job/${jobId}/edit`);
  }, [navigate]);

  const handleDeleteJob = useCallback(async (jobId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this job? This action cannot be undone.');
    if (confirmed) {
      try {
        await dashboardService.deleteJob(jobId);
        alert('Job deleted successfully');
        await loadDashboardData();
      } catch (error) {
        console.error('Failed to delete job:', error);
        alert('Failed to delete job');
      }
    }
  }, []);

  const handleCompleteJob = useCallback(async (jobId) => {
    const confirmed = await showConfirm('Mark this job as Ended? This will end the job and disable the public link.');
    if (!confirmed) return;
    try {
      await dashboardService.completeJob(jobId);
      alert('Job marked as ended');
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to complete job:', error);
      alert('Failed to mark job as ended');
    }
  }, []);

  const currentUser = authService.getUser();
  const rawRole = currentUser && (currentUser.role || currentUser.Role || null);
  const userRole = rawRole ? String(rawRole).trim() : null;
  const isSuperAdmin = userRole && String(userRole).toLowerCase() === 'superadmin';
  const userName = currentUser && (currentUser.name || currentUser.Name || 'User');

  const statsConfig = [];
  if (userRole !== 'HiringAssistant' && userRole !== 'Candidate') {
    statsConfig.push({ 
      title: 'Active Jobs', 
      value: stats?.activeJobs || 0, 
      iconType: 'briefcase'
    });
    statsConfig.push({ 
      title: 'Total Candidates', 
      value: stats?.totalCandidates || 0, 
      iconType: 'users'
    });

    if (isSuperAdmin) {
      statsConfig.push({ 
        title: 'Recruiters', 
        value: stats?.totalRecruiters || 0, 
        iconType: 'users'
      });
    }
  }

  const normalizeStatus = useCallback((s) => {
    const st = (s || '').toString().trim().toLowerCase();
    if (!st) return '';
    if (st === 'ended' || st === 'completed') return 'ended';
    if (st === 'ongoing' || st === 'running' || st === 'active') return 'ongoing';
    if (st === 'paused' || st === 'pause') return 'paused';
    return st;
  }, []);

  const filteredJobs = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (jobs || []).filter(job => {
      const title = (job.title || '').toLowerCase();
      const position = (job.position || '').toLowerCase();
      const rawStatus = (job.status || job.JobStatus || '');
      const status = normalizeStatus(rawStatus);

      const matchesSearch = title.includes(q) || position.includes(q);
      const matchesStatus = (selectedJobStatus === 'All') || (status === selectedJobStatus.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, selectedJobStatus, normalizeStatus]);

  const statusOrder = { ongoing: 0, paused: 1, ended: 2 };
  const sortedJobs = useMemo(() => filteredJobs.slice().sort((a, b) => {
    const aCreated = Date.parse(a.createdAt || a.CreatedAt || a.JobCreatedAt || a.CreatedOn || a.PostedOn || '') || 0;
    const bCreated = Date.parse(b.createdAt || b.CreatedAt || b.JobCreatedAt || b.CreatedOn || b.PostedOn || '') || 0;
    if (aCreated !== bCreated) return bCreated - aCreated;

    const sa = normalizeStatus((a.status || a.JobStatus || ''));
    const sb = normalizeStatus((b.status || b.JobStatus || ''));
    const oa = Object.prototype.hasOwnProperty.call(statusOrder, sa) ? statusOrder[sa] : 3;
    const ob = Object.prototype.hasOwnProperty.call(statusOrder, sb) ? statusOrder[sb] : 3;
    if (oa !== ob) return oa - ob;

    const aKey = (a.position || a.title || '').toString();
    const bKey = (b.position || b.title || '').toString();
    return aKey.localeCompare(bKey);
  }), [filteredJobs]);

  const totalJobs = sortedJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));
  
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalJobs]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalJobs);
  const paginatedJobs = useMemo(() => sortedJobs.slice(startIndex, endIndex), [sortedJobs, startIndex, endIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="text-lg font-medium text-gray-700">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Navbar variant="dashboard" onFeedback={handleFeedback} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              Manage Your Jobs And Candidates
            </p>
          </div>
          <div className="flex gap-3">
            {isSuperAdmin && (
              <button
                onClick={handleAddRecruiters}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Recruiter
              </button>
            )}
            {(userRole !== 'Candidate' && userRole !== 'HiringAssistant') && (
              <button
                onClick={handleGetStarted}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Post New Job
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {statsConfig.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {statsConfig.map((stat, index) => {
              const iconColors = {
                briefcase: 'text-purple-600 bg-purple-50',
                users: index === 1 ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'
              };
              
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105"
                  style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.06}s both` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-sm font-medium text-gray-600">{stat.title}</div>
                      <div className={`p-2 rounded-lg ${iconColors[stat.iconType] || 'text-gray-600 bg-gray-50'}`}>
                        {stat.iconType === 'briefcase' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-4xl font-bold text-gray-900">{stat.value}</div>
                      {stat.change && (
                        <div className="text-sm font-medium text-green-600">{stat.change}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
              <div className="relative flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 transition-all duration-300 shadow-lg hover:shadow-xl">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs by title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 focus:outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-3 text-gray-400 hover:text-purple-600 transition-colors bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200 hover:border-purple-300 shadow-md hover:shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              
              <div className="flex bg-white/80 backdrop-blur-sm rounded-xl p-1.5 border-2 border-gray-200 shadow-md">
                {['All', 'Active', 'Paused', 'Closed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => { 
                      const mappedStatus = status === 'Active' ? 'Ongoing' : status === 'Paused' ? 'Paused' : status === 'Closed' ? 'Ended' : 'All';
                      setSelectedJobStatus(mappedStatus); 
                      setCurrentPage(1); 
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      (selectedJobStatus === 'All' && status === 'All') ||
                      (selectedJobStatus === 'Ongoing' && status === 'Active') ||
                      (selectedJobStatus === 'Paused' && status === 'Paused') ||
                      (selectedJobStatus === 'Ended' && status === 'Closed')
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedJobs.length > 0 ? (
            paginatedJobs.map((job, index) => (
              <div
                key={job.id}
                className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105"
                style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.06}s both` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <JobCard
                    job={job}
                    onDelete={handleDeleteJob}
                    onPause={handlePauseJob}
                    onResume={handleResumeJob}
                    onEdit={handleEditJob}
                    onComplete={handleCompleteJob}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery ? 'No jobs found matching your search' : 'No Current Jobs'}
              </p>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your filters' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalJobs > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm font-medium text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200">
              Showing <span className="text-purple-600 font-bold">{startIndex + 1} - {endIndex}</span> of <span className="font-bold">{totalJobs}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                  currentPage <= 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white shadow-md hover:shadow-lg border border-gray-200'
                }`}
              >
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
                    }`}
                  >
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
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

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

export default Dashboard;