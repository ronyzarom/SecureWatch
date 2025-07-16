import { Employee } from '../types';

export const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Critical': return 'bg-red-500';
    case 'High': return 'bg-orange-500';
    case 'Medium': return 'bg-yellow-500';
    case 'Low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const getRiskTextColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Critical': return 'text-red-600';
    case 'High': return 'text-orange-600';
    case 'Medium': return 'text-yellow-600';
    case 'Low': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

export const getRiskBorderColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Critical': return 'border-red-500';
    case 'High': return 'border-orange-500';
    case 'Medium': return 'border-yellow-500';
    case 'Low': return 'border-green-500';
    default: return 'border-gray-500';
  }
};

export const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMs = now.getTime() - time.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

export const sortEmployeesByRisk = (employees: Employee[]): Employee[] => {
  return [...employees].sort((a, b) => b.riskScore - a.riskScore);
};