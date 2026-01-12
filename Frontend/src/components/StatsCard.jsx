import React from 'react';
import { Briefcase, Users, UserCheck, Calendar } from 'lucide-react';

const StatsCard = ({ title, value, iconType }) => {
  const getIcon = (type) => {
    const icons = {
      briefcase: Briefcase,
      users: Users,
      userCheck: UserCheck,
      calendar: Calendar
    };
    return icons[type] || Briefcase;
  };

  const Icon = getIcon(iconType);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-gray-600" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;