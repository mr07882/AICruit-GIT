import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressStepper from '../components/ProgressStepper';
import Input from '../components/Input';
import Button from '../components/Buttons';
import { useNotifications } from '../components/Notifications';

const CreateShortlistStep1 = ({ onNext, initialData, exitLabel, isProcessing }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    roleTitle: initialData?.roleTitle || '',
    companyName: initialData?.companyName || '',
    jobDescription: initialData?.jobDescription || ''
  });

  const steps = [
    { id: 1, label: 'Upload JD' },
    { id: 2, label: 'Set Criteria' },
    { id: 3, label: 'Add Candidates' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTextChange = (value) => {
    setFormData(prev => ({
      ...prev,
      jobDescription: value
    }));
  };

  const { showConfirm } = useNotifications();

  const handleNext = () => {
    if (!formData.roleTitle || !formData.companyName) {
      alert('Please fill in all required fields');
      return;
    }
    onNext(formData);
  };

  const handleExit = async () => {
    const confirmed = await showConfirm('Are you sure you want to discard changes? Your progress will be lost.');
    if (confirmed) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <ProgressStepper currentStep={1} steps={steps} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Step 1: What Role Are You Shortlisting For?
          </h2>

          <div className="space-y-8">
            <div className="bg-gray-50 rounded-xl p-8">
              <Input
                label="Role Title"
                type="text"
                name="roleTitle"
                placeholder="eg. Chief Technology Officer"
                value={formData.roleTitle}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <Input
                label="Company Name"
                type="text"
                name="companyName"
                placeholder="eg. TechCorp"
                value={formData.companyName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Job description</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Paste or type the full job description below.
              </p>
              <textarea
                name="jobDescription"
                value={formData.jobDescription}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={10}
                className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Provide the full job description here..."
              />
            </div>
          </div>

          <div className="flex justify-between mt-12">
            <Button
              onClick={handleExit}
              variant="outline"
              className="px-8"
            >
              {exitLabel || 'Exit job setup'}
            </Button>
            <Button
              onClick={handleNext}
              variant="primary"
              className="px-12"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateShortlistStep1;