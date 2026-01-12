import React from 'react';
import Button from '../components/Buttons';
import { useNavigate } from 'react-router-dom';
import { apiFetch, authService } from '../services/AuthService';

const InterviewEndPage = () => {
  const navigate = useNavigate();
  const handleDashboard = () => {
    (async () => {
      try {
        // Determine jobId and email: prefer query params, fallback to logged-in user
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get('jobId');
        const emailParam = params.get('email');
        const user = authService.getUser && authService.getUser();
        const email = emailParam || (user && (user.Email || user.email));

        if (jobId && email) {
          // Call backend to mark AI interview completed
          const body = { Email: decodeURIComponent(email), JobID: jobId, PromoteTo: 'AIInterviewCompleted' };
          try {
            const res = await apiFetch('/api/ChangeApplicationStatus', { method: 'POST', body: JSON.stringify(body) });
            if (!res.ok) {
              const txt = await res.text();
              console.error('Failed to update application status:', txt || res.status);
            }
          } catch (err) {
            console.error('Error calling ChangeApplicationStatus:', err);
          }
        }

      } catch (e) {
        console.error('Error during interview end processing', e);
      } finally {
        // Redirect everyone to the main dashboard
        navigate('/dashboard');
      }
    })();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Thank You Message */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Thank you for completing the interview!
      </h1>

      {/* Dashboard Button */}
      <Button
        onClick={handleDashboard}
        className="px-12"
      >
        Dashboard
      </Button>
    </div>
  );
};

export default InterviewEndPage;