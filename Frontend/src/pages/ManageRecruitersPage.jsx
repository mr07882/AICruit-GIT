import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Plus, X } from 'lucide-react';
import Navbar from '../components/NavBar';
import Button from '../components/Buttons';
import { apiFetch } from '../services/AuthService';
import { useNotifications } from '../components/Notifications';

const ManageRecruitersPage = () => {
  const [recruiters, setRecruiters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecruiters, setSelectedRecruiters] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecruiterName, setNewRecruiterName] = useState('');
  const [newRecruiterEmail, setNewRecruiterEmail] = useState('');
  const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(true);

  const { showConfirm } = useNotifications();

  const handleFeedback = () => {
    alert('Feedback feature coming soon!');
  };

  const handleLogout = () => {
    alert('Logging out...');
  };

  useEffect(() => {
    let mounted = true;
    const loadRecruiters = async () => {
      try {
        const res = await apiFetch('/api/AllRecruiters', { method: 'GET' });
        if (!res.ok) {
          console.error('Failed to fetch recruiters', res.status);
          if (mounted) setIsLoadingRecruiters(false);
          return;
        }
        const json = await res.json();
        // Expecting { TotalRecruiters, Recruiters: [{ Email, FullName }] }
        const list = (json.Recruiters || []).map((r, idx) => ({ id: idx + 1, name: r.FullName || '', email: r.Email || '' }));
        if (mounted) {
          setRecruiters(list);
          setIsLoadingRecruiters(false);
        }
      } catch (err) {
        console.error('Error loading recruiters', err);
        if (mounted) setIsLoadingRecruiters(false);
      }
    };
    loadRecruiters();
    return () => { mounted = false; };
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleRemove = async () => {
    if (selectedRecruiters.length === 0) {
      alert('Please select recruiters to remove');
      return;
    }
    const confirmed = await showConfirm(`Remove ${selectedRecruiters.length} recruiter(s)?`);
    if (!confirmed) return;

    // Collect emails for selected recruiters
    const emails = selectedRecruiters.map(id => {
      const r = recruiters.find(x => x.id === id);
      return r ? r.email : null;
    }).filter(Boolean);

    if (emails.length === 0) {
      alert('No valid recruiter emails selected');
      return;
    }

    try {
      const res = await apiFetch('/api/RemoveRecruiter', { method: 'POST', body: JSON.stringify({ Emails: emails }) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      const json = await res.json();
      // Remove from local state
      setRecruiters(recruiters.filter(r => !emails.includes(r.email)));
      setSelectedRecruiters([]);
      alert(`Removed ${json.deletedCount || emails.length} recruiter(s)`);
    } catch (err) {
      console.error('Failed to remove recruiters', err);
      alert('Failed to remove recruiters');
    }
  };

  const handleAddNew = () => {
    if (newRecruiterName.trim() === '') {
      alert('Please enter a recruiter name');
      return;
    }

    if (newRecruiterEmail.trim() === '') {
      alert('Please enter a recruiter email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecruiterEmail.trim())) {
      alert('Please enter a valid email address');
      return;
    }

    (async () => {
      try {
        const body = { Email: newRecruiterEmail.trim(), FullName: newRecruiterName.trim() };
        const res = await apiFetch('/api/InviteRecruiter', { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed (${res.status})`);
        }
        const json = await res.json();
        const created = json.user;
        const newItem = { id: Date.now(), name: created.FullName || created.Email, email: created.Email };
        setRecruiters([newItem, ...recruiters]);
        setNewRecruiterName('');
        setNewRecruiterEmail('');
        setShowAddModal(false);
      } catch (err) {
        console.error('Failed to invite recruiter', err);
        alert('Failed to invite recruiter: ' + (err.message || 'Unknown error'));
      }
    })();
  };

  const toggleRecruiterSelection = (id) => {
    if (selectedRecruiters.includes(id)) {
      setSelectedRecruiters(selectedRecruiters.filter(rId => rId !== id));
    } else {
      setSelectedRecruiters([...selectedRecruiters, id]);
    }
  };

  const filteredRecruiters = recruiters.filter(recruiter =>
    (recruiter.name || recruiter.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Navbar 
        variant="dashboard"
        onFeedback={handleFeedback}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header Section with Enhanced Design */}
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
              Recruiters
            </h1>
            <p className="text-gray-600 text-lg font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              Manage your recruiting team
            </p>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-4 mb-8">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <input
              type="text"
              placeholder="Search recruiters..."
              value={searchQuery}
              onChange={handleSearch}
              className="relative w-full px-6 py-3 pl-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-lg hover:shadow-xl"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-purple-500" size={20} />
          </div>

          {/* Filter Button */}
          <button className="p-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white hover:border-purple-300 transition-all duration-300 shadow-lg hover:shadow-xl">
            <SlidersHorizontal size={20} />
          </button>

          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-300 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <X size={18} />
            Remove
          </button>

          {/* Add New Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Plus size={18} />
            Add Recruiter
          </button>
        </div>

        {/* Recruiters List */}
        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 hover:border-purple-300 shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <div className="space-y-3">
              {isLoadingRecruiters ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                  </div>
                  <p className="text-gray-600 mt-4 font-medium">Loading Recruiters...</p>
                </div>
              ) : (
                filteredRecruiters.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-4">
                      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m0 0l3-3m-3 3l-3-3m3 3l3 3m-3-3l-3 3m3-3l3-3" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No recruiters found</p>
                  </div>
                ) : (
                  filteredRecruiters.map((recruiter) => (
                    <div
                      key={recruiter.id}
                      onClick={() => toggleRecruiterSelection(recruiter.id)}
                      className={`px-6 py-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedRecruiters.includes(recruiter.id)
                          ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {recruiter.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-semibold">{recruiter.name || recruiter.email}</p>
                          <p className="text-sm text-gray-500">{recruiter.email}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedRecruiters.includes(recruiter.id)}
                          onChange={() => {}}
                          className="w-5 h-5 rounded border-gray-300 text-purple-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-end">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white hover:border-purple-300 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Back
          </button>
        </div>
      </main>

      {/* Add New Recruiter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-white/50">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent mb-6">Add New Recruiter</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter recruiter name"
                  value={newRecruiterName}
                  onChange={(e) => setNewRecruiterName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter recruiter email"
                  value={newRecruiterEmail}
                  onChange={(e) => setNewRecruiterEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewRecruiterName('');
                  setNewRecruiterEmail('');
                }}
                className="px-6 py-3 bg-white/80 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
              >
                Cancel
              </button>
              <Button onClick={handleAddNew} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                Add Recruiter
              </Button>
            </div>
          </div>
        </div>
      )}

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

export default ManageRecruitersPage;