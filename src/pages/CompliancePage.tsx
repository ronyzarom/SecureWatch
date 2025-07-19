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
    description: 'Employee compliance status'
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    description: 'Compliance incidents and violations'
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: Eye,
    description: 'Compliance change history'
  }
];

export const CompliancePage: React.FC = () => {
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
        return <EmployeeComplianceStatus />;
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-8 h-8 mr-3 text-blue-600" />
            Compliance Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive compliance framework for regulatory adherence and organizational policies
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="px-1">
            <nav className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={tab.description}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other tabs (to be implemented)
const RegulationsManagement: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
    <div className="text-center">
      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Regulations Management</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Configure and manage regulatory frameworks like GDPR, SOX, HIPAA, and PCI DSS
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['GDPR', 'SOX', 'HIPAA', 'PCI DSS'].map((regulation) => (
          <div key={regulation} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white">{regulation}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Configure settings</p>
            <button className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PoliciesManagement: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
    <div className="text-center">
      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Internal Policies</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Create and manage organizational policies for employee monitoring, data retention, and access control
      </p>
      <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
        Create New Policy
      </button>
    </div>
  </div>
);

const ProfilesManagement: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
    <div className="text-center">
      <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compliance Profiles</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Define compliance profiles for different roles and departments
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Standard Employee', 'Finance Team', 'IT Administration', 'Contractors'].map((profile) => (
          <div key={profile} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white">{profile}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Compliance profile</p>
            <button className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors">
              Edit Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EmployeeComplianceStatus: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
    <div className="text-center">
      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Employee Compliance Status</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        View and manage compliance status for all employees
      </p>
      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        View Employee List
      </button>
    </div>
  </div>
);

const IncidentsManagement: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
    <div className="text-center">
      <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compliance Incidents</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Track and manage compliance violations and incidents
      </p>
      <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
        Create Incident
      </button>
    </div>
  </div>
);

const AuditTrail: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
    <div className="text-center">
      <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Audit Trail</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Complete history of compliance-related changes and activities
      </p>
      <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
        View Audit Log
      </button>
    </div>
  </div>
); 