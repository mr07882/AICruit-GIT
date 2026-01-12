import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateShortlistWizard from './pages/CreateShortlistWizard';
import CandidateRankingPage from './pages/CandidateRankingPage';
import CandidateProfilePage from './pages/CandidateProfilePage';
import CandidateDropCVPage from './pages/CandidateDropCVPage';
import InterviewGuidelinesPage from './pages/InterviewGuidelinesPage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import InterviewScreen from './pages/InterviewScreen';
import InterviewEndPage from './pages/InterviewEndPage';
import ManageRecruitersPage from './pages/ManageRecruitersPage';
import EditJobPage from './pages/EditJobPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes (require login) */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create-shortlist" element={<ProtectedRoute><CreateShortlistWizard /></ProtectedRoute>} />
        <Route path="/job/:jobId/candidates" element={<ProtectedRoute><CandidateRankingPage /></ProtectedRoute>} />
        <Route path="/candidates/:candidateId/profile" element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>} />
        <Route path="/job/:jobId/candidate/:email/profile" element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>} />
        {/* Public route - candidate drop CV should remain accessible without login */}
        <Route path="/candidate-drop-cv" element={<CandidateDropCVPage />} />
        <Route path="/client-interview-guidelines-page" element={<ProtectedRoute><InterviewGuidelinesPage /></ProtectedRoute>} />
        <Route path="/interview-setup" element={<ProtectedRoute><InterviewSetupPage /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><InterviewScreen /></ProtectedRoute>} />
        <Route path="/interview-end" element={<ProtectedRoute><InterviewEndPage /></ProtectedRoute>} />
        <Route path="/manage-recruiters" element={<ProtectedRoute><ManageRecruitersPage /></ProtectedRoute>} />
        <Route path="/job/:jobId/edit" element={<ProtectedRoute><EditJobPage /></ProtectedRoute>} />


        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;