import React from 'react';

const ProgressStepper = ({ currentStep, steps }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-12">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : isCompleted
                      ? 'bg-gray-300 text-gray-700'
                      : 'bg-white border-2 border-gray-300 text-gray-500'
                  }`}
                >
                  {stepNumber}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-700">{step.label}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    stepNumber < currentStep ? 'bg-gray-300' : 'bg-gray-200'
                  }`}
                  style={{ marginBottom: '24px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressStepper;