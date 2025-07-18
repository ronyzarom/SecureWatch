import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  AlertTriangle,
  Users,
  TrendingUp,
  Shield,
  Calendar,
  Mail,
  Clock
} from 'lucide-react';
import { Employee } from '../types';
// Mock data import removed - now using real API data
import { EmployeeCard } from '../components/EmployeeCard';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';
import { getRiskColor, sortEmployeesByRisk } from '../utils/riskUtils';
import { LoadingSpinner, LoadingCard, LoadingSkeleton } from '../components/LoadingSpinner';
import { ErrorMessage, ErrorCard } from '../components/ErrorMessage';
import { AppError, ErrorType, createError, withErrorHandling, logError } from '../utils/errorUtils';
import { employeeAPI } from '../services/api';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [sortBy, setSortBy] = useState<'riskScore' | 'name' | 'department' | 'lastActivity'>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch employees from API
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 EmployeesPage: Fetching employees...');
      
      const { data, error: fetchError } = await withErrorHandling(
        () => employeeAPI.getAll({ limit: 50 }),
        'EmployeesPage.fetchEmployees'
      );

      if (fetchError) {
        throw fetchError;
      }

      // Use employee data directly from API (consistent with dashboard)
      const employeesData = data?.employees || data || [];
      
      console.log('✅ EmployeesPage: Employees data:', employeesData);
      console.log('🔍 EmployeesPage Employee data:');
      employeesData.forEach((emp: any) => {
        console.log(`- ${emp.name}: ${emp.riskScore}% (${emp.riskLevel}) | Dept: ${emp.department}`);
      });
      
      setEmployees(employeesData);
      
    } catch (error) {
      const appError = error instanceof Error 
        ? createError(ErrorType.SERVER, 'Failed to load employee data. Please try again.', error, undefined, true)
        : error as AppError;
      
      setError(appError);
      logError(appError, 'EmployeesPage');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchEmployees();
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(employee => {
    const name = employee.name || '';
    const email = employee.email || '';
    const department = employee.department || '';
    const role = employee.role || employee.jobTitle || employee.job_title || '';
    const riskLevel = employee.riskLevel || employee.risk_level || 'Low';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || riskLevel === riskFilter;
    const matchesDepartment = departmentFilter === 'all' || department === departmentFilter;
    
    return matchesSearch && matchesRisk && matchesDepartment;
  });

  // Enhanced sorting logic
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'department':
        aValue = a.department.toLowerCase();
        bValue = b.department.toLowerCase();
        break;
      case 'lastActivity':
        aValue = new Date(a.lastActivity || a.last_activity || 0).getTime();
        bValue = new Date(b.lastActivity || b.last_activity || 0).getTime();
        break;
      case 'riskScore':
      default:
        aValue = a.riskScore || a.risk_score || 0;
        bValue = b.riskScore || b.risk_score || 0;
        break;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalEmployees = sortedEmployees.length;
  const totalPages = Math.ceil(totalEmployees / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, riskFilter, departmentFilter, sortBy, sortOrder, itemsPerPage]);
  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

  // Helper functions
  const clearFilters = () => {
    setSearchTerm('');
    setRiskFilter('all');
    setDepartmentFilter('all');
    setSortBy('riskScore');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || riskFilter !== 'all' || departmentFilter !== 'all';

  const getRiskStats = () => {
    const stats = employees.reduce((acc, emp) => {
      // Handle both riskLevel and risk_level field names
      const riskLevel = emp.riskLevel || emp.risk_level || 'Low';
      acc[riskLevel] = (acc[riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  };

  const riskStats = getRiskStats();

  // Show loading state
  if (loading) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-8">
          <LoadingSkeleton className="h-8 w-80 mb-2" />
          <LoadingSkeleton className="h-4 w-96" />
        </div>
        
        {/* Loading stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <LoadingSkeleton className="h-12 w-12 mb-4" />
              <LoadingSkeleton className="h-4 w-20 mb-2" />
              <LoadingSkeleton className="h-6 w-16" />
            </div>
          ))}
        </div>

        <LoadingCard 
          title="Loading Employee Data"
          description="Please wait while we fetch the latest employee security information..."
        />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Security Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-300">Monitor and analyze employee security risks and behaviors</p>
        </div>
        
        <ErrorCard
          title="Failed to Load Employee Data"
          message={error.message}
          onRetry={handleRetry}
          retryText="Reload Data"
        />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Security Monitoring</h1>
            <p className="text-gray-600 dark:text-gray-300">Monitor and analyze employee security risks and behaviors</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-4 h-4 flex flex-col space-y-1">
                <div className="h-0.5 bg-current rounded"></div>
                <div className="h-0.5 bg-current rounded"></div>
                <div className="h-0.5 bg-current rounded"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">High Risk</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(riskStats.Critical || 0) + (riskStats.High || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Violations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {employees.reduce((sum, emp) => sum + (emp.violations?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {employees.length > 0 ? Math.round(employees.reduce((sum, emp) => sum + (emp.riskScore || emp.risk_score || 0), 0) / employees.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="space-y-4">
          {/* Search and primary filters */}
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search employees by name, email, department, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Risk Levels</option>
                <option value="Critical">Critical Risk</option>
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>
              
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sorting and pagination controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="riskScore">Risk Score</option>
                <option value="name">Name</option>
                <option value="department">Department</option>
                <option value="lastActivity">Last Activity</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={6}>6 per page</option>
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                                  <option value={48}>48 per page</option>
                </select>
              </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

        {/* Risk Level Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Levels:</span>
            {Object.entries(riskStats).map(([level, count]) => (
              <div key={level} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getRiskColor(level)}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">{level} ({count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee List/Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Employees ({totalEmployees} total, showing {startIndex + 1}-{Math.min(endIndex, totalEmployees)})
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sorted by {sortBy} ({sortOrder === 'desc' ? 'highest' : 'lowest'} first)
          </div>
        </div>
        
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onViewDetails={setSelectedEmployee}
                layout="grid"
                showMetrics={true}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onViewDetails={setSelectedEmployee}
                layout="list"
                showMetrics={true}
              />
            ))}
          </div>
        )}

        {totalEmployees === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
            <p className="text-gray-600 dark:text-gray-300">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 border-t border-gray-200 dark:border-gray-600 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, totalEmployees)} of {totalEmployees} employees
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  First
                </button>
                
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  Next
                </button>
                
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
};