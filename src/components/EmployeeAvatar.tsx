import React, { useState } from 'react';

interface Employee {
  name: string;
  email?: string;
  department?: string;
  photo?: string;
}

interface EmployeeAvatarProps {
  employee: Employee;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({ 
  employee, 
  size = 'md', 
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const getInitials = (name: string) => {
    if (!name) return 'N/A';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getBackgroundColor = (name: string) => {
    if (!name) return '#808080'; // Default gray color for missing names
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#FFB6C1', '#87CEEB'
    ];
    const index = Math.abs(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  if (!employee.photo || imageError) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
        style={{ backgroundColor: getBackgroundColor(employee.name) }}
      >
        {getInitials(employee.name)}
      </div>
    );
  }

  return (
    <img
      src={employee.photo}
      alt={employee.name}
      className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      onError={() => setImageError(true)}
    />
  );
};

export default EmployeeAvatar; 