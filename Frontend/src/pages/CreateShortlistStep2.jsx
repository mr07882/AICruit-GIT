import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressStepper from '../components/ProgressStepper';
import Button from '../components/Buttons';
import CriteriaInput from '../components/CriteriaInput';
import CriteriaList from '../components/CriteriaList';
import { sampleNonNegotiableCriteria, sampleOtherCriteria } from '../mock/JobData';
import { useNotifications } from '../components/Notifications';

const CreateShortlistStep2 = ({ onNext, onBack, initialData, exitLabel }) => {
  const navigate = useNavigate();
  const [nonNegotiableCriteria, setNonNegotiableCriteria] = useState(
    initialData?.nonNegotiableCriteria || sampleNonNegotiableCriteria
  );
  const [otherCriteria, setOtherCriteria] = useState(
    initialData?.otherCriteria || sampleOtherCriteria
  );

  const { showConfirm } = useNotifications();

  const steps = [
    { id: 1, label: 'Upload JD' },
    { id: 2, label: 'Set Criteria' },
    { id: 3, label: 'Add Candidates' }
  ];

  const handleAddNonNegotiable = (criteria) => {
    if (nonNegotiableCriteria.length < 5) {
      setNonNegotiableCriteria([...nonNegotiableCriteria, criteria]);
    } else {
      alert('Maximum 5 non-negotiable criteria allowed');
    }
  };

  const handleRemoveNonNegotiable = (index) => {
    setNonNegotiableCriteria(nonNegotiableCriteria.filter((_, i) => i !== index));
  };

  const handleAddOther = (criteria) => {
    setOtherCriteria([...otherCriteria, criteria]);
  };

  const handleRemoveOther = (index) => {
    setOtherCriteria(otherCriteria.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (nonNegotiableCriteria.length === 0) {
      alert('Please add at least one non-negotiable criteria');
      return;
    }
    onNext({
      nonNegotiableCriteria,
      otherCriteria
    });
  };

  const handleExit = async () => {
    const confirmed = await showConfirm('Are you sure you want to discard changes? Your progress will be lost.');
    if (confirmed) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <ProgressStepper currentStep={2} steps={steps} />

        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Step 2: How Would You Like To Evaluate Candidates
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900">
              {initialData?.roleTitle || 'Senior Software Developer'}
            </h3>
            <p className="text-gray-500">{initialData?.companyName || 'Techtrific'}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Non-Negotiable Criteria</h3>
            <p className="text-gray-500 text-sm mb-6">set up to 5 non-negotiable criteria</p>
            
            <CriteriaInput 
              onAdd={handleAddNonNegotiable}
              placeholder="Enter a non-negotiable criteria"
            />
            
            <CriteriaList 
              items={nonNegotiableCriteria}
              onRemove={handleRemoveNonNegotiable}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Other Criteria</h3>
            <p className="text-gray-500 text-sm mb-6">include additional evaluation criteria</p>
            
            <CriteriaInput 
              onAdd={handleAddOther}
              placeholder="Enter other criteria"
            />
            
            <CriteriaList 
              items={otherCriteria}
              onRemove={handleRemoveOther}
            />
          </div>

          <div className="flex justify-between">
            <div className="flex gap-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="px-8"
              >
                Back
              </Button>
              <Button
                onClick={handleExit}
                variant="outline"
                className="px-8"
              >
                {exitLabel || 'Exit job setup'}
              </Button>
            </div>
            <Button
              onClick={handleNext}
              variant="primary"
              className="px-12"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateShortlistStep2;