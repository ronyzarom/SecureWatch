import React from 'react';
import { Eye, AlertTriangle, Calendar } from 'lucide-react';
import { Employee } from '../types';
import { getRiskColor, getRiskTextColor, getRiskBorderColor, formatTimeAgo } from '../utils/riskUtils';

interface EmployeeCardProps {
  employee: Employee;
  onViewDetails: (employee: Employee) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onViewDetails }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${getRiskBorderColor(employee.riskLevel)} p-6 hover:shadow-md transition-all duration-200 cursor-pointer`}
         onClick={() => onViewDetails(employee)}>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img 
            src={employee.photoUrl || employee.photo || '/default-avatar.png'} 
            alt={employee.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          />
          <div className={`absolute -top-1 -right-1 w-6 h-6 ${getRiskColor(employee.riskLevel)} rounded-full flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{employee.riskScore}</span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10`}>
              {employee.riskLevel}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{employee.jobTitle || employee.role}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{employee.department}</p>
          
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(employee.lastActivity)}</span>
            </div>
            {(employee.violationCount > 0 || (employee.violations && employee.violations.length > 0)) && (
              <div className="flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600">
                  {employee.violationCount || employee.violations?.length || 0} violation{(employee.violationCount > 1 || (employee.violations && employee.violations.length > 1)) ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-full transition-colors">
          <Eye className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};