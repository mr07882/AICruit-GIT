import React, { useState, useCallback, useMemo } from 'react';

const ExperienceList = ({ experience, experienceText, isParsing }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setIsExpanded(v => !v), []);

  // Call hooks unconditionally (eslint: rules-of-hooks). Keep memo logic safe when
  // `experience` may be undefined so hooks can run even when we early-return below.
  const firstExp = useMemo(() => (experience && experience.length > 0 ? experience[0] : null), [experience]);
  const rest = useMemo(() => (experience && experience.length > 1 ? experience.slice(1) : []), [experience]);

  if (isParsing) {
    return <p className="text-green-600 font-medium">{experienceText}</p>;
  }

  if (!firstExp) {
    return <p className="text-gray-500">{experienceText || 'No relevant experience'}</p>;
  }

  return (
    <div>
      <div className="mb-1">
        <p className="font-medium text-gray-900">{firstExp.title}</p>
        <p className="text-sm text-gray-500">
          {firstExp.company} • {firstExp.duration}
        </p>
      </div>

      {rest.length > 0 && (
        <>
          {isExpanded && (
            <div className="mt-2 space-y-2">
              {rest.map((exp, idx) => (
                <div key={exp.id || `${exp.title}-${idx}`}>
                  <p className="font-medium text-gray-900">{exp.title}</p>
                  <p className="text-sm text-gray-500">
                    {exp.company} • {exp.duration}
                  </p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={toggleExpanded}
            className="text-sm text-blue-600 hover:text-blue-700 mt-1"
          >
            {isExpanded 
              ? `- ${rest.length} less`
              : `+ ${rest.length} more`
            }
          </button>
        </>
      )}
    </div>
  );
};

export default React.memo(ExperienceList);