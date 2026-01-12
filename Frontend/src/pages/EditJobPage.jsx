import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateShortlistStep1 from './CreateShortlistStep1';
import CreateShortlistStep2 from './CreateShortlistStep2';
import CreateShortlistStep3 from './CreateShortlistStep3';
import { apiFetch } from '../services/AuthService';

const EditJobPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [wizardData, setWizardData] = useState({
    jobId: jobId,
    roleTitle: '',
    companyName: '',
    jobDescription: '',
    nonNegotiableCriteria: [],
    otherCriteria: [],
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await apiFetch('/api/JobIntrinsics', { method: 'POST', body: JSON.stringify({ JobID: jobId }) });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed (${res.status})`);
        }
        const json = await res.json();
        // Map response to wizardData fields
        setWizardData({
          jobId: json.JobID || jobId,
          roleTitle: json.JobTitle || '',
          companyName: json.CompanyName || '',
          jobDescription: json.JobDescription || '',
          nonNegotiableCriteria: (json.EvaluationCriteria && json.EvaluationCriteria.NonNegotiable) || [],
          otherCriteria: (json.EvaluationCriteria && json.EvaluationCriteria.Additional) || [],
        });
      } catch (err) {
        console.error('Failed to fetch job details for edit:', err.message || err);
        alert('Failed to load job details');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const handleStep1Next = (data) => {
    setWizardData(prev => ({ ...prev, roleTitle: data.roleTitle, companyName: data.companyName, jobDescription: data.jobDescription }));
    setCurrentStep(2);
  };

  const handleStep2Next = (data) => {
    setWizardData(prev => ({ ...prev, nonNegotiableCriteria: data.nonNegotiableCriteria || [], otherCriteria: data.otherCriteria || [] }));
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else navigate('/dashboard');
  };

  const handleFinishEdit = async () => {
    // Call EditJobDetails endpoint
    try {
      const payload = {
        JobID: wizardData.jobId,
        NewJobTitle: wizardData.roleTitle,
        NewCompanyName: wizardData.companyName,
        NewJobDescription: wizardData.jobDescription,
        NewNonNegotiable: (wizardData.nonNegotiableCriteria || []).join(','),
        NewAdditional: (wizardData.otherCriteria || []).join(','),
      };

      const res = await apiFetch('/api/EditJobDetails', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed (${res.status})`);
      }

      // If there are uploaded files in the edit flow, send them to AddResumes
      if (uploadedFiles && uploadedFiles.length > 0) {
        try {
          const form = new FormData();
          form.append('JobID', wizardData.jobId);
          for (const f of uploadedFiles) {
            form.append('cvs', f, f.name);
          }
          // Generate placeholder emails for these new files based on existing candidate count
          try {
            const resp = await apiFetch('/api/JobIntrinsics', { method: 'POST', body: JSON.stringify({ JobID: wizardData.jobId }) });
            let existingCount = 0;
            if (resp && resp.ok) {
              const j = await resp.json();
              existingCount = (j.TotalNumberOfCandidates || 0);
            }
            const start = existingCount + 1;
            const placeholders = uploadedFiles.map((_, i) => `CA${start + i}@example.com`);
            form.append('candidateEmails', placeholders.join(','));
          } catch (e) {
            console.warn('Could not fetch existing candidate count; proceeding without candidateEmails', e);
          }
          const addRes = await apiFetch('/api/AddResumes', { method: 'POST', body: form });
          if (!addRes.ok) {
            const txt = await addRes.text();
            console.error('AddResumes failed:', txt);
            // don't throw — proceed but inform user
            alert('Job updated but adding resumes failed. Check console for details.');
            navigate('/dashboard');
            return;
          }
        } catch (rErr) {
          console.error('Failed to upload resumes:', rErr);
          alert('Job updated but uploading resumes failed. See console.');
          navigate('/dashboard');
          return;
        }
      }

      alert('Job updated successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to update job:', err.message || err);
      alert('Failed to update job. See console for details.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {currentStep === 1 && (
        <CreateShortlistStep1 onNext={handleStep1Next} initialData={wizardData} exitLabel="Discard Changes" />
      )}
      {currentStep === 2 && (
        <CreateShortlistStep2 onNext={handleStep2Next} onBack={handleBack} initialData={wizardData} exitLabel="Discard Changes" />
      )}
      {currentStep === 3 && (
        // Replace default finish behavior with edit finish
        <div className="max-w-4xl mx-auto p-8">
          <CreateShortlistStep3 onBack={handleBack} initialData={wizardData} isEdit={true} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleFinishEdit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditJobPage;
