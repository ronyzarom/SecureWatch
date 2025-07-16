import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Shield, TrendingUp, Bot } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricsCard } from './components/MetricsCard';
import { EmployeeCard } from './components/EmployeeCard';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
import { NetworkAnalysis } from './components/NetworkAnalysis';
import { RecentActivity } from './components/RecentActivity';
import { SecurityChatbot } from './components/SecurityChatbot';
import { EmailAnalytics } from './components/EmailAnalytics';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { UsersPage } from './pages/UsersPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { SettingsEmailPage } from './pages/SettingsEmailPage';
import { SettingsCompanyPage } from './pages/SettingsCompanyPage';
// Mock data imports removed - now using real API data
import { sortEmployeesByRisk } from './utils/riskUtils';
import { Employee } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { logError } from './utils/errorUtils';
import { testConnection, testAuth, dashboardAPI, employeeAPI } from './services/api';
import { LoginPage } from './components/LoginPage';
import api from './services/api';

function App() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'high-risk'>('high-risk');
  const [showChatbot, setShowChatbot] = useState(false);
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
  const [employeesPerPage, setEmployeesPerPage] = useState(6); // Default to 6 employees per page for better UI

  // Check authentication and test API connection on app load
  useEffect(() => {
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
        } catch (error) {
          console.log('ℹ️ User not authenticated, showing login page');
          setIsAuthenticated(false);
        }
      } else {
        console.error('❌ Backend connection failed');
        setIsAuthenticated(false);
      }
    };
    
    initializeApp();
  }, []);

  // Handle successful login
  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
    console.log('🎉 Login successful, user authenticated:', userData);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      // Clear data on logout
      setDashboardData(null);
      setEmployees([]);
    }
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
      
      // Debug: Check employee risk scores
      const employees = employeesResponse.employees || employeesResponse;
      console.log('🔍 Employee risk scores:');
      employees.forEach((emp: any) => {
        console.log(`- ${emp.name}: ${emp.riskScore}% (${emp.riskLevel})`);
      });
      
      const highRiskCount = employees.filter((emp: any) => emp.riskScore >= 65).length;
      console.log(`🚨 High risk employees (score >= 65): ${highRiskCount}`);
      
      setDashboardData(metricsResponse);
      setEmployees(employees);
      
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data');
      logError(error as Error, { component: 'App', action: 'fetchDashboardData' });
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
      
      const response = await employeeAPI.getById(employee.id);
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
      logError(error as Error, { component: 'App', action: 'fetchEmployeeDetails', employeeId: employee.id });
      
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

  const handleChatAction = (actionType: string, context?: any) => {
    console.log('Global chat action:', actionType, context);
    // Handle different action types globally
    if (actionType === 'investigate' && context?.employee) {
      setSelectedEmployee(context.employee);
      setShowChatbot(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'integrations':
        return <IntegrationsPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'users':
        return <UsersPage />;
      case 'settings-email':
        return <SettingsEmailPage />;
      case 'settings-company':
        return <SettingsCompanyPage />;
      default:
        return (
          <>
            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {loading ? (
                <div className="col-span-4 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
                </div>
              ) : error ? (
                <div className="col-span-4 text-center py-8 text-red-600">
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
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Employee Risk Gallery */}
              <div className="lg:col-span-2">
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
                  
                  <div className="space-y-4">
                    {displayedEmployees.map((employee) => (
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        onViewDetails={fetchEmployeeDetails}
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
                              <option value={3}>3</option>
                              <option value={6}>6</option>
                              <option value={9}>9</option>
                              <option value={12}>12</option>
                              <option value={18}>18</option>
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
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <NetworkAnalysis />
                <EmailAnalytics />
                <RecentActivity />
              </div>
            </div>

            {/* AI Assistant Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <Bot className="w-6 h-6 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Security Assistant</h2>
                    </div>
                    <button
                      onClick={() => setShowChatbot(!showChatbot)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        showChatbot 
                          ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {showChatbot ? 'Hide Assistant' : 'Show Assistant'}
                    </button>
                  </div>
                  
                  {showChatbot ? (
                    <SecurityChatbot onActionClick={handleChatAction} />
                  ) : (
                    <div className="text-center py-12">
                      <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">AI Security Investigation Assistant</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                        Get intelligent insights about security threats, investigate employee behavior, 
                        and receive actionable recommendations for incident response.
                      </p>
                      <button
                        onClick={() => setShowChatbot(true)}
                        className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                      >
                        Start AI Investigation
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Capabilities</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Risk Analysis</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Analyze employee behavior patterns and risk factors</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Investigation Guidance</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Step-by-step investigation procedures and checklists</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Threat Detection</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Identify policy violations and security incidents</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Network Analysis</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Understand employee connections and communication patterns</p>
                      </div>
                    </div>
                  </div>
                </div>
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
        <ThemeProvider>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Show main app if authenticated
  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ThemeProvider>
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
                onClose={() => {
                  setSelectedEmployee(null);
                  setDetailedEmployee(null);
                }}
                loading={loadingEmployeeDetails}
              />
            </ErrorBoundary>
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;