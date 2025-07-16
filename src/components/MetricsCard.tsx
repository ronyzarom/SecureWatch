import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  color?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'text-blue-600'
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% from last week
            </p>
          )}
        </div>
        <div className={`${color} bg-opacity-10 dark:bg-opacity-20 rounded-full p-3`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
};