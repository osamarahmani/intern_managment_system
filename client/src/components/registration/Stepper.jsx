import React from 'react';

const Stepper = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Personal Details' },
    { number: 2, label: 'Contact Details' },
    { number: 3, label: 'Program Details' },
    { number: 4, label: 'Review & Submit' }
  ];

  return (
    <div className="stepper-wrapper">
      <div className="stepper-tabs" role="tablist" aria-label="Registration Progress Stepper">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isInactive = currentStep < step.number;

          let tabClass = 'stepper-tab';
          if (isActive) tabClass += ' tab-active';
          if (isCompleted) tabClass += ' tab-completed';
          if (isInactive) tabClass += ' tab-inactive';

          return (
            <div 
              key={step.number} 
              className={tabClass}
              role="tab"
              aria-selected={isActive}
              aria-label={`Step ${step.number}: ${step.label}`}
            >
              <span className="tab-label-text">{step.label}</span>
            </div>
          );
        })}
      </div>
      {/* Stepper Baseline Divider */}
      <div className="stepper-divider" aria-hidden="true"></div>
    </div>
  );
};

export default Stepper;
