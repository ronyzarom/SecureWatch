import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricsCard } from './components/MetricsCard';
import { EmployeeCard } from './components/EmployeeCard';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
import { NetworkAnalysis } from './components/NetworkAnalysis';
import { ToastContainer } from './components/ToastContainer';

import { EmailAnalytics } from './components/EmailAnalytics';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { UsersPage } from './pages/UsersPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { SettingsEmailPage } from './pages/SettingsEmailPage';
import { SettingsCompanyPage } from './pages/SettingsCompanyPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ViolationsPage } from './pages/ViolationsPage';
import { ActivityReportsPage } from './pages/ActivityReportsPage';
import CompliancePage from './pages/CompliancePage';
import TrainingManagementPage from './pages/TrainingManagementPage';
// Mock data imports removed - now using real API data
import { sortEmployeesByRisk } from './utils/riskUtils';
import { Employee } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { logError } from './utils/errorUtils';
import { testConnection, testAuth, dashboardAPI, employeeAPI, setAutoLogoutHandler, authAPI } from './services/api';
import { LoginPage } from './components/LoginPage';
import api from './services/api';

// Inner app component that has access to notification context
function AppContent() {
  const { addToast } = useNotifications();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'high-risk'>('high-risk');

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedEmployee, setDetailedEmployee] = useState<any>(null);
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState(false);
  
  // Pagination state for employee list
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [employeesPerPage, setEmployeesPerPage] = useState(12); // Default to 12 employees per page to match Employees page

  // Check authentication and test API connection on app load
  useEffect(() => {
    // Register auto-logout handler for session expiration
    setAutoLogoutHandler(handleAutoLogout);
    
    const initializeApp = async () => {
      console.log('🔗 Testing backend connection...');
      
      // Test basic connection
      const healthCheck = await testConnection();
      
      if (healthCheck.success) {
        console.log('🎉 Frontend-Backend connection established!');
        
        // Check if user is already authenticated
        try {
          const response = await api.get('/api/auth/me');
          setUser(response.data.user);
          setIsAuthenticated(true);
          console.log('✅ User already authenticated:', response.data.user);
        } catch (error: any) {
          // 401 is expected when no session exists - not an error
          if (error.response?.status === 401) {
            console.log('ℹ️ No existing session found, showing login page');
          } else {
            console.error('⚠️ Auth check failed:', error.message);
          }
          setIsAuthenticated(false);
        }
      } else {
        console.error('❌ Backend connection failed');
        setIsAuthenticated(false);
      }
    };
    
    initializeApp();
  }, []);

  // Handle automatic logout when session expires
  const handleAutoLogout = async () => {
    console.log('🔒 Session expired - performing automatic logout');
    
    try {
      // Try to call logout endpoint to clean up server-side session
      await authAPI.logout();
    } catch (error) {
      // Ignore errors during logout (session might already be invalid)
      console.log('ℹ️ Logout cleanup failed (session might already be expired)');
    }
    
    // Show user-friendly notification
    addToast({
      type: 'warning',
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again to continue.',
      duration: 5000
    });
    
    // Clear client-side state
    setUser(null);
    setIsAuthenticated(false);
    setDashboardData(null);
    setEmployees([]);
    setCurrentPage('dashboard');
    
    console.log('🔄 Redirected to login due to session expiration');
  };

  // Handle successful login
  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
    console.log('🎉 Login successful, user authenticated:', userData);
  };

  // Handle manual logout
  const handleLogout = async () => {
    console.log('🔒 User initiated logout');
    
    try {
      await authAPI.logout();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('⚠️ Logout error:', error);
    }
    
    // Clear client-side state
    setUser(null);
    setIsAuthenticated(false);
    setDashboardData(null);
    setEmployees([]);
    setCurrentPage('dashboard');
  };

  // Fetch dashboard and employee data
  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching dashboard data...');
      
      // Fetch dashboard metrics and employee data in parallel
      const [metricsResponse, employeesResponse] = await Promise.all([
        dashboardAPI.getMetrics(),
        employeeAPI.getAll({ limit: 50 }) // Get all employees for dashboard
      ]);
      
      console.log('✅ Dashboard metrics:', metricsResponse);
      console.log('✅ Employees data:', employeesResponse);
      
      // Use employee data directly from API (consistent structure)
      const employees = employeesResponse.employees || employeesResponse;
      
      console.log('🔍 Dashboard Employee data:');
      employees.forEach((emp: any) => {
        console.log(`- ${emp.name}: ${emp.riskScore}% (${emp.riskLevel}) | Dept: ${emp.department}`);
      });
      
      const highRiskCount = employees.filter((emp: any) => emp.riskScore >= 65).length;
      console.log(`🚨 High risk employees (score >= 65): ${highRiskCount}`);
      
      setDashboardData(metricsResponse);
      setEmployees(employees);
      
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data');
      logError(error as Error, 'App.fetchDashboardData');
    } finally {
      setLoading(false);
    }
  };

  // Add refresh function
  const refreshDashboard = async () => {
    console.log('🔄 Manually refreshing dashboard data...');
    await fetchDashboardData();
  };

  // Fetch data when user is authenticated
  useEffect(() => {
    if (isAuthenticated === true) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  // Fetch detailed employee data
  const fetchEmployeeDetails = async (employee: Employee) => {
    setLoadingEmployeeDetails(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching detailed employee data for:', employee.name);
      
      const response = await employeeAPI.getById(Number(employee.id));
      console.log('✅ Employee details:', response);
      
      // Create detailed employee object with all data
      const detailedEmployeeData = {
        ...employee,
        ...response.employee,
        violations: response.violations || [],
        metrics: response.metrics && response.metrics.length > 0 ? response.metrics[0] : {
          emailVolume: 0,
          externalContacts: 0,
          afterHoursActivity: 0,
          dataTransfer: 0,
          securityEvents: 0,
          behaviorChange: 0
        }
      };
      
      setDetailedEmployee(detailedEmployeeData);
      setSelectedEmployee(detailedEmployeeData);
      
    } catch (error) {
      console.error('❌ Failed to fetch employee details:', error);
      setError('Failed to load employee details');
      logError(error as Error, `App.fetchEmployeeDetails.${employee.id}`);
      
      // Fallback: show basic employee data
      setSelectedEmployee(employee);
    } finally {
      setLoadingEmployeeDetails(false);
    }
  };
  
  // Use real employee data or fallback to empty array
  const sortedEmployees = employees.length > 0 ? sortEmployeesByRisk(employees) : [];
  const highRiskEmployees = sortedEmployees.filter(emp => emp.riskScore >= 65);
  const filteredEmployees = viewMode === 'high-risk' ? highRiskEmployees : sortedEmployees;
  
  // Pagination logic
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.ceil(totalEmployees / employeesPerPage);
  const startIndex = (employeeCurrentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const displayedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Reset to first page when view mode or per page changes
  useEffect(() => {
    setEmployeeCurrentPage(1);
  }, [viewMode, employeesPerPage]);



  const renderPage = () => {
    switch (currentPage) {
      case 'integrations':
        return <IntegrationsPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'users':
        return <UsersPage />;
      case 'policies':
        return <PoliciesPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'violations':
        return <ViolationsPage />;
      case 'activity-reports':
        return <ActivityReportsPage />;
      case 'compliance':
        return <CompliancePage />;
      case 'training-management':
        return <TrainingManagementPage />;
      case 'settings-email':
        return <SettingsEmailPage />;
      case 'settings-company':
        return <SettingsCompanyPage />;
      case 'user-settings':
        return <UserSettingsPage user={user} />;
      case 'notification-settings':
        return <NotificationSettingsPage />;
      default:
        return (
          <>
            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              {loading ? (
                <div className="col-span-6 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
                </div>
              ) : error ? (
                <div className="col-span-6 text-center py-8 text-red-600">
                  <p>{error}</p>
                  <button 
                    onClick={fetchDashboardData}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <MetricsCard
                    title="Total Employees"
                    value={dashboardData?.summary?.totalEmployees?.toLocaleString() || '0'}
                    icon={Users}
                    color="text-blue-600"
                  />
                  <MetricsCard
                    title="High Risk Employees"
                    value={((dashboardData?.summary?.criticalRisk || 0) + (dashboardData?.summary?.highRisk || 0)).toString()}
                    icon={AlertTriangle}
                    color="text-red-600"
                  />
                  <MetricsCard
                    title="Active Violations"
                    value={dashboardData?.summary?.activeViolations || '0'}
                    icon={Shield}
                    color="text-orange-600"
                  />
                  <MetricsCard
                    title="Total Violations"
                    value={dashboardData?.summary?.totalViolations || '0'}
                    icon={TrendingUp}
                    color="text-yellow-600"
                  />
                  {/* New Compliance Metrics */}
                  <MetricsCard
                    title="Compliant Employees"
                    value={employees.filter(emp => emp.complianceStatus === 'compliant').length.toString()}
                    icon={Shield}
                    color="text-green-600"
                  />
                  <MetricsCard
                    title="Compliance Reviews Due"
                    value={employees.filter(emp => emp.reviewStatus === 'overdue' || emp.reviewStatus === 'due_soon').length.toString()}
                    icon={Clock}
                    color="text-amber-600"
                  />
                </>
              )}
            </div>

            <div className="space-y-8 mb-8">
              {/* Employee Risk Gallery - Full Width */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Risk Assessment</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={refreshDashboard}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Refresh data"
                    >
                      🔄 Refresh
                    </button>
                    <button
                      onClick={() => setViewMode('high-risk')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        viewMode === 'high-risk' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      High Risk Only
                    </button>
                    <button
                      onClick={() => setViewMode('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        viewMode === 'all' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      All Employees
                    </button>
                  </div>
                </div>
                
                {/* Employee Cards Grid - Using Same Layout as Employees Page */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayedEmployees.map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      onViewDetails={fetchEmployeeDetails}
                      layout="grid"
                      showMetrics={true}
                      showCompliance={true}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {(totalEmployees > 0) && (
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalEmployees)} of {totalEmployees} employees
                        </div>
                        
                        {/* Per page selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
                          <select
                            value={employeesPerPage}
                            onChange={(e) => setEmployeesPerPage(Number(e.target.value))}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={6}>6</option>
                            <option value={9}>9</option>
                            <option value={12}>12</option>
                            <option value={18}>18</option>
                            <option value={24}>24</option>
                          </select>
                          <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                        </div>
                      </div>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEmployeeCurrentPage(employeeCurrentPage - 1)}
                            disabled={employeeCurrentPage === 1}
                            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            Previous
                          </button>
                          
                          {/* Page numbers */}
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (employeeCurrentPage <= 3) {
                                pageNum = i + 1;
                              } else if (employeeCurrentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = employeeCurrentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setEmployeeCurrentPage(pageNum)}
                                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                    pageNum === employeeCurrentPage
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => setEmployeeCurrentPage(employeeCurrentPage + 1)}
                            disabled={employeeCurrentPage === totalPages}
                            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Analytics Grid - Below Employee Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compliance Overview Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-blue-600" />
                      Compliance Overview
                    </h3>
                  </div>
                  
                  {employees.length > 0 ? (
                    <div className="space-y-4">
                      {/* Compliance Status Breakdown */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status Distribution</h4>
                        <div className="space-y-2">
                          {[
                            { status: 'compliant', label: 'Compliant', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400' },
                            { status: 'needs_review', label: 'Needs Review', color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-400' },
                            { status: 'non_compliant', label: 'Non-Compliant', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
                            { status: 'overdue', label: 'Overdue', color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-400' }
                          ].map(({ status, label, color, textColor }) => {
                            const count = employees.filter(emp => emp.complianceStatus === status).length;
                            const percentage = Math.round((count / employees.length) * 100);
                            
                            return (
                              <div key={status} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-medium ${textColor}`}>{count}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No employee data available</p>
                    </div>
                  )}
                </div>
                
                <NetworkAnalysis />
                <EmailAnalytics />
              </div>
            </div>


          </>
        );
    }
  };

  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    logError(error, 'App ErrorBoundary');
    
    // In production, you might want to send this to an error reporting service
    // Example: analytics.track('App Error', { error: error.message, stack: error.stack });
  };

  // Loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading SecureWatch...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <ToastContainer />
      </ErrorBoundary>
    );
  }

  // Show main app if authenticated
  return (
    <ErrorBoundary onError={handleGlobalError}>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
            {/* Mobile sidebar overlay */}
            {mobileSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 z-40 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}
            
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 lg:flex-shrink-0 lg:h-full transform transition-transform duration-300 ease-in-out ${
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
              <ErrorBoundary>
                <Sidebar
                  currentPage={currentPage}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    setMobileSidebarOpen(false);
                  }}
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
              </ErrorBoundary>
            </div>
            
            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <ErrorBoundary>
                <Header 
                  onToggleSidebar={() => setMobileSidebarOpen(true)} 
                  user={user}
                  onLogout={handleLogout}
                  onPageChange={setCurrentPage}
                />
              </ErrorBoundary>
              
              <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                <ErrorBoundary>
                  {renderPage()}
                </ErrorBoundary>
              </main>
            </div>

            {/* Employee Details Modal */}
            {selectedEmployee && (
              <ErrorBoundary>
                <EmployeeDetailsModal
                  employee={selectedEmployee}
                  isOpen={!!selectedEmployee}
                  onClose={() => {
                    setSelectedEmployee(null);
                    setDetailedEmployee(null);
                  }}
                />
              </ErrorBoundary>
            )}
            
            {/* Toast Notifications */}
            <ToastContainer />
          </div>
    </ErrorBoundary>
  );
}

// Main App wrapper component
function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;