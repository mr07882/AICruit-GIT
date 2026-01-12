import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ProgressStepper, FileUpload } from '../components';
import { apiFetch, authService } from '../services/AuthService';
import { jobService } from '../services/JobService';

const CreateShortlistStep3 = ({ onBack, initialData, isEdit = false, uploadedFiles: uploadedFilesProp, setUploadedFiles: setUploadedFilesProp }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'link'
  const [localUploadedFiles, setLocalUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkSettings, setLinkSettings] = useState({
    expiryDays: 7,
    maxCandidates: 25,
    requireLogin: false,
  });

  // use uploadedFiles from props if provided, otherwise local state
  const uploadedFiles = Array.isArray(uploadedFilesProp) ? uploadedFilesProp : localUploadedFiles;
  const setUploadedFiles = setUploadedFilesProp || setLocalUploadedFiles;

  const handleFileUpload = (file) => {
    // Limit to 25 files max
    if (uploadedFiles.length >= 25) {
      alert('Maximum 25 files allowed');
      return;
    }

    setUploadedFiles(prev => [...prev, file]);
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateLink = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call
      const response = await jobService.generateCandidateLink({
        jobId: initialData.jobId,
        settings: linkSettings,
      });
      
      setGeneratedLink(response.link);
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Failed to generate link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

  const handleFinish = async () => {
    setIsLoading(true);

    try {
      // Create the job and upload candidates in one request to /api/CreateJob
      // Collect data from initialData and uploadedFiles
      const payload = new FormData();
      const owner = authService.getUser();
      const ownerEmail = owner && (owner.Email || owner.email) || '';

      payload.append('JobTitle', initialData.roleTitle || '');
      payload.append('CompanyName', initialData.companyName || '');
      payload.append('JobDescription', initialData.jobDescription || '');

      // NonNegotiable and Additional expect comma-separated or arrays; send as comma-separated
      const nonNeg = (initialData.nonNegotiableCriteria || []).join(',');
      const additional = (initialData.otherCriteria || []).join(',');
      payload.append('NonNegotiable', nonNeg);
      payload.append('Additional', additional);
      payload.append('OwnerEmail', ownerEmail);

      // Append uploaded files under field name 'cvs'
      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          payload.append('cvs', f, f.name);
        }
        // Add placeholder emails for uploaded files so backend can create candidate entries
        try {
          const placeholders = uploadedFiles.map((_, i) => `CA${i + 1}@example.com`);
          payload.append('candidateEmails', placeholders.join(','));
        } catch (e) {
          console.warn('Failed to attach placeholder candidate emails', e);
        }
      }

      const res = await apiFetch('/api/CreateJob', { method: 'POST', body: payload });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }
      const json = await res.json();
      const createdLink = json?.job?.JobLink || json?.JobLink || '';

      // Handle both sync (200) and async (202) responses
      if (res.status === 202 || json.note) {
        alert(`Job created successfully. Resume evaluation processing in the background.\n${json.note || 'Scores will be updated shortly.'}`);
      } else {
        alert('Job created successfully');
      }

      if (createdLink) {
        try {
          await navigator.clipboard.writeText(createdLink);
        } catch (e) {
          // If clipboard not available, show the link to the user
          alert(`Candidate link:\n${createdLink}`);
        }
      }

      // Optionally show or store the generated link in the UI
      if (createdLink) setGeneratedLink(createdLink);

      navigate('/dashboard');
    } catch (error) {
      console.error('Error finishing setup:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Progress Stepper */}
      <ProgressStepper
        steps={[
          { number: 1, label: 'Upload JD', completed: true },
          { number: 2, label: 'Set Criteria', completed: true },
          { number: 3, label: 'Add Candidates', active: true },
        ]}
      />

      {/* Main Content */}
      <div className="mt-12">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Step 3: How Do You Want To Add Candidates
        </h1>

        {/* Tab Buttons: only manual upload tab is displayed */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1">
            <button
              onClick={() => setActiveTab('manual')}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
                activeTab === 'manual'
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-medium">Upload manually</span>
            </button>
          </div>
        </div>

        {/* Manual Upload Tab */}
        {activeTab === 'manual' && (
          <div className="bg-gray-50 rounded-xl p-8">
            <p className="text-gray-600 mb-6">
              Drop CVs of candidates you want to evaluate - up to 25
            </p>

            <FileUpload
              onFileSelect={handleFileUpload}
              acceptedFormats=".pdf,.doc,.docx"
              maxSize={5}
            />

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Uploaded Files ({uploadedFiles.length}/25)
                </h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Link Tab */}
        {!isEdit && activeTab === 'link' && (
          <div className="bg-gray-50 rounded-xl p-8">
            <div className="space-y-6">
              {/* Link Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Link Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link Expiry
                    </label>
                    <select
                      value={linkSettings.expiryDays}
                      onChange={(e) => setLinkSettings(prev => ({
                        ...prev,
                        expiryDays: parseInt(e.target.value)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value={1}>1 Day</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Candidates
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={linkSettings.maxCandidates}
                      onChange={(e) => setLinkSettings(prev => ({
                        ...prev,
                        maxCandidates: parseInt(e.target.value)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requireLogin"
                      checked={linkSettings.requireLogin}
                      onChange={(e) => setLinkSettings(prev => ({
                        ...prev,
                        requireLogin: e.target.checked
                      }))}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="requireLogin" className="ml-2 text-sm text-gray-700">
                      Require candidates to login before submitting
                    </label>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              {!generatedLink && (
                <Button
                  onClick={handleGenerateLink}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Generating...' : 'Generate Candidate Link'}
                </Button>
              )}

              {/* Generated Link Display */}
              {generatedLink && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share this link with candidates
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Link expires in {linkSettings.expiryDays} day{linkSettings.expiryDays > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons (hidden in edit mode; Edit page renders its own aligned controls) */}
        {!isEdit && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
            >
              Back
            </Button>

            {!isEdit && (
              <Button
                onClick={handleFinish}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Finish'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateShortlistStep3;