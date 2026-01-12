// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import CreateShortlistStep1 from './CreateShortlistStep1';
// import CreateShortlistStep2 from './CreateShortlistStep2';
// import { jobService } from '../services/JobService';

// const CreateShortlistWizard = () => {
//   const navigate = useNavigate();
//   const [currentStep, setCurrentStep] = useState(1);
//   const [wizardData, setWizardData] = useState({
//     roleTitle: '',
//     companyName: '',
//     jobDescription: null,
//     nonNegotiableCriteria: [],
//     otherCriteria: []
//   });

//   const handleStep1Next = (step1Data) => {
//     setWizardData(prev => ({
//       ...prev,
//       ...step1Data
//     }));
//     setCurrentStep(2);
//   };

//   const handleStep2Next = async (step2Data) => {
//     const finalData = {
//       ...wizardData,
//       ...step2Data
//     };
    
//     try {
//       const response = await jobService.createJob(finalData);
      
//       if (response.success) {
//         alert('Job created successfully!');
//         navigate('/dashboard');
//       }
//     } catch (error) {
//       console.error('Failed to create job:', error);
//       alert('Failed to create job. Please try again.');
//     }
//   };

//   const handleBack = () => {
//     setCurrentStep(prev => prev - 1);
//   };

//   return (
//     <>
//       {currentStep === 1 && (
//         <CreateShortlistStep1 
//           onNext={handleStep1Next}
//           initialData={wizardData}
//         />
//       )}
//       {currentStep === 2 && (
//         <CreateShortlistStep2 
//           onNext={handleStep2Next}
//           onBack={handleBack}
//           initialData={wizardData}
//         />
//       )}
//     </>
//   );
// };

// export default CreateShortlistWizard;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components';
import CreateShortlistStep1 from './CreateShortlistStep1';
import CreateShortlistStep2 from './CreateShortlistStep2';
import CreateShortlistStep3 from './CreateShortlistStep3';
import { jobService } from '../services/JobService';

const CreateShortlistWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    jobId: null,
    roleTitle: '',
    companyName: '',
    jobDescription: '',
    nonNegotiableCriteria: [],
    otherCriteria: [],
  });
  const [isSegmenting, setIsSegmenting] = useState(false);

  const handleStep1Next = async (data) => {
    // Save basic fields immediately
    setWizardData(prev => ({
      ...prev,
      roleTitle: data.roleTitle,
      companyName: data.companyName,
      jobDescription: data.jobDescription,
    }));

    // If a job description was provided, attempt to auto-segment it
    if (data.jobDescription && String(data.jobDescription).trim().length > 0) {
      setIsSegmenting(true);
      try {
        const segmented = await jobService.segmentJobDescription(data.jobDescription);
        // segmented is expected to be { NonNegotiable: [...], Additional: [...] }
        setWizardData(prev => ({
          ...prev,
          nonNegotiableCriteria: segmented?.NonNegotiable || [],
          otherCriteria: segmented?.Additional || []
        }));
      } catch (err) {
        // If segmentation fails, keep existing/default criteria (do nothing)
        console.error('JD segmentation failed:', err.message || err);
      } finally {
        setIsSegmenting(false);
      }
    }

    setCurrentStep(2);
  };

  const handleStep2Next = (data) => {
    setWizardData(prev => ({
      ...prev,
      nonNegotiableCriteria: data.nonNegotiableCriteria || [],
      otherCriteria: data.otherCriteria || []
    }));
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        variant="dashboard"
        onFeedback={() => alert('Feedback feature coming soon!')}
        onLogout={() => { try { localStorage.removeItem('token'); } catch (e) {} navigate('/'); }}
      />
      {currentStep === 1 && (
        <CreateShortlistStep1 
          onNext={handleStep1Next}
          onBack={handleBack}
          initialData={wizardData}
          isProcessing={isSegmenting}
        />
      )}
      {currentStep === 2 && (
        <CreateShortlistStep2 
          onNext={handleStep2Next}
          onBack={handleBack}
          initialData={wizardData}
        />
      )}
      {currentStep === 3 && (
        <CreateShortlistStep3 
          onBack={handleBack}
          initialData={wizardData}
        />
      )}
    </div>
  );
};

export default CreateShortlistWizard;