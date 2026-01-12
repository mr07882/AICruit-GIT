import React, { useState } from 'react';
import { Camera, Mic, Video, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InterviewGuidelinesPage = () => {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleStartInterview = () => {
    if (agreed) {
      navigate('/interview-setup');
      console.log('Starting interview...');
      // Add navigation logic here
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
    console.log('Going back...');
    // Add navigation logic here
  };

  const guidelines = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Keep Your Camera On",
      description: "Stay visible and look into the camera throughout the interview. Ensure your background is clean and dress professionally.",
      color: "text-blue-600"
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Speak Clearly",
      description: "Ensure your microphone is working. Speak at a normal pace and volume in a quiet place.",
      color: "text-green-600"
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: "Recording & Matching",
      description: "Your responses will be recorded and used to match you with job opportunities and shared with hiring managers.",
      color: "text-purple-600"
    },
    {
      icon: <AlertCircle className="w-6 h-6" />,
      title: "No External Assistance",
      description: "Complete the interview without help from others or AI tools. External assistance may result in disqualification.",
      color: "text-red-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">Interview Guidelines</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Video className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Get Ready For Your Interview!
          </h1>
          <p className="text-gray-600">
            Please follow the following guidelines for a smooth experience
          </p>
        </div>

        {/* Guidelines Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Interview Guidelines
          </h2>

          <div className="space-y-6">
            {guidelines.map((guideline, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center ${guideline.color}`}>
                  {guideline.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {guideline.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {guideline.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Consent Checkbox */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                I agree to my interview being recorded and used to match me with a potential job
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            Back
          </button>
          <button
            onClick={handleStartInterview}
            disabled={!agreed}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
              agreed
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Interview
          </button>
        </div>

        {/* Help Text */}
        {!agreed && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Please agree to the terms to start your interview
          </p>
        )}
      </div>

      {/* Desktop/Primary Label */}
      <div className="fixed top-4 left-4 text-xs text-gray-500 font-mono">
        Desktop · Primary
      </div>
    </div>
  );
};

export default InterviewGuidelinesPage;