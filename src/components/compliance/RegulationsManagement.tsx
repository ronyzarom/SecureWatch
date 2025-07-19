import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Shield, 
  Globe, 
  Settings, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  Loader,
  Save,
  RefreshCw
} from 'lucide-react';
import { complianceAPI } from '../../services/api';
import { ComplianceRegulation } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface RegulationCardProps {
  regulation: ComplianceRegulation;
  onToggle: (code: string, isActive: boolean) => Promise<void>;
  onConfigure: (regulation: ComplianceRegulation) => void;
  isToggling: boolean;
}

const RegulationCard: React.FC<RegulationCardProps> = ({ 
  regulation, 
  onToggle, 
  onConfigure, 
  isToggling 
}) => {
  const getRegionIcon = (region: string) => {
    switch (region) {
      case 'EU': return '🇪🇺';
      case 'US': return '🇺🇸';
      case 'CA': return '🇨🇦';
      case 'GLOBAL': return '🌍';
      default: return '🌐';
    }
  };

  const getRegulationDescription = (code: string) => {
    switch (code) {
      case 'gdpr':
        return {
          summary: 'Comprehensive data protection for EU residents',
          requirements: ['Data subject rights', 'Privacy by design', '72h breach notification', 'Data minimization'],
          impact: 'High - Affects all EU data processing'
        };
      case 'sox':
        return {
          summary: 'Financial reporting and audit requirements',
          requirements: ['7-year audit retention', 'Segregation of duties', 'Access logging', 'Financial controls'],
          impact: 'Critical - Required for public companies'
        };
      case 'hipaa':
        return {
          summary: 'Healthcare data protection standards',
          requirements: ['PHI encryption', 'Access controls', 'Audit trails', 'Training requirements'],
          impact: 'High - Required for healthcare data'
        };
      case 'pci_dss':
        return {
          summary: 'Payment card data security standards',
          requirements: ['Network segmentation', 'Encryption', 'Vulnerability scanning', 'Access monitoring'],
          impact: 'Critical - Required for card processing'
        };
      default:
        return {
          summary: regulation.description || 'Custom regulation',
          requirements: ['Custom requirements'],
          impact: 'Medium - Organization specific'
        };
    }
  };

  const details = getRegulationDescription(regulation.regulation_code);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all duration-200 ${
      regulation.is_active 
        ? 'border-green-500 dark:border-green-400' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getRegionIcon(regulation.region)}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {regulation.regulation_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {regulation.regulation_code.toUpperCase()} • {regulation.region}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {regulation.is_active ? (
              <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-sm font-medium">
                <Check className="w-4 h-4 mr-1" />
                Active
              </div>
            ) : (
              <div className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
                <X className="w-4 h-4 mr-1" />
                Inactive
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {details.summary}
        </p>

        {/* Requirements */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Key Requirements:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {details.requirements.map((req, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                {req}
              </div>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Impact:</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{details.impact}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onConfigure(regulation)}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </button>
          
          <button
            onClick={() => onToggle(regulation.regulation_code, !regulation.is_active)}
            disabled={isToggling}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              regulation.is_active
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isToggling ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : regulation.is_active ? (
              <X className="w-4 h-4 mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {regulation.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const RegulationsManagement: React.FC = () => {
  const [regulations, setRegulations] = useState<ComplianceRegulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingRegulations, setTogglingRegulations] = useState<Set<string>>(new Set());
  const [selectedRegulation, setSelectedRegulation] = useState<ComplianceRegulation | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fetchRegulations = async () => {
    try {
      setError(null);
      const response = await complianceAPI.regulations.getAll();
      setRegulations(response.regulations || []);
    } catch (err) {
      console.error('Error fetching regulations:', err);
      setError('Failed to load regulations');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegulation = async (code: string, isActive: boolean) => {
    try {
      setTogglingRegulations(prev => new Set(prev.add(code)));
      
      await complianceAPI.regulations.activate(code, isActive);
      
      // Update local state
      setRegulations(prev => 
        prev.map(reg => 
          reg.regulation_code === code 
            ? { ...reg, is_active: isActive }
            : reg
        )
      );
      
    } catch (err) {
      console.error('Error toggling regulation:', err);
      setError(`Failed to ${isActive ? 'activate' : 'deactivate'} regulation`);
    } finally {
      setTogglingRegulations(prev => {
        const newSet = new Set(prev);
        newSet.delete(code);
        return newSet;
      });
    }
  };

  const handleConfigureRegulation = (regulation: ComplianceRegulation) => {
    setSelectedRegulation(regulation);
    setShowConfigModal(true);
  };

  useEffect(() => {
    fetchRegulations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchRegulations} />;
  }

  const activeRegulations = regulations.filter(reg => reg.is_active);
  const inactiveRegulations = regulations.filter(reg => !reg.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
            Regulatory Compliance
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage regulatory frameworks and compliance requirements
          </p>
        </div>
        <button
          onClick={fetchRegulations}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{regulations.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Regulations</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeRegulations.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Regulations</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Globe className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(regulations.map(r => r.region)).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Regions Covered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Regulations */}
      {activeRegulations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Check className="w-5 h-5 mr-2 text-green-600" />
            Active Regulations ({activeRegulations.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeRegulations.map((regulation) => (
              <RegulationCard
                key={regulation.id}
                regulation={regulation}
                onToggle={handleToggleRegulation}
                onConfigure={handleConfigureRegulation}
                isToggling={togglingRegulations.has(regulation.regulation_code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Regulations */}
      {inactiveRegulations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <X className="w-5 h-5 mr-2 text-gray-400" />
            Available Regulations ({inactiveRegulations.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {inactiveRegulations.map((regulation) => (
              <RegulationCard
                key={regulation.id}
                regulation={regulation}
                onToggle={handleToggleRegulation}
                onConfigure={handleConfigureRegulation}
                isToggling={togglingRegulations.has(regulation.regulation_code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Regulatory Compliance Guidelines
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Activating a regulation applies its requirements to all relevant employees</li>
              <li>• Each regulation has specific data retention and monitoring requirements</li>
              <li>• Compliance profiles are automatically updated when regulations change</li>
              <li>• Deactivating a regulation may require data retention review</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 