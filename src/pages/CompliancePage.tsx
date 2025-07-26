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
  BarChart3,
  Info,
  ArrowRight,
  Mail,
  GraduationCap
} from 'lucide-react';
import { ComplianceDashboard } from '../components/ComplianceDashboard';
import { RegulationsManagement } from '../components/compliance/RegulationsManagement';
import { PoliciesManagement } from '../components/compliance/PoliciesManagement';
import { ProfilesManagement } from '../components/compliance/ProfilesManagement';
import { AuditTrail } from '../components/compliance/AuditTrail';

type TabType = 'dashboard' | 'regulations' | 'policies' | 'profiles' | 'audit';

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
    description: 'Monitor your organization\'s overall compliance status with real-time metrics, incident tracking, and employee compliance health.'
  },
  {
    id: 'regulations',
    label: 'Regulations',
    icon: BookOpen,
    description: 'Enable and configure which external regulations apply to your organization. This drives automatic email monitoring and compliance analysis.'
  },
  {
    id: 'policies',
    label: 'Internal Policies',
    icon: FileText,
    description: 'Create and manage organizational policies that work alongside regulations to provide comprehensive compliance coverage.'
  },
  {
    id: 'profiles',
    label: 'Compliance Profiles',
    icon: Shield,
    description: 'Define different compliance requirements for different types of employees based on their role, department, and data access needs.'
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: Eye,
    description: 'Maintain comprehensive audit logs of all compliance-related changes and activities for regulatory inspections and accountability.'
  }
];

const CompliancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const getCurrentTabDescription = () => {
    return tabs.find(tab => tab.id === activeTab)?.description || '';
  };

  const renderTabContent = () => {
    const currentDescription = getCurrentTabDescription();
    
    return (
      <div>
        {/* Tab Description */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {currentDescription}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {(() => {
            switch (activeTab) {
              case 'dashboard':
                return <ComplianceDashboard />;
              case 'regulations':
                return <RegulationsManagement />;
              case 'policies':
                return <PoliciesManagement />;
              case 'profiles':
                return <ProfilesManagement />;
              case 'audit':
                return <AuditTrail />;
              default:
                return <ComplianceDashboard />;
            }
          })()}
        </div>
      </div>
    );
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
            Configure regulations and policies to automatically monitor communications and assign training
          </p>
          
          {/* Simple Workflow Overview */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center text-sm text-blue-800 dark:text-blue-200">
              <Info className="w-4 h-4 mr-2 flex-shrink-0" />
              <div className="flex items-center space-x-2 overflow-x-auto">
                <span className="flex items-center whitespace-nowrap">
                  <BookOpen className="w-4 h-4 mr-1" />
                  Configure Regulations
                </span>
                <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="flex items-center whitespace-nowrap">
                  <Shield className="w-4 h-4 mr-1" />
                  Assign Profiles
                </span>
                <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="flex items-center whitespace-nowrap">
                  <Mail className="w-4 h-4 mr-1" />
                  Monitor Communications
                </span>
                <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="flex items-center whitespace-nowrap">
                  <GraduationCap className="w-4 h-4 mr-1" />
                  Auto-Assign Training
                </span>
              </div>
            </div>
          </div>
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