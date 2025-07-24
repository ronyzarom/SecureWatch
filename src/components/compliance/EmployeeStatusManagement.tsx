import React, { useState, useEffect } from 'react';
import { 
  Users, 
  User, 
  Shield, 
  AlertTriangle, 
  Check, 
  X, 
  Settings,
  Eye,
  Filter,
  Search,
  Download,
  UserPlus,
  RefreshCw,
  Star,
  Calendar,
  Award
} from 'lucide-react';
import { complianceAPI } from '../../services/api';
import { Employee, ComplianceProfile } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { ComplianceStatusBadge } from '../ComplianceStatusBadge';
import { EmployeeCard } from '../EmployeeCard'; // Use unified EmployeeCard
import { EmployeeDetailsModal } from '../EmployeeDetailsModal';

// Using the unified EmployeeCard component for consistency

interface AssignProfileModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (employeeId: number, profileId: number) => void;
  availableProfiles: ComplianceProfile[];
}

const AssignProfileModal: React.FC<AssignProfileModalProps> = ({ 
  employee, 
  isOpen, 
  onClose, 
  onAssign,
  availableProfiles 
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  useEffect(() => {
    if (employee && availableProfiles.length > 0) {
      const defaultProfile = availableProfiles.find(p => p.is_default);
      setSelectedProfileId(defaultProfile?.id || availableProfiles[0]?.id || null);
    }
  }, [employee, availableProfiles]);

  const handleAssign = () => {
    if (employee && selectedProfileId) {
      onAssign(employee.id, selectedProfileId);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Assign Compliance Profile
          </h2>
          
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {employee.job_title} • {employee.department}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Compliance Profile
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableProfiles.map((profile) => (
                <label key={profile.id} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="profile"
                    value={profile.id}
                    checked={selectedProfileId === profile.id}
                    onChange={() => setSelectedProfileId(profile.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {profile.profile_name}
                      </span>
                      {profile.is_default && (
                        <div className="flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {profile.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Risk Level: {profile.risk_level} • {profile.required_regulations?.length || 0} regulations
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedProfileId}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Shield className="w-4 h-4 mr-2" />
              Assign Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmployeeStatusManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [employeesRes, profilesRes] = await Promise.all([
        complianceAPI.employees.getAll(),
        complianceAPI.profiles.getAll()
      ]);
      
      setEmployees(employeesRes.employees || []);
      setProfiles(profilesRes.profiles?.filter(p => p.is_active) || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load employee compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProfile = (employee: Employee) => {
    console.log('🔧 Debug: Assign Profile clicked for employee:', employee.name);
    setSelectedEmployee(employee);
    setShowAssignModal(true);
    console.log('🔧 Debug: Modal should now be open, showAssignModal:', true);
  };

  const handleAssignProfileSubmit = async (employeeId: number, profileId: number) => {
    console.log('🔧 Debug: Profile assignment submitted:', { employeeId, profileId });
    try {
      await complianceAPI.employees.assignProfile(employeeId, profileId);
      setShowAssignModal(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error assigning profile:', err);
      setError('Failed to assign compliance profile');
    }
  };

  const handleViewDetails = (employee: Employee) => {
    console.log('🔧 Debug: View Details clicked for employee:', employee.name);
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleBulkEvaluate = async () => {
    try {
      await complianceAPI.employees.bulkEvaluate();
      fetchData();
    } catch (err) {
      console.error('Error running bulk evaluation:', err);
      setError('Failed to run bulk compliance evaluation');
    }
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log('Export compliance report');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
    const matchesStatus = !statusFilter || employee.complianceStatus === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const complianceStats = {
    compliant: employees.filter(e => e.complianceStatus === 'compliant').length,
    atRisk: employees.filter(e => e.complianceStatus === 'at_risk').length,
    nonCompliant: employees.filter(e => e.complianceStatus === 'non_compliant').length,
    unassigned: employees.filter(e => !e.complianceProfiles?.length).length
  };

  const departments = Array.from(new Set(employees.map(e => e.department)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-6 h-6 mr-3 text-blue-600" />
            Employee Compliance Status
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Monitor and manage employee compliance across the organization
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportReport}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={handleBulkEvaluate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Bulk Evaluate
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{complianceStats.compliant}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Compliant</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{complianceStats.atRisk}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">At Risk</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{complianceStats.nonCompliant}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Non-Compliant</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
              <UserPlus className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{complianceStats.unassigned}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="at_risk">At Risk</option>
            <option value="non_compliant">Non-Compliant</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Employees Grid */}
      {filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onViewDetails={handleViewDetails}
              layout="grid"
              showMetrics={true}
              showCompliance={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || departmentFilter || statusFilter ? 'No employees match your filters' : 'No employees found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {searchTerm || departmentFilter || statusFilter 
              ? 'Try adjusting your search criteria'
              : 'Employee data will appear here once loaded'
            }
          </p>
        </div>
      )}

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        employee={selectedEmployee}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Assign Profile Modal */}
      <AssignProfileModal
        employee={selectedEmployee}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssignProfileSubmit}
        availableProfiles={profiles}
      />
    </div>
  );
}; 