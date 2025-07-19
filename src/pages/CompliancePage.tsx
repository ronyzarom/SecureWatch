import React, { useState } from 'react';
import { 
  Shield, 
  Settings, 
  Users, 
  FileText, 
  BookOpen,
  AlertTriangle,
  Calendar,
  Eye,
  BarChart3
} from 'lucide-react';
import { ComplianceDashboard } from '../components/ComplianceDashboard';
import { RegulationsManagement } from '../components/compliance/RegulationsManagement';
import { PoliciesManagement } from '../components/compliance/PoliciesManagement';
import { ProfilesManagement } from '../components/compliance/ProfilesManagement';
import { AuditTrail } from '../components/compliance/AuditTrail';

type TabType = 'dashboard' | 'regulations' | 'policies' | 'profiles' | 'employees' | 'audit';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Compliance overview and metrics'
  },
  {
    id: 'regulations',
    label: 'Regulations',
    icon: BookOpen,
    description: 'Manage regulatory frameworks'
  },
  {
    id: 'policies',
    label: 'Internal Policies',
    icon: FileText,
    description: 'Organizational policy management'
  },
  {
    id: 'profiles',
    label: 'Compliance Profiles',
    icon: Shield,
    description: 'Employee compliance classifications'
  },
  {
    id: 'employees',
    label: 'Employee Status',
    icon: Users,
    description: 'View employee compliance in main dashboard & employees page'
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: Eye,
    description: 'Compliance activity history'
  }
];

const CompliancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ComplianceDashboard />;
      case 'regulations':
        return <RegulationsManagement />;
      case 'policies':
        return <PoliciesManagement />;
      case 'profiles':
        return <ProfilesManagement />;
      case 'employees':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Employee Compliance Status Integrated
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                    Employee compliance information is now integrated directly into the main dashboard and employees page 
                    for better accessibility and user experience.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 w-full max-w-2xl">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      Main Dashboard
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View compliance metrics, status overview, and employee cards with integrated compliance information.
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-blue-600" />
                      Employees Page
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Filter employees by compliance status, review status, and profiles. View detailed compliance information on each employee card.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => window.location.href = '#dashboard'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '#employees'}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>Go to Employees</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'audit':
        return <AuditTrail />;
      default:
        return <ComplianceDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-8 h-8 mr-3 text-blue-600" />
            Compliance Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive compliance framework for regulatory adherence and risk management
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-200">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CompliancePage; 