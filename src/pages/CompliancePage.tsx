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
import { EmployeeStatusManagement } from '../components/compliance/EmployeeStatusManagement';
import { IncidentsManagement } from '../components/compliance/IncidentsManagement';
import { AuditTrail } from '../components/compliance/AuditTrail';

type TabType = 'dashboard' | 'regulations' | 'policies' | 'profiles' | 'employees' | 'incidents' | 'audit';

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
    description: 'Employee compliance monitoring'
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    description: 'Compliance incident tracking'
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
        return <EmployeeStatusManagement />;
      case 'incidents':
        return <IncidentsManagement />;
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