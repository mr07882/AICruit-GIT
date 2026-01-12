import React from 'react';

const ResumeScoreCard = ({ scores }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Resume Score</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-center py-4 px-4 font-semibold text-gray-900">Recency Score</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-900">Relevance Score</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-900">Skill Match</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-900">Experience Score</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-900">Soft Skills</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-900 bg-gray-50">Final Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center py-6 px-4 text-3xl font-bold text-gray-900">
                {scores.recencyScore}
              </td>
              <td className="text-center py-6 px-4 text-3xl font-bold text-gray-900">
                {scores.relevanceScore}
              </td>
              <td className="text-center py-6 px-4 text-3xl font-bold text-gray-900">
                {scores.skillMatch}
              </td>
              <td className="text-center py-6 px-4 text-3xl font-bold text-gray-900">
                {scores.experienceScore}
              </td>
              <td className="text-center py-6 px-4 text-3xl font-bold text-gray-900">
                {scores.softSkills}
              </td>
              <td className="text-center py-6 px-4 text-3xl font-bold text-gray-900 bg-gray-50">
                {scores.finalScore}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumeScoreCard;