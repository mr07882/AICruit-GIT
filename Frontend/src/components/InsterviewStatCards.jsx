import React from 'react';
import { Users, Mail, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const InterviewStatsCard = ({ type, value }) => {
  const getIconAndLabel = (type) => {
    const config = {
      totalCandidates: {
        icon: Users,
        label: 'Total Candidates'
      },
      invitesSent: {
        icon: Clock,
        label: 'AI-Interviews Scheduled'
      },
      scheduled: {
        icon: Clock,
        label: 'Human-Interviews Scheduled'
      },
      pending: {
        icon: CheckCircle,
        label: 'AI-Interviews Completed'
      },
      completed: {
        icon: CheckCircle,
        label: 'Human Interviews Completed'
      }
    };
    return config[type] || { icon: AlertTriangle, label: 'Unknown' }; // Fallback for invalid types
  };

  const { icon: Icon, label } = getIconAndLabel(type);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-gray-600" />
        </div>
      </div>
    </div>
  );
};

export default InterviewStatsCard;