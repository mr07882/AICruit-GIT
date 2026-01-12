import React, { useState, useEffect } from 'react';
import { Mic, Settings } from 'lucide-react';
import Button from '../components/Buttons';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../components/Notifications';

const InterviewPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationScale, setAnimationScale] = useState(1);
  const navigate = useNavigate();
  const { showConfirm } = useNotifications();

  const steps = [
    { id: 1, label: 'Introduction', status: 'active' },
    { id: 2, label: 'Basic Questions', status: 'upcoming' },
    { id: 3, label: 'Detailed Question', status: 'upcoming' },
    { id: 4, label: 'Conclusion', status: 'upcoming' }
  ];

  // Animate waveform when speaking
  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setAnimationScale(prev => (prev === 1 ? 1.1 : 1));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  const handleMicToggle = () => {
    setIsRecording(!isRecording);
    if (isPaused) setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleDone = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setIsRecording(false);
      setIsPaused(false);
    } else {
      alert('Interview completed!');
      // preserve jobId and email
      const params = new URLSearchParams(window.location.search);
      const jobId = params.get('jobId');
      const email = params.get('email');
      const q = [];
      if (jobId) q.push(`jobId=${encodeURIComponent(jobId)}`);
      if (email) q.push(`email=${encodeURIComponent(email)}`);
      const qs = q.length ? `?${q.join('&')}` : '';
      navigate(`/interview-end${qs}`);
      // Navigate to completion page
    }
  };

  const handleExit = async () => {
    const confirmed = await showConfirm('Are you sure you want to exit the interview?');
    if (!confirmed) return;
    alert('Exiting interview...');
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    navigate('/dashboard');
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Progress Stepper */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center relative">
          {/* Progress Stepper - Centered */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      getStepStatus(step.id) === 'completed'
                        ? 'bg-purple-600 text-white'
                        : getStepStatus(step.id) === 'active'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.id}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 whitespace-nowrap">
                    {step.label}
                  </p>
                </div>

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-16 mb-6 transition-all ${
                      getStepStatus(step.id) === 'completed'
                        ? 'bg-purple-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Exit Button - Positioned to the right */}
          <button
            onClick={handleExit}
            className="absolute right-0 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Waveform Animation */}
        <div className="mb-8">
          <div 
            className="flex items-end justify-center gap-1.5 h-32"
            style={{ transform: `scale(${animationScale})`, transition: 'transform 0.3s ease' }}
          >
            {[40, 60, 100, 80, 70, 90, 70].map((height, index) => (
              <div
                key={index}
                className={`w-3 rounded-full transition-all duration-300 ${
                  isRecording && !isPaused ? 'bg-gray-900' : 'bg-gray-400'
                }`}
                style={{
                  height: `${height}px`,
                  animation: isRecording && !isPaused ? `pulse ${0.5 + index * 0.1}s ease-in-out infinite alternate` : 'none'
                }}
              />
            ))}
          </div>
        </div>

        {/* Status Text */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-12">
          {isRecording && !isPaused ? 'AI-Cruit Speaking' : isPaused ? 'Paused' : 'AI-Cruit Ready'}
        </h2>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Microphone Button */}
          <button
            onClick={handleMicToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-100 hover:bg-red-200'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Mic 
              size={24} 
              className={isRecording ? 'text-red-600' : 'text-gray-700'}
              fill={isRecording ? 'currentColor' : 'none'}
            />
          </button>

          {/* Pause/Resume Button */}
          <button
            onClick={handlePauseResume}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors min-w-[200px]"
          >
            {isPaused ? 'Resume' : 'Pause and resume later'}
          </button>

          {/* Settings Button */}
          <button
            className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Settings size={24} className="text-gray-700" />
          </button>

          {/* Done Button */}
          <Button
            onClick={handleDone}
            className="px-8"
          >
            Done
          </Button>
        </div>
      </div>

      {/* CSS for waveform animation */}
      <style jsx>{`
        @keyframes pulse {
          from {
            transform: scaleY(0.6);
          }
          to {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
};

export default InterviewPage;