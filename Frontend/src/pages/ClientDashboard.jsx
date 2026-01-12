import React, { useState } from 'react';
import Navbar from '../components/NavBar';
import Button from '../components/Buttons';
import { clientJobsData } from '../mock/clientDashboardData';
import { useNavigate } from 'react-router-dom';

const ClientDashboard = () => {
  const [jobs] = useState(clientJobsData);
  const navigate = useNavigate();

  const handleFeedback = () => {
    alert('Feedback feature coming soon!');
  };

  const handleLogout = () => {
    alert('Logging out...');
  };

  const handleStartInterview = (jobId) => {
    navigate('/client-interview-guidelines-page');
    // Optional: Remove or keep the alert
    // alert(`Starting interview for job ${jobId}`);
  };

  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'applied':
        return 'text-gray-600';
      case 'shortlisted':
        return 'text-blue-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        variant="dashboard"
        onFeedback={handleFeedback}
        onLogout={handleLogout}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Jobs</h1>
          <p className="text-gray-600">Start Your Interview</p>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                {/* Left: Job Info */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {job.title}
                  </h2>
                  <p className="text-sm text-green-600 font-medium">
                    {job.position}
                  </p>
                </div>

                {/* Right: Status & Action */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(job.statusType)}`}>
                      Status: {job.status}
                    </p>
                  </div>
                  
                  {job.hasInterviewButton && (
                    <Button
                      onClick={() => handleStartInterview(job.id)}
                      className="whitespace-nowrap"
                    >
                      Start Interview
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;